import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Phone, MapPin, UserCheck, Loader2, AlertCircle, Plus, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface Candidato {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  area: string;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  status: string;
  obs: string | null;
  encaminhado_mc_at: string | null;
  created_at: string;
}

const AREAS_RH = [
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'financeiro',     label: 'Financeiro' },
  { value: 'produto',        label: 'Produto' },
  { value: 'vendas',         label: 'Vendas' },
  { value: 'marketing',      label: 'Marketing' },
  { value: 'producao',       label: 'Produção' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  novo:       { label: 'Novo',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
  em_analise: { label: 'Em análise', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  aprovado:   { label: 'Aprovado',   color: 'bg-green-100 text-green-700 border-green-200' },
  descartado: { label: 'Descartado', color: 'bg-red-100 text-red-700 border-red-200' },
};

function fmtPhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) {
    const l = d.slice(2);
    return `(${l.slice(0, 2)}) ${l.slice(2, 7)}-${l.slice(7)}`;
  }
  return p;
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function EditCandidato({ candidato, onClose, onSaved }: { candidato: Candidato; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: candidato.nome, whatsapp: candidato.whatsapp, area: candidato.area,
    estado: candidato.estado ?? '', cidade: candidato.cidade ?? '',
  });
  const mut = useMutation({
    mutationFn: () => apiFetch(`/kanban/candidatos-rh/${candidato.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...form, whatsapp: form.whatsapp.replace(/\D/g, '') }),
    }),
    onSuccess: () => { toast.success('Candidato atualizado'); onSaved(); onClose(); },
    onError: () => toast.error('Erro ao atualizar'),
  });
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [k]: e.target.value }));
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar Candidato</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={f('nome')} /></div>
          <div><Label>WhatsApp *</Label><Input value={form.whatsapp} onChange={f('whatsapp')} /></div>
          <div>
            <Label>Área de interesse *</Label>
            <Select value={form.area} onValueChange={v => setForm(x => ({ ...x, area: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AREAS_RH.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>UF</Label><Input value={form.estado} onChange={f('estado')} maxLength={2} placeholder="SP" /></div>
            <div><Label>Cidade</Label><Input value={form.cidade} onChange={f('cidade')} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.nome || !form.whatsapp || !form.area} className="bg-violet-600 hover:bg-violet-700">
            {mut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoCandidato({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nome: '', whatsapp: '', area: '', estado: '', cidade: '', bairro: '' });
  const mut = useMutation({
    mutationFn: () => apiFetch('/public/r2pb/candidato', {
      method: 'POST',
      body: JSON.stringify({ ...form, whatsapp: form.whatsapp.replace(/\D/g, '') }),
    }),
    onSuccess: () => { toast.success('Candidato cadastrado'); onSaved(); onClose(); },
    onError: () => toast.error('Erro ao cadastrar'),
  });
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [k]: e.target.value }));
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo Candidato</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={f('nome')} /></div>
          <div><Label>WhatsApp *</Label><Input value={form.whatsapp} onChange={f('whatsapp')} placeholder="(11) 99999-0000" /></div>
          <div>
            <Label>Área de interesse *</Label>
            <Select value={form.area} onValueChange={v => setForm(x => ({ ...x, area: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {AREAS_RH.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>UF</Label><Input value={form.estado} onChange={f('estado')} maxLength={2} placeholder="SP" /></div>
            <div><Label>Cidade</Label><Input value={form.cidade} onChange={f('cidade')} /></div>
            <div><Label>Bairro</Label><Input value={form.bairro} onChange={f('bairro')} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.nome || !form.whatsapp || !form.area} className="bg-violet-600 hover:bg-violet-700">
            {mut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EncaminharMCModal({ candidato, onClose, onSaved }: { candidato: Candidato; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(candidato.email ?? '');
  const mut = useMutation({
    mutationFn: () => apiFetch(`/kanban/candidatos-rh/${candidato.id}/encaminhar-moda-conecta`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    }),
    onSuccess: (data: any) => {
      if (data?.alreadyExists) toast.success('Candidato já estava no Moda Conecta — atualizado!');
      else toast.success('Candidato encaminhado ao Moda Conecta com sucesso!');
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao encaminhar'),
  });
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-purple-600" /> Encaminhar ao Moda Conecta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{candidato.nome}</span> será cadastrado no pipeline de curadoria do Moda Conecta com status <span className="font-medium">Novo</span>.
          </p>
          <div>
            <Label>E-mail do candidato <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@email.com"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Usado para identificação única no Moda Conecta.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !email.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <ArrowUpRight className="w-4 h-4 mr-1.5" /> Encaminhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CandidatosRH() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showNovo, setShowNovo] = useState(false);
  const [editFor, setEditFor] = useState<Candidato | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [encaminharFor, setEncaminharFor] = useState<Candidato | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['candidatos-rh', search, filterArea, filterStatus],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '200' });
      if (search)       qs.set('search', search);
      if (filterArea)   qs.set('area', filterArea);
      if (filterStatus) qs.set('status', filterStatus);
      return apiFetch(`/kanban/candidatos-rh?${qs}`) as Promise<{ candidatos: Candidato[]; total: number }>;
    },
  });

  const candidatos = data?.candidatos ?? [];
  const total = data?.total ?? 0;

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/kanban/candidatos-rh/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos-rh'] }),
  });

  const deleteCandidato = useMutation({
    mutationFn: (id: string) => apiFetch(`/kanban/candidatos-rh/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Candidato excluído'); setDeleteId(null); qc.invalidateQueries({ queryKey: ['candidatos-rh'] }); },
    onError: () => toast.error('Erro ao excluir'),
  });

  const stats = [
    { label: 'Total',       val: total,                                                    color: 'text-gray-600' },
    { label: 'Novos',       val: candidatos.filter(c => c.status === 'novo').length,       color: 'text-gray-500' },
    { label: 'Em análise',  val: candidatos.filter(c => c.status === 'em_analise').length, color: 'text-blue-600' },
    { label: 'Aprovados',   val: candidatos.filter(c => c.status === 'aprovado').length,   color: 'text-green-600' },
  ];

  return (
    <KanbanLayout>
      <div className="px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-violet-600" /> Candidatos RH
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Banco de talentos — administrativo, financeiro, produto, vendas, marketing e produção
            </p>
          </div>
          <Button onClick={() => setShowNovo(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Plus size={16} /> Novo Candidato
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border bg-card p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar nome, cidade..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterArea || 'all'} onValueChange={v => setFilterArea(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {AREAS_RH.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus || 'all'} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" /> Carregando...
            </div>
          ) : candidatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <AlertCircle size={32} className="opacity-30" />
              <p className="text-sm">Nenhum candidato encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Candidato</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Área</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Localização</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Entrada</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {candidatos.map(c => {
                    const sc = STATUS_CONFIG[c.status] ?? STATUS_CONFIG['novo'];
                    const areaLabel = AREAS_RH.find(a => a.value === c.area)?.label ?? c.area;
                    return (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium">{c.nome}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone size={11} />
                            <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener noreferrer"
                              className="hover:text-green-600 transition-colors">
                              {fmtPhone(c.whatsapp)}
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted/40 text-foreground border-border">
                            {areaLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {(c.cidade || c.estado) ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin size={11} />
                              {[c.cidade, c.estado].filter(Boolean).join(' — ')}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                        <td className="py-3 px-4">
                          <Select value={c.status} onValueChange={v => patchStatus.mutate({ id: c.id, status: v })}>
                            <SelectTrigger className={`h-7 text-xs w-32 border ${sc.color}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs gap-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                              onClick={() => setEncaminharFor(c)}
                              title="Encaminhar para Moda Conecta">
                              {c.encaminhado_mc_at
                                ? <ArrowUpRight size={12} className="text-green-600" />
                                : <ArrowUpRight size={12} />}
                              MC
                            </Button>
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditFor(c)} title="Editar">
                              <Pencil size={12} />
                            </Button>
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                              onClick={() => setDeleteId(c.id)} title="Excluir">
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNovo && (
        <NovoCandidato
          onClose={() => setShowNovo(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['candidatos-rh'] })}
        />
      )}
      {editFor && (
        <EditCandidato
          candidato={editFor}
          onClose={() => setEditFor(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['candidatos-rh'] })}
        />
      )}
      {deleteId && (
        <Dialog open onOpenChange={o => !o && setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Excluir candidato?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. O candidato será removido permanentemente.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteCandidato.mutate(deleteId)} disabled={deleteCandidato.isPending}>
                {deleteCandidato.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {encaminharFor && (
        <EncaminharMCModal
          candidato={encaminharFor}
          onClose={() => setEncaminharFor(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['candidatos-rh'] })}
        />
      )}
    </KanbanLayout>
  );
}
