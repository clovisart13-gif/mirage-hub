import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type HandoffStatus = "pending" | "sent" | "in_progress" | "done" | "failed";

interface AgentHandoff {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: HandoffStatus;
  originAgent: string;
  targetAgent: string;
  title: string;
  context: string | null;
  instruction: string;
  relevantFiles: string[] | null;
  acceptanceCriteria: string | null;
  resultSummary: string | null;
  resultPayload: unknown;
  errorMessage: string | null;
  priority: string;
  claimedAt: string | null;
  completedAt: string | null;
}

const STATUS_CONFIG: Record<HandoffStatus, { label: string; bg: string; color: string }> = {
  pending:     { label: "Pendente",     bg: "#1e293b", color: "#94a3b8" },
  sent:        { label: "Enviado",      bg: "#1e3a5f", color: "#60a5fa" },
  in_progress: { label: "Em Execução", bg: "#1c2a1c", color: "#4ade80" },
  done:        { label: "Concluído",   bg: "#0f2a1a", color: "#34d399" },
  failed:      { label: "Falhou",      bg: "#2a1010", color: "#f87171" },
};

const PRIORITY_COLOR: Record<string, string> = {
  low:      "#475569",
  normal:   "#64748b",
  high:     "#f59e0b",
  critical: "#ef4444",
};

