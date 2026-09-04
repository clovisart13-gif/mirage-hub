import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Classificacao = "aprovado" | "nutricao" | "fora_de_perfil";

interface Answers {
  tipoPerfil?: string;
  estagio?: string;
  segmento?: string;
  publicoAlvo?: string;
  necessidade?: string;
  volume?: string;
  investimento?: string;
  temCnpj?: string;
  prazo?: string;
  // contact (only collected after classification)
  nome?: string;
  contato?: string;
  canalPreferido?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const CALENDAR_LINK = "https://calendar.app.google/nAk76XsPkav8wYK16";

// ── Session + UTM ─────────────────────────────────────────────────────────────

const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function getUtm() {
  const p = new URLSearchParams(window.location.search);
  return {
    utmSource: p.get("utm_source") ?? undefined,
    utmMedium: p.get("utm_medium") ?? undefined,
    utmCampaign: p.get("utm_campaign") ?? undefined,
  };
}

function getWhatsappPhone(): string | undefined {
  return new URLSearchParams(window.location.search).get("phone") ?? undefined;
}

async function track(event: string, step?: string, meta?: Record<string, unknown>) {
  fetch("/api/public/r2pb/form/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, event, stepName: step, metadata: meta }),
  }).catch(() => {});
}

// ── Pre-classification (client-side, matches server logic) ────────────────────

interface PreAnswers {
  tipoPerfil?: string;
  estagio?: string;
  volume?: string;
  investimento?: string;
  temCnpj?: string;
  prazo?: string;
}

// Hard disqualifiers — checked field by field for early exit
function isHardDisqualifier(field: string, value: string): boolean {
  if (field === "tipoPerfil"  && value === "explorando") return true;
  if (field === "publicoAlvo" && value === "cd")         return true;
  return false;
}

function preClassify(a: PreAnswers): Classificacao {
  // Hard disqualifiers (no human contact)
  if (a.tipoPerfil  === "explorando") return "fora_de_perfil";
  if (a.publicoAlvo === "cd")         return "fora_de_perfil";
  if (a.temCnpj     === "nao")        return "fora_de_perfil";
  if (a.investimento === "<3k")       return "fora_de_perfil";

  // Volume < 72 → nutrição (fala com humano)
  if (a.volume === "<72") return "nutricao";

  let score = 0;
  if (a.tipoPerfil === "marca_consolidada") score += 30;
  else if (a.tipoPerfil === "marca_formacao") score += 20;

  if (a.estagio === "consolidacao") score += 20;
  else if (a.estagio === "crescimento") score += 15;
  else if (a.estagio === "inicio") score += 5;

  if (a.volume === "500+")    score += 30;
  else if (a.volume === "200-500") score += 25;
  else if (a.volume === "72-200")  score += 10;

  if (a.investimento === "150k+")   score += 20;
  else if (a.investimento === "50-150k") score += 15;
  else if (a.investimento === "10-50k")  score += 5;
  else if (a.investimento === "<10k")    score -= 5;
  else if (a.investimento === "indefinido") score -= 5;

  if (a.temCnpj === "sim")      score += 15;
  else if (a.temCnpj === "processo") score += 8;

  if (a.prazo === "agora")        score += 15;
  else if (a.prazo === "3meses")  score += 10;
  else if (a.prazo === "3meses+") score += 2;
  else if (a.prazo === "explorando") score -= 10;

  if (score >= 60) return "aprovado";
  if (score >= 20) return "nutricao";
  return "fora_de_perfil";
}

// ── Steps ─────────────────────────────────────────────────────────────────────

interface Option { value: string; label: string; sub?: string }

interface Step {
  id: string;
  question: string;
  sub?: string;
  field: keyof Answers;
  options: Option[];
  skip?: (a: Answers) => boolean;
}

