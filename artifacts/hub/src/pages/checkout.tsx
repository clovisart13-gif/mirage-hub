import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2, CheckCircle2, Shield, Lock, MessageCircle,
  CreditCard, QrCode, FileText, Copy, Check, ExternalLink, ArrowRight,
} from 'lucide-react';

const WHATSAPP_SPECIALIST = '5511992436154';

type FormaPagamento = 'PIX' | 'BOLETO' | 'CREDIT_CARD';
type PageState = 'form' | 'pix_aguardando' | 'boleto_gerado' | 'redirect' | 'sucesso';

interface SessionResponse {
  tipo: string;
  payment_id: string;
  assinatura_id: string;
  tenant_id: string;
  plano_id: string;
  valor: number;
  pix?: { qr_code_base64?: string; chave_copia_cola?: string; expiracao?: string; invoice_url?: string };
  boleto?: { url?: string; codigo_barras?: string; vencimento?: string; invoice_url?: string };
  redirect_url?: string;
}

const PLAN_DETAILS: Record<string, { name: string; price: string; priceVal: number; priceAnualMensal: number; apps: string[]; color: string }> = {
  starter:    { name: 'Starter',    price: 'R$ 197/mês', priceVal: 197, priceAnualMensal: 158, apps: ['🏭 Kanban Mirage', '📋 Orçamento Mirage', '🌐 Moda Conecta'], color: 'bg-violet-600' },
  pro:        { name: 'Pro',        price: 'R$ 397/mês', priceVal: 397, priceAnualMensal: 318, apps: ['🏭 Kanban Mirage', '📋 Orçamento Mirage', '🌐 Moda Conecta', '🔬 PLM Mirage', '💰 Financeiro Mirage'], color: 'bg-blue-600' },
  enterprise: { name: 'Enterprise', price: 'R$ 797/mês', priceVal: 797, priceAnualMensal: 638, apps: ['🏭 Kanban Mirage', '📋 Orçamento Mirage', '🌐 Moda Conecta', '🔬 PLM Mirage', '💬 CRM Mirage', '⚙️ ERP Mirage', '💰 Financeiro Mirage'], color: 'bg-slate-700' },
};

const MODULO_NOMES: Record<string, string> = {
  kanban: '🏭 Kanban Mirage', orcamento: '📋 Orçamento Mirage',
  plm: '🔬 PLM Mirage', comunidade: '🌐 Moda Conecta',
  crm: '💬 CRM Mirage', erp: '⚙️ ERP Mirage', financeiro: '💰 Financeiro Mirage',
};
const MODULO_PRECO: Record<string, number> = {
  kanban: 147, orcamento: 77, plm: 77, comunidade: 47, crm: 297, erp: 197,
};
const MODULO_IMPLANTACAO: Record<string, number> = {
  kanban: 997, orcamento: 0, plm: 397, comunidade: 0, crm: 997, erp: 497,
};

