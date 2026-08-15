import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2, X, Plus } from 'lucide-react';

// ── Opções ─────────────────────────────────────────────────────────────────────
const AREAS = [
  { value: 'producao',       label: 'Produção',               emoji: '🧵' },
  { value: 'beneficiamento', label: 'Beneficiamento',         emoji: '🖨️' },
  { value: 'lavanderia',     label: 'Lavanderia',             emoji: '💧' },
  { value: 'acabamento',     label: 'Acabamento',             emoji: '✂️' },
  { value: 'fornecedor',     label: 'Fornecedor de insumos',  emoji: '📦' },
];

const SUBTIPOS: Record<string, string[]> = {
  producao:       ['Costura', 'Corte', 'Costura e Corte', 'Malharia', 'Tecelagem', 'Tricô / Crochê'],
  beneficiamento: ['Silk Screen', 'Bordado', 'Sublimação', 'Estamparia', 'Termocolante'],
  lavanderia:     ['Lavagem Simples', 'Lavagem Especial', 'Stone', 'Estonagem', 'Tingimento'],
  acabamento:     ['Passadoria', 'Etiquetagem', 'Embalagem', 'Finishing', 'Revisão'],
  fornecedor:     ['Tecido', 'Aviamentos', 'Linha', 'Botões', 'Zíper', 'Elástico'],
};

const ESPECIALIDADES = [
  'Fitness', 'Jeans', 'Alfaiataria', 'Malharia', 'Infantil',
  'Plus Size', 'Íntima / Lingerie', 'Praia / Swim', 'Esporte',
  'Social / Executivo', 'Casual', 'Festa / Noite', 'Sustentável',
  'Alta Costura', 'Uniformes',
];

const MAQUINAS = [
  'Reta', 'Overlock', 'Galoneira', 'Interlock', 'Caseadeira',
  'Botoneira', 'Travete', 'Pespontadeira', 'Elastiqueira',
  'Máquina de Bordar', 'Máquina de Corte', 'Plotter',
];

