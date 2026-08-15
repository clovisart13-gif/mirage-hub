import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Package, Users, Plus, Minus, Info, ArrowRight, Sparkles, TrendingUp, TrendingDown, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Periodicidade = 'mensal' | 'anual';
type Aba = 'planos' | 'modular' | 'extras';

interface Modulo {
  id: string;
  nome: string;
  app_key: string;
  preco_mensal: number;
  preco_anual_mensal: number;
  implantacao: number;
  descricao: string;
}

interface Extra {
  id: string;
  nome: string;
  preco_mensal: number;
  preco_anual_mensal: number;
  descricao: string;
}

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco_mensal: number;
  preco_anual: number;
  preco_anual_mensal: number;
  apps_incluidos: string[];
  limites: { usuarios: number };
}

interface AssinaturaResumo {
  plano: string;
  status: string;
  plano_detalhes: Plano | null;
}

const PLANO_ORDER: Record<string, number> = { starter: 0, pro: 1, enterprise: 2 };

const MODULO_ICONS: Record<string, string> = {
  kanban:     '🏭',
  orcamento:  '📋',
  plm:        '🔬',
  comunidade: '🌐',
  crm:        '💬',
  erp:        '⚙️',
  financeiro: '💰',
};

const PLANO_MODULOS_NOMES: Record<string, string> = {
  kanban:     'Kanban Mirage',
  orcamento:  'Orçamento Mirage',
  plm:        'PLM Mirage',
  comunidade: 'Moda Conecta',
  crm:        'CRM Mirage',
  erp:        'ERP Mirage',
  financeiro: 'Financeiro Mirage',
};

const MOTIVOS_DOWNGRADE = [
  'O plano atual está acima do meu orçamento',
  'Não utilizo todos os módulos incluídos',
  'Quero testar um plano menor antes de decidir',
  'Minha operação diminuiu temporariamente',
  'Outro motivo',
];

const MOTIVOS_CANCELAMENTO = [
  'O sistema não atende minhas necessidades',
  'Preço acima do que posso pagar',
  'Estou usando outro sistema',
  'Minha confecção encerrou as atividades',
  'Foi contratado apenas para teste',
  'Outro motivo',
];

// ─── Modal de Downgrade ──────────────────────────────────────────────────────

