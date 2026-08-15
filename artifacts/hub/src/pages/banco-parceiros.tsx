import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  Search, Send, Phone, MapPin, Users2,
  Loader2, X, CheckCircle2, Clock, AlertCircle, Plus, Filter,
  ArrowUpRight, Pencil, Trash2, ExternalLink, ClipboardList,
  ThumbsUp, ThumbsDown, RefreshCw,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface Parceiro {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  empresa: string | null;
  area: string;
  subtipo: string | null;
  tipo_malha: string | null;
  qtde_costureiros: string | null;
  capacidade_produtiva: string | null;
  tipos_maquina: string[] | null;
  linha_produto: string[] | null;
  tipos_acabamento: string[] | null;
  especialidades: string[] | null;
  tipos_produto: string[] | null;
  private_label: boolean | null;
  aceita_briefing: boolean | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  obs: string | null;
  status: string;
  formulario_enviado_at: string | null;
  cotacao_enviada_at: string | null;
  cotacao_resposta: string | null;
  encaminhado_mc_at: string | null;
  created_at: string;
}

// Todos os valores possíveis de área (antigos + novos do formulário)
const AREA_LABEL: Record<string, string> = {
  producao:       'Produção',
  beneficiamento: 'Beneficiamento',
  lavanderia:     'Lavanderia',
  acabamento:     'Acabamento',
  fornecedor:     'Fornecedor',
  costura:        'Costura',
  corte:          'Corte',
  modelagem:      'Modelagem',
  pilotagem:      'Pilotagem',
  estamparia:     'Estamparia',
  // Valores com maiúscula (vêm do formulário novo)
  Costura:        'Costura',
  Corte:          'Corte',
  Modelagem:      'Modelagem',
  Pilotagem:      'Pilotagem',
  Beneficiamento: 'Beneficiamento',
  Lavanderia:     'Lavanderia',
  Acabamento:     'Acabamento',
  Estamparia:     'Estamparia',
};

