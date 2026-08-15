import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle, ArrowRight, Star, Users, Zap } from "lucide-react";

interface LeadInfo {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string | null;
  companyName: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  neighborhood: string | null;
  addressLine: string | null;
  roleInChain: string | null;
  specialties: string[] | null;
  status: string;
}

export default function ModaConectaConvite() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token de convite não encontrado na URL.");
      setLoading(false);
      return;
    }
    fetch(`/api/moda-conecta/leads/by-token/${encodeURIComponent(token)}`)
      .then(r => {
        if (!r.ok) return r.json().then((e: any) => Promise.reject(e.error || "Convite inválido"));
        return r.json();
      })
      .then((data: LeadInfo) => {
        setLead(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(typeof err === "string" ? err : "Convite não encontrado ou expirado.");
        setLoading(false);
      });
  }, [token]);

  function buildCadastroUrl(): string {
    if (!lead) return "/hub/comunidade/cadastro-fornecedor";
    const p = new URLSearchParams();
    if (lead.fullName)     p.set("pf_name",     lead.fullName);
    if (lead.email)        p.set("pf_email",    lead.email);
    if (lead.whatsapp)     p.set("pf_phone",    lead.whatsapp);
    if (lead.city)         p.set("pf_cidade",   lead.city);
    if (lead.state)        p.set("pf_estado",   lead.state);
    if (lead.cep)          p.set("pf_cep",      lead.cep);
    if (lead.neighborhood) p.set("pf_bairro",   lead.neighborhood);
    if (lead.addressLine)  p.set("pf_endereco", lead.addressLine);
    p.set("pf_token", token);
    return `/hub/comunidade/cadastro-fornecedor?${p.toString()}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto ring-2 ring-red-500/30">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Convite inválido</h1>
            <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
          </div>
          <p className="text-slate-500 text-xs">
            Se você acredita que é um erro, entre em contato pelo WhatsApp da equipe Moda Conecta.
          </p>
        </div>
      </div>
    );
  }

  const firstName = lead!.fullName.split(" ")[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">

        {/* Badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 text-xs text-green-300 font-medium mb-6">
            <CheckCircle className="w-3.5 h-3.5" /> Convite aprovado — Fase Fundadora
          </div>
        </div>

        {/* Avatar + saudação */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4 ring-2 ring-purple-500/40">
            <span className="text-3xl font-bold text-purple-300">
              {firstName.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Bem-vindo(a),{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {firstName}!
            </span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Seu perfil foi selecionado para a <strong className="text-purple-300">Fase Fundadora</strong> do{" "}
            <strong className="text-white">Moda Conecta</strong>. Complete o cadastro para entrar no diretório.
          </p>
        </div>

        {/* Benefícios */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, title: "Diretório exclusivo", desc: "Visível para marcas e confecções da rede" },
            { icon: Zap,   title: "Acesso gratuito",    desc: "Fundadores não pagam na primeira rodada" },
            { icon: Star,  title: "Perfil curado",      desc: "Sua presença é um diferencial de qualidade" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                <Icon className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-xs font-semibold text-white mb-0.5">{title}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
            </div>
          ))}
        </div>

        {/* Pré-preenchimento */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-sm text-purple-200 flex items-start gap-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-purple-400 mt-0.5" />
          <span>
            <strong>Seus dados já estão pré-preenchidos</strong> — nome, e-mail, cidade e endereço vieram
            do seu pré-cadastro. Só preencher as especialidades e detalhes do seu trabalho.
          </span>
        </div>

        {/* CTA */}
        <a href={buildCadastroUrl()}>
          <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-4 text-base">
            Completar meu cadastro <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </a>

        <p className="text-center text-xs text-slate-500">
          Este link é pessoal e intransferível. Ao completar o cadastro, você confirma os termos da Fase Fundadora.
        </p>
      </div>
    </div>
  );
}
