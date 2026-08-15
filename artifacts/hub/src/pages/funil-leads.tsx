import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Loader2, AlertTriangle, Users, Clock, ShieldCheck, PhoneCall, Calendar, TrendingUp, XCircle, Megaphone } from "lucide-react";

interface FunnelBuckets {
  captado: number;
  sem_resposta: number;
  em_nutricao: number;
  em_resgate: number;
  em_atendimento: number;
  agendado: number;
  pipeline_vendas: number;
  perdido: number;
}

interface FunnelData {
  company_slug: string;
  buckets: FunnelBuckets;
  meta: {
    total_espelho: number;
    total_comercial: number;
    taxa_agendamento_pct: number;
    taxa_fechamento_pct: number;
    data_sources: string[];
  };
  generated_at: string;
}

const BUCKETS: {
  key: keyof FunnelBuckets;
  label: string;
  icon: typeof Users;
  color: string;
  bg: string;
  border: string;
  todo?: boolean;
}[] = [
  { key: "captado",        label: "Captado",         icon: Megaphone,    color: "#94a3b8", bg: "#1e293b", border: "#334155" },
  { key: "sem_resposta",   label: "Sem Resposta",    icon: Clock,        color: "#f59e0b", bg: "#451a03", border: "#f59e0b" },
  { key: "em_nutricao",    label: "Em Nutrição",     icon: RefreshCw,    color: "#a855f7", bg: "#2e1065", border: "#a855f7" },
  { key: "em_resgate",     label: "Em Resgate",      icon: AlertTriangle,color: "#ef4444", bg: "#450a0a", border: "#ef4444", todo: true },
  { key: "em_atendimento", label: "Em Atendimento",  icon: PhoneCall,    color: "#0ea5e9", bg: "#082f49", border: "#0ea5e9" },
  { key: "agendado",       label: "Agendado",        icon: Calendar,     color: "#22c55e", bg: "#052e16", border: "#22c55e" },
  { key: "pipeline_vendas",label: "Pipeline Vendas", icon: TrendingUp,   color: "#818cf8", bg: "#1e1b4b", border: "#818cf8" },
  { key: "perdido",        label: "Perdido",         icon: XCircle,      color: "#f87171", bg: "#2d1a1a", border: "#f87171" },
];

