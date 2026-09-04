import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as number[] } },
  exit:   (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0, transition: { duration: 0.22 } }),
};

const AREAS_ATUACAO = [
  "Modelagem", "Corte", "Costura", "Beneficiamento",
  "Lavanderia", "Acabamento", "Pilotagem", "Estamparia",
];

const ESPECIALIDADES_COSTURA = ["Fitness", "Alfaiataria", "Malharia", "Jeans"];
const ESPECIALIDADES_BENEFICIAMENTO = ["Silk", "DTG", "DTF", "Sublimação", "Bordado"];

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

interface Form {
  nome: string;
  empresa: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
  bairro: string;
  areas_atuacao: string[];
  especialidade_costura: string[];
  especialidade_beneficiamento: string[];
  obs: string;
}

const EMPTY: Form = {
  nome: "", empresa: "", whatsapp: "", email: "",
  cidade: "", estado: "", bairro: "",
  areas_atuacao: [], especialidade_costura: [], especialidade_beneficiamento: [],
  obs: "",
};

function RadioCard({ label, sub, selected, onSelect }: { label: string; sub?: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3
        ${selected
          ? "bg-white border-white text-zinc-900"
          : "bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/80"
        }`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-sm leading-snug">{label}</span>
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </div>
      <div className={`w-5 h-5 rounded-full shrink-0 border flex items-center justify-center transition-all ${selected ? "bg-zinc-900 border-zinc-900" : "border-zinc-700"}`}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}

function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
        selected
          ? "bg-white border-white text-zinc-900"
          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-600"
      }`}
    >
      {selected && <Check className="inline w-3 h-3 mr-1" strokeWidth={3} />}
      {label}
    </button>
  );
}

function Input({ placeholder, value, onChange, type = "text", autoFocus = false, onKeyDown }: {
  placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; autoFocus?: boolean; onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
    />
  );
}

