import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search, ChevronDown, ChevronRight, BookOpen, Lightbulb,
  Rocket, Clock, ExternalLink, CheckCircle2, ArrowRight,
  HelpCircle, GraduationCap, Map, MessageCircle,
} from "lucide-react";
import { FAQ_ITEMS, FAQ_CATEGORIES } from "@/data/faq";
import { ONBOARDING_MODULES } from "@/data/onboarding-modules";

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = "faq" | "tutoriais" | "onboarding";

// ── FAQ Section ───────────────────────────────────────────────────────────────
function FaqSection({ search }: { search: string }) {
  const [activeCategory, setActiveCategory] = useState("todos");
  const [openItem, setOpenItem] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchCategory = activeCategory === "todos" || item.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q));
      return matchCategory && matchSearch;
    });
  }, [activeCategory, search]);

  const categories = [{ id: "todos", label: "Todos" }, ...FAQ_CATEGORIES];

  return (
    <div className="space-y-6">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeCategory === cat.id
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ items */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Nenhuma pergunta encontrada</p>
          <p className="text-sm text-gray-300 mt-1">Tente outros termos ou fale com o suporte.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isOpen = openItem === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-white transition-all ${
                  isOpen ? "border-violet-200 shadow-sm" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <button
                  onClick={() => setOpenItem(isOpen ? null : item.id)}
                  className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
                >
                  <span className="text-sm font-semibold text-gray-800 leading-snug">{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {item.tags.map((tag) => (
                          <span key={tag} className="text-[10px] text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Suporte CTA */}
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <MessageCircle className="w-8 h-8 text-violet-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-violet-900">Não encontrou o que precisava?</p>
          <p className="text-xs text-violet-600 mt-0.5">Converse com a Mira ou entre em contato com o suporte humano.</p>
        </div>
        <a
          href="/"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Falar com suporte <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── Tutoriais Section ─────────────────────────────────────────────────────────
function TutoriaisSection({ search: _ }: { search: string }) {
  return (
    <div className="py-20 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
        <GraduationCap className="w-8 h-8 text-violet-300" />
      </div>
      <div>
        <p className="text-base font-bold text-gray-700">Tutoriais em breve</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          Estamos preparando guias visuais passo a passo para cada módulo do Hub. Em breve disponíveis aqui.
        </p>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full">
        Em breve
      </span>
    </div>
  );
}

// ── Onboarding Section ────────────────────────────────────────────────────────
function OnboardingSection({ search }: { search: string }) {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return ONBOARDING_MODULES;
    const q = search.toLowerCase();
    return ONBOARDING_MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.targetAudience.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = ONBOARDING_MODULES.find((m) => m.id === activeModule);

  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveModule(null)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors"
        >
          <ChevronDown className="w-4 h-4 rotate-90" /> Voltar aos módulos
        </button>

        {/* Hero do módulo */}
        <div className={`rounded-2xl bg-gradient-to-br ${selected.color} p-6 text-white`}>
          <span className="text-4xl">{selected.icon}</span>
          <h2 className="text-2xl font-black mt-3 mb-1">{selected.title}</h2>
          <p className="text-white/80 text-sm leading-relaxed">{selected.tagline}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* O que é */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">O que é</p>
            <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
          </div>

          {/* Para quem serve */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Para quem serve</p>
            <p className="text-sm text-gray-700 leading-relaxed">{selected.targetAudience}</p>
          </div>
        </div>

        {/* Como começar */}
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2">Como começar</p>
          <p className="text-sm text-violet-800 leading-relaxed">{selected.howToStart}</p>
        </div>

        {/* Primeiros passos */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Primeiros passos</p>
          <div className="space-y-3">
            {selected.firstSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-black text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                  {step.action && step.actionUrl && (
                    <Link href={step.actionUrl} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                      {step.action} <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <CheckCircle2 className="w-4 h-4 text-gray-200 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Ganho prático */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 flex items-start gap-4">
          <Lightbulb className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">O que você ganha</p>
            <p className="text-sm text-emerald-800 leading-relaxed">{selected.practicalGain}</p>
            <p className="text-xs text-emerald-600 mt-2 font-medium">⏱ {selected.timeToValue}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center pt-2">
          <Link href={selected.ctaUrl} className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm bg-gradient-to-r ${selected.color} hover:opacity-90 transition-opacity shadow-lg`}>
            {selected.ctaLabel} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Selecione um módulo para ver o guia de onboarding completo.</p>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Map className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Nenhum módulo encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className="text-left rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-lg hover:border-violet-200 transition-all group"
            >
              <div className={`h-24 bg-gradient-to-br ${mod.color} flex items-center justify-between px-5`}>
                <div>
                  <span className="text-3xl">{mod.icon}</span>
                  <p className="text-white font-black text-lg mt-1">{mod.title}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{mod.tagline}</p>
                <div className="flex items-center gap-1 mt-3 text-[10px] text-violet-500 font-semibold">
                  <Clock className="w-3 h-3" /> {mod.timeToValue}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AjudaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("faq");
  const [search, setSearch] = useState("");

  const TABS = [
    { id: "faq" as Tab, label: "FAQ", icon: HelpCircle, desc: `${FAQ_ITEMS.length} perguntas` },
    { id: "tutoriais" as Tab, label: "Tutoriais", icon: GraduationCap, desc: "em breve" },
    { id: "onboarding" as Tab, label: "Por módulo", icon: Rocket, desc: `${ONBOARDING_MODULES.length} módulos` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
          <Link href="/" className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors">
            ← Voltar ao Hub
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Central de Ajuda</h1>
              <p className="text-violet-200 text-sm">FAQ, tutoriais e guias por módulo</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-300 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar em toda a central de ajuda…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder-violet-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1 bg-white/10 rounded-xl p-1 w-fit">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.id ? "bg-violet-100 text-violet-600" : "bg-white/10 text-white/60"
                  }`}>
                    {tab.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wave */}
        <div className="h-8 relative mt-2">
          <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 32" fill="none" preserveAspectRatio="none">
            <path d="M0 32L1440 32L1440 0C1200 24 800 32 720 32C640 32 240 24 0 0L0 32Z" fill="#f9fafb" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {activeTab === "faq" && <FaqSection search={search} />}
        {activeTab === "tutoriais" && <TutoriaisSection search={search} />}
        {activeTab === "onboarding" && <OnboardingSection search={search} />}
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto px-4 pb-12 text-center">
        <p className="text-xs text-gray-400">
          Central de Ajuda do Hub Mirage ·{" "}
          <a href="/" className="text-violet-500 hover:text-violet-700 transition-colors">
            Voltar ao site
          </a>
        </p>
      </div>
    </div>
  );
}
