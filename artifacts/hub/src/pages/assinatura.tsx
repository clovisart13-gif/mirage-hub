import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, ExternalLink,
  CreditCard, ArrowRight, MessageCircle, LayoutGrid, RefreshCw,
  CalendarDays, Zap, Package, ShieldCheck, Crown, Plus, Users, Radio,
} from 'lucide-react';

const WHATSAPP_SUPORTE = '5511992436154';

const APP_INFO: Record<string, { nome: string; icon: React.ReactNode; desc: string }> = {
  kanban:     { nome: 'Kanban Mirage',      icon: <LayoutGrid className="w-4 h-4" />, desc: 'Controle de pedidos e etapas' },
  orcamento:  { nome: 'Orçamento Mirage',   icon: <CreditCard className="w-4 h-4" />, desc: 'Fichas de custo e orçamentos' },
  comunidade: { nome: 'Moda Conecta',       icon: <Zap className="w-4 h-4" />,        desc: 'Comunidade e fornecedores' },
  plm:        { nome: 'PLM Mirage',         icon: <Package className="w-4 h-4" />,    desc: 'Gestão do ciclo do produto' },
  crm:        { nome: 'CRM Mirage',         icon: <ShieldCheck className="w-4 h-4" />,desc: 'Gestão de leads e clientes' },
  erp:        { nome: 'ERP Mirage',         icon: <Crown className="w-4 h-4" />,      desc: 'Sistema integrado completo' },
  financeiro: { nome: 'Financeiro Mirage',  icon: <Plus className="w-4 h-4" />,       desc: 'Extrato OFX, fluxo de caixa' },
};

const PLANO_COR: Record<string, string> = {
  starter:    'from-violet-500 to-violet-700',
  pro:        'from-blue-500 to-blue-700',
  enterprise: 'from-slate-600 to-slate-800',
  sem_plano:  'from-gray-400 to-gray-600',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  ativo:     { label: 'Ativo',     color: 'text-green-700',  icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, bg: 'bg-green-50 border-green-200' },
  trial:     { label: 'Trial',     color: 'text-blue-700',   icon: <Clock className="w-5 h-5 text-blue-500" />,         bg: 'bg-blue-50 border-blue-200' },
  vencido:   { label: 'Vencido',   color: 'text-red-700',    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,  bg: 'bg-red-50 border-red-200' },
  cancelado: { label: 'Cancelado', color: 'text-gray-600',   icon: <XCircle className="w-5 h-5 text-gray-400" />,       bg: 'bg-gray-50 border-gray-200' },
  sem_plano: { label: 'Sem plano', color: 'text-gray-600',   icon: <XCircle className="w-5 h-5 text-gray-400" />,       bg: 'bg-gray-50 border-gray-200' },
};

const PAG_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING:   { label: 'Aguardando', variant: 'secondary' },
  RECEIVED:  { label: 'Recebido',   variant: 'default' },
  CONFIRMED: { label: 'Confirmado', variant: 'default' },
  OVERDUE:   { label: 'Vencido',    variant: 'destructive' },
  REFUNDED:  { label: 'Estornado',  variant: 'outline' },
  CANCELED:  { label: 'Cancelado',  variant: 'outline' },
};

