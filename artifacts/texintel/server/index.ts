import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import {
  addAssessment,
  addEvidence,
  addNote,
  createBrand,
  createSession,
  createUserWithWorkspace,
  db,
  deleteSession,
  findUserByEmail,
  getAuthContext,
  getBrand,
  getDashboardSummary,
  getDatabasePath,
  getWorkspaces,
  listBrands,
  normalizeEmail,
  selectWorkspaceForSession,
  verifyPassword,
} from "./db";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const production = process.argv.includes("--production");
const port = Number(process.env.PORT || 20386);
const configuredBase = process.env.BASE_PATH || "/";
const basePath = configuredBase.length > 1
  ? configuredBase.replace(/\/+$/, "")
  : "";
const sessionCookie = "texintel_session";

type JsonRecord = Record<string, unknown>;

function sendJson(res: ServerResponse, status: number, payload: unknown, headers: Record<string, string> = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

function sendError(res: ServerResponse, status: number, code: string, message: string) {
  sendJson(res, status, { error: { code, message } });
}

function parseCookies(req: IncomingMessage) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, ...value]) => [key, decodeURIComponent(value.join("="))]),
  );
}

function setSessionCookie(res: ServerResponse, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`,
  );
}

function clearSessionCookie(res: ServerResponse) {
  res.setHeader(
    "Set-Cookie",
    `${sessionCookie}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

async function readJson(req: IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1024 * 1024) throw new Error("Payload muito grande");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON inválido");
  }
  return parsed as JsonRecord;
}

function getRequestPath(req: IncomingMessage) {
  const requestUrl = new URL(req.url || "/", "http://texintel.local");
  const pathName = requestUrl.pathname;
  const withoutBase = basePath && pathName.startsWith(basePath)
    ? pathName.slice(basePath.length) || "/"
    : pathName;
  return { pathName: withoutBase, searchParams: requestUrl.searchParams };
}

function requireAuth(req: IncomingMessage, res: ServerResponse) {
  const token = parseCookies(req)[sessionCookie];
  if (!token) {
    sendError(res, 401, "UNAUTHENTICATED", "Faça login para continuar.");
    return null;
  }
  const auth = getAuthContext(token);
  if (!auth) {
    clearSessionCookie(res);
    sendError(res, 401, "UNAUTHENTICATED", "Sua sessão expirou. Faça login novamente.");
    return null;
  }
  return { token, auth };
}

function requireWorkspace(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const session = requireAuth(req, res);
  if (!session) return null;
  if (!session.auth.currentWorkspace) {
    sendError(res, 409, "WORKSPACE_REQUIRED", "Selecione um workspace para continuar.");
    return null;
  }
  return { ...session, workspace: session.auth.currentWorkspace };
}

