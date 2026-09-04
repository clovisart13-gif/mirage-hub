import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
// Auth opcional: se GPTMAKER_MCP_SECRET ou MARKETING_INTERNAL_API_KEY estiver
// definido, valida o Bearer token. Se não estiver configurado, ou se nenhum
// Authorization header for enviado, deixa passar (GPTMaker usa "Sem autenticação").
function requireMcpAuth(req: Request, res: Response, next: () => void) {
  const secret = process.env.GPTMAKER_MCP_SECRET ?? process.env.MARKETING_INTERNAL_API_KEY;

  // Sem secret configurado OU sem header enviado → acesso livre (dados não-sensíveis)
  const auth = req.headers.authorization ?? "";
  if (!secret || !auth) { next(); return; }

  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (token !== secret) {
    res.status(401).json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } });
    return;
  }
  next();
}

// ── MCP Streamable HTTP endpoint ──────────────────────────────────────────────
// Implementa o protocolo MCP (JSON-RPC 2.0 over HTTP) versão 2024-11-05.
// Referência: https://modelcontextprotocol.io/specification/2024-11-05/basic/transports
//
// Ferramentas expostas:
//   • verificar_controle_humano(phone, tenant_id?) → { human_in_control, agent_name, instruction }
//
router.post("/mcp", requireMcpAuth, async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");

  const body = req.body as Record<string, unknown>;
  const id = body.id ?? null;
  const method = (body.method as string) ?? "";
  const params = (body.params as Record<string, unknown>) ?? {};

  logger.info({ method, id }, "mcp: request received");

  // ── initialize ────────────────────────────────────────────────────────────
  if (method === "initialize") {
    res.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "mirage-hub", version: "1.0.0" },
      },
    });
    return;
  }

  // ── notifications/initialized (client ACK — sem resposta) ─────────────────
  if (method === "notifications/initialized") {
    res.status(204).end();
    return;
  }

  // ── tools/list ────────────────────────────────────────────────────────────
  if (method === "tools/list") {
    res.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "verificar_controle_humano",
            description:
              "Verifica se um agente humano está atendendo este lead agora. " +
              "CHAME ESTA FERRAMENTA ANTES DE CADA RESPOSTA. " +
              "Se human_in_control for true, NÃO responda e encerre silenciosamente. " +
              "O telefone do lead está disponível no contexto da conversa como contactPhone ou phone — use exatamente esse valor.",
            inputSchema: {
              type: "object",
              properties: {
                phone: {
                  type: "string",
                  description: "Número de telefone do lead — use o valor de contactPhone disponível no contexto da conversa (ex: 5511999998888)",
                },
                tenant_id: {
                  type: "string",
                  description: "Slug do tenant. Use 'r2pb' se não souber.",
                },
              },
              required: ["phone"],
            },
          },
          {
            name: "registrar_qualificacao",
            description:
              "Registra o resultado da qualificação do lead (PRO, nao_pro, vip, reuniao_marcada). " +
              "Chame ao final da qualificação antes de transferir ou encerrar.",
            inputSchema: {
              type: "object",
              properties: {
                phone: { type: "string", description: "Telefone do lead" },
                resultado: {
                  type: "string",
                  enum: ["pro", "nao_pro", "vip", "reuniao_marcada"],
                  description: "Resultado da qualificação",
                },
                volume: { type: "number", description: "Volume de peças informado pelo lead" },
                investimento: { type: "number", description: "Investimento previsto em R$" },
                publico_alvo: { type: "string", description: "Público-alvo da marca do lead" },
                tenant_id: { type: "string", description: "Slug do tenant. Use 'r2pb'." },
              },
              required: ["phone", "resultado"],
            },
          },
        ],
      },
    });
    return;
  }

  // ── tools/call ────────────────────────────────────────────────────────────
  if (method === "tools/call") {
    const toolName = (params.name as string) ?? "";
    const args = (params.arguments as Record<string, unknown>) ?? {};

    // ── verificar_controle_humano ──────────────────────────────────────────
    if (toolName === "verificar_controle_humano") {
      const phone = String(args.phone ?? "").replace(/\D/g, "");
      const tenantId = String(args.tenant_id ?? "r2pb");

      if (!phone) {
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify({ human_in_control: false, error: "phone ausente" }) }],
          },
        });
        return;
      }

      try {
        const altPhone = phone.startsWith("55") ? phone.slice(2) : "55" + phone;
        const rows = await db.execute(
          sql`SELECT human_in_control, human_agent_name
              FROM lead_conversation_state
              WHERE tenant_id = ${tenantId}
                AND phone IN (${phone}, ${altPhone})
              LIMIT 1`
        );

        const row = (rows.rows[0] as Record<string, unknown>) ?? {};
        const humanInControl = Boolean(row.human_in_control ?? false);
        const agentName = (row.human_agent_name as string) ?? null;

        const payload = {
          human_in_control: humanInControl,
          agent_name: agentName,
          instruction: humanInControl
            ? "⛔ PARE. Um agente humano está atendendo este lead agora. NÃO responda. Encerre silenciosamente."
            : "✅ Nenhum humano no controle. Você pode responder normalmente.",
        };

        logger.info({ phone, tenantId, humanInControl, agentName }, "mcp: verificar_controle_humano");

        res.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(payload) }] },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ phone, tenantId, error: msg }, "mcp: erro ao verificar_controle_humano");
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({ human_in_control: false, error: msg }),
            }],
          },
        });
      }
      return;
    }

    // ── registrar_qualificacao ─────────────────────────────────────────────
    if (toolName === "registrar_qualificacao") {
      const phone = String(args.phone ?? "").replace(/\D/g, "");
      const tenantId = String(args.tenant_id ?? "r2pb");
      const resultado = String(args.resultado ?? "");
      const volume = args.volume != null ? Number(args.volume) : null;
      const investimento = args.investimento != null ? Number(args.investimento) : null;
      const publicoAlvo = args.publico_alvo != null ? String(args.publico_alvo) : null;

      try {
        await db.execute(sql`
          INSERT INTO lead_conversation_state
            (id, tenant_id, phone, conversation_status, updated_at)
          VALUES
            (gen_random_uuid(), ${tenantId}, ${phone}, ${resultado}, NOW())
          ON CONFLICT (tenant_id, phone)
          DO UPDATE SET
            conversation_status = ${resultado},
            updated_at = NOW()
        `);

        logger.info({ phone, tenantId, resultado, volume, investimento, publicoAlvo }, "mcp: qualificação registrada");

        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({ success: true, phone, resultado }),
            }],
          },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ phone, tenantId, error: msg }, "mcp: erro ao registrar_qualificacao");
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }) }],
          },
        });
      }
      return;
    }

    // Ferramenta desconhecida
    res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Ferramenta não encontrada: ${toolName}` },
    });
    return;
  }

  // Método desconhecido
  res.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Método não encontrado: ${method}` },
  });
});

export default router;