function ModalDowngrade({
  open,
  onClose,
  planoAtual,
  planoDestino,
  periodicidade,
  modulos,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  planoAtual: Plano;
  planoDestino: Plano;
  periodicidade: Periodicidade;
  modulos: Modulo[];
  onConfirm: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const perderModulos = planoAtual.apps_incluidos.filter(
    app => !planoDestino.apps_incluidos.includes(app)
  );
  const precoDestino = periodicidade === 'anual' ? planoDestino.preco_anual_mensal : planoDestino.preco_mensal;

  const handleConfirm = async () => {
    if (!motivo) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    setLoading(false);
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-500" />
            Fazer downgrade para {planoDestino.nome}
          </DialogTitle>
          <DialogDescription>
            Você está prestes a trocar do plano <strong>{planoAtual.nome}</strong> para o <strong>{planoDestino.nome}</strong> ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(precoDestino)}/mês).
          </DialogDescription>
        </DialogHeader>

        {perderModulos.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Você perderá acesso a:
            </p>
            <ul className="space-y-1">
              {perderModulos.map(app => (
                <li key={app} className="text-sm text-amber-700 flex items-center gap-2">
                  <span>{MODULO_ICONS[app]}</span>
                  <span>{PLANO_MODULOS_NOMES[app] || app}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 mt-2">
              Todos os dados desses módulos são preservados por 30 dias após o downgrade.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Por que deseja fazer o downgrade? <span className="text-red-500">*</span></Label>
          <div className="space-y-1.5">
            {MOTIVOS_DOWNGRADE.map(m => (
              <button
                key={m}
                onClick={() => setMotivo(m)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${motivo === m ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-muted-foreground/40'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={!motivo || loading}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar downgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Cancelamento ───────────────────────────────────────────────────

function ModalCancelar({
  open,
  onClose,
  planoAtual,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  planoAtual: Plano;
  onConfirm: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);

  const podeConfirmar = motivo !== '' && confirmacao === 'CANCELAR';

  const handleConfirm = async () => {
    if (!podeConfirmar) return;
    setLoading(true);
    try {
      await apiFetch('/billing/cancelar', { method: 'POST', body: JSON.stringify({ motivo }) });
      toast.success('Assinatura cancelada. Seu acesso permanece até o fim do período pago.');
      onConfirm();
      onClose();
    } catch (e: any) {
      toast.error('Erro ao cancelar: ' + (e.message || 'tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setMotivo(''); setConfirmacao(''); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5" />
            Cancelar assinatura
          </DialogTitle>
          <DialogDescription>
            Você está cancelando o plano <strong>{planoAtual.nome}</strong>. Seu acesso continua até o fim do período já pago.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> O que acontece ao cancelar:
          </p>
          <ul className="space-y-1 text-sm text-red-700">
            <li>• Acesso a todos os módulos será removido ao fim do período</li>
            <li>• Dados ficam armazenados por 60 dias após o cancelamento</li>
            <li>• Não haverá reembolso proporcional para pagamentos já realizados</li>
            <li>• Você poderá reativar a qualquer momento com um novo plano</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Por que está cancelando? <span className="text-red-500">*</span></Label>
          <div className="space-y-1.5">
            {MOTIVOS_CANCELAMENTO.map(m => (
              <button
                key={m}
                onClick={() => setMotivo(m)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${motivo === m ? 'border-red-400 bg-red-50 text-red-700 font-medium' : 'border-border hover:border-muted-foreground/40'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Para confirmar, digite <strong className="text-red-600">CANCELAR</strong> abaixo:
          </Label>
          <Input
            value={confirmacao}
            onChange={e => setConfirmacao(e.target.value)}
            placeholder="CANCELAR"
            className="font-mono"
          />
        </div>

        <DialogFooter className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => { setMotivo(''); setConfirmacao(''); onClose(); }} disabled={loading}>
            Manter assinatura
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!podeConfirmar || loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Cancelar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Planos() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [aba, setAba] = useState<Aba>('planos');
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal');
  const [catalogo, setCatalogo] = useState<{ planos: Plano[]; modulos: Modulo[]; extras: Extra[] } | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaResumo | null>(null);
  const [assinaturaLoading, setAssinaturaLoading] = useState(false);

  // Modals
  const [downgradeTarget, setDowngradeTarget] = useState<Plano | null>(null);
  const [cancelarOpen, setCancelarOpen] = useState(false);

  // Estado da calculadora modular
  const [modulosSelecionados, setModulosSelecionados] = useState<Set<string>>(new Set());
  const [qtdUsuarios, setQtdUsuarios] = useState(0);
  const [qtdCanais, setQtdCanais] = useState(0);

  useEffect(() => {
    apiFetch('/billing/catalogo').then(setCatalogo).catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    setAssinaturaLoading(true);
    apiFetch('/billing/assinatura')
      .then((res: any) => setAssinatura(res))
      .catch(() => {})
      .finally(() => setAssinaturaLoading(false));
  }, [user, authLoading]);

  const planos = catalogo?.planos ?? [];
  const modulos = catalogo?.modulos ?? [];
  const extras = catalogo?.extras ?? [];

  const planoAtualId = assinatura?.plano ?? null;
  const planoAtualObj = planos.find(p => p.id === planoAtualId) ?? null;
  const temAssinaturaAtiva = !!planoAtualId &&
    planoAtualId !== 'sem_plano' &&
    (assinatura?.status === 'ativo' || assinatura?.status === 'trial');

  // ─── Calculadora modular ─────────────────────────────────────────
  const modulosSelecionadosList = modulos.filter(m => modulosSelecionados.has(m.id));
  const totalModular = modulosSelecionadosList.reduce((sum, m) => {
    return sum + (periodicidade === 'anual' ? m.preco_anual_mensal : m.preco_mensal);
  }, 0);
  const implantacaoModular = periodicidade === 'mensal'
    ? modulosSelecionadosList.reduce((sum, m) => sum + m.implantacao, 0)
    : 0;
  const sugestaoPlano = planos.find(p => {
    const precoPlano = periodicidade === 'anual' ? p.preco_anual_mensal : p.preco_mensal;
    return totalModular >= precoPlano && p.apps_incluidos.length >= modulosSelecionados.size;
  });
  const toggleModulo = (id: string) => {
    setModulosSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const precoExtraUsuario = extras.find(e => e.id === 'usuario_adicional');
  const precoExtraCanal   = extras.find(e => e.id === 'canal_adicional');
  const precoUsu  = periodicidade === 'anual' ? (precoExtraUsuario?.preco_anual_mensal ?? 0) : (precoExtraUsuario?.preco_mensal ?? 0);
  const precoCanal = periodicidade === 'anual' ? (precoExtraCanal?.preco_anual_mensal ?? 0) : (precoExtraCanal?.preco_mensal ?? 0);
  const totalExtras = qtdUsuarios * precoUsu + qtdCanais * precoCanal;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const irCheckoutPlano = (planoId: string) => {
    navigate(`/checkout?plano=${planoId}&periodicidade=${periodicidade}`);
  };
  const irCheckoutModular = () => {
    const ids = Array.from(modulosSelecionados).join(',');
    navigate(`/checkout?modulos=${ids}&periodicidade=${periodicidade}`);
  };

  // Determina o tipo de ação para cada plano
  type TipoAcao = 'atual' | 'upgrade' | 'downgrade' | 'assinar';
  const getTipoAcao = (plano: Plano): TipoAcao => {
    if (!temAssinaturaAtiva) return 'assinar';
    if (plano.id === planoAtualId) return 'atual';
    const ordemAtual = PLANO_ORDER[planoAtualId!] ?? -1;
    const ordemDestino = PLANO_ORDER[plano.id] ?? -1;
    return ordemDestino > ordemAtual ? 'upgrade' : 'downgrade';
  };

  const handleDowngradeConfirm = () => {
    if (downgradeTarget) irCheckoutPlano(downgradeTarget.id);
    setDowngradeTarget(null);
  };

  const handleCancelarConfirm = () => {
    setAssinatura(prev => prev ? { ...prev, plano: 'sem_plano', status: 'cancelado' } : prev);
    navigate('/hub/assinatura');
  };

  // Botão do card de plano
  const renderBotaoPlano = (plano: Plano) => {
    const tipo = getTipoAcao(plano);
    const popular = plano.id === 'pro';

    if (assinaturaLoading) {
      return (
        <Button className="w-full" variant="outline" size="lg" disabled>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...
        </Button>
      );
    }

    switch (tipo) {
      case 'atual':
        return (
          <div className="flex flex-col gap-2">
            <Button className="w-full" variant="outline" size="lg" asChild>
              <Link href="/hub/assinatura">Gerenciar assinatura</Link>
            </Button>
            <Button
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
              variant="outline"
              size="sm"
              onClick={() => setCancelarOpen(true)}
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
              Cancelar assinatura
            </Button>
          </div>
        );

      case 'upgrade':
        return (
          <Button className="w-full" size="lg" onClick={() => irCheckoutPlano(plano.id)}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Fazer upgrade
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        );

      case 'downgrade':
        return (
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            size="lg"
            onClick={() => setDowngradeTarget(plano)}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Fazer downgrade
          </Button>
        );

      default:
        return (
          <Button
            className="w-full"
            variant={popular ? 'default' : 'outline'}
            size="lg"
            onClick={() => irCheckoutPlano(plano.id)}
          >
            Assinar {plano.nome}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        );
    }
  };

  return (
    <Layout>
      <div className="py-16 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* Modals */}
        {downgradeTarget && planoAtualObj && (
          <ModalDowngrade
            open={!!downgradeTarget}
            onClose={() => setDowngradeTarget(null)}
            planoAtual={planoAtualObj}
            planoDestino={downgradeTarget}
            periodicidade={periodicidade}
            modulos={modulos}
            onConfirm={handleDowngradeConfirm}
          />
        )}
        {planoAtualObj && (
          <ModalCancelar
            open={cancelarOpen}
            onClose={() => setCancelarOpen(false)}
            planoAtual={planoAtualObj}
            onConfirm={handleCancelarConfirm}
          />
        )}

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          {temAssinaturaAtiva && planoAtualObj ? (
            <>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                <Check className="w-4 h-4" />
                Seu plano atual: {planoAtualObj.nome}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                Gerencie seu plano
              </h1>
              <p className="text-lg text-muted-foreground">
                Faça upgrade, downgrade ou ajuste seu pacote a qualquer momento.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                Gestão completa para sua confecção
              </h1>
              <p className="text-lg text-muted-foreground">
                Escolha o plano ideal ou monte exatamente o que você precisa. Sem surpresas, sem objeções.
              </p>
            </>
          )}
        </div>

        {/* Toggle Mensal / Anual */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1">
            <button
              onClick={() => setPeriodicidade('mensal')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${periodicidade === 'mensal' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setPeriodicidade('anual')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${periodicidade === 'anual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            >
              Anual
              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>

        {periodicidade === 'anual' && (
          <p className="text-center text-sm text-green-600 font-medium mb-6">
            ✅ Plano anual: 20% de desconto + <strong>taxa de implantação grátis</strong>
          </p>
        )}

        {/* Abas */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex gap-1 bg-muted rounded-xl p-1">
            {([
              { id: 'planos',   label: 'Planos',            icon: Sparkles },
              { id: 'modular',  label: 'Monte seu pacote',  icon: Package },
              { id: 'extras',   label: 'Add-ons & Extras',  icon: Plus },
            ] as { id: Aba; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  aba === id ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ ABA: PLANOS ═══════════════════════════════════════════ */}
        {aba === 'planos' && (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            {planos.map((plano) => {
              const popular = plano.id === 'pro';
              const tipo = getTipoAcao(plano);
              const preco = periodicidade === 'anual' ? plano.preco_anual_mensal : plano.preco_mensal;
              const isAtual = tipo === 'atual';

              return (
                <Card
                  key={plano.id}
                  className={`relative flex flex-col transition-all ${
                    isAtual
                      ? 'border-2 border-primary shadow-xl ring-2 ring-primary/20'
                      : popular && !temAssinaturaAtiva
                      ? 'border-primary shadow-xl scale-105 z-10'
                      : ''
                  }`}
                >
                  {isAtual && (
                    <div className="absolute top-0 inset-x-0 -translate-y-1/2 flex justify-center">
                      <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                        Seu plano atual
                      </span>
                    </div>
                  )}
                  {!isAtual && popular && !temAssinaturaAtiva && (
                    <div className="absolute top-0 inset-x-0 -translate-y-1/2 flex justify-center">
                      <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                        Mais Escolhido
                      </span>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center justify-between">
                      {plano.nome}
                      {temAssinaturaAtiva && tipo === 'upgrade' && (
                        <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Upgrade</Badge>
                      )}
                      {temAssinaturaAtiva && tipo === 'downgrade' && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Downgrade</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{plano.descricao}</p>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-muted-foreground text-lg">R$</span>
                        <span className="text-4xl font-extrabold">{preco}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                      {periodicidade === 'anual' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          R$ {plano.preco_anual.toLocaleString('pt-BR')}/ano · sem implantação
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-2.5">
                      {plano.apps_incluidos.map(app => (
                        <li key={app} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          <span>{MODULO_ICONS[app]} {PLANO_MODULOS_NOMES[app] || app}</span>
                        </li>
                      ))}
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4 shrink-0" />
                        {plano.limites.usuarios === -1 ? 'Usuários ilimitados' : `Até ${plano.limites.usuarios} usuários`}
                      </li>
                    </ul>
                  </CardContent>

                  <CardFooter>
                    {renderBotaoPlano(plano)}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* ═══ ABA: MODULAR ══════════════════════════════════════════ */}
        {aba === 'modular' && (
          <div className="max-w-5xl mx-auto mb-20">
            <p className="text-center text-muted-foreground mb-8">
              Selecione apenas os módulos que você precisa. O total é calculado automaticamente.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {modulos.map((modulo) => {
                const selecionado = modulosSelecionados.has(modulo.id);
                const preco = periodicidade === 'anual' ? modulo.preco_anual_mensal : modulo.preco_mensal;
                return (
                  <button
                    key={modulo.id}
                    onClick={() => toggleModulo(modulo.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selecionado
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{MODULO_ICONS[modulo.app_key]}</span>
                          <span className="font-semibold">{modulo.nome}</span>
                          {selecionado && <Badge className="text-[10px] h-4">Selecionado</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{modulo.descricao}</p>
                        {periodicidade === 'mensal' && modulo.implantacao > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            + {fmt(modulo.implantacao)} implantação (única vez)
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold">{fmt(preco)}</p>
                        <p className="text-[11px] text-muted-foreground">/mês</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Resumo calculadora */}
            <div className="border-2 rounded-2xl p-6 bg-card sticky bottom-4">
              {modulosSelecionados.size === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-2">
                  Selecione pelo menos um módulo para ver o total
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5 mb-4">
                    {modulosSelecionadosList.map(m => {
                      const p = periodicidade === 'anual' ? m.preco_anual_mensal : m.preco_mensal;
                      return (
                        <div key={m.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{MODULO_ICONS[m.app_key]} {m.nome}</span>
                          <span>{fmt(p)}/mês</span>
                        </div>
                      );
                    })}
                    {implantacaoModular > 0 && (
                      <div className="flex justify-between text-sm text-amber-600 border-t pt-1.5">
                        <span>Taxa de implantação (única)</span>
                        <span>{fmt(implantacaoModular)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                      <span>Total mensal</span>
                      <span>{fmt(totalModular)}/mês</span>
                    </div>
                  </div>

                  {sugestaoPlano && (() => {
                    const precoSugestao = periodicidade === 'anual' ? sugestaoPlano.preco_anual_mensal : sugestaoPlano.preco_mensal;
                    if (precoSugestao <= totalModular) return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm">
                        <p className="font-semibold text-amber-800 mb-1">💡 Dica de economia</p>
                        <p className="text-amber-700">
                          O plano <strong>{sugestaoPlano.nome}</strong> ({fmt(precoSugestao)}/mês) inclui tudo isso e mais módulos pelo mesmo valor ou menos.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                          onClick={() => setAba('planos')}
                        >
                          Ver plano {sugestaoPlano.nome}
                        </Button>
                      </div>
                    );
                    return null;
                  })()}

                  <Button className="w-full" size="lg" onClick={irCheckoutModular} disabled={modulosSelecionados.size === 0}>
                    Contratar {modulosSelecionados.size} módulo{modulosSelecionados.size !== 1 ? 's' : ''} — {fmt(totalModular)}/mês
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ ABA: EXTRAS ═══════════════════════════════════════════ */}
        {aba === 'extras' && (
          <div className="max-w-3xl mx-auto mb-20">
            <p className="text-center text-muted-foreground mb-8">
              Já tem um plano ou pacote? Acrescente o que precisar sem mudar de contrato.
            </p>

            <div className="space-y-4 mb-8">
              {/* Usuário adicional */}
              <div className="border rounded-xl p-5 bg-card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span className="font-semibold">Usuário adicional</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Adicione mais usuários além do limite do seu plano.</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">{fmt(precoUsu)}</p>
                    <p className="text-xs text-muted-foreground">por usuário/mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQtdUsuarios(Math.max(0, qtdUsuarios - 1))}>
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-8 text-center font-bold">{qtdUsuarios}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQtdUsuarios(qtdUsuarios + 1)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  {qtdUsuarios > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">= {fmt(qtdUsuarios * precoUsu)}/mês</span>
                  )}
                </div>
              </div>

              {/* Canal adicional */}
              <div className="border rounded-xl p-5 bg-card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-5 h-5 text-muted-foreground" />
                      <span className="font-semibold">Canal adicional</span>
                      <Badge variant="outline" className="text-[10px]">WhatsApp, Instagram...</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Adicione canais de comunicação ao CRM Mirage (WhatsApp, redes sociais).</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">{fmt(precoCanal)}</p>
                    <p className="text-xs text-muted-foreground">por canal/mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQtdCanais(Math.max(0, qtdCanais - 1))}>
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-8 text-center font-bold">{qtdCanais}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQtdCanais(qtdCanais + 1)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  {qtdCanais > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">= {fmt(qtdCanais * precoCanal)}/mês</span>
                  )}
                </div>
              </div>
            </div>

            {totalExtras > 0 && (
              <div className="border-2 rounded-2xl p-6 bg-card mb-4">
                <div className="flex flex-col gap-1.5 mb-4">
                  {qtdUsuarios > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{qtdUsuarios}x Usuário adicional</span>
                      <span>{fmt(qtdUsuarios * precoUsu)}/mês</span>
                    </div>
                  )}
                  {qtdCanais > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{qtdCanais}x Canal adicional</span>
                      <span>{fmt(qtdCanais * precoCanal)}/mês</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                    <span>Total extras</span>
                    <span>{fmt(totalExtras)}/mês</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate(`/checkout?extras=usuario_adicional:${qtdUsuarios},canal_adicional:${qtdCanais}&periodicidade=${periodicidade}`)}
                >
                  Adicionar extras — {fmt(totalExtras)}/mês
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Extras são cobrados proporcionalmente ao período restante do mês atual e adicionados à sua próxima fatura.</p>
            </div>
          </div>
        )}

        {/* Comparativo de planos */}
        {aba === 'planos' && (
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-xl font-bold text-center mb-6">O que está incluído em cada plano</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Módulo</th>
                    {planos.map(p => (
                      <th key={p.id} className={`text-center py-3 px-4 font-semibold ${p.id === planoAtualId ? 'text-primary' : ''}`}>
                        {p.nome}
                        {p.id === planoAtualId && <span className="ml-1 text-[10px] text-primary">✓ atual</span>}
                      </th>
                    ))}
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Avulso</th>
                  </tr>
                </thead>
                <tbody>
                  {modulos.map(m => (
                    <tr key={m.id} className="border-b hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="mr-2">{MODULO_ICONS[m.app_key]}</span>
                        {m.nome}
                      </td>
                      {planos.map(p => (
                        <td key={p.id} className="text-center py-3 px-4">
                          {p.apps_incluidos.includes(m.app_key)
                            ? <Check className="w-4 h-4 text-green-600 mx-auto" />
                            : <span className="text-muted-foreground/40">—</span>
                          }
                        </td>
                      ))}
                      <td className="text-center py-3 px-4 text-muted-foreground text-xs">
                        {fmt(periodicidade === 'anual' ? m.preco_anual_mensal : m.preco_mensal)}/mês
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-muted-foreground">👥 Usuários inclusos</td>
                    {planos.map(p => (
                      <td key={p.id} className="text-center py-3 px-4 text-sm font-medium">
                        {p.limites.usuarios === -1 ? '∞' : p.limites.usuarios}
                      </td>
                    ))}
                    <td className="text-center py-3 px-4 text-muted-foreground text-xs">3 base</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td className="py-4 px-4 font-bold">
                      {periodicidade === 'anual' ? 'Por mês (anual)' : 'Por mês'}
                    </td>
                    {planos.map(p => {
                      const preco = periodicidade === 'anual' ? p.preco_anual_mensal : p.preco_mensal;
                      const tipo = getTipoAcao(p);
                      return (
                        <td key={p.id} className="text-center py-4 px-4">
                          <div className="font-extrabold text-lg">{fmt(preco)}</div>
                          {tipo === 'atual' ? (
                            <span className="inline-block mt-2 text-xs text-primary font-semibold">Plano atual</span>
                          ) : tipo === 'upgrade' ? (
                            <Button size="sm" className="mt-2 h-7 text-xs" onClick={() => irCheckoutPlano(p.id)}>
                              Upgrade
                            </Button>
                          ) : tipo === 'downgrade' ? (
                            <Button size="sm" className="mt-2 h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setDowngradeTarget(p)}>
                              Downgrade
                            </Button>
                          ) : (
                            <Button size="sm" className="mt-2 h-7 text-xs" variant={p.id === 'pro' ? 'default' : 'outline'} onClick={() => irCheckoutPlano(p.id)}>
                              Assinar
                            </Button>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-4 px-4">
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setAba('modular')}>
                        Montar pacote
                      </Button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Perguntas Frequentes</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>Posso combinar plano + módulos avulsos?</AccordionTrigger>
              <AccordionContent>
                Sim! Você pode assinar um plano e adicionar módulos extras individualmente. Por exemplo, contratar o plano Pro e adicionar o ERP Mirage como módulo avulso.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>O que é a taxa de implantação?</AccordionTrigger>
              <AccordionContent>
                A taxa de implantação é um valor único cobrado na contratação de alguns módulos (Kanban, CRM e ERP) que cobre a configuração inicial, migração de dados e treinamento. Ao optar pelo plano anual, essa taxa é zerada.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Como funciona o desconto anual?</AccordionTrigger>
              <AccordionContent>
                Ao escolher a cobrança anual, você paga 20% menos por mês e ainda ganha a taxa de implantação gratuita. O valor total do ano é cobrado de uma vez ou pode ser parcelado — entre em contato para saber mais.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Posso mudar de plano depois?</AccordionTrigger>
              <AccordionContent>
                Sim. Você pode fazer upgrade ou downgrade a qualquer momento. No upgrade, o valor é cobrado proporcionalmente. No downgrade, o crédito é aplicado na próxima fatura.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Preciso de cartão de crédito para testar?</AccordionTrigger>
              <AccordionContent>
                Não. Você pode criar uma conta gratuita e explorar os módulos em modo trial por 14 dias, sem cartão.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q6">
              <AccordionTrigger>O canal adicional serve para quê?</AccordionTrigger>
              <AccordionContent>
                O canal adicional permite conectar mais contas de WhatsApp, Instagram ou outras redes sociais ao CRM Mirage. Cada número de WhatsApp ou perfil de rede social é um canal separado.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

      </div>
    </Layout>
  );
}
