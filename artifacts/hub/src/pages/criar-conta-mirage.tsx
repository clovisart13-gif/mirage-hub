import { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Building2, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/Layout';
import { apiFetch, setActiveTenantId } from '@/lib/api';
import { mirageFunnelEvent } from '@/lib/gtm';
import { supabase } from '@/lib/supabase';

const SUPPORT_WHATSAPP_URL = 'https://wa.me/5511992436154?text=Ol%C3%A1%21%20Meu%20login%20j%C3%A1%20utilizou%20o%20teste%20gr%C3%A1tis%20do%20Mirage%20e%20preciso%20de%20ajuda.';

type RequestedModules = {
  crm: boolean;
  erp: boolean;
};

export default function CriarContaMirage() {
  const [, setLocation] = useLocation();
  const signupStarted = useRef(false);
  const signupParams = new URLSearchParams(window.location.search);
  const source = signupParams.get('source') || signupParams.get('utm_source') || 'direct';
  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    whatsapp: '',
    requestedModules: { crm: false, erp: false } as RequestedModules,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingTenantId, setExistingTenantId] = useState<string | null>(null);
  const [trialAlreadyUsed, setTrialAlreadyUsed] = useState(false);

  const markSignupStarted = () => {
    if (signupStarted.current) return;
    signupStarted.current = true;
    mirageFunnelEvent('start_signup', { source });
  };

  const toggleModule = (module: keyof RequestedModules) => {
    markSignupStarted();
    setForm((current) => ({
      ...current,
      requestedModules: { ...current.requestedModules, [module]: !current.requestedModules[module] },
    }));
  };

  const enterExistingWorkspace = () => {
    if (existingTenantId) {
      setActiveTenantId(existingTenantId);
    }
    setLocation('/hub');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    markSignupStarted();
    setError('');

    if (form.password.length < 8) {
      setError('Escolha uma senha com pelo menos 8 caracteres.');
      return;
    }

    const whatsappDigits = form.whatsapp.replace(/\D/g, '');
    const whatsapp = whatsappDigits.length === 10 || whatsappDigits.length === 11
      ? `55${whatsappDigits}`
      : whatsappDigits;
    if (!/^55\d{10,11}$/.test(whatsapp)) {
      setError('Informe um WhatsApp válido com DDD.');
      return;
    }

    setSubmitting(true);
    try {
      const email = form.email.trim();
      const trialPayload = {
        company_name: form.companyName.trim(),
        whatsapp,
        source,
      };
      const startTrial = async () => {
        const trial = await apiFetch('/billing/trial/ativar', {
          method: 'POST',
          body: JSON.stringify(trialPayload),
        });

        if (!trial?.tenant?.id) {
          throw new Error('Não foi possível definir a empresa do seu trial.');
        }

        setActiveTenantId(trial.tenant.id);
        if (!trial?.ja_existia) {
          mirageFunnelEvent('create_tenant', { source, plan: 'starter' });
          mirageFunnelEvent('start_trial', { source, plan: 'starter', trial_days: 14 });
        }
      };

      // A conta da LP é sempre própria do Mirage. Mesmo que o e-mail exista
      // na R2PB, ela não reutiliza usuário, senha, sessão ou membership de lá.
      let loginEmail = '';
      let createdAccount = false;
      try {
        const registration = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password: form.password,
            full_name: form.fullName.trim(),
            company_name: form.companyName.trim(),
            whatsapp,
            requested_modules: form.requestedModules,
            account_scope: 'mirage',
            source,
          }),
        });
        loginEmail = registration?.login_email;
        createdAccount = true;
      } catch (registerError) {
        const errorWithStatus = registerError as Error & { status?: number };
        let payload: { code?: string; login_email?: string } | null = null;
        try {
          payload = JSON.parse(errorWithStatus.message);
        } catch {
          // Mantém o erro original quando não houver resposta estruturada.
        }
        if (errorWithStatus.status === 409 && payload?.code === 'MIRAGE_ACCOUNT_EXISTS' && payload.login_email) {
          loginEmail = payload.login_email;
        } else {
          throw registerError;
        }
      }

      if (!loginEmail) {
        throw new Error('Não foi possível preparar o acesso da sua empresa Mirage.');
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: form.password,
      });
      if (signInError) {
        throw new Error(createdAccount
          ? 'Não foi possível entrar na nova conta Mirage. Tente novamente.'
          : 'Já existe uma empresa Mirage com estes dados. Confira a senha criada para ela.');
      }
      if (createdAccount) {
        mirageFunnelEvent('complete_signup', { source });
      }
      await startTrial();

      if (form.requestedModules.crm) {
        mirageFunnelEvent('request_crm_activation', { source, activation_stage: 'signup' });
      }
      if (form.requestedModules.erp) {
        mirageFunnelEvent('request_erp_activation', { source, activation_stage: 'signup' });
      }

      setLocation('/hub');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Não foi possível criar sua conta agora.';
      let payload: { code?: string; error?: string; tenant?: { id?: string } } | null = null;
      try {
        payload = JSON.parse(message);
      } catch {
        // Mantém a mensagem original quando a API não devolver JSON.
      }

      if (payload?.code === 'TRIAL_ALREADY_USED') {
        setExistingTenantId(payload.tenant?.id ?? null);
        setTrialAlreadyUsed(true);
        setError('');
        return;
      }

      setError((payload?.error ?? message).replace(/^"|"$/g, ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a1a] py-12 px-4">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200">
              <Sparkles className="h-4 w-4" /> Trial Mirage de 14 dias
            </div>
            <h1 className="text-4xl font-bold text-white">Comece sua operação no Mirage</h1>
            <p className="mt-3 text-lg leading-relaxed text-slate-400">
              Crie sua conta, configure sua empresa e explore o Hub sem cartão.
            </p>
          </div>

          {trialAlreadyUsed ? (
            <div className="space-y-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-6 text-center shadow-2xl sm:p-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Este login já utilizou o teste gratuito</h2>
                <p className="mt-3 leading-relaxed text-slate-300">
                  Não é possível iniciar um segundo trial com a mesma conta. Entre no seu workspace existente ou fale com o suporte do Mirage para recuperar o acesso ou contratar um plano.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" onClick={enterExistingWorkspace} className="h-12 bg-violet-600 text-white hover:bg-violet-500">
                  Entrar no Hub
                </Button>
                <Button asChild variant="outline" className="h-12 border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 hover:text-emerald-100">
                  <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    Falar com o suporte
                  </a>
                </Button>
              </div>
              <p className="text-sm text-slate-500">WhatsApp do suporte: (11) 99243-6154</p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="full-name" className="text-slate-200">Seu nome</Label>
                <Input id="full-name" required value={form.fullName} onFocus={markSignupStarted} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-2 border-white/10 bg-white/5 text-white" placeholder="Seu nome completo" />
              </div>
              <div>
                <Label htmlFor="company-name" className="text-slate-200">Nome da confecção</Label>
                <Input id="company-name" required value={form.companyName} onFocus={markSignupStarted} onChange={(event) => setForm({ ...form, companyName: event.target.value })} className="mt-2 border-white/10 bg-white/5 text-white" placeholder="Ex.: Confecção Horizonte" />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-slate-200">E-mail profissional</Label>
              <Input id="email" type="email" autoComplete="email" required value={form.email} onFocus={markSignupStarted} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 border-white/10 bg-white/5 text-white" placeholder="voce@empresa.com.br" />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-200">Crie sua senha Mirage</Label>
              <Input id="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onFocus={markSignupStarted} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 border-white/10 bg-white/5 text-white" placeholder="Mínimo de 8 caracteres" />
              <p className="mt-2 text-xs text-slate-500">Use esta senha para acessar sua conta no Mirage Hub.</p>
            </div>

            <div>
              <Label htmlFor="whatsapp" className="text-slate-200">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                autoComplete="tel"
                required
                value={form.whatsapp}
                onFocus={markSignupStarted}
                onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                className="mt-2 border-white/10 bg-white/5 text-white"
                placeholder="(11) 99999-9999"
              />
              <p className="mt-2 text-xs text-slate-500">Usaremos este número para contato e futuras automações da sua empresa.</p>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-200">O que você quer avaliar depois do trial? <span className="text-slate-500">(opcional)</span></legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-violet-400/50">
                <input type="checkbox" checked={form.requestedModules.crm} onChange={() => toggleModule('crm')} className="mt-1 h-4 w-4 accent-violet-500" />
                <span><span className="block font-medium text-white">CRM com IA</span><span className="mt-0.5 block text-sm text-slate-400">Solicitar ativação assistida após criar a conta.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-violet-400/50">
                <input type="checkbox" checked={form.requestedModules.erp} onChange={() => toggleModule('erp')} className="mt-1 h-4 w-4 accent-violet-500" />
                <span><span className="block font-medium text-white">ERP integrado</span><span className="mt-0.5 block text-sm text-slate-400">Solicitar conversa sobre a ativação assistida.</span></span>
              </label>
            </fieldset>

            {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

            <Button type="submit" disabled={submitting} className="h-12 w-full bg-violet-600 text-base font-semibold text-white hover:bg-violet-500">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Criar conta e iniciar trial
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Sem cartão. Seu trial começa imediatamente.
            </div>
          </form>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Building2 className="h-4 w-4" />
            Já cadastrou sua empresa? <Link href="/login?workspace=mirage" className="font-medium text-violet-300 hover:text-violet-200">Entrar no Hub</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}