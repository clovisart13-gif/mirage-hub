import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `Você é o assistente comercial do Mirage Hub — software de gestão para confecções brasileiras.

Seu papel: explicar o produto, responder dúvidas, quebrar objeções e orientar o lead para iniciar o teste gratuito ou conversar com a equipe.

## Sobre o Mirage Hub
- Software de gestão completo para confecção brasileira
- Nasceu de operação real de confecção — não é teoria, é produto validado em uso prático
- Lançamento oficial: 01/07/2025 com fase fundadora (vagas limitadas)

## Módulos disponíveis no TRIAL GRATUITO (ativação imediata, sem cartão):
1. **Kanban de Produção** — 14 fases, controle total de OPs em tempo real
2. **PLM — Desenvolvimento** — fichas técnicas, modelagem, pilotagem, aprovação
3. **Custos e Orçamentos** — ficha de custo, margem real, envio por e-mail
4. **Relatórios e BI** — dashboard gerencial, exportação Excel
5. **Comunidade Moda Conecta** — rede B2B, fornecedores verificados

## Módulos com ATIVAÇÃO MANUAL (não estão no trial padrão):
- **CRM** — robô SDR no WhatsApp (requer configuração específica)
- **ERP** — financeiro, estoque, fiscal e NF-e (integração VhSys, requer onboarding)

## Planos
- Starter: R$ 197/mês — Kanban + Custos
- Pro: R$ 397/mês — Kanban + Custos + Moda Conecta + CRM
- Enterprise: R$ 797/mês — Tudo + suporte prioritário + usuários ilimitados
- 14 dias grátis em qualquer plano, sem cartão de crédito

## Fase Fundadora
- Entrada acompanhada pela equipe, do onboarding aos primeiros resultados
- Condições especiais de contrato e precificação
- Vagas limitadas — lançamento 01/07

## Objeções e respostas:
- "Já funciona?" → Sim, está rodando em operação real. Não é MVP.
- "É muito complexo?" → Não. Implantação guiada, focada no que gera valor primeiro.
- "Serve para minha empresa?" → Se é confecção, o Mirage foi desenhado para isso.
- "Por que agora?" → O produto nasceu de dor real e já está validado em produção.
- "Acompanham a entrada?" → Sim, a fase fundadora prevê entrada próxima e acompanhada.

## Como agir:
- Seja direto e objetivo. Máximo 3 parágrafos por resposta.
- Se o lead estiver pronto para testar: sugira "/comecar" para o trial gratuito.
- Se a dúvida for sobre CRM ou ERP com volume grande: sugira falar com a equipe.
- Nunca cite preços especiais sem que o lead pergunte.
- Tom: profissional, sem enrolação, português brasileiro, B2B SaaS premium.
- Nunca mencione concorrentes. Nunca faça promessas que não estão no produto.`;

// ── Rate limiting: 5 req/min per IP + 200 req/min global cap ─────────────────
const perIpCounts = new Map<string, { count: number; resetAt: number }>();
let globalCount = 0;
let globalResetAt = 0;

const PER_IP_MAX   = 5;
const PER_IP_WIN   = 60_000;
const GLOBAL_MAX   = 200;
const GLOBAL_WIN   = 60_000;

function checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();

  // Global bucket
  if (now > globalResetAt) { globalCount = 0; globalResetAt = now + GLOBAL_WIN; }
  if (globalCount >= GLOBAL_MAX) return { allowed: false, reason: "global" };
  globalCount++;

  // Per-IP bucket
  const entry = perIpCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    perIpCounts.set(ip, { count: 1, resetAt: now + PER_IP_WIN });
  } else {
    if (entry.count >= PER_IP_MAX) return { allowed: false, reason: "ip" };
    entry.count++;
  }

  return { allowed: true };
}

// Prune stale IP entries every 5 min to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of perIpCounts) {
    if (now > entry.resetAt) perIpCounts.delete(ip);
  }
}, 5 * 60_000);

// ── Allowed origins for the public assistant ──────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://www.gestaomirage.com.br",
  "https://gestaomirage.com.br",
  "https://c319ab3b-a8c0-4451-90e5-a003b5f268d0-00-2opuobqqv1lhw.worf.replit.dev",
]);

router.post("/mirage/assistant", async (req, res) => {
  // Origin check — reject requests from unknown origins
  const origin = req.headers["origin"] as string | undefined;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    res.status(403).json({ error: "Origin não autorizado" });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    res.status(429).json({ error: "Muitas requisições. Aguarde um momento." });
    return;
  }

  const { message, history = [] } = req.body as {
    message?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  const trimmed = message?.trim();
  if (!trimmed) {
    res.status(400).json({ error: "message é obrigatório" });
    return;
  }

  // Hard limit on message length
  if (trimmed.length > 500) {
    res.status(400).json({ error: "Mensagem muito longa (máx. 500 caracteres)." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const safeHistory = (history || [])
      .slice(-6)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 800) }));

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 400,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...safeHistory,
        { role: "user", content: trimmed.slice(0, 500) },
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch {
    res.write(`data: ${JSON.stringify({ error: "Erro ao processar sua pergunta. Tente novamente." })}\n\n`);
    res.end();
  }
});

export default router;