function Badge({ status }: { status: HandoffStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "#1e293b", color: "#94a3b8" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700,
      padding: "2px 8px", borderRadius: 4, letterSpacing: 0.5, textTransform: "uppercase",
    }}>{cfg.label}</span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: PRIORITY_COLOR[priority] ?? "#64748b", marginRight: 4,
    }} title={priority} />
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "agora";
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function AgentHandoffsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AgentHandoff | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", instruction: "", context: "", acceptance_criteria: "", priority: "normal" });
  const [creating, setCreating] = useState(false);

  const qs = statusFilter === "all" ? "" : `?status=${statusFilter}`;
  const { data, isLoading } = useQuery<{ handoffs: AgentHandoff[] }>({
    queryKey: ["agent-handoffs", statusFilter],
    queryFn: () => apiFetch(`/internal/agent-handoffs${qs}`),
    refetchInterval: 15000,
  });

  const handoffs = data?.handoffs ?? [];

  const counts = handoffs.reduce((acc, h) => {
    acc[h.status] = (acc[h.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCreate = useCallback(async () => {
    if (!form.title.trim() || !form.instruction.trim()) return alert("Título e instrução são obrigatórios");
    setCreating(true);
    try {
      await apiFetch("/internal/agent-handoffs", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          instruction: form.instruction,
          context: form.context || null,
          acceptance_criteria: form.acceptance_criteria || null,
          priority: form.priority,
          origin_agent: "hub-admin",
          target_agent: "replit",
        }),
      });
      setForm({ title: "", instruction: "", context: "", acceptance_criteria: "", priority: "normal" });
      setShowCreate(false);
      await qc.invalidateQueries({ queryKey: ["agent-handoffs"] });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erro ao criar handoff");
    } finally {
      setCreating(false);
    }
  }, [form, qc]);

  const S = {
    page: { minHeight: "100vh", background: "#020617", padding: "24px", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" } as React.CSSProperties,
    wrap: { maxWidth: 1100, margin: "0 auto" } as React.CSSProperties,
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 } as React.CSSProperties,
    h1: { fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0 } as React.CSSProperties,
    sub: { fontSize: 13, color: "#64748b", marginTop: 2 } as React.CSSProperties,
    btn: (primary?: boolean) => ({
      background: primary ? "#6366f1" : "#1e293b",
      color: primary ? "#fff" : "#94a3b8",
      border: "none", borderRadius: 6, padding: "8px 16px",
      fontSize: 13, fontWeight: 600, cursor: "pointer",
    } as React.CSSProperties),
    filters: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const },
    filterBtn: (active: boolean) => ({
      background: active ? "#334155" : "#0f172a",
      color: active ? "#f1f5f9" : "#64748b",
      border: `1px solid ${active ? "#475569" : "#1e293b"}`,
      borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
    } as React.CSSProperties),
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
    th: { textAlign: "left" as const, color: "#64748b", fontWeight: 600, padding: "8px 12px", borderBottom: "1px solid #1e293b", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    td: { padding: "10px 12px", borderBottom: "1px solid #0f172a", verticalAlign: "top" as const },
    row: (hover: boolean) => ({ background: hover ? "#0f172a" : "transparent", cursor: "pointer" } as React.CSSProperties),
    panel: { position: "fixed" as const, top: 0, right: 0, width: 480, height: "100vh", background: "#0f172a", borderLeft: "1px solid #1e293b", overflowY: "auto" as const, padding: 24, zIndex: 100 },
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 },
    label: { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 },
    input: { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#f1f5f9", padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
    textarea: { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#f1f5f9", padding: "8px 12px", fontSize: 13, outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const },
  };

  const [hovered, setHovered] = useState<string | null>(null);

  const allStatuses: HandoffStatus[] = ["pending", "sent", "in_progress", "done", "failed"];
  const allCount = data?.handoffs?.length ?? 0;

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <h1 style={S.h1}>⚡ Agent Handoffs</h1>
            <div style={S.sub}>Barramento de execução ATHOS → Replit</div>
          </div>
          <button style={S.btn(true)} onClick={() => setShowCreate(true)}>+ Novo Handoff</button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {allStatuses.map(s => {
            const cfg = STATUS_CONFIG[s];
            const n = handoffs.filter(h => h.status === s).length;
            return (
              <div key={s} style={{
                background: "#0f172a", border: `1px solid ${cfg.bg}`,
                borderRadius: 8, padding: "10px 16px", minWidth: 100,
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>{n}</div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{cfg.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div style={S.filters}>
          <button style={S.filterBtn(statusFilter === "all")} onClick={() => setStatusFilter("all")}>
            Todos ({allCount})
          </button>
          {allStatuses.map(s => (
            <button key={s} style={S.filterBtn(statusFilter === s)} onClick={() => setStatusFilter(s)}>
              {STATUS_CONFIG[s].label} ({handoffs.filter(h => h.status === s).length})
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Carregando…</div>
        ) : handoffs.length === 0 ? (
          <div style={{ color: "#475569", padding: 40, textAlign: "center", fontSize: 14 }}>
            Nenhum handoff encontrado.<br />
            <span style={{ fontSize: 12, color: "#334155" }}>ATHOS pode criar via POST /api/internal/agent-handoffs</span>
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Prioridade</th>
                <th style={S.th}>Título</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Origem → Destino</th>
                <th style={S.th}>Criado</th>
                <th style={S.th}>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {handoffs.map(h => (
                <tr
                  key={h.id}
                  style={S.row(hovered === h.id)}
                  onMouseEnter={() => setHovered(h.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(h)}
                >
                  <td style={S.td}><PriorityDot priority={h.priority} /></td>
                  <td style={{ ...S.td, maxWidth: 280 }}>
                    <div style={{ fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.title}
                    </div>
                    {h.acceptanceCriteria && (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        ✓ {h.acceptanceCriteria}
                      </div>
                    )}
                  </td>
                  <td style={S.td}><Badge status={h.status} /></td>
                  <td style={{ ...S.td, fontSize: 11, color: "#64748b" }}>{h.originAgent} → {h.targetAgent}</td>
                  <td style={{ ...S.td, fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{relTime(h.createdAt)}</td>
                  <td style={{ ...S.td, fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{relTime(h.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <>
          <div style={S.overlay} onClick={() => setSelected(null)} />
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <Badge status={selected.status} />
                <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginTop: 8 }}>{selected.title}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  <PriorityDot priority={selected.priority} /> {selected.priority} · {selected.originAgent} → {selected.targetAgent}
                </div>
              </div>
              <button style={S.btn()} onClick={() => setSelected(null)}>✕</button>
            </div>

            {selected.context && (
              <div style={{ marginBottom: 16 }}>
                <div style={S.label}>Contexto</div>
                <div style={{ fontSize: 13, color: "#94a3b8", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selected.context}</div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={S.label}>Instrução</div>
              <div style={{ fontSize: 13, color: "#e2e8f0", background: "#1e293b", borderRadius: 6, padding: 12, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selected.instruction}</div>
            </div>

            {selected.acceptanceCriteria && (
              <div style={{ marginBottom: 16 }}>
                <div style={S.label}>Critério de Pronto</div>
                <div style={{ fontSize: 13, color: "#86efac", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selected.acceptanceCriteria}</div>
              </div>
            )}

            {selected.relevantFiles && Array.isArray(selected.relevantFiles) && selected.relevantFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={S.label}>Arquivos Relevantes</div>
                {(selected.relevantFiles as string[]).map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#60a5fa", fontFamily: "monospace", marginBottom: 2 }}>→ {f}</div>
                ))}
              </div>
            )}

            {selected.resultSummary && (
              <div style={{ marginBottom: 16 }}>
                <div style={S.label}>Resultado</div>
                <div style={{ fontSize: 13, color: "#4ade80", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selected.resultSummary}</div>
              </div>
            )}

            {selected.errorMessage && (
              <div style={{ marginBottom: 16 }}>
                <div style={S.label}>Erro</div>
                <div style={{ fontSize: 13, color: "#f87171", background: "#2a1010", borderRadius: 6, padding: 10, whiteSpace: "pre-wrap" }}>{selected.errorMessage}</div>
              </div>
            )}

            <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12, marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, color: "#64748b" }}>
                <div><span style={{ color: "#475569" }}>ID:</span> {selected.id.slice(0, 8)}…</div>
                <div><span style={{ color: "#475569" }}>Criado:</span> {new Date(selected.createdAt).toLocaleString("pt-BR")}</div>
                {selected.claimedAt && <div><span style={{ color: "#475569" }}>Claimed:</span> {new Date(selected.claimedAt).toLocaleString("pt-BR")}</div>}
                {selected.completedAt && <div><span style={{ color: "#475569" }}>Concluído:</span> {new Date(selected.completedAt).toLocaleString("pt-BR")}</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <>
          <div style={S.overlay} onClick={() => setShowCreate(false)} />
          <div style={{ ...S.panel, width: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>Novo Handoff</div>
              <button style={S.btn()} onClick={() => setShowCreate(false)}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Título *</label>
              <input style={S.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Criar endpoint de exportação CSV" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Instrução Completa *</label>
              <textarea style={{ ...S.textarea, minHeight: 120 }} value={form.instruction} onChange={e => setForm(f => ({ ...f, instruction: e.target.value }))} placeholder="Descreva exatamente o que o Replit deve implementar…" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Contexto</label>
              <textarea style={{ ...S.textarea, minHeight: 60 }} value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} placeholder="Contexto adicional para o executor…" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Critério de Pronto</label>
              <input style={S.input} value={form.acceptance_criteria} onChange={e => setForm(f => ({ ...f, acceptance_criteria: e.target.value }))} placeholder="Ex: Endpoint retorna 200 com lista paginada" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Prioridade</label>
              <select style={{ ...S.input, cursor: "pointer" }} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>

            <button
              style={{ ...S.btn(true), width: "100%", padding: "10px 0", opacity: creating ? 0.6 : 1 }}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Criando…" : "Criar Handoff"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
