import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { apiFetch } from "@/lib/api";
import { gtmEvent } from "@/lib/gtm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2, Users, Star, Zap, Lock } from "lucide-react";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const ROLES = [
  { value: "marca",        label: "Marca / Grife" },
  { value: "confeccao",    label: "Confecção" },
  { value: "private_label",label: "Private Label" },
  { value: "faccao",       label: "Facção / Terceirizada" },
  { value: "oficina",      label: "Oficina / Ateliê" },
  { value: "fornecedor",   label: "Fornecedor de Insumos" },
  { value: "prestador",    label: "Prestador de Serviços" },
  { value: "outro",        label: "Outro" },
];

const SPECIALTIES_OPTIONS = [
  "Corte","Costura","Estamparia","Bordado","Modelagem","Lavanderia","Acabamento",
  "Tecidos","Aviamentos","Embalagem","Logística","Design","Marketing","Tecnologia",
];

interface FormData {
  fullName: string;
  email: string;
  whatsapp: string;
  companyName: string;
  city: string;
  state: string;
  cep: string;
  neighborhood: string;
  addressLine: string;
  instagram: string;
  website: string;
  roleInChain: string;
  specialties: string[];
  mainNeed: string;
  mainOffer: string;
  lgpdConsent: boolean;
}

const EMPTY: FormData = {
  fullName: "", email: "", whatsapp: "", companyName: "",
  city: "", state: "", cep: "", neighborhood: "", addressLine: "",
  instagram: "", website: "",
  roleInChain: "", specialties: [], mainNeed: "", mainOffer: "",
  lgpdConsent: false,
};

