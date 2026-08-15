import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertTriangle, ArrowRight, Users } from 'lucide-react';

export default function Onboarding() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [, navigate] = useLocation();

  const [status, setStatus] = useState<'loading' | 'success' | 'no_invite' | 'error'>('loading');
  const [tenant, setTenant] = useState<any>(null);
  const [role, setRole] = useState<string>('member');
  const [errorMsg, setErrorMsg] = useState('');

  const ROLE_LABELS: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    member: 'Membro',
    viewer: 'Visualizador',
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // Usuário não autenticado — redirecionar para login preservando a rota
      navigate('/login?redirect=/onboarding');
      return;
    }

    aplicarConvite();
  }, [authLoading, isAuthenticated]);

  const aplicarConvite = async () => {
    setStatus('loading');
    try {
      const result = await apiFetch('/auth/aplicar-convite', { method: 'POST' });

      if (result.aplicado) {
        setTenant(result.tenant);
        setRole(result.role);
        setStatus('success');

        // Redirecionar para o hub após 3 segundos
        setTimeout(() => navigate('/hub'), 3000);
      } else {
        setStatus('no_invite');
      }
    } catch (err: any) {
      let msg = err.message;
      try { msg = JSON.parse(msg)?.error || msg; } catch {}
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  if (authLoading || status === 'loading') {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Processando seu convite...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (status === 'success') {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-16 px-4">
          <Card className="w-full max-w-md text-center shadow-xl border-primary/20">
            <CardHeader className="pb-4">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Bem-vindo à equipe!</CardTitle>
              <CardDescription className="text-base mt-2">
                Você foi adicionado com sucesso
                {tenant?.name ? ` à empresa ${tenant.name}` : ''} como{' '}
                <strong>{ROLE_LABELS[role] || role}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenant && (
                <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Redirecionando para o Hub em alguns segundos...
              </p>
              <Button className="w-full" onClick={() => navigate('/hub')}>
                Ir para o Hub agora <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (status === 'no_invite') {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-16 px-4">
          <Card className="w-full max-w-md text-center shadow-sm">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <CardTitle>Nenhum convite pendente</CardTitle>
              <CardDescription>
                Não encontramos um convite pendente para a conta <strong>{user?.email}</strong>.
                Se você recebeu um link de convite, pode ter expirado ou já sido utilizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => navigate('/hub')}>
                Ir para o Hub <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/planos')}>
                Ver planos
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-16 px-4">
        <Card className="w-full max-w-md text-center shadow-sm">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle>Erro ao processar convite</CardTitle>
            <CardDescription>{errorMsg || 'Ocorreu um erro inesperado.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={aplicarConvite}>
              Tentar novamente
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/hub')}>
              Ir para o Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
