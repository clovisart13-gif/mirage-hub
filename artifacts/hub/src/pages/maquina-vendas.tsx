import { CheckCircle2, AlertCircle, Clock, XCircle, Zap, Users, Calendar, MessageCircle, RotateCcw, ArrowRight } from "lucide-react";

type StatusType = "ok" | "parcial" | "pendente" | "nao_homologado";

const STATUS_CONFIG: Record<StatusType, { label: string; color: string; bg: string; border: string; dot: string }> = {
  ok:              { label: "Operacional",      color: "#22c55e", bg: "rgba(34,197,94,.1)",   border: "rgba(34,197,94,.25)",   dot: "#22c55e" },
  parcial:         { label: "Em ajuste",        color: "#f59e0b", bg: "rgba(245,158,11,.1)",  border: "rgba(245,158,11,.25)",  dot: "#f59e0b" },
  pendente:        { label: "Pendente",         color: "#ef4444", bg: "rgba(239,68,68,.1)",   border: "rgba(239,68,68,.25)",   dot: "#ef4444" },
  nao_homologado:  { label: "Não homologado",   color: "#ef4444", bg: "rgba(239,68,68,.1)",   border: "rgba(239,68,68,.25)",   dot: "#ef4444" },
};

function StatusBadge({ status }: { status: StatusType }) {
  const s = STATUS_CONFIG[status];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
}

function StatusDot({ status, size = 8 }: { status: StatusType; size?: number }) {
  const s = STATUS_CONFIG[status];
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: s.dot, flexShrink: 0,
      boxShadow: status === "ok" ? `0 0 6px ${s.dot}80` : undefined,
    }} />
  );
}

const ETAPAS: {
  num: string;
  title: string;
  desc: string;
  status: StatusType;
  icon: typeof Zap;
}[] = [
  { num: "01", title: "Entrada de leads", icon: Users,
    desc: "Leads chegam via anúncios, formulários, DM e WhatsApp. Centralizados no CRM Helena + leads_espelho (Hub interno).",
    status: "ok" },
  { num: "02", title: "Qualificação e triagem", icon: ArrowRight,
    desc: "Robô coleta nome, email e WhatsApp. Envia link de agendamento. Dados gravados em leads_espelho no momento do envio.",
    status: "ok" },
  { num: "03", title: "Confirmação de reunião", icon: Calendar,
    desc: "Google Calendar (diagnosticor2pb@gmail.com) é a fonte de verdade. Workflow R2PB_CALL_CONFIRMATION_AND_REMINDER_ZAPI detecta o evento, localiza o WhatsApp via by-email e envia a confirmação.",
    status: "ok" },
  { num: "04", title: "Lembrete 1h antes", icon: Clock,
    desc: "Lógica de lembrete mapeada no workflow mas ainda sem validação end-to-end. Próximo item do backlog.",
    status: "pendente" },
  { num: "05", title: "Recuperação de leads", icon: RotateCcw,
    desc: "Leads que receberam o link mas não agendaram detectados via pending-followup. Endpoint construído, validação no fluxo real pendente.",
    status: "parcial" },
  { num: "06", title: "Inbound automático", icon: MessageCircle,
    desc: "Respostas a mensagens inbound ('olá', fora do fluxo de agendamento) ainda não homologadas — comportamento inconsistente.",
    status: "nao_homologado" },
  { num: "07", title: "Handoff para humano", icon: Users,
    desc: "Lead qualificado vai para atendimento humano. Contexto disponível no CRM Helena. Transição ainda manual.",
    status: "parcial" },
];

const INFRA: { label: string; note: string; status: StatusType }[] = [
  { label: "Mirage Hub",        note: "API + frontend operacionais",          status: "ok" },
  { label: "n8n",               note: "50 workflows — confirmação ativa",     status: "ok" },
  { label: "Z-API (WhatsApp)",  note: "Mensagens enviando normalmente",       status: "ok" },
  { label: "Google Calendar",   note: "diagnosticor2pb — fonte de verdade",   status: "ok" },
  { label: "CRM Helena",        note: "Pipeline Vendas PRO conectada",        status: "ok" },
  { label: "Growth OS",         note: "Estrutura criada, em consolidação",    status: "parcial" },
  { label: "Campaign Factory",  note: "R2PB_CAMPAIGN_FACTORY_DB_V2 ativo",   status: "parcial" },
  { label: "Midjourney",        note: "Bloqueado — infra Discord pendente",   status: "pendente" },
];

const PENDENTES = [
  "Lembrete 1h antes da reunião — fechar end-to-end",
  "Inbound automático ('olá') — homologar fluxo",
  "Máquina de vendas ponta a ponta — validação confiável",
  "Growth OS — consolidação operacional",
  "Midjourney — aguardando infraestrutura Discord/ponte",
];

