import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { CheckCircle2, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_APPS: Record<string, string[]> = {
  starter:    ['Kanban Mirage', 'Orçamento Mirage', 'Moda Conecta'],
  pro:        ['Kanban Mirage', 'Orçamento Mirage', 'Moda Conecta', 'PLM Mirage', 'Financeiro Mirage'],
  enterprise: ['Kanban Mirage', 'Orçamento Mirage', 'Moda Conecta', 'PLM Mirage', 'CRM Mirage', 'ERP Mirage', 'Financeiro Mirage'],
};

export default function CheckoutSucesso() {
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id');
  const modo = searchParams.get('modo'); // 'simulado' = sem Stripe
  const planoParam = searchParams.get('plano') || 'starter';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [planoAtivado, setPlanoAtivado] = useState<string>(planoParam);
  const [appsLiberados, setAppsLiberados] = useState<string[]>([]);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const confirmar = async () => {
      // Modo simulado: sem Stripe, só mostra sucesso
      if (modo === 'simulado') {
        setPlanoAtivado(planoParam);
        setAppsLiberados(PLAN_APPS[planoParam] || []);
        setStatus('success');
        return;
      }

      if (!sessionId) {
        setErrMsg('Sessão de pagamento não encontrada.');
        setStatus('error');
        return;
      }

      try {
        const resultado = await apiFetch('/billing/checkout/confirmar', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
        });
        setPlanoAtivado(resultado.plano_nome || PLAN_NAMES[resultado.plano] || resultado.plano);
        setAppsLiberados(resultado.apps_liberados?.map((k: string) => {
          const m: Record<string, string> = {
            kanban:     'Kanban Mirage',
            orcamento:  'Orçamento Mirage',
            comunidade: 'Moda Conecta',
            plm:        'PLM Mirage',
            crm:        'CRM Mirage',
            erp:        'ERP Mirage',
            financeiro: 'Financeiro Mirage',
          };
          return m[k] || k;
        }) || PLAN_APPS[resultado.plano] || []);
        setStatus('success');
      } catch (err: any) {
        let msg = err.message || 'Erro ao confirmar pagamento.';
        try { msg = JSON.parse(msg)?.error || msg; } catch {}
        setErrMsg(msg);
        setStatus('error');
      }
    };

    confirmar();
  }, [sessionId, modo, planoParam]);

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-semibold text-foreground">Confirmando pagamento...</p>
            <p className="text-muted-foreground text-sm">Aguarde enquanto validamos sua transação com o Stripe.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (status === 'error') {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-16 px-4">
          <Card className="w-full max-w-md text-center border-destructive/20 shadow-xl">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle>Não conseguimos confirmar o pagamento</CardTitle>
              <CardDescription className="mt-1">{errMsg}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Se o valor foi cobrado, entre em contato com nosso suporte que resolvemos em até 24h.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild variant="default">
                  <Link href="/hub">Ir para o Hub</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/checkout">Tentar novamente</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-16 px-4">
        <Card className="w-full max-w-lg text-center border-primary/20 shadow-xl">
          <CardHeader className="pb-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Assinatura Ativada!</CardTitle>
            <CardDescription className="text-base mt-1">
              Bem-vindo ao Mirage Hub. Seu plano <strong>{planoAtivado}</strong> está ativo e pronto para usar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {appsLiberados.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm font-semibold text-foreground mb-2">Apps liberados no seu plano:</p>
                {appsLiberados.map((app, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    {app}
                  </div>
                ))}
              </div>
            )}
            <Button asChild className="w-full" size="lg">
              <Link href="/hub">
                Acessar meu Hub <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Um e-mail de confirmação foi enviado pelo Stripe com o recibo do pagamento.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
