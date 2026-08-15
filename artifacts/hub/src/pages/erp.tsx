import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  FileText, ExternalLink, ArrowLeft, BarChart3,
  Package, Zap, TrendingUp, DollarSign, CheckCircle2, BookOpen,
} from 'lucide-react';

const ERP_URL = 'https://erp.gestaomirage.com.br';

const features = [
  { icon: FileText, title: 'Emissão de NF-e e NFS-e', desc: 'Emita notas fiscais eletrônicas diretamente pelo sistema, com transmissão automática para a SEFAZ.' },
  { icon: DollarSign, title: 'Controle Financeiro Completo', desc: 'Contas a pagar, contas a receber, fluxo de caixa e DRE atualizados em tempo real.' },
  { icon: Package, title: 'Gestão de Estoque Integrada', desc: 'Controle matéria-prima e produto acabado com movimentação automática ao registrar produção.' },
  { icon: BarChart3, title: 'Relatórios Gerenciais', desc: 'DRE, fluxo de caixa, balanço e relatórios prontos para o contador — sem planilhas.' },
  { icon: Zap, title: 'Contas a Pagar e Receber', desc: 'Gerencie boletos, transferências e cobranças com alertas de vencimento automáticos.' },
  { icon: TrendingUp, title: 'Integrado ao Ecossistema', desc: 'Sincroniza com Kanban, Orçamento e CRM — dados únicos em todo o sistema, sem redigitação.' },
];

export default function ERPApp() {
  return (
    <KanbanLayout>
      <div className="px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-8 text-white">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">ERP Mirage</h1>
                  <p className="text-slate-300 text-sm">Gestão Fiscal & Financeira Completa</p>
                </div>
              </div>
              <p className="text-slate-200 leading-relaxed">
                Sistema ERP completo para indústrias têxteis: emissão de NF-e, gestão financeira, 
                controle de estoque e relatórios contábeis — tudo integrado ao ecossistema Mirage 
                sem redigitação.
              </p>
              <div className="flex flex-wrap gap-2">
                {['NF-e / NFS-e', 'Financeiro', 'Estoque', 'Contabilidade'].map(tag => (
                  <span key={tag} className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <a href={ERP_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-white text-slate-800 hover:bg-slate-100 gap-2 w-full sm:w-auto font-semibold shadow-lg">
                  <ExternalLink size={16} />
                  Acessar ERP Mirage
                </Button>
              </a>
              <p className="text-xs text-slate-400 text-center">Abre em nova aba · erp.gestaomirage.com.br</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { stat: '100%', label: 'Integrado ao ecossistema' },
            { stat: 'NF-e', label: 'Emitida em segundos' },
            { stat: '0', label: 'Planilhas necessárias' },
          ].map(s => (
            <div key={s.label} className="text-center p-4 rounded-xl border bg-card">
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{s.stat}</p>
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
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
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
              { step: '1', title: 'Integre com o ecossistema Mirage', desc: 'O ERP se conecta automaticamente ao Kanban e ao Orçamento. Quando uma OP é finalizada, o financeiro já sabe.' },
              { step: '2', title: 'Emita NF-e em segundos', desc: 'Com os dados da produção já registrados, emitir a nota fiscal é apenas confirmar e transmitir. Sem redigitação.' },
              { step: '3', title: 'Gestão financeira completa', desc: 'DRE, fluxo de caixa, relatórios para o contador — tudo atualizado automaticamente, sem planilhas.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4 p-4 rounded-xl border bg-card">
                <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
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

        {/* Acesso */}
        <div className="rounded-2xl border bg-slate-50 dark:bg-slate-900/30 p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <BookOpen className="text-slate-600 shrink-0 mt-0.5" size={22} />
            <div className="flex-1 space-y-2">
              <p className="font-semibold">Primeiro acesso ao ERP</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ao acessar pela primeira vez, use as credenciais fornecidas pela equipe Mirage durante o onboarding. 
                Se não recebeu suas credenciais, entre em contato pelo suporte.
              </p>
            </div>
          </div>
        </div>

        {/* CTA final */}
        <div className="rounded-2xl border bg-slate-100 dark:bg-slate-800/30 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-slate-600 shrink-0" size={24} />
            <div>
              <p className="font-semibold">Acesso incluído no plano Enterprise</p>
              <p className="text-sm text-muted-foreground">Entre no sistema para gerenciar sua operação fiscal e financeira.</p>
            </div>
          </div>
          <a href={ERP_URL} target="_blank" rel="noopener noreferrer">
            <Button className="bg-slate-700 hover:bg-slate-800 text-white gap-2">
              <ExternalLink size={14} />
              Abrir ERP Mirage
            </Button>
          </a>
        </div>
      </div>
    </KanbanLayout>
  );
}
