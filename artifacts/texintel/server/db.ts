import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type WorkspaceRole = "owner" | "admin" | "curator" | "viewer";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
};

export type AuthContext = {
  user: UserRecord;
  workspaces: WorkspaceRecord[];
  currentWorkspace: WorkspaceRecord | null;
  sessionId: string;
};

const dataDirectory = process.env.TEXINTEL_DATA_DIR
  ? path.resolve(process.env.TEXINTEL_DATA_DIR)
  : path.resolve(process.cwd(), "data");
const databasePath = process.env.TEXINTEL_DB_PATH
  ? path.resolve(process.env.TEXINTEL_DB_PATH)
  : path.join(dataDirectory, "texintel.sqlite");

mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`);

const migrations: Array<[string, string]> = [
  [
    "001_foundation",
    `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS memberships (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'curator', 'viewer')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prospected_brands (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        instagram_handle TEXT,
        instagram_url TEXT,
        website_url TEXT,
        city TEXT,
        state TEXT NOT NULL DEFAULT 'SP',
        market_segment TEXT,
        identity_status TEXT NOT NULL DEFAULT 'candidate',
        lifecycle_status TEXT NOT NULL DEFAULT 'candidate',
        discovery_summary TEXT,
        total_score INTEGER,
        score_band TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS prospected_brands_workspace_idx
        ON prospected_brands(workspace_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS prospected_brands_search_idx
        ON prospected_brands(workspace_id, normalized_name);

      CREATE TABLE IF NOT EXISTS brand_evidence (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        brand_id TEXT NOT NULL REFERENCES prospected_brands(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        source_url TEXT,
        claim TEXT NOT NULL,
        excerpt TEXT,
        confidence TEXT NOT NULL DEFAULT 'medium'
          CHECK (confidence IN ('low', 'medium', 'high')),
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS brand_evidence_brand_idx
        ON brand_evidence(brand_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS fit_assessments (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        brand_id TEXT NOT NULL REFERENCES prospected_brands(id) ON DELETE CASCADE,
        total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
        dimension_scores TEXT NOT NULL,
        rationale TEXT NOT NULL,
        rubric_version TEXT NOT NULL DEFAULT 'v1',
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS fit_assessments_brand_idx
        ON fit_assessments(brand_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS curation_notes (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        brand_id TEXT NOT NULL REFERENCES prospected_brands(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES users(id),
        note_type TEXT NOT NULL DEFAULT 'observation',
        body TEXT NOT NULL,
        decision_after_note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS curation_notes_brand_idx
        ON curation_notes(brand_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS brand_events (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        brand_id TEXT NOT NULL REFERENCES prospected_brands(id) ON DELETE CASCADE,
        actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,
  ],
];

for (const [version, sql] of migrations) {
  const existing = db
    .prepare("SELECT version FROM schema_migrations WHERE version = ?")
    .get(version) as { version?: string } | undefined;
  if (!existing) {
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
        .run(version, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

export function getDatabasePath() {
  return databasePath;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string) {
  const base = normalizeName(value).replace(/\s+/g, "-").slice(0, 48) || "workspace";
  let slug = base;
  let suffix = 2;
  while (
    db.prepare("SELECT id FROM workspaces WHERE slug = ?").get(slug)
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [, salt, expectedHex] = encoded.split("$");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function createSession(userId: string, currentWorkspaceId: string | null) {
  const id = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = scryptSync(token, "texintel-session", 32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  db.prepare(
    `INSERT INTO sessions (id, token_hash, user_id, current_workspace_id, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, tokenHash, userId, currentWorkspaceId, expiresAt);
  return token;
}

function hashSessionToken(token: string) {
  return scryptSync(token, "texintel-session", 32).toString("hex");
}

export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
}

export function selectWorkspaceForSession(token: string, workspaceId: string) {
  const tokenHash = hashSessionToken(token);
  const session = db
    .prepare("SELECT id, user_id FROM sessions WHERE token_hash = ?")
    .get(tokenHash) as { id?: string; user_id?: string } | undefined;
  if (!session?.id || !session.user_id) return false;
  const membership = db
    .prepare("SELECT 1 FROM memberships WHERE workspace_id = ? AND user_id = ?")
    .get(workspaceId, session.user_id);
  if (!membership) return false;
  db.prepare("UPDATE sessions SET current_workspace_id = ? WHERE id = ?")
    .run(workspaceId, session.id);
  return true;
}

export function getWorkspaces(userId: string): WorkspaceRecord[] {
  return db
    .prepare(
      `SELECT w.id, w.name, w.slug, m.role
       FROM workspaces w
       INNER JOIN memberships m ON m.workspace_id = w.id
       WHERE m.user_id = ?
       ORDER BY w.created_at ASC`,
    )
    .all(userId) as WorkspaceRecord[];
}

export function getAuthContext(token: string): AuthContext | null {
  const tokenHash = hashSessionToken(token);
  const session = db
    .prepare(
      `SELECT s.id, s.user_id, s.current_workspace_id, s.expires_at,
              u.name, u.email
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as
    | {
        id: string;
        user_id: string;
        current_workspace_id: string | null;
        expires_at: string;
        name: string;
        email: string;
      }
    | undefined;

  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
    return null;
  }

  const workspaces = getWorkspaces(session.user_id);
  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === session.current_workspace_id) ?? null;

  return {
    user: { id: session.user_id, name: session.name, email: session.email },
    workspaces,
    currentWorkspace,
    sessionId: session.id,
  };
}

export function createUserWithWorkspace(
  name: string,
  email: string,
  password: string,
  workspaceName: string,
) {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const workspaceSlug = slugify(workspaceName);
  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
    ).run(userId, name.trim(), email, hashPassword(password));
    db.prepare("INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)")
      .run(workspaceId, workspaceName.trim(), workspaceSlug);
    db.prepare(
      "INSERT INTO memberships (workspace_id, user_id, role) VALUES (?, ?, 'owner')",
    ).run(workspaceId, userId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { userId, workspaceId };
}

export function findUserByEmail(email: string) {
  return db
    .prepare(
      "SELECT id, name, email, password_hash FROM users WHERE email = ? COLLATE NOCASE",
    )
    .get(email) as
    | { id: string; name: string; email: string; password_hash: string }
    | undefined;
}

export function createBrand(
  workspaceId: string,
  userId: string,
  input: {
    displayName: string;
    instagramHandle?: string;
    instagramUrl?: string;
    websiteUrl?: string;
    city?: string;
    state?: string;
    marketSegment?: string;
    discoverySummary?: string;
  },
) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO prospected_brands (
       id, workspace_id, display_name, normalized_name, instagram_handle,
       instagram_url, website_url, city, state, market_segment, discovery_summary
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    workspaceId,
    input.displayName.trim(),
    normalizeName(input.displayName),
    input.instagramHandle?.trim() || null,
    input.instagramUrl?.trim() || null,
    input.websiteUrl?.trim() || null,
    input.city?.trim() || null,
    input.state?.trim().toUpperCase() || "SP",
    input.marketSegment?.trim() || null,
    input.discoverySummary?.trim() || null,
  );
  recordBrandEvent(workspaceId, id, userId, "brand.created", {});
  return getBrand(workspaceId, id);
}

export function recordBrandEvent(
  workspaceId: string,
  brandId: string,
  actorId: string | null,
  eventType: string,
  payload: unknown,
) {
  db.prepare(
    `INSERT INTO brand_events (id, workspace_id, brand_id, actor_id, event_type, payload)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), workspaceId, brandId, actorId, eventType, JSON.stringify(payload));
}

export function listBrands(
  workspaceId: string,
  query: { search?: string; limit?: number },
) {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const search = query.search?.trim();
  if (search) {
    const term = `%${search}%`;
    return db
      .prepare(
        `SELECT * FROM prospected_brands
         WHERE workspace_id = ?
           AND (display_name LIKE ? OR normalized_name LIKE ? OR instagram_handle LIKE ?)
         ORDER BY updated_at DESC LIMIT ?`,
      )
      .all(workspaceId, term, term, term, limit);
  }
  return db
    .prepare(
      `SELECT * FROM prospected_brands
       WHERE workspace_id = ?
       ORDER BY updated_at DESC LIMIT ?`,
    )
    .all(workspaceId, limit);
}

export function getBrand(workspaceId: string, brandId: string) {
  const brand = db
    .prepare(
      "SELECT * FROM prospected_brands WHERE id = ? AND workspace_id = ?",
    )
    .get(brandId, workspaceId);
  if (!brand) return null;
  const evidence = db
    .prepare(
      "SELECT * FROM brand_evidence WHERE brand_id = ? AND workspace_id = ? ORDER BY created_at DESC",
    )
    .all(brandId, workspaceId);
  const notes = db
    .prepare(
      `SELECT n.*, u.name AS author_name
       FROM curation_notes n INNER JOIN users u ON u.id = n.author_id
       WHERE n.brand_id = ? AND n.workspace_id = ?
       ORDER BY n.created_at DESC`,
    )
    .all(brandId, workspaceId);
  const assessments = db
    .prepare(
      `SELECT a.*, u.name AS author_name
       FROM fit_assessments a INNER JOIN users u ON u.id = a.created_by
       WHERE a.brand_id = ? AND a.workspace_id = ?
       ORDER BY a.created_at DESC`,
    )
    .all(brandId, workspaceId);
  const events = db
    .prepare(
      `SELECT e.*, u.name AS actor_name
       FROM brand_events e LEFT JOIN users u ON u.id = e.actor_id
       WHERE e.brand_id = ? AND e.workspace_id = ?
       ORDER BY e.created_at DESC LIMIT 50`,
    )
    .all(brandId, workspaceId);
  return { ...brand as object, evidence, notes, assessments, events };
}

export function addEvidence(
  workspaceId: string,
  brandId: string,
  userId: string,
  input: {
    sourceType: string;
    sourceUrl?: string;
    claim: string;
    excerpt?: string;
    confidence?: "low" | "medium" | "high";
  },
) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO brand_evidence
       (id, workspace_id, brand_id, source_type, source_url, claim, excerpt, confidence, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    workspaceId,
    brandId,
    input.sourceType.trim(),
    input.sourceUrl?.trim() || null,
    input.claim.trim(),
    input.excerpt?.trim() || null,
    input.confidence ?? "medium",
    userId,
  );
  recordBrandEvent(workspaceId, brandId, userId, "evidence.added", { evidenceId: id });
  return id;
}

export function addNote(
  workspaceId: string,
  brandId: string,
  userId: string,
  input: { body: string; noteType?: string; decisionAfterNote?: string },
) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO curation_notes
       (id, workspace_id, brand_id, author_id, note_type, body, decision_after_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    workspaceId,
    brandId,
    userId,
    input.noteType?.trim() || "observation",
    input.body.trim(),
    input.decisionAfterNote?.trim() || null,
  );
  recordBrandEvent(workspaceId, brandId, userId, "curation_note.added", { noteId: id });
  return id;
}

export function addAssessment(
  workspaceId: string,
  brandId: string,
  userId: string,
  input: { totalScore: number; dimensionScores: Record<string, number>; rationale: string },
) {
  const id = randomUUID();
  const band =
    input.totalScore >= 80
      ? "high"
      : input.totalScore >= 65
        ? "review_required"
        : input.totalScore >= 40
          ? "medium"
          : "low";
  db.prepare(
    `INSERT INTO fit_assessments
       (id, workspace_id, brand_id, total_score, dimension_scores, rationale, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    workspaceId,
    brandId,
    input.totalScore,
    JSON.stringify(input.dimensionScores),
    input.rationale.trim(),
    userId,
  );
  db.prepare(
    `UPDATE prospected_brands
     SET total_score = ?, score_band = ?, lifecycle_status = 'curation_review',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND workspace_id = ?`,
  ).run(input.totalScore, band, brandId, workspaceId);
  recordBrandEvent(workspaceId, brandId, userId, "fit_assessment.created", {
    assessmentId: id,
    totalScore: input.totalScore,
  });
  return id;
}

export function getDashboardSummary(workspaceId: string) {
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN lifecycle_status = 'curation_review' THEN 1 ELSE 0 END) AS review,
         SUM(CASE WHEN total_score IS NOT NULL THEN 1 ELSE 0 END) AS scored
       FROM prospected_brands WHERE workspace_id = ?`,
    )
    .get(workspaceId) as { total: number; review: number; scored: number };
  const evidence = db
    .prepare("SELECT COUNT(*) AS count FROM brand_evidence WHERE workspace_id = ?")
    .get(workspaceId) as { count: number };
  return {
    totalBrands: Number(totals.total ?? 0),
    needingReview: Number(totals.review ?? 0),
    scoredBrands: Number(totals.scored ?? 0),
    evidenceCount: Number(evidence.count ?? 0),
  };
}