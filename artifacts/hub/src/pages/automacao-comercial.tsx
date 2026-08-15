import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "wouter";

const SUPER_ADMIN_EMAIL = "clovisart13@gmail.com";

type Tab = "crm" | "whatsapp" | "templates" | "sdr";

type WppUso = "atendimento" | "confirmacao" | "campanhas" | "robo" | "outro";

interface WhatsappInstance {
  id: string;
  nome: string;
  canal: "zapi" | "oficial" | "wts";
  baseUrl?: string;
  instanceId?: string;
  token?: string;
  clientToken?: string;
  usos?: WppUso[];
}

interface Config {
  id?: string;
  crmProvider?: string;
  crmBaseUrl?: string;
  crmApiKey?: string;
  pipelineVendasId?: string;
  pipelineVendasNome?: string;
  pipelineNutricaoId?: string;
  pipelineNutricaoNome?: string;
  pipelineStarterId?: string;
  pipelineStarterNome?: string;
  pipelinePosVendasId?: string;
  pipelinePosVendasNome?: string;
  whatsappInstances?: WhatsappInstance[];
  msgConfirmacao?: string;
  msgLembrete?: string;
  msgReengajamento?: string;
  msgResgate?: string;
  ativo?: boolean;
}

interface SdrConfig {
  personaNome: string;
  personaTom: string;
  contextoNegocio: string;
  maxTurns: number;
}

const SDR_DEFAULTS: SdrConfig = {
  personaNome: "SDR",
  personaTom: "consultivo, casual, direto, sem enrolação",
  contextoNegocio: "",
  maxTurns: 5,
};

const DEFAULTS: Config = {
  crmProvider: "helena",
  crmBaseUrl: "https://api.wts.chat",
  whatsappInstances: [],
  ativo: false,
  msgConfirmacao:
    "Oi {nome}! 😊 Sua reunião está confirmada para {data} às {hora}. Qualquer dúvida é só chamar aqui!",
  msgLembrete:
    "Oi {nome}! Lembrete: sua reunião começa em 1 hora ({hora}). Te esperamos! 🎯",
  msgReengajamento:
    "Oi {nome}, tudo bem? Vi que você ainda não escolheu um horário para nossa conversa. Que tal a gente marcar agora? É rápido 😊",
  msgResgate:
    "Oi {nome}! Vi que você chegou a conversar com a gente mas a gente se perdeu no meio do caminho 😅 Posso te ajudar em algo?",
};

const USO_LABELS: Record<WppUso, string> = {
  atendimento: "Atendimento 1 a 1",
  confirmacao: "Confirmação de reunião",
  campanhas: "Campanhas em massa",
  robo: "Robô de entrada",
  outro: "Outro",
};

