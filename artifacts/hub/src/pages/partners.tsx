import { useState } from 'react';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { apiFetch } from '@/lib/api';
import {
  Briefcase, TrendingUp, Receipt, ExternalLink, Star,
  CheckCircle2, Loader2, Copy, Shield, Handshake, ArrowRight,
  Users, Award, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PARTNER_TYPES = [
  {
    id: 'contador',
    icon: Receipt,
    gradient: 'from-blue-600 to-cyan-600',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-600',
    tag: 'Financeiro & Fiscal',
    title: 'Contador / BPO Fiscal',
    desc: 'Escritórios contábeis com experiência comprovada no setor têxtil. Emissão de NF-e, SIMPLES Nacional, Lucro Presumido e todas as obrigações acessórias.',
    items: [
      'Emissão e gestão de NF-e integrada ao ERP',
      'SPED Fiscal e Contribuições',
      'Folha de pagamento para confecções',
      'Relatórios contábeis mensais',
    ],
    stat: '40+',
    statLabel: 'confecções atendidas',
  },
  {
    id: 'marketing',
    icon: TrendingUp,
    gradient: 'from-orange-500 to-rose-500',
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    iconBg: 'bg-orange-100 text-orange-600',
    tag: 'Marketing & Vendas',
    title: 'Marketing & Performance',
    desc: 'Agências especializadas em moda e confecção: tráfego pago, branding, conteúdo e estratégia B2B para o setor têxtil.',
    items: [
      'Gestão de tráfego pago (Meta, Google)',
      'Branding e identidade visual para confecção',
      'Conteúdo e social media para B2B e varejo',
      'Estratégia de vendas digitais',
    ],
    stat: '3x',
    statLabel: 'mais leads qualificados',
  },
  {
    id: 'consultoria',
    icon: Briefcase,
    gradient: 'from-violet-600 to-purple-700',
    bgLight: 'bg-violet-50',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    iconBg: 'bg-violet-100 text-violet-600',
    tag: 'Gestão & Processos',
    title: 'Consultoria de Gestão',
    desc: 'Consultores que já estruturaram dezenas de confecções: processos, custos, equipe e escalabilidade integrados ao ecossistema Mirage.',
    items: [
      'Diagnóstico e mapeamento de processos',
      'Estruturação de custo de produção',
      'Implantação do ecossistema Mirage',
      'Mentoria para gestores e donos de confecção',
    ],
    stat: '60d',
    statLabel: 'para ver resultados',
  },
];

const DIFERENCIAIS = [
  { icon: Shield,   title: 'Certificados Mirage', desc: 'Todos os parceiros passam por seleção e validação da nossa equipe.' },
  { icon: Star,     title: 'NPS 9+ garantido',    desc: 'Só permanecem na rede parceiros com altíssima satisfação dos clientes.' },
  { icon: Zap,      title: 'Integração nativa',   desc: 'Trabalham com o ecossistema Mirage, sem fricção e sem retrabalho.' },
  { icon: Users,    title: '30+ parceiros ativos', desc: 'Rede em crescimento com especialistas de todo o Brasil.' },
];

export default function PartnersApp() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleVisitar = async (partnerId: string) => {
    setLoadingId(partnerId);
    try {
      const res = await apiFetch(`/parceiros/click/${partnerId}`);
      if (res?.redirect) {
        toast.success(
          `Seu cupom: ${res.cupom} — use ao entrar em contato com o parceiro!`,
          { duration: 6000 }
        );
        setTimeout(() => window.open(res.redirect, '_blank', 'noopener,noreferrer'), 400);
      }
    } catch {
      toast.error('Erro ao gerar link de acesso');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <KanbanLayout>
      <div className="px-6 py-8 space-y-6 w-full overflow-auto">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl relative bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-700 overflow-hidden">
          {/* Padrão decorativo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/30" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/20" />
          </div>
          <div className="relative px-8 py-10 text-white">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 border border-white/20">
                <Handshake size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">Partners Mirage</h1>
                  <span className="text-[10px] font-bold bg-white/20 border border-white/30 px-2 py-0.5 rounded-full">CERTIFICADOS</span>
                </div>
                <p className="text-violet-200 text-sm max-w-lg leading-relaxed">
                  Conectamos sua confecção a contadores, agências de marketing e consultores
                  especializados no setor têxtil — todos selecionados pela Mirage.
                </p>
              </div>
            </div>

            {/* Diferenciais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {DIFERENCIAIS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/15">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className="text-violet-200" />
                    <span className="text-xs font-semibold text-white">{title}</span>
                  </div>
                  <p className="text-[10px] text-violet-300 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Aviso cupom ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <Copy size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Como funciona o cupom Mirage?</p>
              <p className="text-amber-700 mt-0.5 text-xs leading-relaxed">
                Ao clicar em "Visitar Parceiro", você recebe um cupom exclusivo
                (ex: <strong>MIRAGE-SUA-EMPRESA</strong>). Apresente esse cupom ao parceiro para
                identificar que veio pelo Hub Mirage e eventualmente receber condições especiais.
              </p>
            </div>
          </div>
        </div>

        {/* ── Cards de parceiros ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {PARTNER_TYPES.map((p) => {
            const Icon = p.icon;
            const isLoading = loadingId === p.id;
            return (
              <div key={p.id} className={cn('rounded-2xl border-2 bg-card overflow-hidden shadow-sm', p.border)}>
                {/* Faixa de cor */}
                <div className={cn('h-1.5 bg-gradient-to-r', p.gradient)} />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', p.iconBg)}>
                      <Icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', p.badge)}>{p.tag}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 border">Parceiros disponíveis</span>
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-1">{p.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{p.desc}</p>

                      <div className="flex gap-4 items-start">
                        {/* Lista de itens */}
                        <ul className="flex-1 space-y-1.5">
                          {p.items.map(item => (
                            <li key={item} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                              <span className="text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Stat */}
                        <div className={cn('rounded-xl px-4 py-3 text-center shrink-0', p.bgLight)}>
                          <p className={cn('text-2xl font-black bg-gradient-to-br bg-clip-text text-transparent', p.gradient)}>{p.stat}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 max-w-[80px]">{p.statLabel}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <Button
                          onClick={() => handleVisitar(p.id)}
                          disabled={isLoading}
                          size="sm"
                          className={cn('gap-2 text-xs h-8 text-white bg-gradient-to-r', p.gradient, 'hover:opacity-90 border-0')}
                        >
                          {isLoading ? (
                            <><Loader2 size={13} className="animate-spin" /> Gerando link...</>
                          ) : (
                            <><ExternalLink size={13} /> Visitar Parceiro</>
                          )}
                        </Button>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Award size={10} className="text-amber-500" /> Parceiro certificado Mirage
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CTA Seja Parceiro ─────────────────────────────────────────────── */}
        <div>
          <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-indigo-50 px-6 py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 mx-auto flex items-center justify-center">
              <Handshake size={22} className="text-violet-600" />
            </div>
            <h2 className="text-base font-bold text-foreground">Quer ser um parceiro Mirage?</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Se você é contador, agência ou consultor especializado em confecção,
              entre em contato para fazer parte da rede de parceiros certificados.
            </p>
            <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white" size="sm">
              <a href="mailto:parceiros@gestaomirage.com.br" className="flex items-center gap-2">
                <ArrowRight size={13} /> Solicitar credenciamento
              </a>
            </Button>
          </div>
        </div>

      </div>
    </KanbanLayout>
  );
}