// ✅ VÁLIDO: este componente é explicitamente para o tenant r2pb (R2PB Confecções).
// Para suportar outros tenants no futuro, passar tenantSlug como prop e atualizar o título abaixo.
function LiveFunnel({ tenantSlug = "r2pb" }: { tenantSlug?: string }) {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery<FunnelData>({
    queryKey: ["lead-funnel", tenantSlug],
    queryFn: async () => {
      const r = await fetch(`/api/marketing/lead-funnel?company_slug=${encodeURIComponent(tenantSlug)}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{ background: "#0f172a", borderRadius: "12px", padding: "20px 24px", marginBottom: "28px", border: "1px solid #1e293b" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLoading ? "#f59e0b" : "#22c55e", boxShadow: `0 0 6px ${isLoading ? "#f59e0b" : "#22c55e"}` }} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9" }}>Funil ao Vivo — R2PB Confecções</span>
          </div>
          {updatedLabel && (
            <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
              Atualizado às {updatedLabel} · Fonte: leads_espelho + comercial_leads
            </div>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "4px 10px", color: "#94a3b8", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
        >
          {isLoading ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <RefreshCw style={{ width: 12, height: 12 }} />}
          Atualizar
        </button>
      </div>

      {isError && (
        <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#fca5a5", marginBottom: "12px" }}>
          ⚠️ Erro ao carregar dados. Verifique se a sessão está ativa.
        </div>
      )}

      {isLoading && !data && (
        <div style={{ display: "flex", justifyContent: "center", padding: "24px", color: "#475569", fontSize: "12px", gap: "8px", alignItems: "center" }}>
          <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
          Carregando dados reais...
        </div>
      )}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
            {BUCKETS.map(({ key, label, icon: Icon, color, bg, border, todo }) => (
              <div key={key} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "8px", padding: "10px 12px", position: "relative" }}>
                {todo && (
                  <div style={{ position: "absolute", top: "4px", right: "4px", fontSize: "8px", background: "#334155", color: "#64748b", padding: "1px 4px", borderRadius: "4px" }}>TODO</div>
                )}
                <Icon style={{ width: 14, height: 14, color, marginBottom: "6px" }} />
                <div style={{ fontSize: "22px", fontWeight: 900, color, lineHeight: 1 }}>
                  {data.buckets[key]}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ background: "#1e293b", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", color: "#94a3b8" }}>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>{data.meta.taxa_agendamento_pct}%</span> taxa de agendamento
            </div>
            <div style={{ background: "#1e293b", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", color: "#94a3b8" }}>
              <span style={{ color: "#818cf8", fontWeight: 700 }}>{data.meta.taxa_fechamento_pct}%</span> no pipeline ativo
            </div>
            <div style={{ background: "#1e293b", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", color: "#94a3b8" }}>
              <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{data.meta.total_espelho}</span> via WhatsApp ·{" "}
              <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{data.meta.total_comercial}</span> em atendimento humano
            </div>
            <div style={{ background: "#1e293b", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", color: "#64748b" }}>
              ⚠️ "Em Resgate" = 0 até MIRAGE_ZAPI_POSTFUNNEL_ROUTER logar eventos no DB
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function FunilLeads() {
  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: "#0f172a", color: "#e2e8f0", minHeight: "100vh", padding: "32px 24px" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .page { max-width: 1000px; margin: 0 auto; }
        h1 { font-size: 22px; font-weight: 700; color: #f8fafc; margin-bottom: 4px; text-align: center; }
        .subtitle { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 6px; }
        .blueprint-badge { display: inline-flex; align-items: center; gap: 6px; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 4px 12px; font-size: 11px; color: #94a3b8; margin: 0 auto 28px; display: flex; width: fit-content; }
        
        .section { margin-bottom: 28px; }
        .section-header { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #1e293b; }
        
        .legend { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8; }
        .ldot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }

        .stages-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
        .stage-col { display: flex; flex-direction: column; gap: 6px; }
        .stage-header { text-align: center; font-size: 10px; font-weight: 700; padding: 6px 4px; border-radius: 6px; line-height: 1.3; }

        .card { border-radius: 8px; padding: 8px 10px; font-size: 11px; border: 1px solid transparent; }
        .card .cn { font-weight: 700; margin-bottom: 3px; font-size: 11px; }
        .card .cd { font-size: 10px; opacity: 0.8; line-height: 1.4; }
        .card .ct { display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 10px; margin-top: 4px; }

        .c-auto { background: #14532d; border-color: #22c55e; }
        .c-auto .ct { background: #22c55e; color: #052e16; }
        .c-manual { background: #451a03; border-color: #f59e0b; }
        .c-manual .ct { background: #f59e0b; color: #1c0700; }
        .c-gap { background: #450a0a; border-color: #ef4444; }
        .c-gap .ct { background: #ef4444; color: #fff; }
        .c-pending { background: #2e1065; border-color: #a855f7; }
        .c-pending .ct { background: #a855f7; color: #fff; }
        .c-planned { background: #0c1a2e; border-color: #3b82f6; }
        .c-planned .ct { background: #3b82f6; color: #fff; }

        .resp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .resp-col { border-radius: 8px; padding: 12px; }
        .resp-col .rh { font-size: 12px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .resp-col ul { list-style: none; display: flex; flex-direction: column; gap: 5px; }
        .resp-col li { font-size: 11px; opacity: 0.85; display: flex; align-items: flex-start; gap: 5px; line-height: 1.4; }
        .resp-col li::before { content: '→'; flex-shrink: 0; opacity: 0.5; }

        .r-helena { background: #1e1a3a; border: 1px solid #7c3aed; }
        .r-helena .rh { color: #c4b5fd; }
        .r-n8n { background: #1a2e1a; border: 1px solid #16a34a; }
        .r-n8n .rh { color: #86efac; }
        .r-hub { background: #1e293b; border: 1px solid #0ea5e9; }
        .r-hub .rh { color: #7dd3fc; }
        .r-human { background: #2d1a1a; border: 1px solid #f87171; }
        .r-human .rh { color: #fca5a5; }

        .gaps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .gap-item { background: #450a0a; border: 1px dashed #ef4444; border-radius: 8px; padding: 10px 12px; }
        .gap-item .gi-title { font-size: 12px; font-weight: 700; color: #fca5a5; margin-bottom: 4px; }
        .gap-item .gi-desc { font-size: 11px; color: #fecaca; line-height: 1.4; }

        .priorities { display: flex; flex-direction: column; gap: 8px; }
        .priority-item { display: flex; gap: 12px; align-items: flex-start; background: #1e293b; border-radius: 8px; padding: 12px 14px; border-left: 3px solid; }
        .priority-item .pn { font-size: 18px; font-weight: 900; opacity: 0.6; flex-shrink: 0; min-width: 24px; }
        .priority-item .pt { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
        .priority-item .pd { font-size: 11px; opacity: 0.75; line-height: 1.4; }
        .priority-item .pr { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; margin-top: 5px; display: inline-block; }

        @media (max-width: 750px) {
          .stages-grid { grid-template-columns: repeat(2, 1fr); }
          .resp-grid { grid-template-columns: 1fr 1fr; }
          .gaps-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page">
        <h1>Funil Comercial — R2PB Confecções</h1>
        <p className="subtitle">Dados ao vivo · Blueprint estratégico · Gaps · Prioridades</p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <div className="blueprint-badge">🏢 R2PB · Dados via leads_espelho + comercial_leads · Atualiza a cada 60s</div>
        </div>

        {/* PAINEL VIVO */}
        <LiveFunnel tenantSlug="r2pb" />

        {/* LEGENDA */}
        <div className="section">
          <div className="section-header">📋 Blueprint — Estado do Funil (Julho 2026)</div>
          <div className="legend">
            <div className="legend-item"><div className="ldot" style={{ background: "#22c55e" }} /> Automatizado hoje</div>
            <div className="legend-item"><div className="ldot" style={{ background: "#f59e0b" }} /> Manual (sem automação)</div>
            <div className="legend-item"><div className="ldot" style={{ background: "#ef4444" }} /> Gap crítico (inexistente)</div>
            <div className="legend-item"><div className="ldot" style={{ background: "#a855f7" }} /> Pendente (infra pronta, falta Z-API)</div>
            <div className="legend-item"><div className="ldot" style={{ background: "#3b82f6" }} /> Planejado (ainda não construído)</div>
          </div>
        </div>

        {/* ESTADO ATUAL */}
        <div className="section">
          <div className="section-header">⚙️ Estado Atual — O que existe hoje por etapa do funil</div>
          <div className="stages-grid">

            <div className="stage-col">
              <div className="stage-header" style={{ background: "#1e293b", color: "#94a3b8" }}>📥 Captação</div>
              <div className="card c-auto">
                <div className="cn">WhatsApp Orgânico</div>
                <div className="cd">Lead chega pelo canal e o robô nativo do Helena atende</div>
                <span className="ct">✅ Ativo</span>
              </div>
              <div className="card c-gap">
                <div className="cn">Rastreio de origem</div>
                <div className="cd">Sem identificação de campanha/fonte do lead</div>
                <span className="ct">🚨 Inexistente</span>
              </div>
            </div>

            <div className="stage-col">
              <div className="stage-header" style={{ background: "#1e293b", color: "#94a3b8" }}>🤖 Qualificação</div>
              <div className="card c-auto">
                <div className="cn">Robô Helena</div>
                <div className="cd">Perguntas de filtro automáticas via bot nativo</div>
                <span className="ct">✅ Ativo</span>
              </div>
              <div className="card c-gap">
                <div className="cn">Lead perdido no bot</div>
                <div className="cd">Não completou fluxo, bot encerra, ninguém retoma</div>
                <span className="ct">🚨 Gap Crítico</span>
              </div>
              <div className="card c-manual">
                <div className="cn">Criação de card</div>
                <div className="cd">Entrada no pipeline é manual após qualificação</div>
                <span className="ct">⚠️ Manual</span>
              </div>
            </div>

            <div className="stage-col">
              <div className="stage-header" style={{ background: "#1e293b", color: "#94a3b8" }}>🔄 Reativação</div>
              <div className="card c-gap">
                <div className="cn">Sequência Nutrição</div>
                <div className="cd">Leads entram em Nutrição mas não recebem mensagens</div>
                <span className="ct">🚨 Inexistente</span>
              </div>
              <div className="card c-gap">
                <div className="cn">Promoção Nutrição→Vendas</div>
                <div className="cd">Lead maduro não volta ao funil ativo automaticamente</div>
                <span className="ct">🚨 Inexistente</span>
              </div>
            </div>

            <div className="stage-col">
              <div className="stage-header" style={{ background: "#1e293b", color: "#94a3b8" }}>📅 Agendamento</div>
              <div className="card c-auto">
                <div className="cn">Link Google Calendar</div>
                <div className="cd">Robô envia link de agendamento ao lead qualificado</div>
                <span className="ct">✅ Ativo</span>
              </div>
              <div className="card c-pending">
                <div className="cn">Confirmação via WhatsApp</div>
                <div className="cd">Infraestrutura pronta (Google Calendar → n8n → Hub), falta credencial Z-API</div>
                <span className="ct">🟣 Pendente</span>
              </div>
              <div className="card c-gap">
                <div className="cn">Lembrete 1h antes</div>
                <div className="cd">Sem envio automático de lembrete antes da call</div>
                <span className="ct">🚨 Inexistente</span>
              </div>
            </div>

            <div className="stage-col">
              <div className="stage-header" style={{ background: "#1e293b", color: "#94a3b8" }}>💼 Reunião / Fechamento</div>
              <div className="card c-manual">
                <div className="cn">Movimentação de card</div>
                <div className="cd">Humano move card entre etapas manualmente</div>
                <span className="ct">⚠️ Manual</span>
              </div>
              <div className="card c-auto">
                <div className="cn">GANHO → Pós-Vendas</div>
                <div className="cd">Duplica card e dispara n8n automaticamente</div>
                <span className="ct">✅ Automático</span>
              </div>
              <div className="card c-auto">
                <div className="cn">PERDIDO → Nutrição</div>
                <div className="cd">Duplica card e dispara n8n automaticamente</div>
                <span className="ct">✅ Automático</span>
              </div>
            </div>

            <div className="stage-col">
              <div className="stage-header" style={{ background: "#1e293b", color: "#94a3b8" }}>🎉 Pós-Venda</div>
              <div className="card c-auto">
                <div className="cn">Entrada automática</div>
                <div className="cd">Recebe cards GANHO do Vendas PRO</div>
                <span className="ct">✅ Automático</span>
              </div>
              <div className="card c-manual">
                <div className="cn">Acompanhamento</div>
                <div className="cd">Sem mensagens automáticas de satisfação/retenção</div>
                <span className="ct">⚠️ Manual</span>
              </div>
              <div className="card c-auto">
                <div className="cn">Feedback → Nutrição</div>
                <div className="cd">Redireciona card automaticamente após avaliação</div>
                <span className="ct">✅ Automático</span>
              </div>
            </div>

          </div>
        </div>

        {/* ESTADO IDEAL */}
        <div className="section">
          <div className="section-header">🎯 Estado Ideal — Arquitetura híbrida por camada</div>
          <div className="resp-grid">
            <div className="resp-col r-helena">
              <div className="rh">🤖 IA Helena (Bot Nativo)</div>
              <ul>
                <li>Qualificação inicial conversacional</li>
                <li>Resgate de lead parado no bot</li>
                <li>Triagem e roteamento para pipeline correto</li>
                <li>Follow-up de leads não responsivos</li>
                <li>Reativação de leads em Nutrição</li>
                <li>Coleta de feedback pós-reunião</li>
              </ul>
            </div>
            <div className="resp-col r-n8n">
              <div className="rh">⚙️ n8n (Orquestrador)</div>
              <ul>
                <li>Criar card no pipeline correto após qualificação</li>
                <li>Confirmação de reunião via WhatsApp (Z-API)</li>
                <li>Lembrete de call 1h antes</li>
                <li>Mover cards entre etapas por gatilho</li>
                <li>Sequência de nutrição automática</li>
                <li>Promoção Nutrição → Vendas</li>
              </ul>
            </div>
            <div className="resp-col r-hub">
              <div className="rh">🖥️ Mirage Hub</div>
              <ul>
                <li>Registro de leads_espelho (WhatsApp + e-mail)</li>
                <li>Endpoints internos para lookup e marcação</li>
                <li>Painel operacional do funil (este painel)</li>
                <li>Relatórios de conversão por pipeline</li>
                <li>Histórico de automações executadas</li>
              </ul>
            </div>
            <div className="resp-col r-human">
              <div className="rh">👤 Humano / Comercial</div>
              <ul>
                <li>Conduzir a call de vendas</li>
                <li>Aprovar proposta e fechar contrato</li>
                <li>Autorizar OAuth (Google, WhatsApp) uma vez</li>
                <li>Revisão de leads bloqueados ou sem classificação</li>
                <li>Decisões estratégicas de produto e pricing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* GAPS */}
        <div className="section">
          <div className="section-header">🚨 Gaps Críticos — O que está faltando hoje</div>
          <div className="gaps-grid">
            <div className="gap-item">
              <div className="gi-title">Lead perdido no bot sem resgate</div>
              <div className="gi-desc">Bot encerra e ninguém retoma. Lead fica sem resposta. Sem trigger de reengajamento configurado.</div>
            </div>
            <div className="gap-item">
              <div className="gi-title">Criação de card 100% manual</div>
              <div className="gi-desc">Nenhum pipeline tem criação automática de card após qualificação do bot. Depende de operador humano.</div>
            </div>
            <div className="gap-item">
              <div className="gi-title">Confirmação de reunião sem WhatsApp</div>
              <div className="gi-desc">Infraestrutura construída e testada, mas bloqueada por credencial Z-API ainda não contratada diretamente.</div>
            </div>
            <div className="gap-item">
              <div className="gi-title">Vendas Starter e Nutrição sem automação</div>
              <div className="gi-desc">Mirage não processa eventos desses pipelines. Sem mensagens, sem movimentação automática de cards.</div>
            </div>
            <div className="gap-item">
              <div className="gi-title">IA Helena subutilizada</div>
              <div className="gi-desc">Bot nativo do Helena usado apenas na qualificação inicial. Potencial de resgate, reativação e nutrição não explorado.</div>
            </div>
            <div className="gap-item">
              <div className="gi-title">"Em Resgate" sem tracking no DB</div>
              <div className="gi-desc">Mensagens de rescue são enviadas pelo MIRAGE_ZAPI_POSTFUNNEL_ROUTER mas não salvas no banco. Bucket sempre mostra 0 até isso ser implementado.</div>
            </div>
          </div>
        </div>

        {/* PRIORIDADES */}
        <div className="section">
          <div className="section-header">📌 Sequência de Implementação Recomendada</div>
          <div className="priorities">
            <div className="priority-item" style={{ borderColor: "#ef4444" }}>
              <div className="pn" style={{ color: "#ef4444" }}>1</div>
              <div>
                <div className="pt">Credencial Z-API — desbloquear confirmação de reunião</div>
                <div className="pd">Contratar instância Z-API diretamente (z-api.io) com o número da operação. Passar Instance ID + Token para ATHOS configurar o node no n8n. Desbloqueia confirmação de reunião, lembrete 1h antes e follow-up de não-comparecimento.</div>
                <span className="pr" style={{ background: "#ef4444", color: "#fff" }}>🔑 Responsável: Clóvis (externo)</span>
              </div>
            </div>
            <div className="priority-item" style={{ borderColor: "#f59e0b" }}>
              <div className="pn" style={{ color: "#f59e0b" }}>2</div>
              <div>
                <div className="pt">Tracking de eventos rescue/nurture no DB</div>
                <div className="pd">MIRAGE_ZAPI_POSTFUNNEL_ROUTER registrar cada envio de mensagem na tabela leads_espelho ou em tabela própria de eventos. Isso preenche o bucket "Em Resgate" com dado real.</div>
                <span className="pr" style={{ background: "#f59e0b", color: "#1c0700" }}>🔧 Responsável: Replit Agent + ATHOS</span>
              </div>
            </div>
            <div className="priority-item" style={{ borderColor: "#7c3aed" }}>
              <div className="pn" style={{ color: "#7c3aed" }}>3</div>
              <div>
                <div className="pt">Playbook de resgate de lead perdido no bot</div>
                <div className="pd">IA Helena detecta leads inativos no bot → envia mensagem de reengajamento. n8n monitora e escala para humano se sem resposta em X horas. Resolve o principal ponto de perda de leads hoje.</div>
                <span className="pr" style={{ background: "#7c3aed", color: "#fff" }}>🤖 Responsável: ATHOS + IA Helena</span>
              </div>
            </div>
            <div className="priority-item" style={{ borderColor: "#16a34a" }}>
              <div className="pn" style={{ color: "#16a34a" }}>4</div>
              <div>
                <div className="pt">Automação de criação de card e movimentação</div>
                <div className="pd">n8n cria card no pipeline correto após qualificação do bot (PRO, Starter ou Nutrição). Automações de mudança de etapa por trigger. Ativa também Vendas Starter e Nutrição no Mirage.</div>
                <span className="pr" style={{ background: "#16a34a", color: "#fff" }}>⚙️ Responsável: ATHOS + n8n + Replit Agent</span>
              </div>
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#1e293b", fontSize: "11px", marginTop: "24px", paddingBottom: "16px" }}>
          Funil operacional ao vivo + Blueprint estratégico · Mirage Hub · R2PB Confecções · Julho 2026
        </p>
      </div>
    </div>
  );
}