const TRIAGEM_STEPS: Step[] = [
  {
    id: "tipo_perfil",
    question: "Qual é o perfil do seu negócio?",
    sub: "Essa resposta define como vamos conduzir sua triagem.",
    field: "tipoPerfil",
    options: [
      { value: "marca_formacao",    label: "Marca em formação",      sub: "Estruturando minha identidade" },
      { value: "marca_consolidada", label: "Marca consolidada",       sub: "Já opera com produção própria" },
      { value: "explorando",        label: "Ainda estou pesquisando", sub: "Sem projeto definido" },
    ],
  },
  {
    id: "segmento",
    question: "Qual é o segmento da sua marca?",
    sub: "Nos ajuda a entender o mercado que você atende.",
    field: "segmento",
    skip: (a) => a.tipoPerfil === "revendedor",
    options: [
      { value: "street",       label: "Street / Casual" },
      { value: "fitness",      label: "Fitness / Activewear" },
      { value: "alfaiataria",  label: "Alfaiataria" },
      { value: "outro",        label: "Outro" },
    ],
  },
  {
    id: "publico_alvo",
    question: "Qual é o posicionamento de preço da sua marca?",
    sub: "Classe econômica do seu consumidor final.",
    field: "publicoAlvo",
    skip: (a) => a.tipoPerfil === "revendedor",
    options: [
      { value: "ab", label: "Classes A/B", sub: "Moda premium e contemporânea" },
      { value: "bc", label: "Classes B/C", sub: "Moda acessível de qualidade" },
      { value: "cd", label: "Classes C/D", sub: "Moda popular, alto volume" },
    ],
  },
  {
    id: "estagio",
    question: "Em que estágio está hoje?",
    sub: "Seja preciso — isso altera a recomendação.",
    field: "estagio",
    options: [
      { value: "inicio",       label: "Início",       sub: "Tenho a ideia, ainda estruturando" },
      { value: "crescimento",  label: "Crescimento",   sub: "Já produzo, quero escalar" },
      { value: "consolidacao", label: "Consolidação",  sub: "Operação rodando, quero otimizar" },
    ],
  },
  {
    id: "necessidade",
    question: "Qual é a sua principal necessidade?",
    field: "necessidade",
    skip: (a) => a.tipoPerfil === "revendedor",
    options: [
      { value: "private_label", label: "Private Label" },
      { value: "modelagem",     label: "Modelagem e desenvolvimento" },
      { value: "faccao",        label: "Facção" },
    ],
  },
  {
    id: "volume",
    question: "Quantidade pretendida por modelo?",
    sub: "Estimativa — não precisa ser exato.",
    field: "volume",
    options: [
      { value: "<72",     label: "Menos de 72 peças" },
      { value: "72-200",  label: "72 a 200 peças" },
      { value: "200-500", label: "200 a 500 peças" },
      { value: "500+",    label: "Acima de 500 peças" },
    ],
  },
  {
    id: "investimento",
    question: "Qual é o investimento inicial disponível?",
    sub: "Isso nos ajuda a indicar o melhor ponto de entrada.",
    field: "investimento",
    options: [
      { value: "<3k",       label: "Menos de R$ 3.000",        sub: "Sem capital inicial disponível" },
      { value: "<10k",      label: "R$ 3.000 a R$ 10 mil",     sub: "Início controlado" },
      { value: "10-50k",    label: "R$ 10 mil a R$ 50 mil",    sub: "Operação em formação" },
      { value: "50-150k",   label: "R$ 50 mil a R$ 150 mil",   sub: "Estrutura consolidada" },
      { value: "150k+",     label: "Acima de R$ 150 mil",      sub: "Operação premium" },
      { value: "indefinido",label: "Ainda não definido" },
    ],
  },
  {
    id: "cnpj",
    question: "Você possui CNPJ ativo?",
    field: "temCnpj",
    options: [
      { value: "sim",      label: "Sim, ativo",              sub: "Empresa regularizada" },
      { value: "processo", label: "Em processo de abertura" },
      { value: "nao",      label: "Não, ainda pessoa física" },
    ],
  },
  {
    id: "prazo",
    question: "Qual é o seu horizonte de início?",
    field: "prazo",
    options: [
      { value: "agora",      label: "Imediato",           sub: "Preciso agora" },
      { value: "3meses",     label: "Até 3 meses",        sub: "Planejando a entrada" },
      { value: "3meses+",    label: "Mais de 3 meses",    sub: "Ainda estruturando" },
      { value: "explorando", label: "Sem prazo definido", sub: "Pesquisando o mercado" },
    ],
  },
];

