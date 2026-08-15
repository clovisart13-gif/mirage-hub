import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import {
  Settings,
  Building2,
  Users,
  Crown,
  Save,
  Loader2,
  RefreshCw,
  UserCircle,
  Shield,
  Trash2,
  UserPlus,
  Mail,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-violet-100 text-violet-800',
  admin: 'bg-blue-100 text-blue-800',
  member: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-600',
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tenant, setTenant] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email_financeiro: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const t = await apiFetch('/tenants/meu-tenant');
      setTenant(t);
      setForm({
        nome: t.nome || t.name || '',
        cnpj: t.cnpj || '',
        telefone: t.telefone || '',
        email_financeiro: t.email_financeiro || '',
      });

      // Buscar membros
      try {
        const membros = await apiFetch('/tenants/' + t.id + '/users');
        setMembers(membros || []);
      } catch {
        setMembers([]);
      }
    } catch (err: any) {
      toast({ title: 'Erro ao carregar configurações', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    try {
      await apiFetch('/tenants/' + tenant.id, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.nome,
        }),
      });
      toast({ title: 'Configurações salvas', description: 'Dados da empresa atualizados com sucesso.' });
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!tenant) return;
    if (memberUserId === user?.id) {
      toast({ title: 'Ação não permitida', description: 'Você não pode remover a si mesmo.', variant: 'destructive' });
      return;
    }
    setRemovingId(memberId);
    try {
      await apiFetch('/tenants/' + tenant.id + '/users/' + memberUserId, { method: 'DELETE' });
      toast({ title: 'Membro removido' });
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !inviteEmail) return;
    setInviting(true);
    try {
      const result = await apiFetch('/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, tenant_id: tenant.id, role: inviteRole }),
      });
      setInviteSent(true);
      setInviteEmail('');
      const msg = result.tipo === 'vinculo_direto'
        ? 'Usuário existente vinculado diretamente à equipe.'
        : 'Convite enviado! O usuário receberá um e-mail para acessar a plataforma.';
      toast({ title: 'Convite enviado!', description: msg });
      await fetchData();
    } catch (err: any) {
      let msg = err.message;
      try { msg = JSON.parse(msg)?.error || msg; } catch {}
      toast({ title: 'Erro ao enviar convite', description: msg, variant: 'destructive' });
    } finally {
      setInviting(false);
      setTimeout(() => setInviteSent(false), 4000);
    }
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A nova senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast({ title: 'Senhas não conferem', description: 'A nova senha e a confirmação devem ser iguais.', variant: 'destructive' });
      return;
    }
    setSavingSenha(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      toast({ title: 'Senha alterada com sucesso!', description: 'Use a nova senha no próximo acesso.' });
    } catch (err: any) {
      toast({ title: 'Erro ao alterar senha', description: err.message, variant: 'destructive' });
    } finally {
      setSavingSenha(false);
    }
  };

  const userRole = members.find((m: any) => m.user_id === user?.id)?.role || 'member';
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  if (loading) {
    return (
      <Layout>
        <div className="px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!tenant) {
    return (
      <Layout>
        <div className="px-4 py-16 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold mb-2">Nenhuma empresa encontrada</h2>
          <p className="text-muted-foreground mb-6">Você ainda não tem uma conta vinculada. Assine um plano para começar.</p>
          <Button asChild><a href="/planos">Ver planos</a></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-violet-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Gerencie os dados da sua empresa e equipe</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <div className="space-y-6">
          {/* Plano atual */}
          <Card className="border shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Plano atual</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {tenant.assinatura_status === 'ativo' ? 'Ativo' : tenant.assinatura_status === 'trial' ? 'Trial' : tenant.assinatura_status || 'Sem plano'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-violet-100 text-violet-800 border-violet-200">
                    {PLAN_LABELS[tenant.plano] || 'Sem plano'}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/planos">Mudar plano</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados da empresa */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4" /> Dados da Empresa
              </CardTitle>
              <CardDescription>Informações da sua confecção no Mirage Hub.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome / Razão Social</Label>
                    <Input
                      id="nome"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="R2PB Confecções LTDA"
                      disabled={!isOwnerOrAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Identificador (slug)</Label>
                    <Input
                      id="slug"
                      value={tenant.slug}
                      disabled
                      className="bg-muted/50 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={form.cnpj}
                      onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                      disabled={!isOwnerOrAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      disabled={!isOwnerOrAdmin}
                    />
                  </div>
                </div>

                {isOwnerOrAdmin && (
                  <div className="pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {saving ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </form>
          </Card>

          {/* Alterar senha */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="w-4 h-4" /> Segurança
              </CardTitle>
              <CardDescription>Altere sua senha de acesso à plataforma.</CardDescription>
            </CardHeader>
            <form onSubmit={handleAlterarSenha}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="novaSenha">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="novaSenha"
                        type={showSenha ? 'text' : 'password'}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSenha(!showSenha)}
                      >
                        {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmarSenha"
                        type={showSenha ? 'text' : 'password'}
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        placeholder="Repita a nova senha"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <Button type="submit" disabled={savingSenha || !novaSenha || !confirmarSenha}>
                    {savingSenha ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    {savingSenha ? 'Salvando...' : 'Alterar senha'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* Membros da equipe */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="w-4 h-4" /> Equipe ({members.length})
                  </CardTitle>
                  <CardDescription>Membros com acesso à sua conta Mirage.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum membro cadastrado ainda.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member: any) => {
                    const isCurrentUser = member.user_id === user?.id;
                    const memberEmail = member.user?.email || member.user_id;
                    const memberRole = member.role || 'member';

                    return (
                      <div
                        key={member.id || member.user_id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold uppercase">
                            {memberEmail?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {memberEmail}
                              {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(você)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Desde {new Date(member.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {memberRole === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                          <Badge className={`text-xs ${ROLE_COLORS[memberRole] || 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[memberRole] || memberRole}
                          </Badge>
                          {isOwnerOrAdmin && !isCurrentUser && memberRole !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-600"
                              onClick={() => handleRemoveMember(member.id, member.user_id)}
                              disabled={removingId === member.id}
                            >
                              {removingId === member.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isOwnerOrAdmin && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-violet-600" />
                    Convidar novo membro
                  </p>
                  <form onSubmit={handleSendInvite} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Input
                          type="email"
                          required
                          placeholder="email@empresa.com.br"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={inviting}
                          className="h-9 text-sm"
                        />
                      </div>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="h-9 text-sm w-full sm:w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="submit" size="sm" className="h-9 shrink-0" disabled={inviting || !inviteEmail}>
                        {inviting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : inviteSent ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <><Mail className="w-3.5 h-3.5 mr-1.5" />Convidar</>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se o e-mail já tiver conta no Mirage, será vinculado diretamente. Caso contrário, receberá um e-mail de convite.
                    </p>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