const CANAL_LABELS: Record<string, string> = {
  zapi: "Z-API",
  oficial: "WhatsApp Business API (Meta)",
  wts: "WTS Chat",
};

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-300">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  sensitive,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  sensitive?: boolean;
  multiline?: boolean;
}) {
  const [show, setShow] = useState(false);
  const base =
    "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  if (multiline)
    return (
      <textarea
        className={`${base} min-h-[80px] resize-y`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  return (
    <div className="relative">
      <input
        type={sensitive && !show ? "password" : "text"}
        className={`${base} ${sensitive ? "pr-10" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {sensitive && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
        >
          {show ? "ocultar" : "ver"}
        </button>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Card de instância WhatsApp ────────────────────────────────────────────────

function InstanceCard({
  inst,
  index,
  onChange,
  onRemove,
}: {
  inst: WhatsappInstance;
  index: number;
  onChange: (updated: WhatsappInstance) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);

  const setField = (key: keyof WhatsappInstance) => (val: string) =>
    onChange({ ...inst, [key]: val });

  const toggleUso = (uso: WppUso) => {
    const usos = inst.usos ?? [];
    onChange({
      ...inst,
      usos: usos.includes(uso) ? usos.filter((u) => u !== uso) : [...usos, uso],
    });
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header do card */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60">
        <span className="text-slate-400 text-xs font-bold">#{index + 1}</span>
        <span className="flex-1 text-sm font-semibold text-slate-200 truncate">
          {inst.nome || "Nova instância"}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
          {CANAL_LABELS[inst.canal] ?? inst.canal}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-slate-400 hover:text-slate-200 text-xs px-2"
        >
          {open ? "▲ recolher" : "▼ expandir"}
        </button>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-400 text-xs font-bold px-1"
        >
          ✕
        </button>
      </div>

      {open && (
        <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da instância" hint="Ex: Atendimento Individual, Robô de Entrada">
              <Input
                value={inst.nome}
                onChange={setField("nome")}
                placeholder="Ex: Atendimento Individual"
              />
            </Field>
            <Field label="Provedor">
              <Select
                value={inst.canal}
                onChange={(v) => onChange({ ...inst, canal: v as WhatsappInstance["canal"] })}
                options={[
                  { value: "zapi", label: "Z-API" },
                  { value: "oficial", label: "WhatsApp Business API (Meta)" },
                  { value: "wts", label: "WTS Chat" },
                ]}
              />
            </Field>
            {inst.canal === "oficial" && (
              <Field label="Base URL" hint="URL base da API Meta">
                <Input
                  value={inst.baseUrl ?? ""}
                  onChange={setField("baseUrl")}
                  placeholder="https://graph.facebook.com/..."
                />
              </Field>
            )}
            <Field label="Instance ID">
              <Input
                value={inst.instanceId ?? ""}
                onChange={setField("instanceId")}
                placeholder="ID da instância"
                sensitive
              />
            </Field>
            <Field label="Token">
              <Input
                value={inst.token ?? ""}
                onChange={setField("token")}
                placeholder="Token de autenticação"
                sensitive
              />
            </Field>
            <Field label="Client Token" hint="Opcional">
              <Input
                value={inst.clientToken ?? ""}
                onChange={setField("clientToken")}
                placeholder="Opcional"
                sensitive
              />
            </Field>
          </div>

          {/* Finalidades */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Finalidades desta instância</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(USO_LABELS) as WppUso[]).map((uso) => {
                const active = (inst.usos ?? []).includes(uso);
                return (
                  <button
                    key={uso}
                    onClick={() => toggleUso(uso)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-blue-700 border-blue-500 text-white"
                        : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
                    }`}
                  >
                    {USO_LABELS[uso]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AutomacaoComercial() {
  const { toast } = useToast();
  const { session, user } = useAuth();
  const [tab, setTab] = useState<Tab>("crm");
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  const [sdrConfig, setSdrConfig] = useState<SdrConfig>(SDR_DEFAULTS);
  const [sdrSaving, setSdrSaving] = useState(false);
  const [sdrLoaded, setSdrLoaded] = useState(false);

  const isSuperAdmin = (user as any)?.email === SUPER_ADMIN_EMAIL;
  const token = session?.access_token;
  const search = useSearch();
  const companySlug = new URLSearchParams(search).get("company_slug") ?? undefined;
  const apiSuffix = companySlug ? `?company_slug=${encodeURIComponent(companySlug)}` : "";

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/automation/sales-config${apiSuffix}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig({ ...DEFAULTS, ...data.config });
          setExists(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !isSuperAdmin) return;
    fetch(`/api/automation/sdr-config${apiSuffix}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.sdrConfig) {
          setSdrConfig({ ...SDR_DEFAULTS, ...data.sdrConfig });
        }
        setSdrLoaded(true);
      })
      .catch(() => setSdrLoaded(true));
  }, [token, isSuperAdmin]);

  async function saveSdr() {
    setSdrSaving(true);
    try {
      const res = await fetch(`/api/automation/sdr-config${apiSuffix}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(sdrConfig),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro ao salvar IA SDR", description: JSON.stringify(data.error), variant: "destructive" });
        return;
      }
      setSdrConfig({ ...SDR_DEFAULTS, ...data.sdrConfig });
      toast({ title: "IA SDR salva ✓", description: "Configuração aplicada. A IA usa o novo contexto nas próximas mensagens." });
    } catch (e: any) {
      toast({ title: "Erro de rede", description: e.message, variant: "destructive" });
    } finally {
      setSdrSaving(false);
    }
  }

  const set = (key: keyof Config) => (val: string | boolean) =>
    setConfig((c) => ({ ...c, [key]: val }));

  const setInstances = (instances: WhatsappInstance[]) =>
    setConfig((c) => ({ ...c, whatsappInstances: instances }));

  const addInstance = () => {
    const newInst: WhatsappInstance = {
      id: uuid(),
      nome: "",
      canal: "zapi",
      usos: [],
    };
    setInstances([...(config.whatsappInstances ?? []), newInst]);
  };

  const updateInstance = (index: number, updated: WhatsappInstance) => {
    const list = [...(config.whatsappInstances ?? [])];
    list[index] = updated;
    setInstances(list);
  };

  const removeInstance = (index: number) => {
    const list = [...(config.whatsappInstances ?? [])];
    list.splice(index, 1);
    setInstances(list);
  };

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/automation/sales-config${apiSuffix}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Erro ao salvar",
          description: JSON.stringify(data.error),
          variant: "destructive",
        });
        return;
      }
      setConfig({ ...DEFAULTS, ...data.config });
      setExists(true);
      toast({ title: "Configuração salva ✓" });
    } catch (e: any) {
      toast({ title: "Erro de rede", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const TABS: { id: Tab; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: "crm", label: "CRM & Pipelines", icon: "🔗" },
    { id: "whatsapp", label: "WhatsApp", icon: "💬" },
    { id: "templates", label: "Templates", icon: "✉️" },
    { id: "sdr", label: "IA SDR", icon: "🤖", adminOnly: true },
  ].filter((t) => !t.adminOnly || isSuperAdmin);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-xl font-bold text-white">Automação Comercial</h1>
            {companySlug && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-900/60 text-violet-300 border border-violet-700">
                🏢 {companySlug.toUpperCase()}
              </span>
            )}
            <span
              className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
                config.ativo
                  ? "bg-green-900 text-green-300 border border-green-700"
                  : "bg-slate-800 text-slate-400 border border-slate-600"
              }`}
            >
              {config.ativo ? "● Ativa" : "○ Inativa"}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            {companySlug
              ? `Configuração da máquina comercial para a empresa ${companySlug.toUpperCase()} — acesso exclusivo admin.`
              : "Configuração da máquina comercial — CRM, pipelines, WhatsApp e mensagens automáticas."}
          </p>
          {!exists && !loading && (
            <div className="mt-3 flex items-center gap-2 bg-blue-900/30 border border-blue-700 rounded-lg px-3 py-2 text-xs text-blue-300">
              <span>ℹ️</span> Nenhuma configuração salva ainda. Preencha os campos e salve para criar.
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
            Carregando...
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-900 rounded-xl p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                    tab === t.id
                      ? "bg-slate-700 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab: CRM & Pipelines */}
            {tab === "crm" && (
              <div className="flex flex-col gap-5">
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Provedor CRM
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Provedor">
                      <Select
                        value={config.crmProvider ?? "helena"}
                        onChange={set("crmProvider")}
                        options={[
                          { value: "helena", label: "Helena / WTS" },
                          { value: "custom", label: "Outro (customizado)" },
                        ]}
                      />
                    </Field>
                    <Field label="Base URL" hint="Ex: https://api.wts.chat">
                      <Input
                        value={config.crmBaseUrl ?? ""}
                        onChange={set("crmBaseUrl")}
                        placeholder="https://api.wts.chat"
                      />
                    </Field>
                    <Field label="API Key / Token" hint="Token de autenticação do CRM">
                      <Input
                        value={config.crmApiKey ?? ""}
                        onChange={set("crmApiKey")}
                        placeholder="Bearer token..."
                        sensitive
                      />
                    </Field>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Pipelines
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Pipeline Vendas — ID">
                      <Input value={config.pipelineVendasId ?? ""} onChange={set("pipelineVendasId")} placeholder="UUID do pipeline" />
                    </Field>
                    <Field label="Pipeline Vendas — Nome">
                      <Input value={config.pipelineVendasNome ?? ""} onChange={set("pipelineVendasNome")} placeholder="Ex: Vendas PRO" />
                    </Field>
                    <Field label="Pipeline Nutrição — ID">
                      <Input value={config.pipelineNutricaoId ?? ""} onChange={set("pipelineNutricaoId")} placeholder="UUID do pipeline" />
                    </Field>
                    <Field label="Pipeline Nutrição — Nome">
                      <Input value={config.pipelineNutricaoNome ?? ""} onChange={set("pipelineNutricaoNome")} placeholder="Ex: Nutrição" />
                    </Field>
                    <Field label="Pipeline Starter — ID">
                      <Input value={config.pipelineStarterId ?? ""} onChange={set("pipelineStarterId")} placeholder="UUID do pipeline" />
                    </Field>
                    <Field label="Pipeline Starter — Nome">
                      <Input value={config.pipelineStarterNome ?? ""} onChange={set("pipelineStarterNome")} placeholder="Ex: Vendas Starter" />
                    </Field>
                    <Field label="Pipeline Pós-Vendas — ID">
                      <Input value={config.pipelinePosVendasId ?? ""} onChange={set("pipelinePosVendasId")} placeholder="UUID do pipeline" />
                    </Field>
                    <Field label="Pipeline Pós-Vendas — Nome">
                      <Input value={config.pipelinePosVendasNome ?? ""} onChange={set("pipelinePosVendasNome")} placeholder="Ex: Pós Vendas" />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: WhatsApp */}
            {tab === "whatsapp" && (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-900/20 border border-blue-800 rounded-xl px-4 py-3 text-xs text-blue-300">
                  <strong className="text-blue-200">Instâncias dinâmicas</strong> — cada tenant pode ter quantas instâncias quiser.
                  Cada uma tem nome, provedor e finalidades próprias. Adicione, edite ou remova conforme sua operação crescer.
                </div>

                {(config.whatsappInstances ?? []).map((inst, i) => (
                  <InstanceCard
                    key={inst.id}
                    inst={inst}
                    index={i}
                    onChange={(updated) => updateInstance(i, updated)}
                    onRemove={() => removeInstance(i)}
                  />
                ))}

                {(config.whatsappInstances ?? []).length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
                    Nenhuma instância configurada ainda.<br />
                    <span className="text-slate-400">Clique em "+ Adicionar instância" para começar.</span>
                  </div>
                )}

                <button
                  onClick={addInstance}
                  className="w-full py-3 rounded-xl border border-dashed border-blue-700 text-blue-400 hover:bg-blue-900/20 text-sm font-medium transition-colors"
                >
                  + Adicionar instância WhatsApp
                </button>

                {/* Status da automação */}
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Status da Automação
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => set("ativo")(!config.ativo)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        config.ativo ? "bg-green-600" : "bg-slate-600"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          config.ativo ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </div>
                    <span className="text-sm text-slate-300">
                      {config.ativo
                        ? "Automação ativa — workflows n8n podem usar esta configuração"
                        : "Automação inativa — salvar sem ativar para rascunho"}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Tab: Templates */}
            {tab === "templates" && (
              <div className="flex flex-col gap-5">
                <div className="bg-slate-800/40 rounded-lg px-4 py-3 text-xs text-slate-400 border border-slate-700">
                  <strong className="text-slate-300">Variáveis disponíveis:</strong>{" "}
                  <code className="bg-slate-700 px-1 rounded">{"{nome}"}</code>{" "}
                  <code className="bg-slate-700 px-1 rounded">{"{data}"}</code>{" "}
                  <code className="bg-slate-700 px-1 rounded">{"{hora}"}</code>{" "}
                  <code className="bg-slate-700 px-1 rounded">{"{link}"}</code>
                </div>
                {(
                  [
                    { key: "msgConfirmacao", label: "✅ Confirmação de reunião" },
                    { key: "msgLembrete", label: "⏰ Lembrete (1h antes)" },
                    { key: "msgReengajamento", label: "💬 Reengajamento (lead sem agendar)" },
                    { key: "msgResgate", label: "🔄 Resgate (lead perdido)" },
                  ] as { key: keyof Config; label: string }[]
                ).map(({ key, label }) => (
                  <div key={key} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                    <p className="text-xs font-bold text-slate-300 mb-3">{label}</p>
                    <Input
                      value={(config[key] as string) ?? ""}
                      onChange={set(key)}
                      multiline
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Tab: IA SDR */}
            {tab === "sdr" && (
              <div className="flex flex-col gap-5">
                <div className="bg-violet-900/20 border border-violet-700 rounded-xl px-4 py-3 text-xs text-violet-300">
                  <strong className="text-violet-200">IA 100% configurável por tenant.</strong>{" "}
                  O que você salvar aqui substitui o comportamento padrão da IA para este tenant.
                  Cada empresa tem o seu próprio contexto, persona e regras — sem hardcode.
                </div>

                {/* Persona */}
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Persona da IA</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nome da IA" hint="Ex: Atha, Ana, Sofia…">
                      <Input
                        value={sdrConfig.personaNome}
                        onChange={(v) => setSdrConfig((c) => ({ ...c, personaNome: v }))}
                        placeholder="Ex: Atha"
                      />
                    </Field>
                    <Field label="Turnos máximos automáticos" hint="Após esse limite, transfere para humano">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={sdrConfig.maxTurns}
                        onChange={(e) => setSdrConfig((c) => ({ ...c, maxTurns: Number(e.target.value) }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </Field>
                    <Field label="Tom / Entonação" hint="Descreva como a IA deve soar" >
                      <Input
                        value={sdrConfig.personaTom}
                        onChange={(v) => setSdrConfig((c) => ({ ...c, personaTom: v }))}
                        placeholder="Ex: consultivo, casual, direto, sem enrolação"
                        multiline
                      />
                    </Field>
                  </div>
                </div>

                {/* Contexto do negócio */}
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Contexto do negócio
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Tudo que a IA precisa saber: o que a empresa faz, produtos, planos, preços, regras de MOQ,
                    como qualificar leads, o que fazer em cada situação. Escreva em texto livre ou markdown.
                  </p>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 min-h-[320px] resize-y font-mono leading-relaxed"
                    value={sdrConfig.contextoNegocio}
                    onChange={(e) => setSdrConfig((c) => ({ ...c, contextoNegocio: e.target.value }))}
                    placeholder={`## SOBRE A EMPRESA\nDescreva o que a empresa faz...\n\n## PLANOS / PRODUTOS\n- Plano Pro: ...\n\n## QUALIFICAÇÃO DO LEAD\n1. Produto → 2. Quantidade → ...\n\n## PLAYBOOKS\n**pricing**: resposta para quem pergunta preço...\n**minimum_quantity**: resposta para MOQ...`}
                  />
                  <p className="text-xs text-slate-600 mt-2">
                    {sdrConfig.contextoNegocio.length.toLocaleString("pt-BR")} caracteres
                  </p>
                </div>

                {/* Botão salvar IA SDR */}
                <div className="flex items-center justify-between">
                  {!sdrLoaded && (
                    <span className="text-xs text-slate-500">Carregando configuração atual…</span>
                  )}
                  <div className="ml-auto">
                    <button
                      onClick={saveSdr}
                      disabled={sdrSaving || !sdrLoaded}
                      className="px-8 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
                    >
                      {sdrSaving ? "Salvando IA…" : "Salvar IA SDR"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Botão salvar (abas CRM / WhatsApp / Templates) */}
            {tab !== "sdr" && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
              >
                {saving ? "Salvando..." : "Salvar configuração"}
              </button>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
