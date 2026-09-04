import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { apiFetch, setActiveTenantId } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle2, ArrowRight, Star, Building2 } from 'lucide-react';
import { Layout } from '@/components/Layout';

const PRODUCTION_URL = 'https://www.gestaomirage.com.br';
const FORM_LINK = '/moda-conecta/fundadores';

type WorkspaceChoice = {
  tenant_id: string;
  role: string;
  tenants?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'forgot' | 'forgot-sent' | 'workspace'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [workspaceChoices, setWorkspaceChoices] = useState<WorkspaceChoice[]>([]);

  const finishMirageLogin = async () => {
    const me = await apiFetch('/auth/me');
    const workspaces: WorkspaceChoice[] = Array.isArray(me?.tenants) ? me.tenants : [];
    const requestedTenantId = new URLSearchParams(window.location.search).get('tenant_id');

    if (requestedTenantId && workspaces.some((workspace) => workspace.tenant_id === requestedTenantId)) {
      setActiveTenantId(requestedTenantId);
      setLocation('/hub');
      return;
    }

    if (workspaces.length === 1 && workspaces[0]?.tenant_id) {
      setActiveTenantId(workspaces[0].tenant_id);
      setLocation('/hub');
      return;
    }

    if (workspaces.length > 1) {
      setWorkspaceChoices(workspaces);
      setMode('workspace');
      return;
    }

    throw new Error('Sua conta ainda não possui um workspace Mirage associado.');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginFailed(false);

    try {
      const account = await apiFetch('/auth/resolve-login-email', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      const loginEmails = Array.isArray(account?.login_emails) && account.login_emails.length > 0
        ? account.login_emails
        : [account.login_email];
      let lastSignInError: any = null;

      for (const loginEmail of loginEmails) {
        if (!loginEmail) continue;
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (!error) {
          await finishMirageLogin();
          return;
        }
        lastSignInError = error;
      }

      if (lastSignInError) throw lastSignInError;
      throw new Error('Não foi possível preparar o acesso Mirage.');
    } catch (error: any) {
      if (error.message === 'Invalid login credentials') {
        setLoginFailed(true);
      } else {
        const msg = error.message === 'Email not confirmed'
          ? 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'
          : error.message?.includes('rate')
          ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
          : error.message;
        toast({ title: 'Erro ao fazer login', description: msg, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSelection = (tenantId: string) => {
    setActiveTenantId(tenantId);
    setLocation('/hub');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      const account = await apiFetch('/auth/resolve-login-email', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const redirectTo = `${PRODUCTION_URL}/recuperar-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(account.login_email, { redirectTo });
      if (error) throw error;
      setMode('forgot-sent');
    } catch (error: any) {
      toast({ title: 'Erro ao enviar e-mail', description: error.message, variant: 'destructive' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <div className="text-center">
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                  Acesse sua conta Mirage
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use o e-mail e a senha criados no cadastro da sua empresa.{' '}
                  <Link href={FORM_LINK} className="font-medium text-primary hover:text-primary/80">
                    Crie sua conta
                  </Link>
                </p>
              </div>

              {/* Bloco inline: credenciais inválidas → redireciona ao formulário */}
              {loginFailed && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-violet-500 shrink-0" />
                    <p className="text-sm font-semibold text-violet-800">
                      E-mail ou senha não reconhecidos
                    </p>
                  </div>
                  <p className="text-sm text-violet-700 leading-relaxed">
                    Verifique se você está usando o e-mail do cadastro ou recupere sua senha.
                    Caso ainda não tenha uma conta, faça seu cadastro para iniciar o trial:
                  </p>
                  <Link href={FORM_LINK}>
                    <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2">
                      Criar conta Mirage <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setLoginFailed(false); setForgotEmail(email); setMode('forgot'); }}
                    className="w-full text-center text-xs text-violet-500 hover:text-violet-700 transition-colors"
                  >
                    Já tenho conta — recuperar minha senha
                  </button>
                </div>
              )}

              <form className="mt-8 space-y-6 bg-card p-8 rounded-xl border shadow-sm" onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setLoginFailed(false); }}
                      className="mt-1"
                      placeholder="seu@email.com"
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(email); setMode('forgot'); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setLoginFailed(false); }}
                      className="mt-1"
                      placeholder="••••••••"
                      data-testid="input-password"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Entrar no Hub
                </Button>
              </form>
            </>
          )}

          {/* ── ESQUECI MINHA SENHA ── */}
          {mode === 'forgot' && (
            <>
              <div className="text-center">
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                  Recuperar senha
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Digite seu e-mail cadastrado. Enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form className="mt-8 space-y-6 bg-card p-8 rounded-xl border shadow-sm" onSubmit={handleForgotPassword}>
                <div>
                  <Label htmlFor="forgot-email">E-mail cadastrado</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="mt-1"
                    placeholder="seu@email.com"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar link de recuperação
                </Button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
                </button>
              </form>
            </>
          )}

          {/* ── E-MAIL ENVIADO ── */}
          {mode === 'forgot-sent' && (
            <div className="bg-card p-8 rounded-xl border shadow-sm text-center space-y-4">
              <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">E-mail enviado!</h2>
              <p className="text-sm text-muted-foreground">
                Se o e-mail <strong>{forgotEmail}</strong> estiver cadastrado, você receberá um link para redefinir a senha em instantes.
                Verifique também a caixa de spam.
              </p>
              <Button className="w-full" variant="outline" onClick={() => setMode('login')}>
                <ArrowLeft className="mr-2 w-4 h-4" /> Voltar ao login
              </Button>
            </div>
          )}

          {/* ── ESCOLHA DE WORKSPACE ── */}
          {mode === 'workspace' && (
            <>
              <div className="text-center">
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                  Escolha sua empresa
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Este login possui mais de um workspace Mirage. Selecione qual deseja abrir agora.
                </p>
              </div>

              <div className="mt-8 space-y-3 rounded-xl border bg-card p-6 shadow-sm">
                {workspaceChoices.map((workspace) => (
                  <button
                    key={workspace.tenant_id}
                    type="button"
                    onClick={() => handleWorkspaceSelection(workspace.tenant_id)}
                    className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/40"
                  >
                    <Building2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {workspace.tenants?.name ?? 'Empresa Mirage'}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {workspace.role === 'owner' ? 'Proprietário' : 'Membro'}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setWorkspaceChoices([]);
                    setMode('login');
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </Layout>
  );
}