export default function Checkout() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const plano = searchParams.get('plano') || '';
  const modulosParam = searchParams.get('modulos') || ''; // "kanban,plm,crm"
  const extrasParam  = searchParams.get('extras')  || ''; // "usuario_adicional:2,canal_adicional:1"
  const periodicidade = (searchParams.get('periodicidade') || 'mensal') as 'mensal' | 'anual';
  const cancelado = searchParams.get('cancelado') === '1';
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  // Modo do checkout
  const modo: 'plano' | 'modulos' | 'extras' = modulosParam ? 'modulos' : extrasParam ? 'extras' : 'plano';
  const planoEfetivo = plano || 'starter';

  // Parsed módulos
  const modulosIds = modulosParam ? modulosParam.split(',').filter(Boolean) : [];
  const extrasMap: Record<string, number> = {};
  if (extrasParam) extrasParam.split(',').forEach(e => { const [k, v] = e.split(':'); if (k) extrasMap[k] = parseInt(v || '1'); });

  // Calcular total
  const desc = periodicidade === 'anual' ? 0.8 : 1;
  const totalModulos  = modulosIds.reduce((s, id) => s + Math.round((MODULO_PRECO[id] ?? 0) * desc), 0);
  const implantacaoModulos = periodicidade === 'mensal' ? modulosIds.reduce((s, id) => s + (MODULO_IMPLANTACAO[id] ?? 0), 0) : 0;
  const totalExtrasVal = (extrasMap['usuario_adicional'] || 0) * Math.round(39 * desc) + (extrasMap['canal_adicional'] || 0) * Math.round(49 * desc);
  const totalGeral = modo === 'plano'
    ? (periodicidade === 'anual' ? (PLAN_DETAILS[planoEfetivo]?.priceAnualMensal ?? 0) : (PLAN_DETAILS[planoEfetivo]?.priceVal ?? 0))
    : modo === 'modulos' ? totalModulos
    : totalExtrasVal;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [pageState, setPageState] = useState<PageState>('form');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [formData, setFormData] = useState({ nome_empresa: '', cnpj: '', email: user?.email || '', telefone: '' });
  useEffect(() => { if (user?.email) setFormData(p => ({ ...p, email: user.email || '' })); }, [user]);

  // Polling para confirmar pagamento PIX/Boleto
  useEffect(() => {
    if ((pageState === 'pix_aguardando' || pageState === 'boleto_gerado') && session?.payment_id) {
      pollRef.current = setInterval(async () => {
        try {
          const status = await apiFetch(`/billing/checkout/status/${session.payment_id}`);
          if (['RECEIVED', 'CONFIRMED'].includes(status.status)) {
            clearInterval(pollRef.current!);
            await ativarPlano();
          }
        } catch {}
      }, 6000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pageState, session]);

  const ativarPlano = async () => {
    if (!session) return;
    try {
      // Primeiro tenta confirmar via Asaas (verifica status real)
      await apiFetch('/billing/checkout/confirmar', {
        method: 'POST',
        body: JSON.stringify({ payment_id: session.payment_id, tenant_id: session.tenant_id, plano_id: session.plano_id }),
      });
    } catch {
      // Se o Asaas ainda não confirmou, força ativação manual
      // (usuário clicou "Já paguei" como escape hatch)
      try {
        await apiFetch('/billing/checkout/ativar-manual', {
          method: 'POST',
          body: JSON.stringify({ tenant_id: session.tenant_id, plano_id: session.plano_id }),
        });
      } catch (e: any) {
        toast({ title: 'Erro ao ativar', description: e.message || 'Tente novamente ou contate o suporte.', variant: 'destructive' });
        return;
      }
    }
    setPageState('sucesso');
  };

  const handleCnpj = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    if (v.length > 5) v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    if (v.length > 8) v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    if (v.length > 12) v = v.replace(/(\d{4})(\d)/, '$1-$2');
    setFormData({ ...formData, cnpj: v });
  };

  const handleTelefone = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = v.replace(/^(\d{2})(\d{5})(\d)/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '($1) $2');
    setFormData({ ...formData, telefone: v });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { toast({ title: 'Login necessário', description: 'Você precisa estar logado para assinar.' }); return; }
    setLoading(true);

    try {
      // 1. Criar/obter tenant
      let tenantId: string | null = null;
      try { const t = await apiFetch('/tenants/meu-tenant'); tenantId = t?.id; } catch {}

      if (!tenantId) {
        const slug = formData.nome_empresa.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 35) + '-' + Date.now().toString(36);
        const novoTenant = await apiFetch('/tenants', { method: 'POST', body: JSON.stringify({ name: formData.nome_empresa, slug, plan: planoEfetivo }) });
        tenantId = novoTenant.id;
        try { await apiFetch('/tenants/' + tenantId + '/membros', { method: 'POST', body: JSON.stringify({ role: 'owner' }) }); } catch {}
      }

      // 2. Criar sessão de pagamento (com suporte a modo modular/extras)
      let sessaoData: SessionResponse;
      const payloadSessao =
        modo === 'modulos' ? { modulos: modulosIds, periodo: periodicidade, tenant_id: tenantId, forma_pagamento: formaPagamento, dados_empresa: formData } :
        modo === 'extras'  ? { extras: extrasMap,  periodo: periodicidade, tenant_id: tenantId, forma_pagamento: formaPagamento, dados_empresa: formData } :
                             { plano_id: planoEfetivo, periodo: periodicidade, tenant_id: tenantId, forma_pagamento: formaPagamento, dados_empresa: formData };

      try {
        sessaoData = await apiFetch('/billing/checkout/criar-sessao', { method: 'POST', body: JSON.stringify(payloadSessao) });
      } catch (err: any) {
        if (err.message?.includes('não configurado') || err.asaas_disabled) {
          // Fallback simulado
          const payloadSimular =
            modo === 'modulos' ? { modulos: modulosIds, periodo: periodicidade, tenant_id: tenantId } :
            modo === 'extras'  ? { extras: extrasMap,  periodo: periodicidade, tenant_id: tenantId } :
                                 { plano_id: planoEfetivo, periodo: periodicidade, tenant_id: tenantId };
          await apiFetch('/billing/checkout/simular', { method: 'POST', body: JSON.stringify(payloadSimular) });
          setPageState('sucesso');
          setLoading(false);
          return;
        }
        throw err;
      }

      setSession(sessaoData);
      if (formaPagamento === 'PIX') setPageState('pix_aguardando');
      else if (formaPagamento === 'BOLETO') setPageState('boleto_gerado');
      else if (sessaoData.redirect_url) window.location.href = sessaoData.redirect_url;
    } catch (error: any) {
      let msg = error.message || 'Ocorreu um erro inesperado.';
      try { msg = JSON.parse(msg)?.error || msg; } catch {}
      toast({ title: 'Erro ao processar pagamento', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copiarPix = () => {
    if (session?.pix?.chave_copia_cola) {
      navigator.clipboard.writeText(session.pix.chave_copia_cola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const selectedPlan = PLAN_DETAILS[planoEfetivo] || PLAN_DETAILS.starter;
  const tituloSucesso = modo === 'modulos' ? `${modulosIds.length} módulo${modulosIds.length !== 1 ? 's' : ''} ativado${modulosIds.length !== 1 ? 's' : ''}` :
                        modo === 'extras' ? 'Extras adicionados!' :
                        `Plano ${selectedPlan.name} ativado!`;
  const itensSucesso = modo === 'modulos' ? modulosIds.map(id => MODULO_NOMES[id] || id) :
                       modo === 'extras' ? Object.entries(extrasMap).filter(([,q]) => q > 0).map(([id, q]) => `${q}x ${id === 'usuario_adicional' ? 'Usuário adicional' : 'Canal adicional'}`) :
                       selectedPlan.apps;

  // ─── TELA DE SUCESSO ─────────────────────────────────────
  if (pageState === 'sucesso') {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-16 px-4">
          <Card className="w-full max-w-lg text-center shadow-xl border-primary/20">
            <CardHeader>
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Assinatura Ativada!</CardTitle>
              <CardDescription className="text-base mt-1">
                <strong>{tituloSucesso}</strong> — pronto para usar agora mesmo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                {itensSucesso.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {item}
                  </div>
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate('/hub')}>
                Acessar meu Hub <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ─── TELA PIX AGUARDANDO ──────────────────────────────────
  if (pageState === 'pix_aguardando' && session) {
    const pixData = session.pix;
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mb-3">
                <QrCode className="h-7 w-7 text-violet-600" />
              </div>
              <CardTitle>Pague com PIX</CardTitle>
              <CardDescription>
                Escaneie o QR code ou copie a chave. O pagamento é confirmado automaticamente em instantes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pixData?.qr_code_base64 ? (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-56 h-56 rounded-lg border"
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center h-56 bg-muted rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {pixData?.chave_copia_cola && (
                <div>
                  <Label className="text-xs text-muted-foreground">Chave PIX Copia e Cola</Label>
                  <div className="flex gap-2 mt-1">
                    <Input readOnly value={pixData.chave_copia_cola} className="text-xs font-mono" />
                    <Button type="button" variant="outline" size="icon" onClick={copiarPix}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {pixData?.invoice_url && !pixData.qr_code_base64 && (
                <a href={pixData.invoice_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="h-4 w-4" /> Abrir link de pagamento
                  </Button>
                </a>
              )}

              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Aguardando confirmação do pagamento... Não feche esta aba.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { clearInterval(pollRef.current!); setPageState('form'); }}>
                  Voltar
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={ativarPlano}>
                  Já paguei — confirmar manualmente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ─── TELA BOLETO GERADO ───────────────────────────────────
  if (pageState === 'boleto_gerado' && session) {
    const boletoData = session.boleto;
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                <FileText className="h-7 w-7 text-blue-600" />
              </div>
              <CardTitle>Boleto Gerado!</CardTitle>
              <CardDescription>
                Seu boleto foi gerado. O prazo de compensação é de até <strong>3 dias úteis</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {boletoData?.vencimento && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
                  Vencimento: <strong>{new Date(boletoData.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                </div>
              )}

              {boletoData?.url && (
                <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2">
                    <FileText className="h-4 w-4" /> Abrir Boleto PDF
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </a>
              )}

              {boletoData?.invoice_url && (
                <a href={boletoData.invoice_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full gap-2 text-sm">
                    <ExternalLink className="h-4 w-4" /> Ver página de pagamento
                  </Button>
                </a>
              )}

              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Aguardando confirmação... Seu acesso será liberado automaticamente após a compensação.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { clearInterval(pollRef.current!); setPageState('form'); }}>
                  Voltar
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={ativarPlano}>
                  Já paguei — confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const tituloCheckout = modo === 'modulos' ? 'Finalizar Pacote Modular' : modo === 'extras' ? 'Adicionar Extras' : 'Finalizar Assinatura';

  // ─── FORMULÁRIO PRINCIPAL ─────────────────────────────────
  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8">

          {/* Coluna esquerda — resumo do que está sendo contratado */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{tituloCheckout}</h1>
            <p className="text-muted-foreground mb-6">
              Preencha os dados e escolha a forma de pagamento. Ativação automática após a confirmação.
            </p>

            {cancelado && (
              <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                ⚠️ O pagamento foi cancelado. Tente novamente.
              </div>
            )}

            {periodicidade === 'anual' && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
                ✅ Plano anual: <strong>20% de desconto</strong> aplicado + implantação grátis
              </div>
            )}

            <Card className="border shadow-sm mb-5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {modo === 'plano' ? `Plano ${selectedPlan.name}` :
                     modo === 'modulos' ? `${modulosIds.length} módulo${modulosIds.length !== 1 ? 's' : ''} avulso${modulosIds.length !== 1 ? 's' : ''}` :
                     'Add-ons & Extras'}
                  </CardTitle>
                  <Badge className="bg-primary text-primary-foreground border-0">
                    {fmt(totalGeral)}/mês
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-0">
                {modo === 'plano' && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Apps incluídos:</p>
                    {selectedPlan.apps.map((app, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {app}
                      </div>
                    ))}
                  </>
                )}
                {modo === 'modulos' && modulosIds.map(id => (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {MODULO_NOMES[id] || id}
                    </div>
                    <span className="text-muted-foreground">{fmt(Math.round((MODULO_PRECO[id] ?? 0) * desc))}/mês</span>
                  </div>
                ))}
                {modo === 'extras' && Object.entries(extrasMap).filter(([,q]) => q > 0).map(([id, qtd]) => (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {qtd}x {id === 'usuario_adicional' ? 'Usuário adicional' : 'Canal adicional'}
                    </div>
                    <span className="text-muted-foreground">{fmt(qtd * Math.round((id === 'usuario_adicional' ? 39 : 49) * desc))}/mês</span>
                  </div>
                ))}

                <div className="pt-3 border-t mt-3 space-y-1">
                  {modo === 'modulos' && implantacaoModulos > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>Taxa de implantação (única)</span>
                      <span>{fmt(implantacaoModulos)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Cobrança {periodicidade === 'anual' ? 'anual' : 'mensal'} recorrente
                    </span>
                    <span className="font-bold">{fmt(totalGeral)}/mês</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-5">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Pagamento processado pelo Asaas (certificado PCI)</div>
              <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-green-500" /> Cancele quando quiser, sem multa</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> PIX, Boleto ou Cartão de Crédito</div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-1">Prefere falar com alguém?</p>
              <a
                href={`https://wa.me/${WHATSAPP_SPECIALIST}?text=${encodeURIComponent(`Olá! Tenho interesse em contratar a Mirage.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                <MessageCircle className="w-4 h-4" /> Falar com especialista no WhatsApp
              </a>
            </div>

            {!isAuthenticated && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium mb-2">Você precisa de uma conta para assinar.</p>
                <div className="flex gap-3">
                  <Button asChild variant="outline" size="sm" className="bg-white dark:bg-transparent">
                    <Link href={`/login?redirect=/checkout?plano=${plano}`}>Fazer Login</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/register?redirect=/checkout?plano=${plano}`}>Criar Conta</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita — formulário */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>Para ativação da conta e emissão de nota fiscal.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_empresa">Razão Social / Nome da Empresa *</Label>
                  <Input id="nome_empresa" required value={formData.nome_empresa} onChange={e => setFormData({ ...formData, nome_empresa: e.target.value })} placeholder="R2PB Confecções LTDA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input id="cnpj" required value={formData.cnpj} onChange={handleCnpj} placeholder="00.000.000/0000-00" maxLength={18} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail Financeiro *</Label>
                  <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="financeiro@empresa.com.br" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
                  <Input id="telefone" required value={formData.telefone} onChange={handleTelefone} placeholder="(11) 99999-9999" maxLength={15} />
                </div>

                {/* Seletor de forma de pagamento */}
                <div className="space-y-2">
                  <Label>Forma de Pagamento *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'PIX',         label: 'PIX',    icon: QrCode,    desc: 'Instantâneo' },
                      { id: 'BOLETO',      label: 'Boleto', icon: FileText,  desc: '3 dias úteis' },
                      { id: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard, desc: 'Crédito' },
                    ] as { id: FormaPagamento; label: string; icon: any; desc: string }[]).map(op => {
                      const Icon = op.icon;
                      const sel = formaPagamento === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setFormaPagamento(op.id)}
                          className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all cursor-pointer ${sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <Icon className={`h-5 w-5 ${sel ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-medium ${sel ? 'text-primary' : 'text-foreground'}`}>{op.label}</span>
                          <span className="text-xs text-muted-foreground">{op.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full gap-2" size="lg" disabled={loading || !isAuthenticated}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                  ) : formaPagamento === 'PIX' ? (
                    <><QrCode className="h-4 w-4" /> Gerar QR Code PIX</>
                  ) : formaPagamento === 'BOLETO' ? (
                    <><FileText className="h-4 w-4" /> Gerar Boleto</>
                  ) : (
                    <><CreditCard className="h-4 w-4" /> Pagar com Cartão</>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Pagamento processado pelo <strong>Asaas</strong> — plataforma certificada PCI DSS. Ao confirmar, você aceita os Termos de Serviço da Mirage.
                </p>
              </CardFooter>
            </form>
          </Card>

        </div>
      </div>
    </Layout>
  );
}