export default function FornecedoresForm() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (field: keyof Form, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const toggle = (field: "areas_atuacao" | "especialidade_costura" | "especialidade_beneficiamento", value: string) =>
    setForm(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });

  const hasCostura = form.areas_atuacao.includes("Costura");
  const hasBenef = form.areas_atuacao.includes("Beneficiamento");
  const stepSequence = [0, 1, 2, ...(hasCostura ? [3] : []), ...(hasBenef ? [4] : []), 5];
  const TOTAL_STEPS = stepSequence.length;
  const currentIdx = stepSequence.indexOf(step);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep(s => { const idx = stepSequence.indexOf(s); return stepSequence[idx + 1] ?? s; });
  }, [stepSequence.join(",")]);
  const goBack = useCallback(() => {
    setDirection(-1);
    setStep(s => { const idx = stepSequence.indexOf(s); return stepSequence[idx - 1] ?? s; });
  }, [stepSequence.join(",")]);

  const handleSubmit = async () => {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/public/r2pb/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch { /* ignore */ }
    setDone(true);
    setSending(false);
  };

  const progress = done ? 100 : Math.round((currentIdx / (TOTAL_STEPS - 1)) * 100);

  const step0Valid = form.nome.trim().length >= 2 && form.whatsapp.trim().length >= 8;
  const step1Valid = !!form.cidade.trim() && !!form.estado;

  if (done) {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: "#0a0a0a" }}>
        <div className="w-full h-px bg-zinc-900"><div className="h-full bg-zinc-500" style={{ width: "100%" }} /></div>
        <div className="px-6 pt-5 pb-2 flex items-center justify-center min-h-[52px]">
          <img src="/onboarding-portal/logo-r2pb.png" alt="R2PB" className="h-8 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        </div>
        <div className="flex-1 px-6 py-10 max-w-lg mx-auto w-full flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-2">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Cadastro enviado</p>
            <h2 className="text-3xl font-bold text-white leading-tight">
              {form.nome.split(" ")[0]}, recebemos!
            </h2>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="text-zinc-400 text-base leading-relaxed">
            Seu cadastro foi registrado. Nossa equipe vai entrar em contato pelo WhatsApp em breve.
          </motion.p>
          <div className="border-t border-zinc-800 pt-6">
            <p className="text-xs text-zinc-700">R2PB · Rede de Produção para Moda Premium</p>
          </div>
        </div>
        <div className="pb-6 text-center">
          <span className="text-[11px] tracking-[0.2em] text-zinc-800 uppercase">R2PB</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Progress line */}
      <div className="w-full h-px bg-zinc-900">
        <motion.div className="h-full bg-zinc-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
      </div>

      {/* Header */}
      <div className="px-6 pt-5 pb-2 flex items-center justify-between min-h-[52px]">
        {step > 0 ? (
          <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
        ) : <div />}
        <img src="/onboarding-portal/logo-r2pb.png" alt="R2PB" className="h-8 w-auto object-contain absolute left-1/2 -translate-x-1/2" style={{ filter: "brightness(0) invert(1)" }} />
        <span className="text-xs text-zinc-600">{currentIdx + 1}/{TOTAL_STEPS}</span>
      </div>

      {/* Subtitle */}
      <div className="px-6 pb-1 text-center">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-700">R2PB · Cadastro de Fornecedor</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>

          {/* Step 0 — Nome + WhatsApp */}
          {step === 0 && (
            <motion.div key="s0" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white leading-snug tracking-tight">Vamos começar pelo básico</h1>
                <p className="text-sm text-zinc-500">Nome, WhatsApp e empresa — para entrarmos em contato.</p>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Seu nome completo *"
                  value={form.nome}
                  onChange={v => set("nome", v)}
                  autoFocus
                />
                <Input
                  placeholder="WhatsApp com DDD *"
                  value={form.whatsapp}
                  onChange={v => set("whatsapp", v)}
                  type="tel"
                />
                <Input
                  placeholder="Nome da empresa ou ateliê (opcional)"
                  value={form.empresa}
                  onChange={v => set("empresa", v)}
                />
                <Input
                  placeholder="E-mail (opcional)"
                  value={form.email}
                  onChange={v => set("email", v)}
                  type="email"
                />
              </div>
              <button
                onClick={goNext}
                disabled={!step0Valid}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold tracking-wide transition-all ${step0Valid ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed"}`}
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 1 — Localização: Cidade + Estado + Bairro */}
          {step === 1 && (
            <motion.div key="s1" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white leading-snug tracking-tight">Onde você está localizado?</h1>
                <p className="text-sm text-zinc-500">Cidade, estado e bairro da sua operação.</p>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Cidade *"
                  value={form.cidade}
                  onChange={v => set("cidade", v)}
                  autoFocus
                />
                <select
                  value={form.estado}
                  onChange={e => set("estado", e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600 transition-colors appearance-none"
                  style={{ color: form.estado ? "white" : "#52525b" }}
                >
                  <option value="">Estado *</option>
                  {ESTADOS.map(e => <option key={e} value={e} className="text-white bg-zinc-900">{e}</option>)}
                </select>
                <Input
                  placeholder="Bairro (opcional)"
                  value={form.bairro}
                  onChange={v => set("bairro", v)}
                />
              </div>
              <button
                onClick={goNext}
                disabled={!step1Valid}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold tracking-wide transition-all ${step1Valid ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed"}`}
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2 — Área de atuação (single select) */}
          {step === 2 && (
            <motion.div key="s2" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white leading-snug tracking-tight">Qual é sua principal área?</h1>
                <p className="text-sm text-zinc-500">Escolha a que melhor representa sua operação.</p>
              </div>
              <div className="space-y-2">
                {AREAS_ATUACAO.map(a => (
                  <RadioCard
                    key={a}
                    label={a}
                    selected={form.areas_atuacao[0] === a}
                    onSelect={() => set("areas_atuacao", [a])}
                  />
                ))}
              </div>
              <button
                onClick={goNext}
                disabled={form.areas_atuacao.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold tracking-wide transition-all ${form.areas_atuacao.length > 0 ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed"}`}
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 3 — Especialidade Costura (condicional) */}
          {step === 3 && (
            <motion.div key="s3" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white leading-snug tracking-tight">Qual especialidade em costura?</h1>
                <p className="text-sm text-zinc-500">Selecione todas as que se aplicam.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ESPECIALIDADES_COSTURA.map(e => (
                  <Chip key={e} label={e} selected={form.especialidade_costura.includes(e)} onToggle={() => toggle("especialidade_costura", e)} />
                ))}
              </div>
              <button
                onClick={goNext}
                disabled={form.especialidade_costura.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold tracking-wide transition-all ${form.especialidade_costura.length > 0 ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed"}`}
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 4 — Especialidade Beneficiamento (condicional) */}
          {step === 4 && (
            <motion.div key="s4" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white leading-snug tracking-tight">Qual técnica de beneficiamento?</h1>
                <p className="text-sm text-zinc-500">Selecione todas as que se aplicam.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ESPECIALIDADES_BENEFICIAMENTO.map(e => (
                  <Chip key={e} label={e} selected={form.especialidade_beneficiamento.includes(e)} onToggle={() => toggle("especialidade_beneficiamento", e)} />
                ))}
              </div>
              <button
                onClick={goNext}
                disabled={form.especialidade_beneficiamento.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold tracking-wide transition-all ${form.especialidade_beneficiamento.length > 0 ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed"}`}
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 5 — Observações + Enviar */}
          {step === 5 && (
            <motion.div key="s5" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white leading-snug tracking-tight">Fale um pouco mais sobre sua estrutura</h1>
                <p className="text-sm text-zinc-500">Maquinários, lote mínimo aceitável, diferenciais — opcional.</p>
              </div>
              <textarea
                rows={4}
                placeholder="Conte mais sobre seu trabalho..."
                value={form.obs}
                onChange={e => set("obs", e.target.value)}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
              />
              <button
                onClick={handleSubmit}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold tracking-wide transition-all bg-white text-zinc-900 hover:bg-zinc-100 active:scale-[0.98]"
              >
                {sending
                  ? <><span className="w-4 h-4 border-2 border-zinc-400/40 border-t-zinc-400 rounded-full animate-spin" /> Enviando...</>
                  : <><Check className="w-4 h-4" /> Enviar cadastro</>
                }
              </button>
              <p className="text-xs text-zinc-700 text-center">Nenhum dado é compartilhado com terceiros.</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Brand mark */}
      <div className="pb-6 text-center">
        <span className="text-[11px] tracking-[0.2em] text-zinc-800 uppercase">R2PB</span>
      </div>
    </div>
  );
}