export default function ModaConectaFundadores() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const utmCampaign = params.get("utm_campaign") ?? params.get("campaign") ?? "moda-conecta-fundadores";
  const utmSource = params.get("utm_source") ?? undefined;
  const utmMedium = params.get("utm_medium") ?? undefined;

  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");
  const formStartedRef = useRef(false);

  // Evento: visualização da página
  useEffect(() => {
    gtmEvent({ event: "moda_conecta_fundadores_view" });
  }, []);

  function setField<K extends keyof FormData>(key: K, val: FormData[K]) {
    // Evento: início do preenchimento (dispara apenas na primeira interação)
    if (!formStartedRef.current) {
      formStartedRef.current = true;
      gtmEvent({ event: "moda_conecta_fundadores_form_start" });
    }
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  async function handleCepChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const display = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setField("cep", display);
    if (digits.length === 8) {
      try {
        const data = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`).then(r => r.json());
        if (data.city)         setField("city", data.city);
        if (data.state)        setField("state", data.state);
        if (data.neighborhood) setField("neighborhood", data.neighborhood);
        if (data.street)       setField("addressLine", data.street);
      } catch {}
    }
  }

  function toggleSpecialty(s: string) {
    setForm(f => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter(x => x !== s)
        : [...f.specialties, s],
    }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Nome obrigatório";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (!form.whatsapp.trim()) e.whatsapp = "WhatsApp obrigatório";
    if (!form.roleInChain) e.roleInChain = "Selecione seu perfil";
    if (!form.lgpdConsent) e.lgpdConsent = "Consentimento obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError("");

    // Evento: envio do formulário
    gtmEvent({
      event: "moda_conecta_fundadores_form_submit",
      role_in_chain: form.roleInChain,
      utm_campaign: utmCampaign,
      utm_source: utmSource ?? null,
      utm_medium: utmMedium ?? null,
    });

    try {
      await apiFetch("/moda-conecta/leads/public", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          companySlug: "mirage",
          campaignSource: utmCampaign,
          utmSource,
          utmMedium,
          utmCampaign,
        }),
      });

      // Evento: envio confirmado com sucesso pela API
      gtmEvent({
        event: "moda_conecta_fundadores_form_success",
        role_in_chain: form.roleInChain,
        utm_campaign: utmCampaign,
        utm_source: utmSource ?? null,
        utm_medium: utmMedium ?? null,
      });

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      if (err?.status === 409) {
        setApiError("Este e-mail já está cadastrado na lista de espera. Entraremos em contato em breve.");
      } else {
        setApiError("Erro ao enviar cadastro. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full text-center space-y-6">
            {/* Logo no topo do card de sucesso */}
            <div className="flex justify-center mb-2">
              <img src="/mirage-logo.png" alt="Mirage" className="h-9 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto ring-2 ring-green-500/40">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Pré-cadastro recebido!</h1>
              <p className="text-slate-300 leading-relaxed">
                Obrigado por se interessar pelo <strong className="text-purple-300">Moda Conecta</strong>.
                Seu perfil entrou para a lista de curadoria da fase fundadora.
              </p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 text-left space-y-3">
              <p className="text-sm font-semibold text-slate-200">O que acontece agora:</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2"><span className="text-purple-400 mt-0.5">→</span> Nossa equipe analisará seu perfil com atenção</li>
                <li className="flex gap-2"><span className="text-purple-400 mt-0.5">→</span> Se aprovado, você receberá um convite exclusivo por e-mail</li>
                <li className="flex gap-2"><span className="text-purple-400 mt-0.5">→</span> O envio do formulário não libera acesso imediato à plataforma</li>
                <li className="flex gap-2"><span className="text-purple-400 mt-0.5">→</span> Fundadores terão acesso gratuito na primeira rodada</li>
              </ul>
            </div>
            <p className="text-xs text-slate-500">Fique de olho no seu e-mail. Entraremos em contato em breve.</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800/60 py-6 px-4">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
            <img src="/mirage-logo.png" alt="Mirage" className="h-6 object-contain" style={{ filter: "brightness(0) invert(1) opacity(0.4)" }} />
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <a href="https://instagram.com/gestaomirage" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">@gestaomirage</a>
              <span>·</span>
              <a href="https://www.gestaomirage.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">gestaomirage.com.br</a>
            </div>
            <p className="text-[10px] text-slate-700">© {new Date().getFullYear()} Mirage Hub. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex flex-col">

      {/* Hero — logo integrado para aparecer no recorte do Instagram */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-10 pb-6 text-center">
        {/* Logo no topo do hero */}
        <div className="flex justify-center mb-8">
          <img
            src="/mirage-logo.png"
            alt="Mirage"
            className="h-10 object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-xs text-purple-300 font-medium mb-6">
          <Star className="w-3.5 h-3.5" /> Fase Fundadora — Vagas Limitadas
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
          Seja um dos primeiros a entrar no{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Moda Conecta
          </span>
        </h1>
        <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-4">
          A comunidade B2B do setor têxtil brasileiro que conecta marcas, confecções, facções, oficinas e fornecedores em uma rede qualificada de negócios.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200 flex items-start gap-3">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            <strong>Pré-cadastro com curadoria.</strong> Estamos reunindo os primeiros perfis da fase fundadora. Após análise, entraremos em contato com os próximos passos. O envio deste formulário não libera acesso imediato à plataforma.
          </span>
        </div>
      </div>

      {/* Benefícios */}
      <div className="max-w-2xl mx-auto px-4 pb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Users, title: "Conexões qualificadas", desc: "Match direto entre quem precisa e quem oferece" },
          { icon: Zap, title: "Fase fundadora gratuita", desc: "Primeiros aprovados entram sem custo inicial" },
          { icon: Star, title: "Curadoria ativa", desc: "Cada perfil é analisado antes do acesso" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
              <Icon className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">{title}</p>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
        ))}
      </div>

      {/* Formulário */}
      <div className="max-w-2xl mx-auto w-full px-4 pb-8">
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-6">Pré-cadastro — Fase Fundadora</h2>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nome + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Nome completo *</Label>
                <Input
                  value={form.fullName} onChange={e => setField("fullName", e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
                {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">E-mail *</Label>
                <Input
                  type="email" value={form.email} onChange={e => setField("email", e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>
            </div>

            {/* WhatsApp + Empresa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">WhatsApp *</Label>
                <Input
                  value={form.whatsapp} onChange={e => setField("whatsapp", e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
                {errors.whatsapp && <p className="text-xs text-red-400">{errors.whatsapp}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Nome da empresa / marca</Label>
                <Input
                  value={form.companyName} onChange={e => setField("companyName", e.target.value)}
                  placeholder="Nome da empresa"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* CEP → auto-preenche Cidade, Estado, Bairro */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">CEP <span className="text-slate-500 font-normal">(preenche cidade e bairro automaticamente)</span></Label>
              <Input
                value={form.cep} onChange={e => handleCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 max-w-[160px]"
              />
            </div>

            {/* Cidade + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Cidade</Label>
                <Input
                  value={form.city} onChange={e => setField("city", e.target.value)}
                  placeholder="Cidade"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Estado</Label>
                <Select value={form.state} onValueChange={v => setField("state", v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {ESTADOS.map(e => <SelectItem key={e} value={e} className="text-slate-200">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bairro + Logradouro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Bairro</Label>
                <Input
                  value={form.neighborhood} onChange={e => setField("neighborhood", e.target.value)}
                  placeholder="Bairro"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Logradouro e número</Label>
                <Input
                  value={form.addressLine} onChange={e => setField("addressLine", e.target.value)}
                  placeholder="Rua das Flores, 123"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Instagram + Site */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Instagram</Label>
                <Input
                  value={form.instagram} onChange={e => setField("instagram", e.target.value)}
                  placeholder="@suamarca"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Site (opcional)</Label>
                <Input
                  value={form.website} onChange={e => setField("website", e.target.value)}
                  placeholder="www.suamarca.com.br"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Perfil na cadeia */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Seu perfil na cadeia produtiva *</Label>
              <Select value={form.roleInChain} onValueChange={v => setField("roleInChain", v)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione seu perfil" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-slate-200">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.roleInChain && <p className="text-xs text-red-400">{errors.roleInChain}</p>}
            </div>

            {/* Especialidades */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Especialidades (selecione todas que se aplicam)</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES_OPTIONS.map(s => (
                  <button
                    key={s} type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.specialties.includes(s)
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* O que busca */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">O que você busca no Moda Conecta?</Label>
              <Textarea
                value={form.mainNeed} onChange={e => setField("mainNeed", e.target.value)}
                placeholder="Ex: Preciso de facções especializadas em malharia para produção de 500 peças/mês..."
                rows={3}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 resize-none"
              />
            </div>

            {/* O que oferece */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">O que você oferece para a rede?</Label>
              <Textarea
                value={form.mainOffer} onChange={e => setField("mainOffer", e.target.value)}
                placeholder="Ex: Somos uma facção com 15 anos de experiência em jeanswear, capacidade de 800 peças/dia..."
                rows={3}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 resize-none"
              />
            </div>

            {/* LGPD */}
            <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <Checkbox
                id="lgpd"
                checked={form.lgpdConsent}
                onCheckedChange={v => setField("lgpdConsent", Boolean(v))}
                className="mt-0.5 border-slate-500"
              />
              <label htmlFor="lgpd" className="text-sm text-slate-400 cursor-pointer leading-relaxed">
                Concordo com o uso dos meus dados para análise de perfil e contato referente ao Moda Conecta / Mirage Hub, conforme a LGPD. Não receberei spam e posso solicitar remoção a qualquer momento.
              </label>
            </div>
            {errors.lgpdConsent && <p className="text-xs text-red-400 -mt-3">{errors.lgpdConsent}</p>}

            {apiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
                {apiError}
              </div>
            )}

            <Button
              type="submit" disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 text-base"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Quero entrar para a fase fundadora"}
            </Button>

            <p className="text-center text-xs text-slate-500">
              Ao enviar, seu perfil entra em análise. O convite de acesso será enviado por e-mail após aprovação.
            </p>
          </form>
        </div>
      </div>

      {/* Rodapé */}
      <footer className="mt-auto border-t border-slate-800/60 py-6 px-4">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <img src="/mirage-logo.png" alt="Mirage" className="h-6 object-contain" style={{ filter: "brightness(0) invert(1) opacity(0.4)" }} />
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <a href="https://instagram.com/gestaomirage" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">@gestaomirage</a>
            <span>·</span>
            <a href="https://www.gestaomirage.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">gestaomirage.com.br</a>
          </div>
          <p className="text-[10px] text-slate-700">© {new Date().getFullYear()} Mirage Hub. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
