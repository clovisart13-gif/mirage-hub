import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as number[] } },
  exit:   (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0, transition: { duration: 0.22 } }),
};

const AREAS = [
  { value: "Administrativo",  label: "Administrativo" },
  { value: "Financeiro",      label: "Financeiro" },
  { value: "Produto",         label: "Produto / Design" },
  { value: "Vendas",          label: "Vendas / Comercial" },
  { value: "Marketing",       label: "Marketing" },
  { value: "Produção",        label: "Produção / Confecção" },
];

const EXPERIENCIA_OPTIONS = [
  { value: "sem_experiencia",  label: "Sem experiência", sub: "Primeiro emprego" },
  { value: "menos_1_ano",      label: "Menos de 1 ano" },
  { value: "1_3_anos",         label: "1 a 3 anos" },
  { value: "3_5_anos",         label: "3 a 5 anos" },
  { value: "mais_5_anos",      label: "Mais de 5 anos" },
];

const DISPONIBILIDADE_OPTIONS = [
  { value: "imediata",     label: "Imediata" },
  { value: "15_dias",      label: "Em até 15 dias" },
  { value: "30_dias",      label: "Em até 30 dias" },
  { value: "combinada",    label: "A combinar" },
];

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

interface Form {
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
  area: string;
  funcao: string;
  experiencia: string;
  disponibilidade: string;
  experiencia_confeccao: string;
  resumo: string;
  obs: string;
}

const EMPTY: Form = {
  nome: "", whatsapp: "", email: "",
  cidade: "", estado: "",
  area: "", funcao: "",
  experiencia: "", disponibilidade: "",
  experiencia_confeccao: "",
  resumo: "", obs: "",
};

type Phase = "form" | "done";

function RadioCard({ label, sub, selected, onSelect }: {
  label: string; sub?: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-5 py-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
        selected
          ? "bg-white border-white text-zinc-900"
          : "bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/80"
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-sm">{label}</span>
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </div>
      <div className={`w-5 h-5 rounded-full shrink-0 border flex items-center justify-center ${
        selected ? "bg-zinc-900 border-zinc-900" : "border-zinc-700"
      }`}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}

export default function CandidatosForm() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [phase, setPhase] = useState<Phase>("form");
  const [sending, setSending] = useState(false);
  const [direction] = useState(1);

  const set = (field: keyof Form, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const ready =
    form.nome.trim().length >= 2 &&
    form.whatsapp.trim().length >= 8 &&
    form.area !== "" &&
    form.experiencia !== "" &&
    form.disponibilidade !== "" &&
    form.experiencia_confeccao !== "";

  const handleSubmit = async () => {
    if (!ready || sending) return;
    setSending(true);
    try {
      await fetch("/api/public/r2pb/candidatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          experiencia_confeccao: form.experiencia_confeccao === "sim",
        }),
      });
      setPhase("done");
    } catch {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">R2PB</p>
        <h1 className="text-2xl font-bold text-white mt-1">Trabalhe Conosco</h1>
        <p className="text-zinc-500 text-sm mt-1">Cadastro de candidatos</p>
      </div>

      {/* Progress */}
      <div className="px-6">
        <div className="h-0.5 bg-zinc-900 rounded-full">
          <div
            className="h-0.5 bg-white rounded-full transition-all duration-500"
            style={{ width: phase === "done" ? "100%" : "0%" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          {phase === "form" && (
            <motion.div
              key="form"
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8"
            >
              {/* Dados pessoais */}
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">Identificação</p>
                <input
                  type="text"
                  placeholder="Seu nome completo *"
                  value={form.nome}
                  onChange={e => set("nome", e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (com DDD) *"
                  value={form.whatsapp}
                  onChange={e => set("whatsapp", e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={form.cidade}
                    onChange={e => set("cidade", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                  <select
                    value={form.estado}
                    onChange={e => set("estado", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600 transition-colors appearance-none"
                    style={{ color: form.estado ? "white" : "#52525b" }}
                  >
                    <option value="">Estado</option>
                    {ESTADOS.map(e => <option key={e} value={e} className="text-white">{e}</option>)}
                  </select>
                </div>
              </div>

              {/* Área de interesse */}
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">Área de interesse *</p>
                <div className="space-y-2">
                  {AREAS.map(a => (
                    <RadioCard
                      key={a.value}
                      label={a.label}
                      selected={form.area === a.value}
                      onSelect={() => set("area", a.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Função desejada */}
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">
                  Função desejada <span className="text-zinc-700 normal-case tracking-normal">(opcional)</span>
                </p>
                <input
                  type="text"
                  placeholder="Ex.: Costureira, Assistente Administrativo, SDR..."
                  value={form.funcao}
                  onChange={e => set("funcao", e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Experiência */}
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">Experiência anterior *</p>
                <div className="space-y-2">
                  {EXPERIENCIA_OPTIONS.map(opt => (
                    <RadioCard
                      key={opt.value}
                      label={opt.label}
                      sub={opt.sub}
                      selected={form.experiencia === opt.value}
                      onSelect={() => set("experiencia", opt.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Experiência com confecção */}
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">Já trabalhou com confecção? *</p>
                <div className="grid grid-cols-2 gap-3">
                  <RadioCard label="Sim" selected={form.experiencia_confeccao === "sim"} onSelect={() => set("experiencia_confeccao", "sim")} />
                  <RadioCard label="Não" selected={form.experiencia_confeccao === "nao"} onSelect={() => set("experiencia_confeccao", "nao")} />
                </div>
              </div>

              {/* Disponibilidade */}
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">Disponibilidade para início *</p>
                <div className="space-y-2">
                  {DISPONIBILIDADE_OPTIONS.map(opt => (
                    <RadioCard
                      key={opt.value}
                      label={opt.label}
                      selected={form.disponibilidade === opt.value}
                      onSelect={() => set("disponibilidade", opt.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Resumo profissional */}
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">
                  Resumo profissional <span className="text-zinc-700 normal-case tracking-normal">(opcional)</span>
                </p>
                <textarea
                  rows={4}
                  placeholder="Conte um pouco sobre sua trajetória, habilidades e o que busca..."
                  value={form.resumo}
                  onChange={e => set("resumo", e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                />
              </div>

              {/* Obs */}
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">
                  Observações <span className="text-zinc-700 normal-case tracking-normal">(opcional)</span>
                </p>
                <textarea
                  rows={2}
                  placeholder="Algo mais que queira informar..."
                  value={form.obs}
                  onChange={e => set("obs", e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                />
              </div>

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={!ready || sending}
                className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
                  ready && !sending
                    ? "bg-white text-zinc-900 hover:bg-zinc-100 active:scale-[0.98]"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed"
                }`}
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-zinc-400/40 border-t-zinc-400 rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Enviar candidatura
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>

              <p className="text-xs text-zinc-700 text-center">* campos obrigatórios</p>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col gap-8 py-4"
            >
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Candidatura enviada</p>
                <h2 className="text-3xl font-bold text-white leading-tight">
                  {form.nome.split(" ")[0]}, recebemos!
                </h2>
              </div>
              <div className="space-y-4 border-l-2 border-zinc-800 pl-5">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-600 uppercase tracking-widest">Status</p>
                  <p className="text-sm text-zinc-300">Candidatura registrada — nossa equipe vai entrar em contato via WhatsApp em breve.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-600 uppercase tracking-widest">Área</p>
                  <p className="text-sm text-zinc-300">{form.area}</p>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-6">
                <p className="text-xs text-zinc-700">R2PB · Rede de Produção para Moda Premium</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