const FUNCIONANDO = [
  "Hub Mirage operacional e multi-tenant",
  "Confirmação de reunião via Google Calendar → WhatsApp",
  "leads_espelho — registro de leads com link enviado",
  "Endpoints internos de lead (mirror, by-email, mark-agendado)",
  "Campaign Factory n8n — geração de campanha ativa",
  "ATHOS Mentor — mentor cognitivo estratégico ativo",
];

const STATUS_GERAL: { label: string; value: string; note: string; status: StatusType }[] = [
  { label: "Hub Mirage",          value: "Operacional",      note: "Multi-tenant ativo, R2PB validando",                    status: "ok" },
  { label: "Funil confirmação",   value: "Parcial",          note: "Confirmação OK — lembrete 1h pendente",                 status: "parcial" },
  { label: "Inbound automático",  value: "Não homologado",   note: "Respostas 'olá' sem validação end-to-end",              status: "nao_homologado" },
  { label: "Growth OS",           value: "Em recuperação",   note: "Estrutura existe, não está confiável ponta a ponta",    status: "parcial" },
];

const s = {
  page: { background: "#0a0f1e", minHeight: "100vh", padding: "32px 24px 64px", color: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" } as React.CSSProperties,
  inner: { maxWidth: 960, margin: "0 auto" } as React.CSSProperties,
  header: { marginBottom: 36, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const },
  label: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "#818cf8", marginBottom: 6 },
  h1: { fontSize: "clamp(22px,3vw,30px)", fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 13, color: "#94a3b8" },
  sectionTitle: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "#64748b", marginBottom: 12 },
  card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 },
};

export default function MaquinaVendasPage() {
  const now = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* HEADER */}
        <div style={s.header}>
          <div>
            <div style={s.label}>Painel Estratégico · Administrador</div>
            <h1 style={s.h1}>Máquina de Vendas, Marketing &amp; Growth</h1>
            <div style={s.sub}>Visão operacional do ecossistema — R2PB como laboratório fundador</div>
          </div>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>
            {now}
          </div>
        </div>

        {/* STATUS GERAL */}
        <div style={{ marginBottom: 28 }}>
          <div style={s.sectionTitle}>Status geral</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            {STATUS_GERAL.map(item => (
              <div key={item.label} style={{ ...s.card, padding: "18px 20px" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: STATUS_CONFIG[item.status].color, marginBottom: 4 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LEGENDA */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "12px 16px", background: "#1e293b", borderRadius: 10, marginBottom: 28 }}>
          {(["ok","parcial","pendente","nao_homologado"] as StatusType[]).map(st => (
            <div key={st} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
              <StatusDot status={st} />
              {STATUS_CONFIG[st].label}
            </div>
          ))}
        </div>

        {/* ETAPAS */}
        <div style={{ marginBottom: 28 }}>
          <div style={s.sectionTitle}>Etapas da máquina de vendas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ETAPAS.map(et => {
              const Icon = et.icon;
              return (
                <div key={et.num} style={{ ...s.card, padding: "16px 20px", display: "grid", gridTemplateColumns: "36px 1fr auto", alignItems: "start", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e293b", border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#64748b", flexShrink: 0 }}>
                    {et.num}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{et.title}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{et.desc}</div>
                  </div>
                  <StatusBadge status={et.status} />
                </div>
              );
            })}
          </div>
        </div>

        {/* INFRAESTRUTURA */}
        <div style={{ marginBottom: 28 }}>
          <div style={s.sectionTitle}>Infraestrutura conectada</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
            {INFRA.map(item => (
              <div key={item.label} style={{ ...s.card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <StatusDot status={item.status} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PENDÊNCIAS + FUNCIONANDO */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 28 }}>
          <div style={{ ...s.card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <XCircle size={16} color="#ef4444" />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Pendente</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PENDENTES.map(p => (
                <div key={p} style={{ display: "flex", gap: 8, fontSize: 13, color: "#94a3b8" }}>
                  <span style={{ color: "#6366f1", flexShrink: 0 }}>→</span>
                  {p}
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...s.card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Funcionando</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FUNCIONANDO.map(p => (
                <div key={p} style={{ display: "flex", gap: 8, fontSize: 13, color: "#94a3b8" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span>
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOCO ESTRATÉGICO */}
        <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,.1) 0%,rgba(168,85,247,.07) 100%)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 14, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertCircle size={16} color="#818cf8" />
            <span style={{ fontSize: 14, fontWeight: 800, color: "#818cf8" }}>Foco estratégico atual</span>
          </div>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8, marginBottom: 10 }}>
            O problema principal hoje <strong style={{ color: "#f1f5f9" }}>não é ausência de produto</strong>. O produto existe, a infraestrutura existe.
          </p>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8, marginBottom: 10 }}>
            O problema é <strong style={{ color: "#f1f5f9" }}>instabilidade na camada de Growth e automação</strong>. O Growth está em recuperação, não em operação madura.
          </p>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8 }}>
            Foco correto: <strong style={{ color: "#f1f5f9" }}>R2PB primeiro</strong> — consolidar o modelo operacional real antes de replicar para outros assinantes.
          </p>
        </div>

      </div>
    </div>
  );
}