// ── Animations ────────────────────────────────────────────────────────────────

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as number[] } },
  exit:   (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0, transition: { duration: 0.22 } }),
};

// ── Option card ───────────────────────────────────────────────────────────────

function OptionCard({
  opt, selected, onSelect,
}: { opt: Option; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`
        group w-full text-left px-5 py-4 rounded-xl border transition-all duration-150
        flex items-center justify-between gap-3
        ${selected
          ? "bg-white border-white text-zinc-900"
          : "bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/80"
        }
      `}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-sm leading-snug">{opt.label}</span>
        {opt.sub && (
          <span className={`text-xs leading-snug ${selected ? "text-zinc-500" : "text-zinc-500"}`}>
            {opt.sub}
          </span>
        )}
      </div>
      <div className={`
        w-5 h-5 rounded-full shrink-0 border flex items-center justify-center transition-all
        ${selected ? "bg-zinc-900 border-zinc-900" : "border-zinc-700"}
      `}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}

// ── Result: rejected ──────────────────────────────────────────────────────────

function ResultRejeitado() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col gap-8 py-4"
    >
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Diagnóstico</p>
        <h2 className="text-3xl font-bold text-white leading-tight">
          Agradecemos o interesse.
        </h2>
      </div>
      <p className="text-zinc-400 text-base leading-relaxed">
        Nossa fábrica opera com um perfil específico de parceiros — marcas e ateliês com projeto estruturado e produção ativa ou em formação qualificada.
      </p>
      <p className="text-zinc-500 text-sm leading-relaxed">
        No momento, o seu perfil não se encaixa nos critérios atuais de parceria. Isso não impede que você nos procure novamente quando o projeto evoluir.
      </p>
      <div className="border-t border-zinc-800 pt-6">
        <p className="text-xs text-zinc-700">R2PB · Rede de Produção para Moda Premium</p>
      </div>
    </motion.div>
  );
}

// ── Contact form (shown only for aprovado / nutricao) ─────────────────────────

