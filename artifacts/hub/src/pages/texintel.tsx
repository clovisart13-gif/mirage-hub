import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  Brain, ExternalLink, ArrowLeft, BarChart3,
  Search, Target, TrendingUp, Database, CheckCircle2, Zap,
} from 'lucide-react';

const TEXINTEL_URL = '/texintel/';

const features = [
  { icon: Search, title: 'Busca por CNPJ', desc: 'Insira qualquer CNPJ do setor de moda/vestuário de SP e o sistema coleta automaticamente dados da Receita Federal e do site da empresa.' },
  { icon: Brain, title: 'Análise com Claude', desc: 'A IA lê o site e os dados públicos da empresa e extrai as principais dores operacionais e estima a capacidade de investimento.' },
  { icon: Target, title: 'Fit por Módulo', desc: 'Cada empresa recebe um score de 0 a 100 para CRM, ERP, PLM e Comunidade — indicando qual módulo do Hub tem maior aderência.' },
  { icon: BarChart3, title: 'Dashboard de Prospecção', desc: 'Visualize todo o banco de empresas qualificadas, filtre por módulo recomendado e priorize os leads com maior potencial.' },
  { icon: TrendingUp, title: 'Machine Growth', desc: 'O banco do TexIntel alimenta diretamente a máquina de Growth do Hub Mirage para campanhas e sequências de prospecção B2B.' },
  { icon: Database, title: 'Base Viva', desc: 'A base cresce continuamente. Cada novo CNPJ analisado enriquece o ecossistema de prospecção do Hub Mirage.' },
];

export default function TexintelApp() {
  return (
    <KanbanLayout>
      <div className="px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-800 p-8 text-white">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Brain size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">TexIntel AI</h1>
                  <p className="text-violet-200 text-sm">Engine de Inteligência B2B — Moda & Vestuário SP</p>
                </div>
              </div>
              <p className="text-violet-100 leading-relaxed">
                Análise automatizada de CNPJs do setor têxtil paulista. O TexIntel usa Claude para 
                extrair dores, estimar faturamento e identificar qual módulo do Hub Mirage 
                tem maior fit para cada empresa — direto no banco de prospecção.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Claude AI', 'CNPJ Automático', 'Fit Score', 'Growth Machine'].map(tag => (
                  <span key={tag} className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <Link href={TEXINTEL_URL}>
                <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 gap-2 w-full sm:w-auto font-semibold shadow-lg">
                  <ExternalLink size={16} />
                  Abrir TexIntel AI
                </Button>
              </Link>
              <p className="text-xs text-violet-300 text-center">Abre na ferramenta · /texintel</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { stat: 'CRM', label: 'Funil de vendas' },
            { stat: 'ERP', label: 'Gestão fiscal' },
            { stat: 'PLM', label: 'Coleção & modelagem' },
            { stat: 'Hub', label: 'Comunidade têxtil' },
          ].map(s => (
            <div key={s.label} className="text-center p-4 rounded-xl border bg-card">
              <p className="text-xl font-bold text-violet-600">{s.stat}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Funcionalidades</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.title} className="flex gap-3 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <f.icon size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Como funciona</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Insira o CNPJ', desc: 'Cole o CNPJ de qualquer empresa de confecção ou moda de São Paulo. O sistema busca automaticamente na Receita Federal e no site da empresa.' },
              { step: '2', title: 'Claude analisa', desc: 'A IA lê o conteúdo do site, identifica as dores operacionais e estima a capacidade de investimento com base nos dados públicos.' },
              { step: '3', title: 'Fit score calculado', desc: 'Cada empresa recebe um score individual por módulo (CRM/ERP/PLM/Comunidade). O módulo com maior score vira a recomendação de entrada.' },
              { step: '4', title: 'Growth Machine age', desc: 'Os leads qualificados entram automaticamente na fila da máquina de Growth para prospecção e campanhas B2B segmentadas.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4 p-4 rounded-xl border bg-card">
                <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="rounded-2xl border bg-violet-50 dark:bg-violet-950/20 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-violet-600 shrink-0" size={24} />
            <div>
              <p className="font-semibold">Ferramenta estratégica Mirage</p>
              <p className="text-sm text-muted-foreground">Prospecção B2B inteligente para o ecossistema Hub Mirage.</p>
            </div>
          </div>
          <Link href={TEXINTEL_URL}>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
              <Zap size={14} />
              Abrir TexIntel AI
            </Button>
          </Link>
        </div>
      </div>
    </KanbanLayout>
  );
}