function textValue(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function validUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function handleApi(req: IncomingMessage, res: ServerResponse) {
  const { pathName, searchParams } = getRequestPath(req);
  if (!pathName.startsWith("/api/")) return false;

  try {
    if (req.method === "GET" && pathName === "/api/health") {
      sendJson(res, 200, { ok: true, service: "texintel-standalone", database: "local-owned" });
      return true;
    }

    if (req.method === "POST" && pathName === "/api/auth/register") {
      const body = await readJson(req);
      const name = textValue(body.name, 100);
      const email = normalizeEmail(textValue(body.email, 200));
      const password = typeof body.password === "string" ? body.password : "";
      const workspaceName = textValue(body.workspaceName, 100) || `${name} Workspace`;
      if (name.length < 2) return sendError(res, 400, "INVALID_NAME", "Informe seu nome."), true;
      if (!email.includes("@") || email.length < 5) {
        sendError(res, 400, "INVALID_EMAIL", "Informe um e-mail válido.");
        return true;
      }
      if (password.length < 8) {
        sendError(res, 400, "WEAK_PASSWORD", "A senha deve ter pelo menos 8 caracteres.");
        return true;
      }
      if (workspaceName.length < 2) {
        sendError(res, 400, "INVALID_WORKSPACE", "Informe o nome do workspace.");
        return true;
      }
      if (findUserByEmail(email)) {
        sendError(res, 409, "EMAIL_IN_USE", "Já existe uma conta com este e-mail.");
        return true;
      }
      const created = createUserWithWorkspace(name, email, password, workspaceName);
      const token = createSession(created.userId, created.workspaceId);
      setSessionCookie(res, token);
      sendJson(res, 201, { ok: true });
      return true;
    }

    if (req.method === "POST" && pathName === "/api/auth/login") {
      const body = await readJson(req);
      const email = normalizeEmail(textValue(body.email, 200));
      const password = typeof body.password === "string" ? body.password : "";
      const user = findUserByEmail(email);
      if (!user || !verifyPassword(password, user.password_hash)) {
        sendError(res, 401, "INVALID_CREDENTIALS", "E-mail ou senha não reconhecidos.");
        return true;
      }
      const workspaces = getWorkspaces(user.id);
      const token = parseCookies(req)[sessionCookie];
      if (token) deleteSession(token);
      const nextToken = createSession(user.id, workspaces.length === 1 ? workspaces[0].id : null);
      setSessionCookie(res, nextToken);
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === "GET" && pathName === "/api/auth/me") {
      const token = parseCookies(req)[sessionCookie];
      const auth = token ? getAuthContext(token) : null;
      if (!auth) {
        sendJson(res, 200, { authenticated: false });
        return true;
      }
      sendJson(res, 200, {
        authenticated: true,
        user: auth.user,
        workspaces: auth.workspaces,
        currentWorkspace: auth.currentWorkspace,
      });
      return true;
    }

    if (req.method === "POST" && pathName === "/api/auth/select-workspace") {
      const session = requireAuth(req, res);
      if (!session) return true;
      const body = await readJson(req);
      const workspaceId = textValue(body.workspaceId, 80);
      if (!selectWorkspaceForSession(session.token, workspaceId)) {
        sendError(res, 403, "WORKSPACE_FORBIDDEN", "Você não tem acesso a este workspace.");
        return true;
      }
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === "POST" && pathName === "/api/auth/logout") {
      const token = parseCookies(req)[sessionCookie];
      if (token) deleteSession(token);
      clearSessionCookie(res);
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === "GET" && pathName === "/api/dashboard/summary") {
      const session = requireWorkspace(req, res);
      if (!session) return true;
      sendJson(res, 200, getDashboardSummary(session.workspace.id));
      return true;
    }

    if (req.method === "GET" && pathName === "/api/brands") {
      const session = requireWorkspace(req, res);
      if (!session) return true;
      sendJson(res, 200, listBrands(session.workspace.id, {
        search: searchParams.get("search") || undefined,
        limit: Number(searchParams.get("limit") || 50),
      }));
      return true;
    }

    if (req.method === "POST" && pathName === "/api/brands") {
      const session = requireWorkspace(req, res);
      if (!session) return true;
      const body = await readJson(req);
      const displayName = textValue(body.displayName, 160);
      const websiteUrl = textValue(body.websiteUrl, 300);
      const instagramUrl = textValue(body.instagramUrl, 300);
      if (displayName.length < 2) {
        sendError(res, 400, "INVALID_BRAND", "Informe o nome da marca.");
        return true;
      }
      if (!validUrl(websiteUrl) || !validUrl(instagramUrl)) {
        sendError(res, 400, "INVALID_URL", "Use uma URL http(s) válida.");
        return true;
      }
      const brand = createBrand(session.workspace.id, session.auth.user.id, {
        displayName,
        instagramHandle: textValue(body.instagramHandle, 120),
        instagramUrl,
        websiteUrl,
        city: textValue(body.city, 100),
        state: textValue(body.state, 2) || "SP",
        marketSegment: textValue(body.marketSegment, 120),
        discoverySummary: textValue(body.discoverySummary, 1000),
      });
      sendJson(res, 201, brand);
      return true;
    }

    const brandMatch = pathName.match(/^\/api\/brands\/([^/]+)(.*)$/);
    if (brandMatch) {
      const brandId = brandMatch[1];
      const suffix = brandMatch[2];
      const session = requireWorkspace(req, res);
      if (!session) return true;
      const brand = getBrand(session.workspace.id, brandId);
      if (!brand) {
        sendError(res, 404, "BRAND_NOT_FOUND", "Marca não encontrada neste workspace.");
        return true;
      }
      if (req.method === "GET" && suffix === "") {
        sendJson(res, 200, brand);
        return true;
      }
      if (req.method === "POST" && suffix === "/evidence") {
        const body = await readJson(req);
        const claim = textValue(body.claim, 500);
        const sourceType = textValue(body.sourceType, 80) || "manual";
        const sourceUrl = textValue(body.sourceUrl, 300);
        if (!claim) {
          sendError(res, 400, "INVALID_EVIDENCE", "Informe o sinal observado.");
          return true;
        }
        if (!validUrl(sourceUrl)) {
          sendError(res, 400, "INVALID_URL", "Use uma URL http(s) válida.");
          return true;
        }
        const evidenceId = addEvidence(session.workspace.id, brandId, session.auth.user.id, {
          sourceType,
          sourceUrl,
          claim,
          excerpt: textValue(body.excerpt, 1000),
          confidence: ["low", "medium", "high"].includes(String(body.confidence))
            ? (String(body.confidence) as "low" | "medium" | "high")
            : "medium",
        });
        sendJson(res, 201, { ok: true, evidenceId });
        return true;
      }
      if (req.method === "POST" && suffix === "/notes") {
        const body = await readJson(req);
        const noteBody = textValue(body.body, 2000);
        if (!noteBody) {
          sendError(res, 400, "INVALID_NOTE", "Escreva uma nota antes de salvar.");
          return true;
        }
        const noteId = addNote(session.workspace.id, brandId, session.auth.user.id, {
          body: noteBody,
          noteType: textValue(body.noteType, 80),
          decisionAfterNote: textValue(body.decisionAfterNote, 80),
        });
        sendJson(res, 201, { ok: true, noteId });
        return true;
      }
      if (req.method === "POST" && suffix === "/score") {
        const body = await readJson(req);
        const totalScore = Number(body.totalScore);
        const rationale = textValue(body.rationale, 1000);
        const dimensionScores = body.dimensionScores;
        if (!Number.isInteger(totalScore) || totalScore < 0 || totalScore > 100 || !rationale) {
          sendError(res, 400, "INVALID_SCORE", "Informe score inteiro de 0 a 100 e uma justificativa.");
          return true;
        }
        if (!dimensionScores || typeof dimensionScores !== "object" || Array.isArray(dimensionScores)) {
          sendError(res, 400, "INVALID_DIMENSIONS", "Informe as dimensões do score.");
          return true;
        }
        const scoreId = addAssessment(session.workspace.id, brandId, session.auth.user.id, {
          totalScore,
          dimensionScores: dimensionScores as Record<string, number>,
          rationale,
        });
        sendJson(res, 201, { ok: true, scoreId });
        return true;
      }
    }

    sendError(res, 404, "NOT_FOUND", "Rota não encontrada.");
    return true;
  } catch (error) {
    console.error("[texintel] API error", error);
    const message = error instanceof SyntaxError
      ? "JSON inválido."
      : error instanceof Error
        ? error.message
        : "Erro interno.";
    sendError(res, 400, "REQUEST_FAILED", message);
    return true;
  }
}

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

async function serveProduction(req: IncomingMessage, res: ServerResponse) {
  const { pathName } = getRequestPath(req);
  const publicRoot = path.join(root, "dist", "public");
  const requested = pathName === "/" ? "/index.html" : pathName;
  const safePath = path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const target = path.join(publicRoot, safePath);
  try {
    const file = await readFile(target);
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(target)] || "application/octet-stream",
      "Cache-Control": target.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(file);
  } catch {
    const index = await readFile(path.join(publicRoot, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
    res.end(index);
  }
}

async function start() {
  const vite = production
    ? null
    : await createViteServer({
        root,
        base: configuredBase,
        server: { middlewareMode: true, allowedHosts: true },
        appType: "spa",
      });

  const server = createServer(async (req, res) => {
    if (await handleApi(req, res)) return;
    if (production) {
      await serveProduction(req, res);
      return;
    }
    vite!.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end("Not found");
    });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[texintel] standalone server listening on ${port}`);
    console.log(`[texintel] own database: ${getDatabasePath()}`);
  });

  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("[texintel] failed to start", error);
  db.close();
  process.exit(1);
});