const AREAS_FILTER = [
  { value: 'Costura',        label: 'Costura' },
  { value: 'Beneficiamento', label: 'Beneficiamento' },
  { value: 'Corte',          label: 'Corte' },
  { value: 'Modelagem',      label: 'Modelagem' },
  { value: 'Pilotagem',      label: 'Pilotagem' },
  { value: 'Lavanderia',     label: 'Lavanderia' },
  { value: 'Acabamento',     label: 'Acabamento' },
  { value: 'Estamparia',     label: 'Estamparia' },
  { value: 'producao',       label: 'Produção (legado)' },
  { value: 'fornecedor',     label: 'Fornecedor (legado)' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  prospecto:      { label: 'Prospecto',      color: 'bg-gray-100 text-gray-600 border-gray-200' },
  qualificado:    { label: 'Qualificado',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  aguardando:     { label: 'Aguardando',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  disponivel:     { label: 'Disponível',     color: 'bg-green-100 text-green-700 border-green-200' },
  nao_disponivel: { label: 'Não Disponível', color: 'bg-red-100 text-red-700 border-red-200' },
  ativo:          { label: 'Ativo',          color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  inativo:        { label: 'Inativo',        color: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
};

function fmtPhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) {
    const l = d.slice(2);
    return `(${l.slice(0, 2)}) ${l.slice(2, 7)}-${l.slice(7)}`;
  }
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return p;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtArea(area: string) {
  return AREA_LABEL[area] ?? area.charAt(0).toUpperCase() + area.slice(1);
}

function capitalize(s: string) {
  if (!s) return s;
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// ── Tag input helper ──────────────────────────────────────────────────────────
function TagInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1 mt-1 mb-1">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-red-500">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? 'Digitar e pressionar Enter...'}
          className="h-8 text-xs"
        />
        <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={add}>+</Button>
      </div>
    </div>
  );
}

const ESP_OPTIONS = ['Costura', 'Modelagem', 'Bordado/Estamparia', 'Aviamentos', 'Lavanderia', 'Acabamento', 'Silk', 'DTG', 'Sublimação', 'Outro'];

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditParceiro({ parceiro, onClose, onSaved }: { parceiro: Parceiro; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome:                  parceiro.nome,
    whatsapp:              parceiro.whatsapp,
    email:                 parceiro.email ?? '',
    empresa:               parceiro.empresa ?? '',
    area:                  parceiro.area,
    subtipo:               parceiro.subtipo ?? '',
    tipo_malha:            parceiro.tipo_malha ?? '',
    qtde_costureiros:      parceiro.qtde_costureiros ?? '',
    capacidade_produtiva:  parceiro.capacidade_produtiva ?? '',
    estado:                parceiro.estado ?? '',
    cidade:                parceiro.cidade ?? '',
    bairro:                parceiro.bairro ?? '',
    obs:                   parceiro.obs ?? '',
    private_label:         parceiro.private_label ?? false,
    aceita_briefing:       parceiro.aceita_briefing ?? true,
    especialidades:        parceiro.especialidades ?? [],
    tipos_maquina:         parceiro.tipos_maquina ?? [],
    linha_produto:         parceiro.linha_produto ?? [],
    tipos_acabamento:      parceiro.tipos_acabamento ?? [],
  });
  const mut = useMutation({
    mutationFn: () => apiFetch(`/kanban/parceiros/${parceiro.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...form, whatsapp: form.whatsapp.replace(/\D/g, '') }),
    }),
    onSuccess: () => { toast.success('Parceiro atualizado'); onSaved(); onClose(); },
    onError: () => toast.error('Erro ao atualizar'),
  });
  const fi = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(v => ({ ...v, [k]: e.target.value }));
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Parceiro</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">

          {/* Identificação */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Identificação</p>
            <div className="space-y-2">
              <div><Label>Nome / Razão Social *</Label><Input value={form.nome} onChange={fi('nome')} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>WhatsApp *</Label><Input value={form.whatsapp} onChange={fi('whatsapp')} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={fi('email')} placeholder="contato@empresa.com" /></div>
              </div>
              <div><Label>Nome da Empresa</Label><Input value={form.empresa} onChange={fi('empresa')} placeholder="Razão social ou nome fantasia" /></div>
            </div>
          </div>

          {/* Área e Serviço */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Área e Serviço</p>
            <div className="space-y-2">
              <div>
                <Label>Área *</Label>
                <Select value={form.area} onValueChange={v => setForm(x => ({ ...x, area: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AREAS_FILTER.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Serviço / Subtipo</Label><Input value={form.subtipo} onChange={fi('subtipo')} placeholder="ex: Fitness, Moda Praia, Jeans..." /></div>
              <TagInput
                label="Especialidades"
                values={form.especialidades}
                onChange={v => setForm(x => ({ ...x, especialidades: v }))}
                placeholder="ex: Silk, DTG, Sublimação..."
              />
              <div className="flex gap-2 flex-wrap">
                {ESP_OPTIONS.map(e => (
                  <button
                    key={e} type="button"
                    onClick={() => {
                      const has = form.especialidades.includes(e);
                      setForm(x => ({ ...x, especialidades: has ? x.especialidades.filter(v => v !== e) : [...x.especialidades, e] }));
                    }}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      form.especialidades.includes(e)
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-muted-foreground border-gray-200 hover:border-violet-400'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Capacidade */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capacidade Produtiva</p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Tipo de Malha</Label><Input value={form.tipo_malha} onChange={fi('tipo_malha')} placeholder="ex: Malharia circular, Denim..." /></div>
                <div><Label>Qtde Costureiros</Label><Input value={form.qtde_costureiros} onChange={fi('qtde_costureiros')} placeholder="ex: 10" /></div>
              </div>
              <div><Label>Capacidade Produtiva</Label><Input value={form.capacidade_produtiva} onChange={fi('capacidade_produtiva')} placeholder="ex: 500 pcs/semana" /></div>
              <TagInput label="Tipos de Máquina" values={form.tipos_maquina} onChange={v => setForm(x => ({ ...x, tipos_maquina: v }))} placeholder="ex: Overlock, Reta, Galoneira..." />
              <TagInput label="Linha de Produto" values={form.linha_produto} onChange={v => setForm(x => ({ ...x, linha_produto: v }))} placeholder="ex: Feminino, Fitness, Infantil..." />
              <TagInput label="Tipos de Acabamento" values={form.tipos_acabamento} onChange={v => setForm(x => ({ ...x, tipos_acabamento: v }))} placeholder="ex: Bordado, Silk, Lavagem..." />
            </div>
          </div>

          {/* Localização */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Localização</p>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>UF</Label><Input value={form.estado} onChange={fi('estado')} maxLength={2} placeholder="SP" /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={fi('cidade')} /></div>
              <div><Label>Bairro</Label><Input value={form.bairro} onChange={fi('bairro')} /></div>
            </div>
          </div>

          {/* Opções */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Opções</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.private_label} onChange={e => setForm(x => ({ ...x, private_label: e.target.checked }))} />
                <span className="text-sm">Faz Private Label</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.aceita_briefing} onChange={e => setForm(x => ({ ...x, aceita_briefing: e.target.checked }))} />
                <span className="text-sm">Aceita Briefing</span>
              </label>
            </div>
          </div>

          {/* Obs */}
          <div>
            <Label>Observações</Label>
            <Input value={form.obs} onChange={fi('obs')} placeholder="Anotações internas..." />
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.nome || !form.whatsapp || !form.area}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Novo Parceiro Modal ───────────────────────────────────────────────────────
function NovoParceiro({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: '', whatsapp: '', email: '', empresa: '', area: '', subtipo: '',
    tipo_malha: '', qtde_costureiros: '', capacidade_produtiva: '',
    estado: '', cidade: '', bairro: '', obs: '',
    private_label: false, aceita_briefing: true,
    especialidades: [] as string[], tipos_maquina: [] as string[],
    linha_produto: [] as string[], tipos_acabamento: [] as string[],
  });
  const mut = useMutation({
    mutationFn: () => apiFetch('/kanban/parceiros', {
      method: 'POST',
      body: JSON.stringify({ ...form, whatsapp: form.whatsapp.replace(/\D/g, '') }),
    }),
    onSuccess: () => { toast.success('Parceiro cadastrado'); onSaved(); onClose(); },
    onError: () => toast.error('Erro ao cadastrar'),
  });
  const fi = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(v => ({ ...v, [k]: e.target.value }));
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Parceiro</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">

          {/* Identificação */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Identificação</p>
            <div className="space-y-2">
              <div><Label>Nome / Razão Social *</Label><Input value={form.nome} onChange={fi('nome')} placeholder="Empresa ou nome" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>WhatsApp *</Label><Input value={form.whatsapp} onChange={fi('whatsapp')} placeholder="(11) 99999-0000" /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={fi('email')} placeholder="contato@empresa.com" /></div>
              </div>
              <div><Label>Nome da Empresa</Label><Input value={form.empresa} onChange={fi('empresa')} placeholder="Razão social ou nome fantasia" /></div>
            </div>
          </div>

          {/* Área e Serviço */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Área e Serviço</p>
            <div className="space-y-2">
              <div>
                <Label>Área *</Label>
                <Select value={form.area} onValueChange={v => setForm(x => ({ ...x, area: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {AREAS_FILTER.filter(a => !['producao','fornecedor'].includes(a.value)).map(a =>
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Serviço / Subtipo</Label><Input value={form.subtipo} onChange={fi('subtipo')} placeholder="ex: Fitness, Moda Praia, Jeans..." /></div>
              <TagInput
                label="Especialidades"
                values={form.especialidades}
                onChange={v => setForm(x => ({ ...x, especialidades: v }))}
                placeholder="ex: Silk, DTG, Sublimação..."
              />
              <div className="flex gap-2 flex-wrap">
                {ESP_OPTIONS.map(e => (
                  <button
                    key={e} type="button"
                    onClick={() => {
                      const has = form.especialidades.includes(e);
                      setForm(x => ({ ...x, especialidades: has ? x.especialidades.filter(v => v !== e) : [...x.especialidades, e] }));
                    }}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      form.especialidades.includes(e)
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-muted-foreground border-gray-200 hover:border-violet-400'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Capacidade */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capacidade Produtiva</p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Tipo de Malha</Label><Input value={form.tipo_malha} onChange={fi('tipo_malha')} placeholder="ex: Malharia circular, Denim..." /></div>
                <div><Label>Qtde Costureiros</Label><Input value={form.qtde_costureiros} onChange={fi('qtde_costureiros')} placeholder="ex: 10" /></div>
              </div>
              <div><Label>Capacidade Produtiva</Label><Input value={form.capacidade_produtiva} onChange={fi('capacidade_produtiva')} placeholder="ex: 500 pcs/semana" /></div>
              <TagInput label="Tipos de Máquina" values={form.tipos_maquina} onChange={v => setForm(x => ({ ...x, tipos_maquina: v }))} placeholder="ex: Overlock, Reta, Galoneira..." />
              <TagInput label="Linha de Produto" values={form.linha_produto} onChange={v => setForm(x => ({ ...x, linha_produto: v }))} placeholder="ex: Feminino, Fitness, Infantil..." />
              <TagInput label="Tipos de Acabamento" values={form.tipos_acabamento} onChange={v => setForm(x => ({ ...x, tipos_acabamento: v }))} placeholder="ex: Bordado, Silk, Lavagem..." />
            </div>
          </div>

          {/* Localização */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Localização</p>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>UF</Label><Input value={form.estado} onChange={fi('estado')} maxLength={2} placeholder="SP" /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={fi('cidade')} /></div>
              <div><Label>Bairro</Label><Input value={form.bairro} onChange={fi('bairro')} /></div>
            </div>
          </div>

          {/* Opções */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Opções</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.private_label} onChange={e => setForm(x => ({ ...x, private_label: e.target.checked }))} />
                <span className="text-sm">Faz Private Label</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.aceita_briefing} onChange={e => setForm(x => ({ ...x, aceita_briefing: e.target.checked }))} />
                <span className="text-sm">Aceita Briefing</span>
              </label>
            </div>
          </div>

          {/* Obs */}
          <div>
            <Label>Observações</Label>
            <Input value={form.obs} onChange={fi('obs')} placeholder="Anotações internas..." />
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.nome || !form.whatsapp || !form.area}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Encaminhar MC Modal ───────────────────────────────────────────────────────
function EncaminharMCModal({ parceiro, onClose, onSaved }: { parceiro: Parceiro; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(parceiro.email ?? '');
  const mut = useMutation({
    mutationFn: () => apiFetch(`/kanban/parceiros/${parceiro.id}/encaminhar-moda-conecta`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    }),
    onSuccess: (data: any) => {
      if (data?.alreadyExists) toast.success('Parceiro já estava no Moda Conecta — atualizado!');
      else toast.success('Parceiro encaminhado ao Moda Conecta com sucesso!');
      onSaved(); onClose();
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
            <span className="font-medium text-foreground">{parceiro.nome}</span> será cadastrado no pipeline com status <span className="font-medium">Novo</span>.
          </p>
          <div>
            <Label>E-mail do contato <span className="text-red-500">*</span></Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@empresa.com.br" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !email.trim()} className="bg-purple-600 hover:bg-purple-700">
            {mut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <ArrowUpRight className="w-4 h-4 mr-1.5" /> Encaminhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BancoParceiros() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [search, setSearch]                     = useState('');
  const [filterArea, setFilterArea]             = useState('');
  const [filterStatus, setFilterStatus]         = useState('');
  const [filterCidade, setFilterCidade]         = useState('');
  const [filterBairro, setFilterBairro]         = useState('');
  const [filterEspecialidade, setFilterEsp]     = useState('');
  const [showNovo, setShowNovo]                 = useState(false);
  const [editFor, setEditFor]           = useState<Parceiro | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [encaminharFor, setEncaminharFor] = useState<Parceiro | null>(null);
  const [sendingFormId, setSendingFormId] = useState<string | null>(null);
  const [selected, setSelected]         = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids: string[]) =>
    setSelected(prev => prev.size === ids.length ? new Set() : new Set(ids));

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['banco-parceiros', search, filterArea, filterStatus, filterCidade],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '300' });
      if (search)       qs.set('search', search);
      if (filterArea)   qs.set('area', filterArea);
      if (filterStatus) qs.set('status', filterStatus);
      if (filterCidade) qs.set('cidade', filterCidade);
      return apiFetch(`/kanban/parceiros?${qs}`) as Promise<{ parceiros: Parceiro[]; total: number }>;
    },
    refetchInterval: 20_000,
  });

  const allParceiros = data?.parceiros ?? [];
  const total = data?.total ?? 0;

  const cidadeOpts = Array.from(new Set(
    (data?.parceiros ?? []).map(p => p.cidade).filter(Boolean) as string[]
  )).sort();
  const bairroOpts = Array.from(new Set(allParceiros.map(p => p.bairro).filter(Boolean) as string[])).sort();
  const espOpts = Array.from(new Set(
    allParceiros.flatMap(p => p.especialidades ?? []).filter(Boolean)
  )).sort();

  const parceiros = allParceiros.filter(p => {
    if (filterBairro && p.bairro !== filterBairro) return false;
    if (filterEspecialidade) {
      const esp = (p.especialidades ?? []) as string[];
      if (!esp.some(e => e.toLowerCase() === filterEspecialidade.toLowerCase())) return false;
    }
    return true;
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['banco-parceiros'] });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/kanban/parceiros/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const responderCotacao = useMutation({
    mutationFn: ({ id, resposta }: { id: string; resposta: 'sim' | 'nao' }) =>
      apiFetch(`/kanban/parceiros/${id}/responder-cotacao`, {
        method: 'POST',
        body: JSON.stringify({ resposta }),
      }),
    onSuccess: (_data, vars) => {
      toast.success(vars.resposta === 'sim' ? '✅ Marcado como Disponível' : '❌ Marcado como Não Disponível');
      invalidate();
    },
    onError: () => toast.error('Erro ao registrar resposta'),
  });

  const deleteParceiro = useMutation({
    mutationFn: (id: string) => apiFetch(`/kanban/parceiros/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Parceiro excluído'); setDeleteId(null); invalidate(); },
    onError: () => toast.error('Erro ao excluir'),
  });

  async function enviarFormulario(p: Parceiro) {
    setSendingFormId(p.id);
    try {
      await apiFetch(`/kanban/parceiros/${p.id}/enviar-formulario`, { method: 'POST' });
      toast.success(`Formulário enviado para ${fmtPhone(p.whatsapp)}`);
      invalidate();
    } catch (e: any) { toast.error(e.message ?? 'Erro ao enviar'); }
    finally { setSendingFormId(null); }
  }

  const aguardandoCount  = parceiros.filter(p => p.cotacao_enviada_at && !p.cotacao_resposta).length;
  const disponiveisCount = parceiros.filter(p => p.status === 'disponivel').length;
  const ativosCount      = parceiros.filter(p => p.status === 'ativo').length;

  const stats = [
    { label: 'Total',       val: total,           color: 'text-gray-700',    bg: '' },
    { label: 'Aguardando',  val: aguardandoCount,  color: 'text-amber-600',   bg: aguardandoCount  > 0 ? 'bg-amber-50 border-amber-200'  : '' },
    { label: 'Disponíveis', val: disponiveisCount, color: 'text-green-600',   bg: disponiveisCount > 0 ? 'bg-green-50 border-green-200'  : '' },
    { label: 'Ativos',      val: ativosCount,      color: 'text-emerald-600', bg: '' },
  ];

  return (
    <KanbanLayout>
      <div className="px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users2 className="w-6 h-6 text-violet-600" /> Banco de Parceiros
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Costura, beneficiamento, corte, modelagem e acabamento
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="gap-1.5 text-xs"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              Atualizar
            </Button>
            <Button onClick={() => setShowNovo(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus size={16} /> Cadastrar Parceiro
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className={`rounded-xl border bg-card p-4 ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Buscar nome, cidade..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterArea || 'all'} onValueChange={v => setFilterArea(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-44">
              <Filter size={13} className="mr-1.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {AREAS_FILTER.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {espOpts.length > 0 && (
            <Select value={filterEspecialidade || 'all'} onValueChange={v => setFilterEsp(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Especialidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas especialidades</SelectItem>
                {espOpts.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {cidadeOpts.length > 0 && (
            <Select value={filterCidade || 'all'} onValueChange={v => { setFilterCidade(v === 'all' ? '' : v); setFilterBairro(''); }}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cidades</SelectItem>
                {cidadeOpts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {bairroOpts.length > 0 && (
            <Select value={filterBairro || 'all'} onValueChange={v => setFilterBairro(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Bairro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os bairros</SelectItem>
                {bairroOpts.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filterStatus || 'all'} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterArea || filterCidade || filterBairro || filterStatus || filterEspecialidade || search) && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground gap-1"
              onClick={() => { setFilterArea(''); setFilterCidade(''); setFilterBairro(''); setFilterStatus(''); setFilterEsp(''); setSearch(''); }}>
              <X size={13} /> Limpar
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" /> Carregando...
            </div>
          ) : parceiros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <AlertCircle size={32} className="opacity-30" />
              <p className="text-sm">Nenhum parceiro encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="py-3 px-3 w-8">
                      <input type="checkbox" className="rounded"
                        checked={selected.size === parceiros.length && parceiros.length > 0}
                        onChange={() => toggleAll(parceiros.map(p => p.id))} />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Parceiro</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Área / Especialidade</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Localização</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cotação</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parceiros.map(p => {
                    const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG['prospecto'];
                    const isSelected = selected.has(p.id);
                    const aguardandoCotacao = !!p.cotacao_enviada_at && !p.cotacao_resposta;
                    const isResponding = responderCotacao.isPending && (responderCotacao.variables as any)?.id === p.id;

                    return (
                      <tr key={p.id} className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-violet-50/60' : ''} ${aguardandoCotacao ? 'bg-amber-50/30' : ''}`}>

                        {/* Checkbox */}
                        <td className="py-3 px-3">
                          <input type="checkbox" className="rounded" checked={isSelected} onChange={() => toggleSelect(p.id)} />
                        </td>

                        {/* Parceiro — nome + telefone */}
                        <td className="py-3 px-4">
                          <div className="font-medium leading-tight">{p.nome}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone size={11} />
                            <a href={`https://wa.me/${p.whatsapp}`} target="_blank" rel="noopener noreferrer"
                              className="hover:text-green-600 transition-colors">
                              {fmtPhone(p.whatsapp)}
                            </a>
                          </div>
                        </td>

                        {/* Área / Especialidade */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-sm leading-tight">
                            {fmtArea(p.area)}
                          </div>
                          {p.subtipo && (
                            <div className="text-xs text-violet-600 font-medium mt-0.5">
                              {capitalize(p.subtipo)}
                            </div>
                          )}
                        </td>

                        {/* Localização — cidade + bairro primário, estado secundário */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-1">
                            <MapPin size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              {p.cidade ? (
                                <div className="text-sm leading-tight font-medium">
                                  {capitalize(p.cidade)}
                                  {p.bairro && (
                                    <span className="font-normal text-muted-foreground">, {capitalize(p.bairro)}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                              {p.estado && (
                                <div className="text-[11px] text-muted-foreground/70 uppercase">{p.estado}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cotação */}
                        <td className="py-3 px-4 min-w-[160px]">
                          {p.cotacao_enviada_at ? (
                            <div className="space-y-1.5">
                              <div className="text-[11px] text-muted-foreground">{fmtDate(p.cotacao_enviada_at)}</div>

                              {p.cotacao_resposta === 'sim' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={11} /> Interessado
                                </span>
                              ) : p.cotacao_resposta === 'nao' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                  <X size={11} /> Não disponível
                                </span>
                              ) : (
                                /* Aguardando — botões Sim / Não */
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <Clock size={11} /> Aguardando
                                  </span>
                                  <div className="flex gap-1 pt-0.5">
                                    <button
                                      onClick={() => responderCotacao.mutate({ id: p.id, resposta: 'sim' })}
                                      disabled={isResponding}
                                      title="Marcar como Disponível"
                                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-colors disabled:opacity-50"
                                    >
                                      {isResponding ? <Loader2 size={10} className="animate-spin" /> : <ThumbsUp size={10} />}
                                      Sim
                                    </button>
                                    <button
                                      onClick={() => responderCotacao.mutate({ id: p.id, resposta: 'nao' })}
                                      disabled={isResponding}
                                      title="Marcar como Não Disponível"
                                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors disabled:opacity-50"
                                    >
                                      {isResponding ? <Loader2 size={10} className="animate-spin" /> : <ThumbsDown size={10} />}
                                      Não
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <Select value={p.status} onValueChange={v => patchStatus.mutate({ id: p.id, status: v })}>
                            <SelectTrigger className={`h-7 text-xs w-36 border ${sc.color}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 justify-end">
                            {/* Form: envia link por WhatsApp + abre em nova aba */}
                            <div className="flex items-center border rounded-md overflow-hidden h-7">
                              <Button size="sm" variant="ghost"
                                className="h-7 rounded-none text-xs gap-1 px-2 border-r"
                                disabled={sendingFormId === p.id}
                                onClick={() => enviarFormulario(p)}
                                title="Enviar link do formulário por WhatsApp">
                                {sendingFormId === p.id
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : <Send size={11} />}
                                Form
                              </Button>
                              <a
                                href="https://www.gestaomirage.com.br/onboarding-portal/fornecedores"
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center h-7 w-6 hover:bg-muted/50 transition-colors"
                                title="Abrir formulário em nova aba">
                                <ExternalLink size={10} className="text-muted-foreground" />
                              </a>
                            </div>
                            {/* Cotação */}
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs gap-1 bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                              onClick={() => navigate(`/hub/kanban/cotacoes/nova?ids=${p.id}`)}
                              title="Criar cotação">
                              <ClipboardList size={12} /> Cotação
                            </Button>
                            {/* Moda Conecta */}
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs gap-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                              onClick={() => setEncaminharFor(p)}
                              title="Encaminhar para Moda Conecta">
                              {p.encaminhado_mc_at
                                ? <CheckCircle2 size={12} className="text-green-600" />
                                : <ArrowUpRight size={12} />}
                              MC
                            </Button>
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditFor(p)} title="Editar">
                              <Pencil size={12} />
                            </Button>
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                              onClick={() => setDeleteId(p.id)} title="Excluir">
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

        {/* Footer count */}
        {!isLoading && parceiros.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {parceiros.length} parceiro{parceiros.length !== 1 ? 's' : ''} exibido{parceiros.length !== 1 ? 's' : ''}
            {data?.total && data.total !== parceiros.length ? ` de ${data.total} total` : ''}
          </p>
        )}
      </div>

      {/* Modals */}
      {showNovo && (
        <NovoParceiro onClose={() => setShowNovo(false)} onSaved={invalidate} />
      )}
      {editFor && (
        <EditParceiro parceiro={editFor} onClose={() => setEditFor(null)} onSaved={invalidate} />
      )}
      {encaminharFor && (
        <EncaminharMCModal parceiro={encaminharFor} onClose={() => setEncaminharFor(null)} onSaved={invalidate} />
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <Dialog open onOpenChange={o => !o && setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground py-2">Esta ação não pode ser desfeita.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteParceiro.mutate(deleteId!)} disabled={deleteParceiro.isPending}>
                {deleteParceiro.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </KanbanLayout>
  );
}
