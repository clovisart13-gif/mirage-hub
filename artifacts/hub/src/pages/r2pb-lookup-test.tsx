import { useState } from "react";

type LookupStatus =
  | "cliente_ativo"
  | "fornecedor"
  | "aprovado"
  | "nutricao"
  | "fora_de_perfil"
  | "lead_comercial"
  | "sem_registro";

interface LookupResult {
  status: LookupStatus;
  nome: string | null;
  diagnostico_preenchido: boolean;
  classificacao: string | null;
  score: number | null;
  helena_card_id: string | null;
  origem: string;
}

const STATUS_CONFIG: Record<LookupStatus, { label: string; color: string; bg: string; acao: string }> = {
  cliente_ativo:  { label: "Cliente Ativo",    color: "text-emerald-400", bg: "bg-emerald-950 border-emerald-800", acao: "→ Redirecionar para atendimento / setor adequado" },
  fornecedor:     { label: "Fornecedor",        color: "text-blue-400",    bg: "bg-blue-950 border-blue-800",       acao: "→ Redirecionar para setor de fornecedores" },
  aprovado:       { label: "Aprovado",          color: "text-green-400",   bg: "bg-green-950 border-green-800",     acao: "→ Passar direto para o comercial / humano" },
  nutricao:       { label: "Em Nutrição",       color: "text-yellow-400",  bg: "bg-yellow-950 border-yellow-800",   acao: "→ Fluxo de nutrição de longo prazo" },
  fora_de_perfil: { label: "Fora de Perfil",    color: "text-red-400",     bg: "bg-red-950 border-red-800",         acao: "→ Mensagem de descarte educada" },
  lead_comercial: { label: "Lead no CRM",       color: "text-purple-400",  bg: "bg-purple-950 border-purple-800",   acao: "→ Já está no CRM, redirecionar para humano" },
  sem_registro:   { label: "Sem Registro",      color: "text-zinc-400",    bg: "bg-zinc-900 border-zinc-700",       acao: "→ Enviar link do diagnóstico R2PB" },
};

export default function R2PBLookupTestPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);

  async function handleLookup() {
    const num = whatsapp.replace(/\D/g, "");
    if (num.length < 8) {
      setError("Digite um número válido (com DDD)");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    setRawJson(null);
    try {
      const res = await fetch("/api/internal/r2pb/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ whatsapp: num }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Erro ${res.status}`);
      } else {
        setResult(data as LookupResult);
        setRawJson(JSON.stringify(data, null, 2));
      }
    } catch (e: any) {
      setError(e.message ?? "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  const cfg = result ? STATUS_CONFIG[result.status] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase">R2PB · Roteador de Identidade</p>
          <h1 className="text-2xl font-bold">Teste de Lookup por WhatsApp</h1>
          <p className="text-zinc-400 text-sm">
            Simula o que o robô vai fazer quando um número entrar no Z-API. Digite qualquer número para ver a classificação.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="Ex: 5511987654321 ou (11) 98765-4321"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handleLookup}
              disabled={loading}
              className="px-6 py-3 bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
            >
              {loading ? "..." : "Consultar"}
            </button>
          </div>
          <p className="text-xs text-zinc-600">Funciona com qualquer formato: com DDI 55, com/sem parênteses, com/sem traços</p>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-800 bg-red-950 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Result card */}
        {result && cfg && (
          <div className={`border rounded-xl p-5 space-y-4 ${cfg.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</div>
              {result.score !== null && (
                <span className="ml-auto text-xs bg-black/30 px-2 py-1 rounded-full text-zinc-300">
                  Score: {result.score} pts
                </span>
              )}
            </div>

            <div className="text-sm text-zinc-300 font-medium border-t border-white/10 pt-3">
              {cfg.acao}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-zinc-400 pt-1">
              {result.nome && (
                <>
                  <span className="text-zinc-600">Nome</span>
                  <span className="text-zinc-200 font-medium">{result.nome}</span>
                </>
              )}
              <span className="text-zinc-600">Diagnóstico preenchido</span>
              <span className={result.diagnostico_preenchido ? "text-green-400" : "text-zinc-500"}>
                {result.diagnostico_preenchido ? "Sim" : "Não"}
              </span>
              {result.classificacao && (
                <>
                  <span className="text-zinc-600">Classificação</span>
                  <span className="text-zinc-200">{result.classificacao}</span>
                </>
              )}
              {result.helena_card_id && (
                <>
                  <span className="text-zinc-600">Card Helena</span>
                  <span className="text-zinc-200 font-mono text-[10px] truncate">{result.helena_card_id}</span>
                </>
              )}
              <span className="text-zinc-600">Origem no banco</span>
              <span className="text-zinc-400 font-mono">{result.origem}</span>
            </div>
          </div>
        )}

        {/* Raw JSON */}
        {rawJson && (
          <details className="text-xs">
            <summary className="text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">Ver JSON completo da resposta</summary>
            <pre className="mt-2 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 overflow-auto">
              {rawJson}
            </pre>
          </details>
        )}

        {/* Legend */}
        <div className="border border-zinc-800 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Legenda de roteamento</p>
          {(Object.entries(STATUS_CONFIG) as [LookupStatus, typeof STATUS_CONFIG[LookupStatus]][]).map(([key, c]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className={`font-semibold w-28 shrink-0 ${c.color}`}>{c.label}</span>
              <span className="text-zinc-500">{c.acao}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
