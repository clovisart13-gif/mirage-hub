import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  Search, Plus, Send, FileText, Phone, Mail, Building2,
  Loader2, X, CheckCircle2, Clock, AlertCircle, UserCheck,
} from 'lucide-react';

interface Contato {
  id: string;
  lead_name: string | null;
  phone: string;
  email: string | null;
  empresa: string | null;
  segmento: string | null;
  classificacao: string;
  score: number;
  diagnostico_triado: boolean;
  formulario_enviado_at: string | null;
  status: string;
  obs: string | null;
  created_at: string;
  updated_at: string;
}

const CLASSIFICACAO_CONFIG: Record<string, { label: string; color: string }> = {
  aprovado:       { label: 'Aprovado',      color: 'bg-green-100 text-green-700 border-green-200' },
  nutricao:       { label: 'Nutrição',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  fora_de_perfil: { label: 'Fora do perfil', color: 'bg-red-100 text-red-700 border-red-200' },
  lead:           { label: 'Lead',          color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function fmtPhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) {
    const local = d.slice(2);
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return p;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function NovoContatoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [phone, setPhone] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const data = await apiFetch('/crm/contatos', {
        method: 'POST',
        body: JSON.stringify({ phone, nome: nome || undefined, email: email || undefined, empresa: empresa || undefined }),
      });
      if (!data?.ok) throw new Error(data?.error ?? 'Erro ao criar contato');
      return data;
    },
    onSuccess: () => {
      toast.success('Contato criado com sucesso');
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Novo Contato Comercial</h2>
          <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Telefone (WhatsApp) *</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" required />
          </div>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva" />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nome da marca ou empresa" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!phone.trim() || mutation.isPending}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {mutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
            Criar Contato
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ContatosComerciais() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['crm-contatos', debouncedSearch],
    queryFn: async () => {
      const qs = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : '';
      const data = await apiFetch(`/crm/contatos${qs}`);
      if (!data?.ok) throw new Error('Falha ao carregar contatos');
      return data as { ok: boolean; contatos: Contato[]; total: number };
    },
  });

  const contatos = data?.contatos ?? [];
  const total = data?.total ?? 0;

  function handleSearchChange(v: string) {
    setSearch(v);
    clearTimeout((window as any)._srchTimer);
    (window as any)._srchTimer = setTimeout(() => setDebouncedSearch(v), 400);
  }

  async function enviarFormulario(c: Contato) {
    setSendingId(c.id);
    try {
      const data = await apiFetch('/crm/diagnostico/enviar', {
        method: 'POST',
        body: JSON.stringify({ phone: c.phone, nome: c.lead_name ?? undefined, contatoId: c.id }),
      });
      if (!data?.ok) throw new Error(data?.error ?? 'Falha ao enviar');
      toast.success(`Formulário enviado para ${fmtPhone(c.phone)}`);
      qc.invalidateQueries({ queryKey: ['crm-contatos'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingId(null);
    }
  }

  const clf = (c: Contato) => CLASSIFICACAO_CONFIG[c.classificacao] ?? CLASSIFICACAO_CONFIG['lead'];

  return (
    <KanbanLayout>
      <div className="px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Contatos Comerciais</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Leads, diagnósticos e contatos pré-orçamento da R2PB — {total} no total
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
            <Plus size={16} /> Novo Contato
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, telefone, empresa..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',       val: total,                                                         icon: UserCheck,    color: 'text-gray-600' },
            { label: 'Aprovados',   val: contatos.filter(c => c.classificacao === 'aprovado').length,   icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Nutrição',    val: contatos.filter(c => c.classificacao === 'nutricao').length,   icon: Clock,        color: 'text-yellow-600' },
            { label: 'Com diagnóstico', val: contatos.filter(c => c.diagnostico_triado).length,         icon: FileText,     color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
              <s.icon size={20} className={s.color} />
              <div>
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" /> Carregando...
            </div>
          ) : contatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <AlertCircle size={32} className="opacity-30" />
              <p className="text-sm">{debouncedSearch ? 'Nenhum resultado para esta busca' : 'Nenhum contato ainda'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contato</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Telefone</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Segmento</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Classificação</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Diagnóstico</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Criado</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contatos.map(c => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium">{c.lead_name ?? <span className="text-muted-foreground italic">Sem nome</span>}</div>
                        {c.empresa && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Building2 size={11} /> {c.empresa}
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Mail size={11} /> {c.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Phone size={12} className="text-muted-foreground" />
                          {fmtPhone(c.phone)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{c.segmento ?? '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${clf(c).color}`}>
                          {clf(c).label}
                          {c.score > 0 && <span className="ml-1 opacity-60">· {c.score}</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {c.diagnostico_triado ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 size={13} /> Preenchido
                          </span>
                        ) : c.formulario_enviado_at ? (
                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                            <Clock size={13} /> Enviado {fmtDate(c.formulario_enviado_at)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={sendingId === c.id}
                            onClick={() => enviarFormulario(c)}
                            title="Enviar formulário de diagnóstico"
                          >
                            {sendingId === c.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Send size={12} />}
                            Formulário
                          </Button>
                          <a
                            href={`/hub/custos/orcamentos?contato=${encodeURIComponent(c.lead_name ?? c.phone)}&phone=${encodeURIComponent(c.phone)}`}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs font-medium bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 transition-colors"
                          >
                            <FileText size={12} /> Orçamento
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NovoContatoModal
          onClose={() => setShowModal(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['crm-contatos'] })}
        />
      )}
    </KanbanLayout>
  );
}