const STATUS_OPTS = [
  { value: 'prospecto',   label: 'Prospecto',   desc: 'Ainda não qualificado' },
  { value: 'qualificado', label: 'Qualificado', desc: 'Avaliado e aprovado' },
  { value: 'ativo',       label: 'Ativo',        desc: 'Trabalhando atualmente' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 2)  return d;
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// ── Chip multi-select ──────────────────────────────────────────────────────────
function ChipSelect({
  options, selected, onChange, allowCustom = false,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean;
}) {
  const [custom, setCustom] = useState('');
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const addCustom = () => {
    const t = custom.trim();
    if (t && !selected.includes(t)) { onChange([...selected, t]); }
    setCustom('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} onClick={() => toggle(o)}
            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
              selected.includes(o)
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-white border-gray-200 hover:border-violet-300 hover:text-violet-600'
            }`}>
            {selected.includes(o) && <Check size={12} className="inline mr-1.5" />}
            {o}
          </button>
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2 mt-1">
          <Input className="h-9 text-sm" placeholder="Outro (digitar e pressionar Enter)..."
            value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()} />
          <Button size="sm" variant="outline" className="h-9 px-3" onClick={addCustom}>
            <Plus size={14} />
          </Button>
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs px-2.5 py-1 rounded-full">
              {v}
              <button onClick={() => toggle(v)}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Barra de progresso ─────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${((current) / total) * 100}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{current} de {total}</span>
    </div>
  );
}

// ── Estado inicial ─────────────────────────────────────────────────────────────
const INITIAL = {
  nome: '', empresa: '', whatsapp: '', email: '',
  area: '', subtipo: '',
  especialidades: [] as string[],
  tipos_maquina: [] as string[],
  capacidade_produtiva: '', qtde_costureiros: '',
  private_label: false, aceita_briefing: true,
  cidade: '', estado: '', bairro: '',
  obs: '', status: 'prospecto',
};

// ── Página principal ──────────────────────────────────────────────────────────
export default function ParceiroCadastro() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const set = <K extends keyof typeof INITIAL>(k: K, v: (typeof INITIAL)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const TOTAL_STEPS = 9;

  const saveMut = useMutation({
    mutationFn: () => apiFetch('/kanban/parceiros', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        subtipo:              form.subtipo || null,
        capacidade_produtiva: form.capacidade_produtiva || null,
        qtde_costureiros:     form.qtde_costureiros || null,
        estado:  form.estado || null,
        cidade:  form.cidade || null,
        bairro:  form.bairro || null,
        obs:     form.obs || null,
        email:   form.email || null,
        empresa: form.empresa || null,
      }),
    }),
    onSuccess: () => {
      toast.success(`Parceiro "${form.nome}" cadastrado!`);
      qc.invalidateQueries({ queryKey: ['banco-parceiros'] });
      qc.invalidateQueries({ queryKey: ['parceiros-select-all'] });
      navigate('/hub/kanban/parceiros');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao cadastrar'),
  });

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  // Renderização de cada etapa
  const steps = [

    // 0 — Nome
    {
      title: 'Qual o nome do parceiro?',
      subtitle: 'Pode ser o nome da empresa ou do profissional autônomo.',
      canAdvance: !!form.nome.trim(),
      content: (
        <div className="space-y-3">
          <Input
            className="text-lg h-12"
            placeholder="Nome ou razão social"
            value={form.nome}
            autoFocus
            onChange={e => set('nome', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && form.nome.trim() && next()}
          />
          <Input
            className="h-10"
            placeholder="Nome fantasia / empresa (opcional)"
            value={form.empresa}
            onChange={e => set('empresa', e.target.value)}
          />
        </div>
      ),
    },

    // 1 — Contato
    {
      title: 'Qual o WhatsApp?',
      subtitle: 'Usado para enviar cotações. O e-mail é opcional.',
      canAdvance: form.whatsapp.replace(/\D/g, '').length >= 10,
      content: (
        <div className="space-y-3">
          <Input
            className="text-lg h-12"
            placeholder="(11) 99999-9999"
            value={form.whatsapp}
            autoFocus
            onChange={e => set('whatsapp', fmtPhone(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && form.whatsapp.replace(/\D/g,'').length >= 10 && next()}
          />
          <Input
            className="h-10"
            placeholder="E-mail (opcional)"
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>
      ),
    },

    // 2 — Área
    {
      title: 'Qual a área de atuação?',
      subtitle: 'Selecione a principal categoria deste parceiro.',
      canAdvance: !!form.area,
      content: (
        <div className="grid sm:grid-cols-2 gap-3">
          {AREAS.map(a => (
            <button key={a.value} onClick={() => { set('area', a.value); set('subtipo', ''); }}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                form.area === a.value
                  ? 'border-violet-500 bg-violet-50 text-violet-800 shadow-sm'
                  : 'border-gray-200 hover:border-violet-200 hover:bg-gray-50'
              }`}>
              <span className="text-2xl">{a.emoji}</span>
              <span className="font-medium text-sm">{a.label}</span>
              {form.area === a.value && <Check size={16} className="ml-auto text-violet-600" />}
            </button>
          ))}
        </div>
      ),
    },

    // 3 — Tipo de serviço
    {
      title: 'Que tipo de serviço realiza?',
      subtitle: `Selecione o serviço principal dentro de ${AREAS.find(a => a.value === form.area)?.label ?? 'sua área'}.`,
      canAdvance: true, // opcional
      content: (
        <div className="flex flex-wrap gap-2">
          {(SUBTIPOS[form.area] ?? []).map(s => (
            <button key={s} onClick={() => set('subtipo', form.subtipo === s ? '' : s)}
              className={`px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                form.subtipo === s
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-gray-200 hover:border-violet-300 hover:text-violet-600'
              }`}>
              {form.subtipo === s && <Check size={12} className="inline mr-1.5" />}
              {s}
            </button>
          ))}
          <Input className="h-9 text-sm w-full mt-2"
            placeholder="Ou descreva livremente..."
            value={SUBTIPOS[form.area]?.includes(form.subtipo) ? '' : form.subtipo}
            onChange={e => set('subtipo', e.target.value)} />
        </div>
      ),
    },

    // 4 — Especialidades
    {
      title: 'Quais as especialidades?',
      subtitle: 'Segmentos de moda em que este parceiro tem experiência. Pode marcar vários.',
      canAdvance: true,
      content: (
        <ChipSelect
          options={ESPECIALIDADES}
          selected={form.especialidades}
          onChange={v => set('especialidades', v)}
          allowCustom
        />
      ),
    },

    // 5 — Capacidade
    {
      title: 'Qual a capacidade produtiva?',
      subtitle: 'Quantidade de peças por semana e número de costureiros (se aplicável).',
      canAdvance: true,
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Capacidade por semana</label>
            <Input className="text-lg h-12" placeholder="ex: 500 peças/semana"
              value={form.capacidade_produtiva} autoFocus
              onChange={e => set('capacidade_produtiva', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Número de costureiros</label>
            <Input className="h-10" placeholder="ex: 8" type="number" min="0"
              value={form.qtde_costureiros}
              onChange={e => set('qtde_costureiros', e.target.value)} />
          </div>
          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded accent-violet-600"
                checked={form.private_label} onChange={e => set('private_label', e.target.checked)} />
              <span className="text-sm">Faz Private Label</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded accent-violet-600"
                checked={form.aceita_briefing} onChange={e => set('aceita_briefing', e.target.checked)} />
              <span className="text-sm">Aceita Briefing / Ficha técnica</span>
            </label>
          </div>
        </div>
      ),
    },

    // 6 — Máquinas
    {
      title: 'Quais máquinas estão disponíveis?',
      subtitle: 'Marque as máquinas que o parceiro utiliza.',
      canAdvance: true,
      content: (
        <ChipSelect
          options={MAQUINAS}
          selected={form.tipos_maquina}
          onChange={v => set('tipos_maquina', v)}
          allowCustom
        />
      ),
    },

    // 7 — Localização
    {
      title: 'Onde está localizado?',
      subtitle: 'Cidade e bairro ajudam a filtrar parceiros por proximidade nas cotações.',
      canAdvance: true,
      content: (
        <div className="space-y-3">
          <Input className="text-lg h-12" placeholder="Cidade" autoFocus
            value={form.cidade} onChange={e => set('cidade', e.target.value)} />
          <div className="flex gap-3">
            <Input className="h-10 flex-1" placeholder="Bairro / região (ex: Brás, Bom Retiro)"
              value={form.bairro} onChange={e => set('bairro', e.target.value)} />
            <Input className="h-10 w-20" placeholder="UF" maxLength={2}
              value={form.estado} onChange={e => set('estado', e.target.value.toUpperCase())} />
          </div>
        </div>
      ),
    },

    // 8 — Status e finalização
    {
      title: 'Qual o status deste parceiro?',
      subtitle: 'Você pode atualizar isso depois a qualquer momento.',
      canAdvance: true,
      content: (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {STATUS_OPTS.map(s => (
              <button key={s.value} onClick={() => set('status', s.value)}
                className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                  form.status === s.value
                    ? 'border-violet-500 bg-violet-50 shadow-sm'
                    : 'border-gray-200 hover:border-violet-200'
                }`}>
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                {form.status === s.value && <Check size={14} className="mt-2 text-violet-600" />}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Observações internas (opcional)</label>
            <Textarea placeholder="Notas sobre este parceiro, condições, contatos..."
              value={form.obs} onChange={e => set('obs', e.target.value)} rows={3} />
          </div>
        </div>
      ),
    },

  ];

  const currentStep = steps[step];

  return (
    <KanbanLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/hub/kanban/parceiros')}
            className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Banco de Parceiros
          </Button>
        </div>

        <ProgressBar current={step + 1} total={TOTAL_STEPS} />

        {/* Conteúdo da etapa */}
        <div className="space-y-6 min-h-[280px]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{currentStep.title}</h2>
            {currentStep.subtitle && (
              <p className="text-muted-foreground mt-1">{currentStep.subtitle}</p>
            )}
          </div>

          <div>{currentStep.content}</div>
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between gap-3 mt-10 pt-6 border-t">
          <Button variant="ghost" onClick={back} disabled={step === 0} className="gap-1">
            <ArrowLeft size={14} /> Anterior
          </Button>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'bg-violet-600 w-4' : i < step ? 'bg-violet-300' : 'bg-gray-200'
                }`} />
            ))}
          </div>

          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={next} disabled={!currentStep.canAdvance}
              className="bg-violet-600 hover:bg-violet-700 gap-1">
              Próximo <ArrowRight size={14} />
            </Button>
          ) : (
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              className="bg-violet-600 hover:bg-violet-700 gap-2 min-w-[130px]">
              {saveMut.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                : <><Check size={14} /> Cadastrar</>}
            </Button>
          )}
        </div>

      </div>
    </KanbanLayout>
  );
}