const FORMA_PAG: Record<string, string> = {
  PIX: 'PIX', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão',
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

function fmtCurrency(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface AddonItem {
  id: number;
  tipo: string;
  item_id: string;
  app_key: string | null;
  quantidade: number;
  periodicidade: string;
  preco_mensal: number;
  status: string;
}

interface AssinaturaData {
  tenant_id: string;
  nome: string;
  plano: string;
  plano_detalhes: any;
  status: string;
  expira_em: string | null;
  dias_restantes: number | null;
  apps_ativos: Array<{ app_key: string; activated_at: string }>;
  modulos_ativos: AddonItem[];
  extras_ativos: AddonItem[];
  usuarios_extras: number;
  canais_extras: number;
  faturas: Array<{
    id: string;
    descricao: string;
    valor: number;
    vencimento: string;
    data_pagamento: string | null;
    status: string;
    forma_pagamento: string;
    invoice_url: string | null;
    boleto_url: string | null;
  }>;
  customer_portal_url: string | null;
  asaas_enabled: boolean;
}

const MODULO_NOMES: Record<string, string> = {
  kanban: '🏭 Kanban Mirage', orcamento: '📋 Orçamento Mirage',
  plm: '🔬 PLM Mirage', comunidade: '🌐 Moda Conecta',
  crm: '💬 CRM Mirage', erp: '⚙️ ERP Mirage', financeiro: '💰 Financeiro Mirage',
};

export default function Assinatura() {
  const [data, setData] = useState<AssinaturaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/billing/assinatura/faturas');
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar informações da assinatura');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const status = data?.status ?? 'sem_plano';
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['sem_plano'];
  const planoGrad = PLANO_COR[data?.plano ?? 'sem_plano'] ?? PLANO_COR['sem_plano'];
  const planoNome = data?.plano_detalhes?.nome ?? (data?.plano === 'sem_plano' ? 'Sem plano' : data?.plano ?? '—');
  const preco = data?.plano_detalhes?.preco_mensal;
  const diasRestantes = data?.dias_restantes;

  const isAlerta = status === 'vencido' || (diasRestantes !== null && diasRestantes <= 7 && status === 'ativo');
  const isCritical = status === 'vencido' || status === 'cancelado' || status === 'sem_plano';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Minha Assinatura</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu plano, apps ativos e histórico de pagamentos</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium">{error}</p>
              <Button variant="outline" className="mt-4" onClick={load}>
                <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* ── Alerta de vencimento ── */}
            {isAlerta && (
              <div className={`rounded-xl border p-4 flex items-start gap-3 ${
                status === 'vencido' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${status === 'vencido' ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  {status === 'vencido' ? (
                    <>
                      <p className="font-semibold text-red-700">Assinatura vencida — seus apps estão suspensos</p>
                      <p className="text-sm text-red-600 mt-0.5">Renove agora para retomar o acesso sem perder dados.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-amber-700">Sua assinatura vence em {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}</p>
                      <p className="text-sm text-amber-600 mt-0.5">O pagamento da próxima fatura já está disponível.</p>
                    </>
                  )}
                  <Button size="sm" className="mt-3" asChild>
                    <Link href="/checkout">Renovar agora <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                  </Button>
                </div>
              </div>
            )}

            {/* ── Card principal do plano ── */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className={`bg-gradient-to-r ${planoGrad} p-6 text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Plano atual</p>
                    <h2 className="text-3xl font-bold mt-1">{planoNome}</h2>
                    {preco && (
                      <p className="text-white/80 text-sm mt-1">{fmtCurrency(preco)}/mês</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                    status === 'ativo' ? 'bg-green-400/30 text-green-100' :
                    status === 'trial' ? 'bg-blue-400/30 text-blue-100' :
                    'bg-red-400/30 text-red-100'
                  }`}>
                    {statusCfg.icon}
                    <span>{statusCfg.label}</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-white/70 text-xs uppercase tracking-wider">Próximo vencimento</p>
                    <p className="text-white font-semibold mt-1">
                      {data?.expira_em ? fmtDate(data.expira_em) : status === 'trial' ? 'Após trial' : '—'}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-white/70 text-xs uppercase tracking-wider">Dias restantes</p>
                    <p className={`font-semibold mt-1 text-lg ${
                      diasRestantes !== null && diasRestantes <= 5 ? 'text-red-300' :
                      diasRestantes !== null && diasRestantes <= 10 ? 'text-amber-300' : 'text-white'
                    }`}>
                      {diasRestantes !== null ? `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="flex flex-wrap gap-3">
                  {isCritical ? (
                    <Button asChild>
                      <Link href="/planos">
                        <Zap className="w-4 h-4 mr-2" />
                        {status === 'sem_plano' ? 'Escolher plano' : 'Renovar assinatura'}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" asChild>
                      <Link href="/planos">
                        <ArrowRight className="w-4 h-4 mr-2" /> Alterar plano
                      </Link>
                    </Button>
                  )}

                  {data?.customer_portal_url && (
                    <Button variant="outline" asChild>
                      <a href={data.customer_portal_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" /> Portal Asaas
                      </a>
                    </Button>
                  )}

                  <Button variant="outline" asChild>
                    <a
                      href={`https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre minha assinatura do Mirage Hub (${data?.nome || ''}, plano ${planoNome}).`)}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> Suporte
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Apps do plano ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Apps incluídos no plano</CardTitle>
                <CardDescription>
                  {data?.plano_detalhes?.apps_incluidos?.length
                    ? `${data.plano_detalhes.apps_incluidos.length} apps no seu plano`
                    : 'Nenhum plano ativo'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data?.plano_detalhes?.apps_incluidos?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.plano_detalhes.apps_incluidos.map((appKey: string) => {
                      const info = APP_INFO[appKey];
                      const ativo = data.apps_ativos?.some(a => a.app_key === appKey);
                      if (!info) return null;
                      return (
                        <div key={appKey} className={`flex items-center gap-3 p-3 rounded-lg border ${ativo ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                            {info.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{info.nome}</p>
                            <p className="text-xs text-muted-foreground truncate">{info.desc}</p>
                          </div>
                          {ativo ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Nenhum plano ativo. Escolha um plano para liberar os apps.</p>
                    <Button className="mt-4" asChild>
                      <Link href="/planos">Ver planos <ArrowRight className="w-4 h-4 ml-1" /></Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Módulos avulsos ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Módulos avulsos</CardTitle>
                    <CardDescription>
                      {data?.modulos_ativos?.length
                        ? `${data.modulos_ativos.length} módulo${data.modulos_ativos.length !== 1 ? 's' : ''} contratado${data.modulos_ativos.length !== 1 ? 's' : ''}`
                        : 'Nenhum módulo avulso ativo'}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/planos?aba=modulos"><Plus className="w-3.5 h-3.5 mr-1" /> Adicionar</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data?.modulos_ativos?.length ? (
                  <div className="space-y-2">
                    {data.modulos_ativos.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-medium">{MODULO_NOMES[m.item_id] || m.item_id}</span>
                          <Badge variant="outline" className="text-xs">{m.periodicidade}</Badge>
                        </div>
                        <span className="text-sm font-semibold text-blue-700">{fmtCurrency(m.preco_mensal)}/mês</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Contrate módulos avulsos para expandir o sistema sem mudar de plano.</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/planos?aba=modulos">Ver módulos disponíveis</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Extras (usuários e canais) ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Add-ons & Extras</CardTitle>
                    <CardDescription>Usuários e canais adicionais</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/planos?aba=extras"><Plus className="w-3.5 h-3.5 mr-1" /> Adicionar</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Usuários adicionais</p>
                      <p className="text-xs text-muted-foreground">R$ 39/usuário/mês</p>
                    </div>
                    <span className="text-lg font-bold text-violet-700">{data?.usuarios_extras ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Radio className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Canais adicionais</p>
                      <p className="text-xs text-muted-foreground">R$ 49/canal/mês</p>
                    </div>
                    <span className="text-lg font-bold text-emerald-700">{data?.canais_extras ?? 0}</span>
                  </div>
                </div>
                {(!data?.usuarios_extras && !data?.canais_extras) && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Precisa de mais usuários ou canais de atendimento? Adicione a qualquer momento.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Histórico de pagamentos ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
                    <CardDescription>Últimas cobranças da sua assinatura</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={load}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!data?.asaas_enabled ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Histórico disponível após ativação do pagamento online.</p>
                  </div>
                ) : data?.faturas?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma cobrança encontrada ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {data?.faturas?.map((f, i) => {
                      const pst = PAG_STATUS[f.status] ?? { label: f.status, variant: 'secondary' as const };
                      return (
                        <div key={f.id}>
                          {i > 0 && <Separator />}
                          <div className="py-3 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{f.descricao}</p>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3" />
                                  Vencimento: {fmtDate(f.vencimento)}
                                </span>
                                {f.data_pagamento && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    Pago: {fmtDate(f.data_pagamento)}
                                  </span>
                                )}
                                <span>{FORMA_PAG[f.forma_pagamento] ?? f.forma_pagamento}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="font-semibold text-sm">{fmtCurrency(f.valor)}</span>
                              <Badge variant={pst.variant}>{pst.label}</Badge>
                              {(f.invoice_url || f.boleto_url) && (
                                <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                                  <a href={f.invoice_url || f.boleto_url || '#'} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Suporte ── */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">Precisa de ajuda?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dúvidas sobre cobranças, notas fiscais ou cancelamento — fale com a gente.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent('Olá! Preciso de ajuda com minha assinatura Mirage Hub.')}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                      WhatsApp
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