function ContactForm({
  classificacao,
  answers,
  onUpdate,
  onSubmit,
  isSubmitting,
}: {
  classificacao: Classificacao;
  answers: Answers;
  onUpdate: (f: keyof Answers, v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const isAprovado = classificacao === "aprovado";
  const ready =
    (answers.nome?.trim().length ?? 0) >= 2 &&
    (answers.contato?.trim().length ?? 0) >= 5 &&
    !!answers.canalPreferido;

  const canais = [
    { value: "whatsapp", label: "WhatsApp", icon: "↗" },
    { value: "reuniao",  label: "Reunião",  icon: "◷" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col gap-8 py-4"
    >
      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">
          {isAprovado ? "Perfil aprovado" : "Em desenvolvimento"}
        </p>
        <h2 className="text-3xl font-bold text-white leading-tight">
          {isAprovado
            ? "Seu projeto tem potencial de parceria."
            : "Você está no caminho certo."}
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          {isAprovado
            ? "Nossa equipe comercial vai analisar o seu perfil e entrar em contato para a próxima etapa."
            : "Vamos acompanhar o desenvolvimento do seu projeto e entrar em contato quando o momento for ideal."}
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Seu nome completo"
          value={answers.nome ?? ""}
          onChange={(e) => onUpdate("nome", e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        <input
          type="text"
          placeholder="WhatsApp ou e-mail"
          value={answers.contato ?? ""}
          onChange={(e) => onUpdate("contato", e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Canal preference */}
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-600">Como prefere continuar?</p>
        <div className="grid grid-cols-3 gap-2">
          {canais.map((c) => (
            <button
              key={c.value}
              onClick={() => onUpdate("canalPreferido", c.value)}
              className={`
                flex flex-col items-center gap-2 py-4 px-2 rounded-xl border text-xs font-semibold transition-all
                ${answers.canalPreferido === c.value
                  ? "bg-white border-white text-zinc-900"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }
              `}
            >
              <span className="text-base">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onSubmit}
        disabled={!ready || isSubmitting}
        className={`
          w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-200
          ${ready && !isSubmitting
            ? "bg-white text-zinc-900 hover:bg-zinc-100 active:scale-[0.98]"
            : "bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed"
          }
        `}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-zinc-400/40 border-t-zinc-400 rounded-full animate-spin" />
            Enviando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Confirmar envio
            <ArrowRight className="w-4 h-4" />
          </span>
        )}
      </button>
    </motion.div>
  );
}

// ── Confirmation ──────────────────────────────────────────────────────────────

function Confirmacao({
  classificacao,
  nome,
  canal,
}: {
  classificacao: Classificacao;
  nome?: string;
  canal?: string;
}) {
  const first = nome?.split(" ")[0];
  const canalLabel: Record<string, string> = {
    whatsapp: "via WhatsApp",
    email: "por e-mail",
    reuniao: "para agendamento",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="flex flex-col gap-8 py-4"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Enviado</p>
        <h2 className="text-3xl font-bold text-white leading-tight">
          {first ? `${first}, recebemos.` : "Recebemos."}
        </h2>
      </div>

      <div className="space-y-4 border-l-2 border-zinc-800 pl-5">
        <div className="space-y-1">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Status</p>
          <p className="text-sm text-zinc-300">
            {classificacao === "aprovado"
              ? "Perfil qualificado — encaminhado para equipe comercial"
              : "Em acompanhamento — equipe notificada"}
          </p>
        </div>
        {canal && canal !== "reuniao" && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Próximo contato</p>
            <p className="text-sm text-zinc-300">Nossa equipe vai entrar em contato {canalLabel[canal] ?? canal}</p>
          </div>
        )}
      </div>

      {/* Agendamento — sempre exibido para aprovados */}
      {classificacao === "aprovado" && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 leading-relaxed">
            {canal === "reuniao"
              ? "Escolha um horário disponível para sua reunião com nossa equipe:"
              : "Ou, se preferir, agende uma reunião agora mesmo:"}
          </p>
          <a
            href={CALENDAR_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-5 py-4 bg-white text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Agendar reunião no Google Calendar
            </span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </a>
        </div>
      )}

      <div className="border-t border-zinc-800 pt-6">
        <p className="text-xs text-zinc-700">R2PB · Rede de Produção para Moda Premium</p>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DiagnosticoForm() {
  const demoParam = new URLSearchParams(window.location.search).get("demo") as Classificacao | null;
  const isDemo    = demoParam === "aprovado" || demoParam === "nutricao" || demoParam === "fora_de_perfil";

  const [answers, setAnswers]         = useState<Answers>({});
  const [stepIndex, setStepIndex]     = useState(0);
  const [direction, setDirection]     = useState(1);
  const [phase, setPhase]             = useState<"intro" | "triagem" | "contact" | "done" | "fornecedor" | "fornecedor_done" | "cliente_existente" | "outros" | "outros_done">(
    isDemo && demoParam !== "fora_de_perfil" ? "contact" : isDemo ? "triagem" : "intro"
  );
  const [fornecedorForm, setFornecedorForm] = useState({ nome: "", especialidade: "", contato: "" });
  const [fornecedorSending, setFornecedorSending] = useState(false);
  const [outrosForm, setOutrosForm] = useState({ nome: "", contato: "", mensagem: "" });
  const [outrosSending, setOutrosSending] = useState(false);
  const [classificacao, setClassificacao] = useState<Classificacao | null>(isDemo ? demoParam : null);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const abandonRef = useRef(false);

  const visibleSteps = TRIAGEM_STEPS.filter((s) => !s.skip?.(answers));
  const totalSteps   = visibleSteps.length;
  const currentStep  = visibleSteps[stepIndex];

  // Progress bar
  const progressPct =
    phase === "done" || phase === "fornecedor_done" ? 100 :
    phase === "contact" ? 88 :
    phase === "fornecedor" ? 50 :
    phase === "cliente_existente" ? 100 :
    phase === "intro" ? 0 :
    Math.round(((stepIndex + 1) / totalSteps) * 70);

  useEffect(() => {
    track("start", undefined, { channel: "form_r2pb" });
    const handleBlur = () => {
      if (!abandonRef.current && phase === "triagem") track("abandon", currentStep?.id);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      if (!currentStep) return;
      const newAnswers = { ...answers, [currentStep.field]: value };
      setAnswers(newAnswers);
      track("step_complete", currentStep.id, { value });

      // Hard disqualifiers — exit immediately, no human contact
      if (isHardDisqualifier(currentStep.field, value)) {
        abandonRef.current = true;
        setClassificacao("fora_de_perfil");
        setTimeout(() => {
          track("complete", undefined, { classificacao: "fora_de_perfil" });
          fetch("/api/public/r2pb/form/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, ...newAnswers, ...getUtm() }),
          }).catch(() => {});
          setPhase("done");
        }, 200);
        return;
      }

      const isLast = stepIndex === visibleSteps.length - 1;

      if (isLast) {
        // Classify and transition
        const clf = preClassify(newAnswers);
        setClassificacao(clf);
        abandonRef.current = true;

        setTimeout(() => {
          if (clf === "fora_de_perfil") {
            track("complete", undefined, { classificacao: "fora_de_perfil" });
            fetch("/api/public/r2pb/form/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, ...newAnswers, ...getUtm() }),
            }).catch(() => {});
            setPhase("done");
          } else {
            setPhase("contact");
          }
        }, 200);
      } else {
        setTimeout(() => {
          setDirection(1);
          setStepIndex((i) => i + 1);
        }, 160);
      }
    },
    [answers, currentStep, stepIndex, visibleSteps.length]
  );

  const handleContactUpdate = useCallback((field: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBack = useCallback(() => {
    if (phase === "fornecedor" || phase === "outros") {
      setPhase("intro");
    } else if (phase === "contact") {
      setPhase("triagem");
      setDirection(-1);
    } else if (stepIndex > 0) {
      setDirection(-1);
      setStepIndex((i) => i - 1);
    }
  }, [phase, stepIndex]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !classificacao) return;
    setIsSubmitting(true);

    try {
      await fetch("/api/public/r2pb/form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tipoPerfil:    answers.tipoPerfil,
          segmento:      answers.segmento,
          publicoAlvo:   answers.publicoAlvo,
          estagio:       answers.estagio,
          necessidade:   answers.necessidade,
          volume:        answers.volume,
          investimento:  answers.investimento,
          temCnpj:       answers.temCnpj,
          prazo:         answers.prazo,
          canalPreferido: answers.canalPreferido,
          nome:          answers.nome,
          contato:       answers.contato,
          whatsappPhone: getWhatsappPhone(),
          ...getUtm(),
        }),
      });
      track("complete", undefined, { classificacao });
      setPhase("done");
    } catch {
      setPhase("done");
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, classificacao, isSubmitting]);

  const showBack = (phase === "triagem" && stepIndex > 0) || phase === "contact" || phase === "fornecedor" || phase === "outros";
  const showCounter = phase === "triagem";

  const handleRestart = useCallback(() => {
    setAnswers({});
    setStepIndex(0);
    setDirection(1);
    setPhase("triagem");
    setClassificacao(null);
    setIsSubmitting(false);
    abandonRef.current = false;
  }, []);

  return (
    <div
      className="min-h-dvh flex flex-col relative overflow-hidden"
      style={{ background: "#0a0a0a" }}
    >
      {/* Progress line */}
      <div className="relative z-10 w-full h-px bg-zinc-900">
        <motion.div
          className="h-full bg-zinc-500"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Header row */}
      <div className="relative z-10 px-6 pt-5 pb-2 flex items-center justify-between min-h-[52px]">
        {showBack ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
        ) : (
          <div />
        )}
        {/* Logo R2PB centralizado */}
        <img
          src="/onboarding-portal/logo-r2pb.png"
          alt="R2PB"
          className="h-10 w-auto absolute left-1/2 -translate-x-1/2"
          style={{ pointerEvents: "none", filter: "brightness(0) invert(1)", opacity: 0.9 }}
        />
        {showCounter && (
          <span className="text-xs text-zinc-700 tabular-nums">
            {stepIndex + 1} / {totalSteps}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-10 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ── INTRO — seletor de perfil ── */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="space-y-7 py-4"
            >
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">
                  R2PB · Rede de Produção para Moda Premium
                </p>
                <h1 className="text-2xl font-bold text-white leading-tight">
                  Olá! Como podemos te chamar?
                </h1>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Escolha a opção que melhor descreve você — assim te direcionamos da forma certa.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "marca",
                    emoji: "👕",
                    label: "Tenho uma marca ou quero terceirizar produção",
                    sub: "Estou buscando parceiro de confecção",
                    action: () => { track("intro_select", "marca"); setPhase("triagem"); },
                  },
                  {
                    id: "fornecedor",
                    emoji: "🧵",
                    label: "Sou fornecedor, fábrica ou ateliê",
                    sub: "Quero me cadastrar como parceiro produtivo",
                    action: () => { track("intro_select", "fornecedor"); window.location.href = `${import.meta.env.BASE_URL}fornecedores`; },
                  },
                  {
                    id: "cliente",
                    emoji: "💼",
                    label: "Já sou cliente da R2PB",
                    sub: "Tenho pedido em andamento ou histórico conosco",
                    action: () => { track("intro_select", "cliente_existente"); setPhase("cliente_existente"); },
                  },
                  {
                    id: "outros",
                    emoji: "💬",
                    label: "Outro assunto",
                    sub: "Dúvida, parceria ou qualquer outra mensagem",
                    action: () => { track("intro_select", "outros"); setPhase("outros"); },
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={opt.action}
                    className="w-full text-left flex items-start gap-4 px-4 py-4 border border-zinc-800 rounded-xl hover:border-zinc-600 hover:bg-zinc-900 transition-all"
                  >
                    <span className="text-2xl mt-0.5 shrink-0">{opt.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-white leading-snug">{opt.label}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{opt.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-zinc-700 text-center">Nenhum dado é compartilhado com terceiros.</p>
            </motion.div>
          )}

          {/* ── FORNECEDOR phase ── */}
          {phase === "fornecedor" && (
            <motion.div
              key="fornecedor"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="space-y-7 py-4"
            >
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Cadastro de Fornecedor</p>
                <h2 className="text-2xl font-bold text-white leading-tight">Ótimo! Vamos registrar seu contato.</h2>
                <p className="text-zinc-500 text-sm">Nossa equipe de parcerias produtivas vai entrar em contato para entender sua capacidade e especialidade.</p>
              </div>

              <div className="space-y-4">
                {[
                  { field: "nome" as const, label: "Seu nome ou razão social", placeholder: "Ex: Ateliê Moda Arte" },
                  { field: "contato" as const, label: "WhatsApp", placeholder: "Ex: (11) 99999-9999" },
                ].map(({ field, label, placeholder }) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</label>
                    <input
                      type={field === "contato" ? "tel" : "text"}
                      placeholder={placeholder}
                      value={fornecedorForm[field]}
                      onChange={(e) => setFornecedorForm((p) => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Especialidade</label>
                  <select
                    value={fornecedorForm.especialidade}
                    onChange={(e) => setFornecedorForm((p) => ({ ...p, especialidade: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="" disabled>Selecione sua área</option>
                    <option value="costura">Costura / Facção</option>
                    <option value="modelagem">Modelagem</option>
                    <option value="bordado">Bordado / Estamparia</option>
                    <option value="aviamentos">Aviamentos / Matéria-prima</option>
                    <option value="lavanderia">Lavanderia / Tingimento</option>
                    <option value="acabamento">Acabamento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <button
                disabled={fornecedorSending || !fornecedorForm.nome.trim() || !fornecedorForm.contato.trim() || !fornecedorForm.especialidade}
                onClick={async () => {
                  setFornecedorSending(true);
                  try {
                    await fetch("/api/public/r2pb/form/submit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        sessionId,
                        tipoPerfil: "fornecedor",
                        nome: fornecedorForm.nome,
                        contato: fornecedorForm.contato,
                        segmento: fornecedorForm.especialidade,
                        classificacao: "fornecedor",
                        ...getUtm(),
                      }),
                    });
                    track("fornecedor_submit");
                  } catch { /* silent */ } finally {
                    setFornecedorSending(false);
                    setPhase("fornecedor_done");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-white text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {fornecedorSending ? "Enviando..." : "Enviar cadastro"}
                {!fornecedorSending && <Check className="w-4 h-4" />}
              </button>
            </motion.div>
          )}

          {/* ── FORNECEDOR DONE ── */}
          {phase === "fornecedor_done" && (
            <motion.div key="fornecedor_done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="space-y-6 py-4">
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Cadastro recebido</p>
                <h2 className="text-3xl font-bold text-white leading-tight">Cadastro enviado com sucesso.</h2>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Nossa equipe de parcerias produtivas vai analisar seu perfil e entrar em contato pelo WhatsApp informado.
              </p>
              <div className="border-t border-zinc-800 pt-6">
                <p className="text-xs text-zinc-700">R2PB · Rede de Produção para Moda Premium</p>
              </div>
            </motion.div>
          )}

          {/* ── CLIENTE EXISTENTE ── */}
          {phase === "cliente_existente" && (
            <motion.div key="cliente_existente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="space-y-6 py-4">
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Cliente R2PB</p>
                <h2 className="text-3xl font-bold text-white leading-tight">Ótimo, já somos parceiros.</h2>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Nossa equipe já tem seu histórico. Para acompanhar seu pedido ou tirar dúvidas, fale diretamente pelo nosso canal de atendimento.
              </p>
              <a
                href="https://wa.me/5511992679826"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-5 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Falar com atendimento
                <ArrowRight className="w-4 h-4" />
              </a>
              <div className="border-t border-zinc-800 pt-6">
                <p className="text-xs text-zinc-700">R2PB · Rede de Produção para Moda Premium</p>
              </div>
            </motion.div>
          )}

          {/* ── OUTROS phase ── */}
          {phase === "outros" && (
            <motion.div
              key="outros"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="space-y-7 py-4"
            >
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Fale conosco</p>
                <h2 className="text-2xl font-bold text-white leading-tight">Qual é o seu assunto?</h2>
                <p className="text-zinc-500 text-sm">Nossa equipe vai ler e retornar pelo canal informado.</p>
              </div>

              <div className="space-y-4">
                {[
                  { field: "nome" as const, label: "Seu nome", placeholder: "Ex: Ana Paula" },
                  { field: "contato" as const, label: "WhatsApp", placeholder: "Ex: (51) 99999-0000" },
                ].map(({ field, label, placeholder }) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">{label}</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                      placeholder={placeholder}
                      value={outrosForm[field]}
                      onChange={(e) => setOutrosForm((p) => ({ ...p, [field]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest">Mensagem</label>
                  <textarea
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-none"
                    placeholder="Descreva sua dúvida ou assunto..."
                    value={outrosForm.mensagem}
                    onChange={(e) => setOutrosForm((p) => ({ ...p, mensagem: e.target.value }))}
                  />
                </div>
              </div>

              <button
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold transition-colors bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
                disabled={outrosSending || !outrosForm.nome.trim() || !outrosForm.contato.trim() || !outrosForm.mensagem.trim()}
                onClick={async () => {
                  setOutrosSending(true);
                  try {
                    await fetch("/api/public/r2pb/form/submit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        tipoPerfil: "outros",
                        nome: outrosForm.nome,
                        contato: outrosForm.contato,
                        observacoes: outrosForm.mensagem,
                        classificacao: "outros",
                      }),
                    });
                    track("outros_submit");
                  } catch { /* ignore */ } finally {
                    setOutrosSending(false);
                    setPhase("outros_done");
                  }
                }}
              >
                {outrosSending ? "Enviando..." : "Enviar mensagem"}
                {!outrosSending && <Check className="w-4 h-4" />}
              </button>
            </motion.div>
          )}

          {/* ── OUTROS DONE ── */}
          {phase === "outros_done" && (
            <motion.div key="outros_done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="space-y-6 py-4">
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-600">Mensagem recebida</p>
                <h2 className="text-3xl font-bold text-white leading-tight">Recebemos sua mensagem.</h2>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Nossa equipe vai analisar e entrar em contato pelo WhatsApp informado em breve.
              </p>
              <div className="border-t border-zinc-800 pt-6">
                <p className="text-xs text-zinc-700">R2PB · Rede de Produção para Moda Premium</p>
              </div>
            </motion.div>
          )}

          {/* ── TRIAGEM phase ── */}
          {phase === "triagem" && currentStep && (
            <motion.div
              key={currentStep.id}
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-7"
            >
              {/* Question */}
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white leading-snug tracking-tight">
                  {currentStep.question}
                </h1>
                {currentStep.sub && (
                  <p className="text-sm text-zinc-500 leading-relaxed">{currentStep.sub}</p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentStep.options.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    opt={opt}
                    selected={answers[currentStep.field] === opt.value}
                    onSelect={() => handleSelect(opt.value)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── CONTACT phase (aprovado / nutricao) ── */}
          {phase === "contact" && classificacao && classificacao !== "fora_de_perfil" && (
            <motion.div key="contact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <ContactForm
                classificacao={classificacao}
                answers={answers}
                onUpdate={handleContactUpdate}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          )}

          {/* ── DONE: fora_de_perfil ── */}
          {phase === "done" && classificacao === "fora_de_perfil" && (
            <motion.div key="rejeitado" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <ResultRejeitado />
            </motion.div>
          )}

          {/* ── DONE: confirmação ── */}
          {phase === "done" && classificacao !== "fora_de_perfil" && (
            <motion.div key="confirmacao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <Confirmacao
                classificacao={classificacao!}
                nome={answers.nome}
                canal={answers.canalPreferido}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recomeçar — visível só na tela final */}
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-10 text-center"
          >
            <button
              onClick={handleRestart}
              className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors underline underline-offset-4"
            >
              Recomeçar do início
            </button>
          </motion.div>
        )}
      </div>

      {/* Brand mark */}
      <div className="relative z-10 pb-6 text-center">
        <span className="text-[11px] tracking-[0.2em] text-zinc-800 uppercase">
          R2PB
        </span>
      </div>
    </div>
  );
}
