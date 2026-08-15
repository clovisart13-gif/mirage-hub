import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/Layout';
import { Loader2, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RecuperarSenha() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<'loading' | 'set-password' | 'success' | 'invalid'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase redireciona com #access_token=...&type=recovery no hash da URL
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (type === 'recovery' && accessToken) {
      // Seta a sessão com o token de recuperação para poder chamar updateUser
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' })
        .then(({ error }) => {
          if (error) {
            setMode('invalid');
          } else {
            setMode('set-password');
          }
        });
    } else {
      // Sem token de recuperação — link inválido ou expirado
      setMode('invalid');
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Senhas não coincidem', description: 'As senhas digitadas são diferentes.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMode('success');
      setTimeout(() => setLocation('/login'), 3000);
    } catch (err: any) {
      toast({ title: 'Erro ao redefinir senha', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">

          {mode === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Verificando link de recuperação...</p>
            </div>
          )}

          {mode === 'set-password' && (
            <>
              <div className="text-center">
                <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <KeyRound className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Criar nova senha</h2>
                <p className="text-sm text-muted-foreground mt-1">Digite sua nova senha abaixo.</p>
              </div>

              <form className="bg-card p-8 rounded-xl border shadow-sm space-y-4" onSubmit={handleSave}>
                <div>
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    className="mt-1"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirmar nova senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    className="mt-1"
                    placeholder="Repita a nova senha"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar nova senha
                </Button>
              </form>
            </>
          )}

          {mode === 'success' && (
            <div className="text-center space-y-4 bg-card p-8 rounded-xl border shadow-sm">
              <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">Senha redefinida!</h2>
              <p className="text-sm text-muted-foreground">Sua senha foi alterada com sucesso. Redirecionando para o login...</p>
              <Button className="w-full" onClick={() => setLocation('/login')}>Ir para o login agora</Button>
            </div>
          )}

          {mode === 'invalid' && (
            <div className="text-center space-y-4 bg-card p-8 rounded-xl border shadow-sm">
              <div className="mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold">Link inválido ou expirado</h2>
              <p className="text-sm text-muted-foreground">
                O link de recuperação não é válido ou já foi utilizado. Solicite um novo link de recuperação.
              </p>
              <Button className="w-full" onClick={() => setLocation('/login')}>Voltar ao login</Button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
