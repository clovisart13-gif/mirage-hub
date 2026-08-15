import { useState, useEffect, useRef } from 'react';
import { Link, useSearch } from 'wouter';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle, ArrowLeft, Info, Tag, Factory, Home,
  User, Mail, Phone, Globe, Loader2, Star, Award,
  Camera, Video, X, ImageIcon, Upload, Copy, Check as CheckIcon,
} from 'lucide-react';

type MediaType = 'fachada' | 'interno' | 'maquinario' | 'outro';
interface MediaItem {
  id: string;
  file: File;
  type: MediaType;
  preview: string;
  objectPath?: string;
  uploading: boolean;
  error?: string;
}

const ROLES_CADEIA = [
  { value: "marca",         label: "Marca / Grife" },
  { value: "confeccao",     label: "Confecção" },
  { value: "private_label", label: "Private Label" },
  { value: "faccao",        label: "Facção / Terceirizada" },
  { value: "oficina",       label: "Oficina / Ateliê" },
  { value: "fornecedor",    label: "Fornecedor de Insumos" },
  { value: "prestador",     label: "Prestador de Serviços" },
  { value: "outro",         label: "Outro" },
];

const SPECIALTIES_OPTIONS = [
  "Corte","Costura","Estamparia","Bordado","Modelagem","Lavanderia","Acabamento",
  "Tecidos","Aviamentos","Embalagem","Logística","Design","Marketing","Tecnologia",
];

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const CAPACIDADES = [
  { label: 'Até 30 peças/dia', value: 'ate_30' },
  { label: '30 a 70 peças/dia', value: '30_70' },
  { label: '70 a 200 peças/dia', value: '70_200' },
  { label: '200 a 500 peças/dia', value: '200_500' },
  { label: 'Acima de 500 peças/dia', value: '500_mais' },
];

const LOTE_MINIMO = [
  { value: '1_5',      label: '1 a 5 peças',          badge: 'Sob medida / Made-to-order' },
  { value: '6_12',     label: '6 a 12 peças',          badge: 'Micro série' },
  { value: '13_30',    label: '13 a 30 peças',         badge: 'Pequena série' },
  { value: '31_60',    label: '31 a 60 peças',         badge: 'Piloto de coleção' },
  { value: '61_120',   label: '61 a 120 peças',        badge: 'Pequena marca' },
  { value: '121_300',  label: '121 a 300 peças',       badge: 'Marca em crescimento' },
  { value: '301_600',  label: '301 a 600 peças',       badge: 'Média produção' },
  { value: '601_1000', label: '601 a 1.000 peças',     badge: 'Produção consolidada' },
  { value: '1000_mais',label: 'Acima de 1.000 peças',  badge: 'Grande produção' },
];

const GRUPOS_TIPOS = [
  {
    grupo: 'Serviços de Produção',
    cor: 'violet',
    tipos: [
      { value: 'Modelagem',              label: 'Modelagem' },
      { value: 'Risco',                  label: 'Risco' },
      { value: 'Corte',                  label: 'Corte' },
      { value: 'Estamparia',             label: 'Estamparia' },
      { value: 'Bordado',                label: 'Bordado' },
      { value: 'Costura',                label: 'Costura' },
      { value: 'Lavanderia',             label: 'Lavanderia' },
      { value: 'Acabamento e Embalagem', label: 'Acabamento / Passadoria / Embalagem' },
      { value: 'Outros',                 label: 'Outros Serviços' },
    ],
  },
  {
    grupo: 'Fornecedores de Insumos',
    cor: 'emerald',
    tipos: [
      { value: 'Fornecedor de Fios',       label: 'Fios' },
      { value: 'Fornecedor de Tecidos',    label: 'Tecidos' },
      { value: 'Fornecedor de Aviamentos', label: 'Aviamentos' },
      { value: 'Tinturaria / Beneficiamento', label: 'Tinturaria / Beneficiamento' },
      { value: 'Facção de Malharia',       label: 'Facção de Malharia' },
      { value: 'Tecelagem',                label: 'Tecelagem' },
      { value: 'Outros Insumos',           label: 'Outros Insumos' },
    ],
  },
];

const TIPOS_OFICINA = GRUPOS_TIPOS.flatMap(g => g.tipos.map(t => t.value));

const TIPO_DESCRICOES: Record<string, string> = {
  'Fornecedor de Aviamentos':     'Botões, zíperes, elásticos, entretelas, etiquetas e aviamentos em geral',
  'Fornecedor de Tecidos':        'Tecidos em rolo — malha, plano, denim, técnico, sintético etc.',
  'Fornecedor de Fios':           'Fios e linhas para costura, bordado e tecelagem',
  'Tinturaria / Beneficiamento':  'Tingimento, beneficiamento, estonagem e tratamentos em tecido ou malha',
  'Facção de Malharia':           'Produção de tecido de malha (circular, retilínea etc.)',
  'Tecelagem':                    'Produção de tecido plano em tear',
};

const LINHAS = [
  { id: 'plano', label: 'Plano', descricao: 'Tecidos planos — algodão, linho, viscose, denim, alfaiataria' },
  { id: 'malha', label: 'Malha', descricao: 'Tecidos de malha — jersey, ribana, suplex, lycra, moletom' },
];

const FAMILIAS = [
  'Fitness / Moda Esportiva',
  'Alfaiataria / Social',
  'Moda Casual / Modinha',
  'Bebê (0–2 anos)',
  'Infantil (2–12 anos)',
  'Camisaria',
  'Jaquetas / Agasalhos',
  'Moda Íntima / Lingerie',
  'Beachwear / Praia',
  'Jeanswear / Denim',
  'Uniforme / Corporativo',
  'Moda Festa / Noiva',
  'Outros',
];

const MAQUINARIO = [
  { id: 'reta', label: 'Máquina Reta', grupo: 'Base' },
  { id: 'reta_dd', label: 'Máquina Reta Direct Drive', grupo: 'Base' },
  { id: 'overlock3', label: 'Overlock 3 Fios', grupo: 'Overlock' },
  { id: 'overlock4', label: 'Overlock 4 Fios (Ponto Cadeia)', grupo: 'Overlock' },
  { id: 'overlock5', label: 'Overlock 5 Fios', grupo: 'Overlock' },
  { id: 'galoneira', label: 'Galoneira (Colarete)', grupo: 'Acabamento' },
  { id: 'flatseamer', label: 'Flatseamer (Ponto Cobre)', grupo: 'Acabamento' },
  { id: 'ponto_corrente', label: 'Ponto Corrente', grupo: 'Acabamento' },
  { id: 'rainha', label: 'Rainha', grupo: 'Acabamento' },
  { id: 'travete', label: 'Travete', grupo: 'Reforço' },
  { id: 'caseadeira', label: 'Caseadeira', grupo: 'Reforço' },
  { id: 'botoeira', label: 'Botoeira', grupo: 'Reforço' },
  { id: 'ponto_invisivel', label: 'Ponto Invisível', grupo: 'Acabamento' },
  { id: 'frufru', label: 'Bainha de Lenço (Fru-fru)', grupo: 'Acabamento' },
  { id: 'elastiqueira', label: 'Elastiqueira', grupo: 'Acabamento' },
  { id: 'zigzag', label: 'Zig-Zag', grupo: 'Acabamento' },
  { id: 'bordadeira', label: 'Bordadeira Computadorizada', grupo: 'Especial' },
  { id: 'cortador_disco', label: 'Cortador de Disco', grupo: 'Corte' },
  { id: 'cortador_vertical', label: 'Cortador Elétrico Vertical', grupo: 'Corte' },
  { id: 'ferro_caldeira', label: 'Ferro de Passar Industrial (Caldeira)', grupo: 'Acabamento' },
];

const CATEGORIA_TO_TIPO: Record<string, string> = {
  'Estamparia': 'Estamparia',
  'Bordado': 'Bordado',
  'Costura': 'Costura',
  'Modelagem': 'Modelagem',
  'Corte': 'Corte',
  'Acabamento': 'Acabamento e Embalagem',
  'Lavanderia': 'Lavanderia',
  'Tecidos': 'Fornecedor de Tecidos',
};

export default function CadastroComunidadeFornecedor() {
  const search = useSearch();
  const sp = new URLSearchParams(search);
  const tipoParam = sp.get('tipo') ?? '';
  const tipoInicial = tipoParam && CATEGORIA_TO_TIPO[tipoParam] ? [CATEGORIA_TO_TIPO[tipoParam]] : [];

  // Pré-preenchimento via convite Moda Conecta
  const pf = {
    name:           sp.get('pf_name')           ?? '',
    email:          sp.get('pf_email')          ?? '',
    phone:          sp.get('pf_phone')          ?? '',
    cidade:         sp.get('pf_cidade')         ?? '',
    estado:         sp.get('pf_estado')         ?? '',
    cep:            sp.get('pf_cep')            ?? '',
    bairro:         sp.get('pf_bairro')         ?? '',
    endereco:       sp.get('pf_endereco')       ?? '',
    role:           sp.get('pf_role')           ?? '',
    especialidades: sp.get('pf_especialidades') ? sp.get('pf_especialidades')!.split(',').filter(Boolean) : [] as string[],
    busca:          sp.get('pf_busca')          ?? '',
    oferece:        sp.get('pf_oferece')        ?? '',
  };
  const hasPrefill = !!(pf.name || pf.email);

  // Se ?t=TOKEN presente, busca os params do servidor (link curto) e preenche o form
  useEffect(() => {
    const tk = sp.get('t');
    if (!tk) return;
    fetch(`/api/comunidade/form-token/${encodeURIComponent(tk)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { params: Record<string, string> }) => {
        const p = data.params ?? {};
        setForm(prev => ({
          ...prev,
          name:          p.pf_name          || prev.name,
          email:         p.pf_email         || prev.email,
          phone:         p.pf_phone         || prev.phone,
          cep:           p.pf_cep           || prev.cep,
          bairro:        p.pf_bairro        || prev.bairro,
          cidade:        p.pf_cidade        || prev.cidade,
          estado:        p.pf_estado        || prev.estado,
          roleInChain:   p.pf_role          || prev.roleInChain,
          especialidades: p.pf_especialidades
            ? p.pf_especialidades.split(',').filter(Boolean)
            : prev.especialidades,
          mainNeed:      p.pf_busca         || prev.mainNeed,
          additionalInfo: p.pf_oferece      || prev.additionalInfo,
        }));
      })
      .catch(() => {/* ignora — fallback para ?pf_* direto se existirem */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [linkCopiado, setLinkCopiado] = useState(false);
  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/hub/comunidade/cadastro-fornecedor');
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2500);
  };

  const [step, setStep] = useState<'form' | 'sucesso'>('form');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);

  // Erros de validação por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const autosaveKey = `mc-form-draft`;

  const [form, setForm] = useState({
    name:         pf.name,
    email:        pf.email,
    phone:        pf.phone,
    portfolioUrl: '',
    aceitaServicoParcial: null as boolean | null,
    cep:          pf.cep,
    endereco:     pf.endereco,
    numero: '',
    complemento: '',
    bairro:       pf.bairro,
    cidade:       pf.cidade,
    estado:       pf.estado,
    productionCapacity: '',
    qtdMinima: '',
    additionalInfo: pf.oferece,
    // Campos do pré-cadastro (LP fundadores) — prefill automático
    roleInChain:    pf.role,
    especialidades: pf.especialidades,
    mainNeed:       pf.busca,
    tiposOficina: tipoInicial,
    linhas: [] as string[],
    familias: [] as string[],
    maquinas: [] as string[],
    faccaoServicos: [] as string[],
    faccaoEstrutura: '',
    personalizacao: [] as string[],
    personalizacaoTecnicas: [] as string[],
    estampariaTecnicas: [] as string[],
    bordadoTecnicas: [] as string[],
    lavanderiaSubtypes: [] as string[],
    lavanderiaTratamentos: [] as string[],
    corteSubtypes: [] as string[],
    corteLarguraMesa: '',
    modelagemSubtypes: [] as string[],
    modelagemCadSistemas: [] as string[],
    modelagemCadOutro: '',
    modelagemRiscoLargura: '',
    riscoSistemas: [] as string[],
    riscoSistemaOutro: '',
    riscoLargura: '',
    acabamentoServicos: [] as string[],
    aviamentosServicos: [] as string[],
    tecidosTipos: [] as string[],
    tinturariaServicos: [] as string[],
    tinturariaSubstrato: [] as string[],
    tinturariaFibras: [] as string[],
    malhariaTipos: [] as string[],
    malhariaFibras: [] as string[],
    tecelagemTipos: [] as string[],
    tecelagemFibras: [] as string[],
    fiosFibras: [] as string[],
    fiosFinalidade: [] as string[],
    isPrivateLabel: false,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Autosave no localStorage — debounced 800ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try { localStorage.setItem(autosaveKey, JSON.stringify(form)); } catch { /* ignora */ }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restaurar rascunho salvo (só se não veio pré-preenchido pelo convite)
  useEffect(() => {
    if (hasPrefill) return;
    try {
      const saved = localStorage.getItem(autosaveKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm(f => ({ ...f, ...parsed }));
      }
    } catch { /* ignora */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: 'especialidades' | 'tiposOficina' | 'linhas' | 'familias' | 'maquinas' | 'faccaoServicos' | 'personalizacao' | 'personalizacaoTecnicas' | 'estampariaTecnicas' | 'bordadoTecnicas' | 'lavanderiaSubtypes' | 'lavanderiaTratamentos' | 'corteSubtypes' | 'modelagemSubtypes' | 'modelagemCadSistemas' | 'acabamentoServicos' | 'aviamentosServicos' | 'tecidosTipos' | 'tinturariaServicos' | 'tinturariaSubstrato' | 'tinturariaFibras' | 'malhariaTipos' | 'malhariaFibras' | 'tecelagemTipos' | 'tecelagemFibras' | 'riscoSistemas' | 'fiosFibras' | 'fiosFinalidade', val: string) => {
    setForm(f => ({
      ...f,
      [key]: (f[key] as string[]).includes(val)
        ? (f[key] as string[]).filter(x => x !== val)
        : [...(f[key] as string[]), val],
    }));
  };

  const TIPOS_FACCAO = ['Facção Completa', 'Private Label / Facção Completa'];
  const TIPOS_COSTURA = ['Costura', 'Modelagem', 'Acabamento e Embalagem'];
  const TIPOS_INSUMOS = ['Fornecedor de Fios', 'Fornecedor de Tecidos', 'Fornecedor de Aviamentos', 'Tinturaria / Beneficiamento', 'Facção de Malharia', 'Tecelagem', 'Outros Insumos'];

  const isFaccao = form.tiposOficina.some(t => TIPOS_FACCAO.includes(t));
  const isCosturaSimples = form.tiposOficina.includes('Costura');
  const isInsumos = form.tiposOficina.some(t => TIPOS_INSUMOS.includes(t));

  const TIPO_TITULO: Record<string, string> = {
    'Modelagem': 'Modelagem',
    'Risco': 'Risco',
    'Corte': 'Corte',
    'Estamparia': 'Estamparia',
    'Bordado': 'Bordado',
    'Costura': 'Costura',
    'Lavanderia': 'Lavanderia',
    'Acabamento e Embalagem': 'Acabamento',
    'Outros': 'Outros',
    'Fornecedor de Fios': 'Fios',
    'Fornecedor de Tecidos': 'Tecidos',
    'Fornecedor de Aviamentos': 'Aviamentos',
    'Tinturaria / Beneficiamento': 'Tinturaria',
    'Facção de Malharia': 'Malharia',
    'Tecelagem': 'Tecelagem',
    'Outros Insumos': 'Outros Insumos',
  };

  const tituloHeader = (() => {
    if (form.tiposOficina.length === 0) return 'Cadastro de Fornecedor';
    const nomes = form.tiposOficina.map(t => TIPO_TITULO[t] ?? t);
    if (nomes.length === 1) return `Cadastro de ${nomes[0]}`;
    if (nomes.length === 2) return `Cadastro de ${nomes[0]} / ${nomes[1]}`;
    return `Cadastro de ${nomes[0]} +${nomes.length - 1}`;
  })();

  const isCostura    = form.tiposOficina.some(t => TIPOS_COSTURA.includes(t));
  const isModelagem  = form.tiposOficina.includes('Modelagem');
  const isRisco      = form.tiposOficina.includes('Risco');
  const isBordado     = form.tiposOficina.includes('Bordado');
  const isEstamparia  = form.tiposOficina.includes('Estamparia');
  const isLavanderia  = form.tiposOficina.includes('Lavanderia');
  const isAcabamento  = form.tiposOficina.includes('Acabamento e Embalagem');
  const isCorte       = form.tiposOficina.includes('Corte');
  const isFios        = form.tiposOficina.includes('Fornecedor de Fios');
  const isOutros     = form.tiposOficina.includes('Outros') || form.tiposOficina.includes('Outros Insumos');
  const isPrivateLabelCatalogo = false;
  const isAviamentos = form.tiposOficina.includes('Fornecedor de Aviamentos');
  const isTecidos    = form.tiposOficina.includes('Fornecedor de Tecidos');
  const isTinturaria = form.tiposOficina.includes('Tinturaria / Beneficiamento');
  const isMalharia   = form.tiposOficina.includes('Facção de Malharia');
  const isTecelagem  = form.tiposOficina.includes('Tecelagem');
  const isProducao   = form.tiposOficina.some(t => !TIPOS_INSUMOS.includes(t));
  const alguemSelecionado = form.tiposOficina.length > 0;

  const maqFiltradas = MAQUINARIO.filter(m => {
    if (m.grupo === 'Especial') return isBordado && isCosturaSimples;
    if (m.grupo === 'Corte')    return isCorte && isCosturaSimples;
    return isCosturaSimples;
  });

  // só mostra separadores de grupo quando há máquinas de categorias distintas
  const showGrupos = maqFiltradas.some(m => m.grupo === 'Especial' || m.grupo === 'Corte') && isCosturaSimples;

  const uploadFile = async (itemId: string, file: File) => {
    setMediaFiles(prev => prev.map(f => f.id === itemId ? { ...f, uploading: true, error: undefined } : f));
    try {
      const { uploadURL, objectPath } = await apiFetch('/storage/uploads/request-url', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setMediaFiles(prev => prev.map(f => f.id === itemId ? { ...f, uploading: false, objectPath } : f));
    } catch {
      setMediaFiles(prev => prev.map(f => f.id === itemId ? { ...f, uploading: false, error: 'Falha no upload' } : f));
    }
  };

  const addMediaFiles = (files: FileList | null) => {
    if (!files) return;
    const MAX = 8;
    const slots = MAX - mediaFiles.length;
    if (slots <= 0) return;
    const newItems: MediaItem[] = Array.from(files).slice(0, slots).map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      type: 'outro' as MediaType,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      uploading: false,
    }));
    setMediaFiles(prev => [...prev, ...newItems]);
    newItems.forEach(item => uploadFile(item.id, item.file));
  };

  const removeMedia = (id: string) => {
    setMediaFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const buscarCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(f => ({
          ...f,
          endereco: d.logradouro || f.endereco,
          bairro: d.bairro || f.bairro,
          cidade: d.localidade || f.cidade,
          estado: d.uf || f.estado,
        }));
      }
    } catch { /* ignora */ } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // ── Validação obrigatória ─────────────────────────────
    const erros: Record<string, string> = {};
    if (!form.name.trim())   erros.name   = 'Informe o nome ou nome da empresa';
    if (!form.email.trim())  erros.email  = 'E-mail é obrigatório';
    if (!form.phone.trim())  erros.phone  = 'WhatsApp é obrigatório para contato';
    if (!form.cidade.trim()) erros.cidade = 'Informe a cidade';
    if (!form.estado)        erros.estado = 'Selecione o estado';
    if (form.tiposOficina.length === 0) erros.tiposOficina = 'Selecione ao menos um tipo de serviço';
    if (form.tiposOficina.length > 0 && form.aceitaServicoParcial === null)
      erros.aceitaServicoParcial = 'Informe se aceita serviço parcial';
    if (!form.qtdMinima)     erros.qtdMinima = 'Informe o lote mínimo por modelo';

    if (Object.keys(erros).length > 0) {
      setFieldErrors(erros);
      setErro('Preencha todos os campos obrigatórios antes de enviar.');
      setTimeout(() => {
        document.querySelector('[data-field-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const maqLabels = form.maquinas.map(id => MAQUINARIO.find(m => m.id === id)?.label ?? id);
      const info = [
        form.roleInChain ? `Perfil: ${ROLES_CADEIA.find(r => r.value === form.roleInChain)?.label ?? form.roleInChain}` : '',
        form.especialidades.length ? `Especialidades: ${form.especialidades.join(', ')}` : '',
        form.mainNeed ? `O que busca: ${form.mainNeed}` : '',
        form.tiposOficina.length ? `Tipo: ${form.tiposOficina.join(', ')}` : '',
        form.linhas.length ? `Linha: ${form.linhas.join(', ')}` : '',
        form.familias.length ? `Família de produto: ${form.familias.join(', ')}` : '',
        form.maquinas.length ? `Maquinário: ${maqLabels.join(', ')}` : '',
        form.faccaoServicos.length ? `Serviços de facção: ${form.faccaoServicos.join(', ')}` : '',
        form.faccaoEstrutura ? `Estrutura de produção: ${form.faccaoEstrutura}` : '',
        form.qtdMinima ? `Lote mínimo: ${LOTE_MINIMO.find(l => l.value === form.qtdMinima)?.label ?? form.qtdMinima}` : '',
        form.isPrivateLabel ? 'Aceita Private Label' : '',
        form.complemento ? `Complemento: ${form.complemento}` : '',
        form.numero ? `Número: ${form.numero}` : '',
        form.additionalInfo,
      ].filter(Boolean).join('\n');

      const mediaUrls = mediaFiles
        .filter(f => f.objectPath)
        .map(f => ({ url: f.objectPath!, type: f.type, name: f.file.name }));

      await apiFetch('/comunidade/pre-cadastro', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: 'mirage', // cadastro de fornecedor é feature do Hub Mirage, não da R2PB privada
          userType: 'fornecedor',
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          cidade: form.cidade.trim() || undefined,
          estado: form.estado || undefined,
          productionCapacity: form.productionCapacity || undefined,
          portfolioUrl: form.portfolioUrl.trim() || undefined,
          additionalInfo: info || undefined,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          formData: {
            // campos do pré-cadastro
            roleInChain:          form.roleInChain,
            especialidades:       form.especialidades,
            mainNeed:             form.mainNeed,
            // campos detalhados do formulário completo
            aceitaServicoParcial: form.aceitaServicoParcial,
            tiposOficina:         form.tiposOficina,
            linhas:               form.linhas,
            familias:             form.familias,
            maquinas:             form.maquinas,
            qtdMinima:            form.qtdMinima,
            isPrivateLabel:       form.isPrivateLabel,
            faccaoServicos:       form.faccaoServicos,
            faccaoEstrutura:      form.faccaoEstrutura,
            personalizacao:       form.personalizacao,
            personalizacaoTecnicas: form.personalizacaoTecnicas,
            estampariaTecnicas:   form.estampariaTecnicas,
            bordadoTecnicas:      form.bordadoTecnicas,
            lavanderiaSubtypes:   form.lavanderiaSubtypes,
            lavanderiaTratamentos: form.lavanderiaTratamentos,
            corteSubtypes:        form.corteSubtypes,
            corteLarguraMesa:     form.corteLarguraMesa,
            modelagemSubtypes:    form.modelagemSubtypes,
            modelagemCadSistemas: form.modelagemCadSistemas,
            modelagemCadOutro:    form.modelagemCadOutro,
            riscoSistemas:        form.riscoSistemas,
            riscoSistemaOutro:    form.riscoSistemaOutro,
            riscoLargura:         form.riscoLargura,
            acabamentoServicos:   form.acabamentoServicos,
            aviamentosServicos:   form.aviamentosServicos,
            tecidosTipos:         form.tecidosTipos,
            tinturariaServicos:   form.tinturariaServicos,
            tinturariaSubstrato:  form.tinturariaSubstrato,
            tinturariaFibras:     form.tinturariaFibras,
            malhariaTipos:        form.malhariaTipos,
            malhariaFibras:       form.malhariaFibras,
            tecelagemTipos:       form.tecelagemTipos,
            tecelagemFibras:      form.tecelagemFibras,
            fiosFibras:           form.fiosFibras,
            fiosFinalidade:       form.fiosFinalidade,
          },
          source: 'cadastro-fornecedor',
        }),
      });
      setStep('sucesso');
      try { localStorage.removeItem(autosaveKey); } catch { /* ignora */ }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao enviar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'sucesso') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cadastro enviado!</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Recebemos seus dados. Nossa equipe vai analisar seu perfil e entrar em contato em até <strong>2 dias úteis</strong>.
            </p>
          </div>

          {/* Status de aguardo — destaque */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-left flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-[10px] font-bold">!</span>
            </div>
            <div>
              <p className="font-semibold text-amber-800 mb-0.5">Aguardando aprovação</p>
              <p className="text-amber-700 text-xs leading-relaxed">
                Seu perfil <strong>ainda não está visível</strong> no diretório do Moda Conecta. 
                Você será notificado quando nossa equipe concluir a análise.
              </p>
            </div>
          </div>

          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-left space-y-2">
            <p className="font-semibold text-violet-700 flex items-center gap-1.5">
              <Star className="w-4 h-4" /> O que acontece depois da aprovação?
            </p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Você recebe uma confirmação por WhatsApp ou e-mail</li>
              <li>Seu perfil é publicado no diretório do Moda Conecta</li>
              <li>Marcas e confecções da rede podem te encontrar e entrar em contato</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Dúvidas? Entre em contato pelo WhatsApp da equipe Moda Conecta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <Link href="/hub/comunidade/fornecedores">
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <img src="/mirage-logo.png" alt="Mirage" className="h-6 sm:h-7 object-contain shrink-0" />
          <div className="w-px h-5 bg-border mx-0.5 sm:mx-1 hidden sm:block" />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm sm:text-base truncate">Cadastro de Fornecedor</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Moda Conecta — Diretório de Fornecedores</p>
          </div>

          {/* Link para compartilhar */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 max-w-xs">
              <span className="text-xs font-mono text-slate-500 truncate select-all">
                {window.location.origin}/hub/comunidade/cadastro-fornecedor
              </span>
            </div>
            <button
              onClick={copiarLink}
              className={`flex items-center gap-1.5 text-xs px-2 sm:px-3 py-2 rounded-lg font-semibold border transition-all whitespace-nowrap
                ${linkCopiado
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100'}`}
            >
              {linkCopiado ? <CheckIcon className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{linkCopiado ? 'Copiado!' : 'Copiar link'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 sm:py-8 pb-28 lg:pb-8">
        {/* Banner */}
        <div className="rounded-2xl bg-violet-600 text-white p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Factory className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-xl">Apareça para centenas de confeccionistas</h2>
                <p className="text-violet-100 text-sm mt-1 leading-relaxed max-w-lg">
                  Informe sua linha de produto, família, maquinário e capacidade. Quanto mais completo, mais clientes certos vão te encontrar.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-6 lg:border-l lg:border-white/20 lg:pl-6 text-center shrink-0">
              <div><p className="text-2xl font-bold">500+</p><p className="text-xs text-violet-200">confeccionistas</p></div>
              <div><p className="text-2xl font-bold">Grátis</p><p className="text-xs text-violet-200">para cadastrar</p></div>
              <div><p className="text-2xl font-bold">2 dias</p><p className="text-xs text-violet-200">para análise</p></div>
            </div>
          </div>
        </div>

        {hasPrefill && (
          <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-6 text-sm text-purple-800">
            <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Dados pré-preenchidos do seu convite</strong> — nome, e-mail, telefone e endereço já vieram do pré-cadastro.
              Revise e complete as informações abaixo.
            </span>
          </div>
        )}

        {/* Sticky submit bar — mobile only */}
        <div className="fixed bottom-0 inset-x-0 z-20 lg:hidden bg-white border-t shadow-lg px-4 py-3 flex gap-2">
          <button
            type="submit"
            form="fornecedor-form"
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-violet-600 text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : 'Enviar Cadastro'}
          </button>
        </div>

        <form id="fornecedor-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* === Coluna principal === */}
            <div className="lg:col-span-2 space-y-6">

              {/* Dados de contato */}
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <User className="w-4 h-4" /> Dados de Contato
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5" data-field-error={!!fieldErrors.name || undefined}>
                    <Label htmlFor="name">Nome / Empresa <span className="text-destructive">*</span></Label>
                    <Input
                      id="name"
                      placeholder="Ex: Confecções Silva"
                      value={form.name}
                      onChange={e => { set('name', e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
                      className={fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
                  </div>
                  <div className="space-y-1.5" data-field-error={!!fieldErrors.email || undefined}>
                    <Label htmlFor="email" className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> E-mail <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="contato@suaempresa.com.br"
                      value={form.email}
                      onChange={e => { set('email', e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
                      className={fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                  </div>
                  <div className="space-y-1.5" data-field-error={!!fieldErrors.phone || undefined}>
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> WhatsApp <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={form.phone}
                      onChange={e => { set('phone', e.target.value); setFieldErrors(p => ({ ...p, phone: '' })); }}
                      className={fieldErrors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="portfolio" className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Site / Instagram
                    </Label>
                    <Input id="portfolio" placeholder="instagram.com/suaempresa" value={form.portfolioUrl} onChange={e => set('portfolioUrl', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Home className="w-4 h-4" /> Endereço Completo
                  <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground ml-1">(para filtro por distância)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cep">CEP</Label>
                    <div className="relative">
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                          const fmt = v.length > 5 ? `${v.slice(0,5)}-${v.slice(5)}` : v;
                          set('cep', fmt);
                          if (v.length === 8) buscarCep(v);
                        }}
                      />
                      {cepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-violet-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Preenche automaticamente</p>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="endereco">Rua / Avenida</Label>
                    <Input id="endereco" placeholder="Ex: Rua das Flores" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="numero">Número</Label>
                    <Input id="numero" placeholder="123" value={form.numero} onChange={e => set('numero', e.target.value)} />
                  </div>
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" placeholder="Apto, Sala, Galpão..." value={form.complemento} onChange={e => set('complemento', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" placeholder="Ex: Centro" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
                  </div>
                  <div className="space-y-1.5" data-field-error={!!fieldErrors.cidade || undefined}>
                    <Label htmlFor="cidade">Cidade <span className="text-destructive">*</span></Label>
                    <Input
                      id="cidade"
                      placeholder="Ex: São Paulo"
                      value={form.cidade}
                      onChange={e => { set('cidade', e.target.value); setFieldErrors(p => ({ ...p, cidade: '' })); }}
                      className={fieldErrors.cidade ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {fieldErrors.cidade && <p className="text-xs text-destructive">{fieldErrors.cidade}</p>}
                  </div>
                  <div className="space-y-1.5" data-field-error={!!fieldErrors.estado || undefined}>
                    <Label>Estado <span className="text-destructive">*</span></Label>
                    <Select value={form.estado} onValueChange={v => { set('estado', v); setFieldErrors(p => ({ ...p, estado: '' })); }}>
                      <SelectTrigger className={fieldErrors.estado ? 'border-destructive' : ''}><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {fieldErrors.estado && <p className="text-xs text-destructive">{fieldErrors.estado}</p>}
                  </div>
                </div>
              </div>

              {/* ── Perfil no Moda Conecta (campos do pré-cadastro) ── */}
              <div className="bg-white rounded-2xl border p-6 space-y-5">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Star className="w-4 h-4" /> Perfil no Moda Conecta
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Dados gerais sobre você e sua atuação na rede</p>
                </div>

                {/* Perfil na cadeia produtiva */}
                <div className="space-y-1.5">
                  <Label>Seu perfil na cadeia produtiva <span className="text-destructive">*</span></Label>
                  <Select value={form.roleInChain} onValueChange={v => set('roleInChain', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione seu perfil" /></SelectTrigger>
                    <SelectContent>
                      {ROLES_CADEIA.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Especialidades */}
                <div className="space-y-2">
                  <Label>Especialidades <span className="text-xs font-normal text-muted-foreground">(selecione todas que se aplicam)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES_OPTIONS.map(s => {
                      const checked = form.especialidades.includes(s);
                      return (
                        <button
                          key={s} type="button"
                          onClick={() => toggle('especialidades', s)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            checked
                              ? 'bg-violet-600 border-violet-500 text-white'
                              : 'bg-white border-border text-muted-foreground hover:border-violet-300 hover:text-violet-700'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* O que você busca */}
                <div className="space-y-1.5">
                  <Label>O que você busca no Moda Conecta?</Label>
                  <Textarea
                    placeholder="Ex: Preciso de facções especializadas em malharia para produção de 500 peças/mês..."
                    rows={3}
                    value={form.mainNeed}
                    onChange={e => set('mainNeed', e.target.value)}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Tipo de Estabelecimento — dois grupos com separador */}
              <div className="bg-white rounded-2xl border p-6 space-y-5">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Factory className="w-4 h-4" /> Tipo de Estabelecimento
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Selecione todos que se aplicam ao seu negócio</p>
                </div>

                {GRUPOS_TIPOS.map((grupo, gi) => (
                  <div key={grupo.grupo}>
                    {/* Separador entre grupos */}
                    {gi > 0 && (
                      <div className="flex items-center gap-3 mb-4">
                        <span className="h-px flex-1 bg-border" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{grupo.grupo}</span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    {gi === 0 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{grupo.grupo}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {grupo.tipos.map(t => {
                        const desc = TIPO_DESCRICOES[t.value];
                        const checked = form.tiposOficina.includes(t.value);
                        const isInsumo = grupo.cor === 'emerald';
                        return (
                          <label key={t.value} className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${checked
                              ? isInsumo ? 'bg-emerald-50 border-emerald-400' : 'bg-violet-50 border-violet-400'
                              : isInsumo ? 'border-border hover:border-emerald-200 hover:bg-emerald-50/40' : 'border-border hover:border-violet-200 hover:bg-violet-50/40'
                            }`}>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggle('tiposOficina', t.value)}
                              className="mt-0.5 shrink-0"
                            />
                            <div>
                              <span className={`text-sm font-medium leading-snug block ${checked ? isInsumo ? 'text-emerald-700' : 'text-violet-700' : ''}`}>{t.label}</span>
                              {desc && <span className="text-xs text-muted-foreground leading-snug block mt-0.5">{desc}</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Erro: tipo obrigatório */}
              {fieldErrors.tiposOficina && (
                <div data-field-error="true" className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3">
                  {fieldErrors.tiposOficina}
                </div>
              )}

              {/* Hint quando nenhum tipo selecionado */}
              {!alguemSelecionado && !fieldErrors.tiposOficina && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 text-center text-sm text-violet-600">
                  Selecione o tipo de estabelecimento acima para ver os campos específicos do seu negócio.
                </div>
              )}

              {/* ── Aceita serviço parcial ── */}
              {alguemSelecionado && (
                <div className={`bg-white rounded-2xl border-2 p-6 space-y-4 transition-colors ${fieldErrors.aceitaServicoParcial ? 'border-destructive' : 'border-border'}`}
                  data-field-error={!!fieldErrors.aceitaServicoParcial || undefined}>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Disponibilidade de Serviço <span className="text-destructive">*</span>
                    </h3>
                    <p className="text-sm text-slate-600 mt-2">
                      {form.tiposOficina.length > 1
                        ? `Você oferece ${form.tiposOficina.length} tipos de serviço. Você aceita pedidos para apenas um deles individualmente?`
                        : 'Você aceita pedidos avulsos para serviços individuais?'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ex: uma marca pode precisar só de modelagem, só de corte, ou só de silk — sem precisar contratar o pacote completo.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { value: true,  label: 'Sim, aceito serviço parcial', desc: 'Atendo pedidos avulsos por etapa (ex: só modelagem, só corte, só silk)', color: 'violet' },
                      { value: false, label: 'Não, apenas pacote completo', desc: 'Só atendo o processo completo, não etapas isoladas', color: 'slate' },
                    ] as const).map(op => {
                      const sel = form.aceitaServicoParcial === op.value;
                      return (
                        <label key={String(op.value)} className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all
                          ${sel
                            ? op.color === 'violet' ? 'bg-violet-50 border-violet-400' : 'bg-slate-50 border-slate-400'
                            : 'border-border hover:border-violet-200 hover:bg-violet-50/30'
                          }`}>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="aceitaServicoParcial"
                              checked={sel}
                              onChange={() => { set('aceitaServicoParcial', op.value); setFieldErrors(p => ({ ...p, aceitaServicoParcial: '' })); }}
                              className="accent-violet-600 shrink-0 w-4 h-4"
                            />
                            <span className={`text-sm font-semibold leading-snug ${sel && op.color === 'violet' ? 'text-violet-700' : sel ? 'text-slate-700' : ''}`}>
                              {op.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6 leading-snug">{op.desc}</p>
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.aceitaServicoParcial && (
                    <p className="text-xs text-destructive">{fieldErrors.aceitaServicoParcial}</p>
                  )}
                </div>
              )}

              {/* Linha de Produto — só para tipos de costura */}
              {isCostura && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Linha de Produto</h3>
                  <p className="text-xs text-muted-foreground -mt-2">Com qual tipo de tecido você trabalha?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {LINHAS.map(l => (
                      <label key={l.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${form.linhas.includes(l.id) ? 'bg-blue-50 border-blue-400' : 'border-border hover:border-blue-200 hover:bg-blue-50/40'}`}>
                        <Checkbox
                          checked={form.linhas.includes(l.id)}
                          onCheckedChange={() => toggle('linhas', l.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className={`font-bold text-base ${form.linhas.includes(l.id) ? 'text-blue-700' : ''}`}>{l.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{l.descricao}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Família de Produto — só para tipos de costura */}
              {isCostura && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Família de Produto</h3>
                  <p className="text-xs text-muted-foreground -mt-2">Quais segmentos de moda você produz? (selecione todos)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FAMILIAS.map(f => (
                      <label key={f} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                        ${form.familias.includes(f) ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-medium' : 'border-border hover:border-emerald-200 hover:bg-emerald-50/40'}`}>
                        <Checkbox
                          checked={form.familias.includes(f)}
                          onCheckedChange={() => toggle('familias', f)}
                        />
                        <span className="text-sm leading-tight">{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Modelagem — método e sistema CAD */}
              {isModelagem && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <span className="text-base">📐</span> Modelagem
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Como você faz a modelagem?</p>
                  </div>

                  {/* Método */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Método de trabalho</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'manual',         label: 'Manual',          desc: 'Papel kraft e réguas — molde físico sem software' },
                        { value: 'cad',             label: 'CAD (software)',  desc: 'Modelagem digital em software especializado' },
                        { value: 'digitalizacao',   label: 'Digitalização',   desc: 'Scanner / digitalizador que converte molde físico em CAD' },
                      ].map(item => {
                        const sel = form.modelagemSubtypes.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${sel ? 'bg-rose-50 border-rose-400' : 'border-border hover:border-rose-200 hover:bg-rose-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('modelagemSubtypes', item.value)} className="mt-0.5 shrink-0" />
                            <div>
                              <p className={`text-sm font-medium leading-snug ${sel ? 'text-rose-700' : ''}`}>{item.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sistema CAD — aparece quando CAD ou Digitalização marcados */}
                  {(form.modelagemSubtypes.includes('cad') || form.modelagemSubtypes.includes('digitalizacao')) && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sistema CAD utilizado</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {['Audaces', 'Electra', 'Lectra', 'Gerber / AccuMark', 'Optitex', 'Valentina', 'Outros'].map(sis => {
                          const sel = form.modelagemCadSistemas.includes(sis);
                          return (
                            <label key={sis} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium
                              ${sel ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-border hover:border-rose-200 hover:bg-rose-50/30'}`}>
                              <Checkbox checked={sel} onCheckedChange={() => toggle('modelagemCadSistemas', sis)} className="shrink-0" />
                              {sis}
                            </label>
                          );
                        })}
                      </div>
                      {form.modelagemCadSistemas.includes('Outros') && (
                        <input
                          type="text"
                          placeholder="Qual sistema? (ex: sistema próprio, outro software...)"
                          value={form.modelagemCadOutro}
                          onChange={e => set('modelagemCadOutro', e.target.value)}
                          className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300 placeholder:text-muted-foreground"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Risco — sistema e largura */}
              {isRisco && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <span className="text-base">📏</span> Risco / Encaixe
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Sistema utilizado e largura máxima do papel de risco</p>
                  </div>

                  {/* Sistema de risco */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sistema de risco</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'audaces',  label: 'Audaces Risco' },
                        { value: 'lectra',   label: 'Lectra' },
                        { value: 'gerber',   label: 'Gerber / AccuMark' },
                        { value: 'optitex',  label: 'Optitex' },
                        { value: 'outros',   label: 'Outros' },
                      ].map(item => {
                        const sel = form.riscoSistemas.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium
                            ${sel ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-border hover:border-indigo-200 hover:bg-indigo-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('riscoSistemas', item.value)} className="shrink-0" />
                            {item.label}
                          </label>
                        );
                      })}
                    </div>
                    {form.riscoSistemas.includes('outros') && (
                      <input
                        type="text"
                        placeholder="Qual sistema? (ex: Optitex, sistema próprio...)"
                        value={form.riscoSistemaOutro}
                        onChange={e => set('riscoSistemaOutro', e.target.value)}
                        className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-muted-foreground"
                      />
                    )}
                  </div>

                  {/* Largura do papel de risco */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Largura máxima do papel / plotter</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {['80 cm', '100 cm', '110 cm', '120 cm', '140 cm', '160 cm', '180 cm', '200 cm'].map(larg => {
                        const sel = form.riscoLargura === larg;
                        return (
                          <button
                            key={larg}
                            type="button"
                            onClick={() => set('riscoLargura', sel ? '' : larg)}
                            className={`p-2.5 rounded-xl border text-sm font-medium text-center transition-all
                              ${sel ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-border hover:border-indigo-200 hover:bg-indigo-50/30'}`}
                          >
                            {larg}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Outra largura:</span>
                      <input
                        type="text"
                        placeholder="Ex: 170 cm"
                        value={!['80 cm','100 cm','110 cm','120 cm','140 cm','160 cm','180 cm','200 cm'].includes(form.riscoLargura) ? form.riscoLargura : ''}
                        onChange={e => set('riscoLargura', e.target.value)}
                        className="w-32 text-sm border border-border rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco Corte */}
              {isCorte && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="text-base">✂️</span> Corte — equipamentos e capacidade
                  </h3>

                  {/* Tipo de equipamento */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Tipo de equipamento</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { value: 'corte_manual_faca',   label: 'Manual — faca elétrica',          desc: 'Corte manual com faca elétrica vertical sobre enfesto' },
                        { value: 'corte_cnc_faca',      label: 'Computadorizado — faca',          desc: 'Máquina CNC com faca vibratória — velocidade e precisão' },
                        { value: 'corte_cnc_laser',     label: 'Computadorizado — laser',         desc: 'Corte a laser — bordas seladas, ideal para sintéticos e técnicos' },
                      ].map(item => {
                        const sel = form.corteSubtypes.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all
                            ${sel ? 'bg-orange-50 border-orange-400' : 'border-border hover:border-orange-200 hover:bg-orange-50/30'}`}>
                            <Checkbox
                              checked={sel}
                              onCheckedChange={() => toggle('corteSubtypes', item.value)}
                              className="mt-0.5 shrink-0"
                            />
                            <div>
                              <p className={`text-xs font-medium leading-snug ${sel ? 'text-orange-700' : ''}`}>{item.label}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Largura de mesa */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Largura de mesa de corte</p>
                    <div className="flex flex-wrap gap-2">
                      {['80 cm','90 cm','100 cm','120 cm','140 cm','160 cm','180 cm','200 cm'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => set('corteLarguraMesa', form.corteLarguraMesa === v ? '' : v)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                            ${form.corteLarguraMesa === v
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'border-border hover:border-orange-300 hover:bg-orange-50'}`}
                        >{v}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Outra largura:</span>
                      <input
                        type="text"
                        placeholder="Ex: 210 cm"
                        value={!['80 cm','90 cm','100 cm','120 cm','140 cm','160 cm','180 cm','200 cm'].includes(form.corteLarguraMesa) ? form.corteLarguraMesa : ''}
                        onChange={e => set('corteLarguraMesa', e.target.value)}
                        className="w-32 text-sm border border-border rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco Estamparia */}
              {isEstamparia && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="text-base">🖨️</span> Estamparia — técnicas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'est_silk_manual',    label: 'Silk / Serigrafia Manual',         desc: 'Quadros manuais — ideal para tiragens menores e especiais' },
                      { value: 'est_silk_carrossel',  label: 'Silk / Serigrafia Carrossel',      desc: 'Carrossel automático — alta produtividade em série' },
                      { value: 'est_sublimacao',      label: 'Sublimação',                       desc: 'Calor + pressão — cores vivas em sintéticos (poliéster, lycra)' },
                      { value: 'est_dtf',             label: 'DTF — Direct to Film',             desc: 'Filme transferido a quente — qualquer tecido, sem pré-trat.' },
                      { value: 'est_dtg',             label: 'DTG — Impressão direta no tecido', desc: 'Impressão inkjet diretamente na peça — algodão e blends' },
                      { value: 'est_transfer',        label: 'Transfer térmico',                  desc: 'Transferência de papel — etiquetas, logos, detalhes' },
                      { value: 'est_reativa',         label: 'Estampa reativa (corante)',         desc: 'Corante que reage com a fibra — cores duráveis em algodão' },
                      { value: 'est_foil',            label: 'Foil / Metalizado',                desc: 'Laminação metálica sobre estampa — efeito brilhante' },
                      { value: 'est_termocolante',    label: 'Termocolante / Vinil recortado',   desc: 'Vinil de corte aplicado a ferro ou prensa' },
                      { value: 'est_outros',          label: 'Outros',                           desc: 'Técnica diferente das listadas acima' },
                    ].map(item => {
                      const sel = form.estampariaTecnicas.includes(item.value);
                      return (
                        <label key={item.value} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all
                          ${sel ? 'bg-pink-50 border-pink-400' : 'border-border hover:border-pink-200 hover:bg-pink-50/30'}`}>
                          <Checkbox checked={sel} onCheckedChange={() => toggle('estampariaTecnicas', item.value)} className="mt-0.5 shrink-0" />
                          <div>
                            <p className={`text-xs font-medium leading-snug ${sel ? 'text-pink-700' : ''}`}>{item.label}</p>
                            <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bloco Bordado */}
              {isBordado && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="text-base">🧵</span> Bordado — técnicas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'brd_computadorizado',  label: 'Bordado computadorizado',        desc: 'Bordadeira automática multi-agulha — alta precisão e volume' },
                      { value: 'brd_manual',           label: 'Bordado manual / artesanal',     desc: 'Ponto a ponto à mão — rendas, crochê, patchwork bordado' },
                      { value: 'brd_paete',            label: 'Paetê automático',               desc: 'Bordadeira com módulo de paetê — sequin simples ou duplo' },
                      { value: 'brd_patch',            label: 'Patch / Aplique bordado',        desc: 'Recorte bordado aplicado por costura ou termofixação' },
                      { value: 'brd_hotfix',           label: 'Hotfix / Pedras termofixadas',   desc: 'Cristais e pedras aplicados por calor' },
                    ].map(item => {
                      const sel = form.bordadoTecnicas.includes(item.value);
                      return (
                        <label key={item.value} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all
                          ${sel ? 'bg-amber-50 border-amber-400' : 'border-border hover:border-amber-200 hover:bg-amber-50/30'}`}>
                          <Checkbox checked={sel} onCheckedChange={() => toggle('bordadoTecnicas', item.value)} className="mt-0.5 shrink-0" />
                          <div>
                            <p className={`text-xs font-medium leading-snug ${sel ? 'text-amber-700' : ''}`}>{item.label}</p>
                            <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bloco Lavanderia */}
              {isLavanderia && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="text-base">💧</span> Lavanderia — substrato e tratamentos
                  </h3>

                  {/* Substrato */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Substrato atendido</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'lav_malha',   label: 'Malha' },
                        { value: 'lav_plano',   label: 'Tecido plano' },
                        { value: 'lav_jeans',   label: 'Jeans / Denim' },
                        { value: 'lav_trico',   label: 'Tricô / Malharia' },
                      ].map(item => {
                        const sel = form.lavanderiaSubtypes.includes(item.value);
                        return (
                          <button key={item.value} type="button"
                            onClick={() => toggle('lavanderiaSubtypes', item.value)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                              ${sel ? 'bg-sky-500 text-white border-sky-500' : 'border-border hover:border-sky-300 hover:bg-sky-50'}`}>
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tratamentos */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Tratamentos realizados</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { value: 'lav_lavagem_simples',   label: 'Lavagem simples / amaciamento',   desc: 'Lavagem industrial com produto amaciante' },
                        { value: 'lav_stonewash',         label: 'Stone wash',                       desc: 'Lavagem com pedra-pomes — efeito envelhecido em denim' },
                        { value: 'lav_estonagem',         label: 'Estonagem',                        desc: 'Acabamento desgastado sem pedra — enzimático ou abrasivo' },
                        { value: 'lav_tingimento_peca',   label: 'Tingimento em peça pronta',        desc: 'Coloração da peça já confeccionada — malha ou plano' },
                        { value: 'lav_delave',            label: 'Delavê / Puído',                   desc: 'Desgaste localizado em jeans — lixamento ou cloro gel' },
                        { value: 'lav_impermeabilizacao', label: 'Impermeabilização (DWR)',           desc: 'Acabamento repelente de água — outdoor, esportivo' },
                        { value: 'lav_softener',          label: 'Softener / Toque suave',           desc: 'Silicone têxtil para toque aveludado' },
                        { value: 'lav_sanfor',            label: 'Sanforização / Estabilização',     desc: 'Pré-encolhimento do tecido para garantir estabilidade' },
                        { value: 'lav_outros',            label: 'Outros tratamentos',               desc: 'Branqueamento, enxaguamento especial, etc.' },
                      ].map(item => {
                        const sel = form.lavanderiaTratamentos.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all
                            ${sel ? 'bg-sky-50 border-sky-400' : 'border-border hover:border-sky-200 hover:bg-sky-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('lavanderiaTratamentos', item.value)} className="mt-0.5 shrink-0" />
                            <div>
                              <p className={`text-xs font-medium leading-snug ${sel ? 'text-sky-700' : ''}`}>{item.label}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco Acabamento */}
              {isAcabamento && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="text-base">📦</span> Acabamento — serviços realizados
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'acab_passadoria_vapor',  label: 'Passadoria a vapor',              desc: 'Ferro ou túnel de vapor industrial' },
                      { value: 'acab_passadoria_plana',  label: 'Passadoria plana / prensa',       desc: 'Prensa plana para modelagem e volume' },
                      { value: 'acab_revisao',           label: 'Revisão / Controle de qualidade', desc: 'Conferência peça a peça — costuras, medidas e acabamento' },
                      { value: 'acab_etiquetagem',       label: 'Etiquetagem',                      desc: 'Aplicação de etiqueta de composição, lavagem e marca' },
                      { value: 'acab_dobragem',          label: 'Dobragem padronizada',             desc: 'Dobra padrão conforme ficha técnica do cliente' },
                      { value: 'acab_embalagem_saco',    label: 'Embalagem em saco / polybag',     desc: 'Ensacamento individual ou por kit' },
                      { value: 'acab_embalagem_caixa',   label: 'Embalagem em caixa',               desc: 'Caixa com e-commerce ou loja — com divisória ou papel tissue' },
                      { value: 'acab_hangtag',           label: 'Aplicação de hang tags',           desc: 'Cartela, preço, tag externa — fixada por cordão ou alfinete' },
                    ].map(item => {
                      const sel = form.acabamentoServicos.includes(item.value);
                      return (
                        <label key={item.value} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all
                          ${sel ? 'bg-violet-50 border-violet-400' : 'border-border hover:border-violet-200 hover:bg-violet-50/30'}`}>
                          <Checkbox checked={sel} onCheckedChange={() => toggle('acabamentoServicos', item.value)} className="mt-0.5 shrink-0" />
                          <div>
                            <p className={`text-xs font-medium leading-snug ${sel ? 'text-violet-700' : ''}`}>{item.label}</p>
                            <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personalização de Catálogo — só para Private Label - Catálogo */}
              {isPrivateLabelCatalogo && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Tag className="w-4 h-4" /> Personalização para o Cliente
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Como você entrega os produtos do seu catálogo?</p>
                  </div>
                  <div className="space-y-2">
                    {/* Opção: vende lisas */}
                    <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${form.personalizacao.includes('lisa')
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'border-border hover:border-emerald-200 hover:bg-emerald-50/40'}`}>
                      <Checkbox
                        checked={form.personalizacao.includes('lisa')}
                        onCheckedChange={() => toggle('personalizacao', 'lisa')}
                        className="mt-0.5 shrink-0"
                      />
                      <div>
                        <p className={`text-sm font-medium ${form.personalizacao.includes('lisa') ? 'text-emerald-700' : ''}`}>Vende peças lisas</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Sem personalização de marca — o cliente etiqueta por conta própria</p>
                      </div>
                    </label>

                    {/* Opção: personaliza */}
                    <div className="space-y-2">
                      <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${form.personalizacao.includes('personaliza')
                          ? 'bg-emerald-50 border-emerald-400'
                          : 'border-border hover:border-emerald-200 hover:bg-emerald-50/40'}`}>
                        <Checkbox
                          checked={form.personalizacao.includes('personaliza')}
                          onCheckedChange={() => toggle('personalizacao', 'personaliza')}
                          className="mt-0.5 shrink-0"
                        />
                        <div>
                          <p className={`text-sm font-medium ${form.personalizacao.includes('personaliza') ? 'text-emerald-700' : ''}`}>Personaliza para o cliente</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Aplica marca, etiqueta, estampa ou acabamento personalizado</p>
                        </div>
                      </label>

                      {/* Sub-opções de técnica — aparecem quando "personaliza" está marcado */}
                      {form.personalizacao.includes('personaliza') && (
                        <div className="ml-4 pl-4 border-l-2 border-emerald-200 space-y-2">
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Quais técnicas você oferece?</p>

                          {/* Estamparia — com sub-grupos ao marcar */}
                          <div className="space-y-2">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                              ${form.personalizacaoTecnicas.includes('estamparia')
                                ? 'bg-orange-50 border-orange-400'
                                : 'border-border hover:border-orange-200 hover:bg-orange-50/30'}`}>
                              <Checkbox
                                checked={form.personalizacaoTecnicas.includes('estamparia')}
                                onCheckedChange={() => toggle('personalizacaoTecnicas', 'estamparia')}
                                className="mt-0.5 shrink-0"
                              />
                              <div>
                                <p className={`text-sm font-medium leading-snug ${form.personalizacaoTecnicas.includes('estamparia') ? 'text-orange-700' : ''}`}>Estamparia / Silk</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Serigrafia, DTG, DTF, Sublimação</p>
                              </div>
                            </label>

                            {/* Sub-grupos de estamparia */}
                            {form.personalizacaoTecnicas.includes('estamparia') && (
                              <div className="ml-4 pl-4 border-l-2 border-orange-200 space-y-4">
                                {[
                                  {
                                    grupo: 'Serigrafia',
                                    cor: 'orange',
                                    itens: [
                                      { value: 'serigrafia_mesa', label: 'Serigrafia Mesa', desc: 'Peças avulsas em mesa plana' },
                                      { value: 'serigrafia_berco', label: 'Serigrafia Berço', desc: 'Carrossel rotativo para maior produção' },
                                      { value: 'serigrafia_qaq', label: 'Serigrafia Quadro a Quadro', desc: 'Rolo de tecido, passagem contínua' },
                                      { value: 'serigrafia_cilindro', label: 'Serigrafia Cilindro', desc: 'Rolo de tecido com cilindro rotativo' },
                                    ],
                                  },
                                  {
                                    grupo: 'DTG — Direct to Garment',
                                    cor: 'blue',
                                    itens: [
                                      { value: 'dtg_localizada', label: 'DTG Localizada', desc: 'Impressão direta em peça acabada' },
                                      { value: 'dtg_full_print', label: 'DTG Full Print', desc: 'Rolo de tecido, cobertura total' },
                                    ],
                                  },
                                  {
                                    grupo: 'DTF — Direct to Film',
                                    cor: 'violet',
                                    itens: [
                                      { value: 'dtf_localizado', label: 'DTF Localizado', desc: 'Transferência de filme para peça acabada' },
                                      { value: 'dtf_fotolito', label: 'DTF Impressão do Fotolito', desc: 'Geração do filme para serigrafia' },
                                    ],
                                  },
                                  {
                                    grupo: 'Sublimação',
                                    cor: 'pink',
                                    itens: [
                                      { value: 'sub_localizada', label: 'Sublimação Localizada', desc: 'Estampa em área específica da peça' },
                                      { value: 'sub_full_print', label: 'Sublimação Full Print', desc: 'Rolo de tecido com cobertura total' },
                                      { value: 'sub_plotagem', label: 'Sublimação Só Plotagem', desc: 'Apenas plota o papel de transferência' },
                                      { value: 'sub_prensagem', label: 'Sublimação Prensagem', desc: 'Apenas prensa o papel na peça' },
                                    ],
                                  },
                                ].map(({ grupo, cor, itens }) => {
                                  const clr: Record<string, { header: string; line: string; active: string; hover: string; text: string }> = {
                                    orange: { header: 'text-orange-600', line: 'bg-orange-200', active: 'bg-orange-50 border-orange-400', hover: 'hover:border-orange-200 hover:bg-orange-50/30', text: 'text-orange-700' },
                                    blue:   { header: 'text-blue-600',   line: 'bg-blue-200',   active: 'bg-blue-50 border-blue-400',     hover: 'hover:border-blue-200 hover:bg-blue-50/30',   text: 'text-blue-700' },
                                    violet: { header: 'text-violet-600', line: 'bg-violet-200', active: 'bg-violet-50 border-violet-400', hover: 'hover:border-violet-200 hover:bg-violet-50/30', text: 'text-violet-700' },
                                    pink:   { header: 'text-pink-600',   line: 'bg-pink-200',   active: 'bg-pink-50 border-pink-400',     hover: 'hover:border-pink-200 hover:bg-pink-50/30',   text: 'text-pink-700' },
                                  };
                                  const c = clr[cor];
                                  return (
                                    <div key={grupo}>
                                      <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${c.header} flex items-center gap-2`}>
                                        <span className={`h-px flex-1 ${c.line}`} />
                                        {grupo}
                                        <span className={`h-px flex-1 ${c.line}`} />
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {itens.map(item => {
                                          const sel = form.estampariaTecnicas.includes(item.value);
                                          return (
                                            <label key={item.value} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${sel ? c.active : `border-border ${c.hover}`}`}>
                                              <Checkbox
                                                checked={sel}
                                                onCheckedChange={() => toggle('estampariaTecnicas', item.value)}
                                                className="mt-0.5 shrink-0"
                                              />
                                              <div>
                                                <p className={`text-xs font-medium leading-snug ${sel ? c.text : ''}`}>{item.label}</p>
                                                <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Bordado — expandível */}
                          <div className="space-y-2">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                              ${form.personalizacaoTecnicas.includes('bordado')
                                ? 'bg-amber-50 border-amber-400'
                                : 'border-border hover:border-amber-200 hover:bg-amber-50/30'}`}>
                              <Checkbox
                                checked={form.personalizacaoTecnicas.includes('bordado')}
                                onCheckedChange={() => toggle('personalizacaoTecnicas', 'bordado')}
                                className="mt-0.5 shrink-0"
                              />
                              <div>
                                <p className={`text-sm font-medium leading-snug ${form.personalizacaoTecnicas.includes('bordado') ? 'text-amber-700' : ''}`}>Bordado</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Patches, apliques, lantejoulas, manual e automático</p>
                              </div>
                            </label>

                            {form.personalizacaoTecnicas.includes('bordado') && (
                              <div className="ml-4 pl-4 border-l-2 border-amber-200 space-y-1.5">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Tipos de bordado</p>
                                {[
                                  { value: 'bordado_patch', label: 'Patch', desc: 'Emblema bordado avulso, costurado ou colado na peça' },
                                  { value: 'bordado_aplique', label: 'Aplique', desc: 'Recorte de tecido ou material aplicado e bordado sobre a peça' },
                                  { value: 'bordado_lantejoula', label: 'Lantejoulas', desc: 'Aplicação de lantejoulas manuais ou automáticas' },
                                  { value: 'bordado_manual', label: 'Bordado Manual', desc: 'Ponto a ponto feito à mão — rendas, crochê, bordado artesanal' },
                                  { value: 'bordado_automatico', label: 'Bordado Automático', desc: 'Bordadeira computadorizada — alta precisão e volume' },
                                ].map(item => {
                                  const sel = form.bordadoTecnicas.includes(item.value);
                                  return (
                                    <label key={item.value} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                                      ${sel ? 'bg-amber-50 border-amber-400' : 'border-border hover:border-amber-200 hover:bg-amber-50/30'}`}>
                                      <Checkbox
                                        checked={sel}
                                        onCheckedChange={() => toggle('bordadoTecnicas', item.value)}
                                        className="mt-0.5 shrink-0"
                                      />
                                      <div>
                                        <p className={`text-xs font-medium leading-snug ${sel ? 'text-amber-700' : ''}`}>{item.label}</p>
                                        <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Lavanderia — expandível */}
                          <div className="space-y-2">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                              ${form.personalizacaoTecnicas.includes('lavanderia')
                                ? 'bg-sky-50 border-sky-400'
                                : 'border-border hover:border-sky-200 hover:bg-sky-50/30'}`}>
                              <Checkbox
                                checked={form.personalizacaoTecnicas.includes('lavanderia')}
                                onCheckedChange={() => toggle('personalizacaoTecnicas', 'lavanderia')}
                                className="mt-0.5 shrink-0"
                              />
                              <div>
                                <p className={`text-sm font-medium leading-snug ${form.personalizacaoTecnicas.includes('lavanderia') ? 'text-sky-700' : ''}`}>Lavanderia / Tratamento</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Tingimento, estonagem, puídos, amaciado — malha ou jeans</p>
                              </div>
                            </label>

                            {form.personalizacaoTecnicas.includes('lavanderia') && (
                              <div className="ml-4 pl-4 border-l-2 border-sky-200 space-y-3">
                                {/* 1. Material */}
                                <div>
                                  <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">Material trabalhado</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { value: 'malha', label: 'Malha', desc: 'Jersey, moletom, suplex, malha fria...' },
                                      { value: 'jeans', label: 'Jeans / Denim', desc: 'Calça, bermuda, saia, jaqueta jeans...' },
                                    ].map(mat => {
                                      const sel = form.lavanderiaSubtypes.includes(mat.value);
                                      return (
                                        <label key={mat.value} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                                          ${sel ? 'bg-sky-100 border-sky-500' : 'border-border hover:border-sky-200 hover:bg-sky-50/30'}`}>
                                          <Checkbox checked={sel} onCheckedChange={() => toggle('lavanderiaSubtypes', mat.value)} className="mt-0.5 shrink-0" />
                                          <div>
                                            <p className={`text-xs font-semibold ${sel ? 'text-sky-700' : ''}`}>{mat.label}</p>
                                            <p className="text-xs text-muted-foreground leading-snug">{mat.desc}</p>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 2. Tratamentos — agrupados por material selecionado */}
                                {form.lavanderiaSubtypes.length > 0 && (() => {
                                  const hasMalha = form.lavanderiaSubtypes.includes('malha');
                                  const hasJeans = form.lavanderiaSubtypes.includes('jeans');
                                  const grupos: { titulo: string; badge: string; itens: { value: string; label: string; desc: string }[] }[] = [];
                                  if (hasMalha) grupos.push({
                                    titulo: 'Tratamentos em Malha',
                                    badge: 'Malha',
                                    itens: [
                                      { value: 'trat_tingimento_malha', label: 'Tingimento', desc: 'Coloração total da peça ou do fio' },
                                      { value: 'trat_tieday', label: 'Tie-Dye / Shibori', desc: 'Amarração e tintura para efeitos manuais' },
                                      { value: 'trat_estonagem_malha', label: 'Estonagem', desc: 'Envelhecimento e amolecimento do tecido' },
                                      { value: 'trat_amaciado_malha', label: 'Amaciado', desc: 'Toque mais macio e agradável na peça' },
                                      { value: 'trat_puidos_malha', label: 'Puídos', desc: 'Efeito desgastado ou rasgado na malha' },
                                    ],
                                  });
                                  if (hasJeans) grupos.push({
                                    titulo: 'Tratamentos em Jeans',
                                    badge: 'Jeans',
                                    itens: [
                                      { value: 'trat_tingimento_jeans', label: 'Tingimento / Overdye', desc: 'Recoloração ou sobrecoloração do jeans' },
                                      { value: 'trat_estonagem_jeans', label: 'Estonagem', desc: 'Envelhecimento com pedra pomes ou enzimas' },
                                      { value: 'trat_amaciado_jeans', label: 'Amaciado', desc: 'Jeans mais flexível e macio ao toque' },
                                      { value: 'trat_puidos_jeans', label: 'Puídos / Rasgo', desc: 'Lixamento, corte ou desgaste manual' },
                                      { value: 'trat_desbotamento', label: 'Desbotamento / Bleaching', desc: 'Clareamento com cloro ou laser' },
                                      { value: 'trat_sandblasting', label: 'Sandblasting / Lixamento', desc: 'Jato de areia ou lixa para efeito desgastado' },
                                    ],
                                  });
                                  return grupos.map(grupo => (
                                    <div key={grupo.titulo}>
                                      <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                        <span className="h-px flex-1 bg-sky-200" />{grupo.titulo}<span className="h-px flex-1 bg-sky-200" />
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {grupo.itens.map(item => {
                                          const sel = form.lavanderiaTratamentos.includes(item.value);
                                          return (
                                            <label key={item.value} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                                              ${sel ? 'bg-sky-50 border-sky-400' : 'border-border hover:border-sky-200 hover:bg-sky-50/30'}`}>
                                              <Checkbox checked={sel} onCheckedChange={() => toggle('lavanderiaTratamentos', item.value)} className="mt-0.5 shrink-0" />
                                              <div>
                                                <p className={`text-xs font-medium leading-snug ${sel ? 'text-sky-700' : ''}`}>{item.label}</p>
                                                <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Modelagem — expandível */}
                          <div className="space-y-2">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                              ${form.personalizacaoTecnicas.includes('modelagem')
                                ? 'bg-rose-50 border-rose-400'
                                : 'border-border hover:border-rose-200 hover:bg-rose-50/30'}`}>
                              <Checkbox
                                checked={form.personalizacaoTecnicas.includes('modelagem')}
                                onCheckedChange={() => toggle('personalizacaoTecnicas', 'modelagem')}
                                className="mt-0.5 shrink-0"
                              />
                              <div>
                                <p className={`text-sm font-medium leading-snug ${form.personalizacaoTecnicas.includes('modelagem') ? 'text-rose-700' : ''}`}>Modelagem</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Manual ou CAD (Audaces, Electra...) · risco automático</p>
                              </div>
                            </label>

                            {form.personalizacaoTecnicas.includes('modelagem') && (
                              <div className="ml-4 pl-4 border-l-2 border-rose-200 space-y-4">

                                {/* Tipo de modelagem */}
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Tipo de modelagem</p>
                                  {[
                                    { value: 'manual', label: 'Manual', desc: 'Modelagem à mão em papel kraft ou tecido piloto' },
                                    { value: 'cad', label: 'CAD (software)', desc: 'Modelagem digital em software especializado' },
                                  ].map(item => {
                                    const sel = form.modelagemSubtypes.includes(item.value);
                                    return (
                                      <label key={item.value} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                                        ${sel ? 'bg-rose-50 border-rose-400' : 'border-border hover:border-rose-200 hover:bg-rose-50/30'}`}>
                                        <Checkbox checked={sel} onCheckedChange={() => toggle('modelagemSubtypes', item.value)} className="mt-0.5 shrink-0" />
                                        <div>
                                          <p className={`text-xs font-medium leading-snug ${sel ? 'text-rose-700' : ''}`}>{item.label}</p>
                                          <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>

                                {/* Sistema CAD — aparece só se CAD marcado */}
                                {form.modelagemSubtypes.includes('cad') && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Sistema CAD utilizado</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {['Audaces', 'Electra', 'Optitex', 'Lectra', 'Gerber / AccuMark', 'Valentina'].map(sis => {
                                        const sel = form.modelagemCadSistemas.includes(sis);
                                        return (
                                          <label key={sis} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs font-medium
                                            ${sel ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-border hover:border-rose-200'}`}>
                                            <Checkbox checked={sel} onCheckedChange={() => toggle('modelagemCadSistemas', sis)} className="shrink-0" />
                                            {sis}
                                          </label>
                                        );
                                      })}
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Outro sistema CAD (opcional)"
                                      value={form.modelagemCadOutro}
                                      onChange={e => set('modelagemCadOutro', e.target.value)}
                                      className="w-full text-xs border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-muted-foreground"
                                    />
                                  </div>
                                )}

                                {/* Risco automático */}
                                <div className="space-y-2">
                                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                                    ${form.modelagemSubtypes.includes('risco_automatico') ? 'bg-rose-50 border-rose-400' : 'border-border hover:border-rose-200 hover:bg-rose-50/30'}`}>
                                    <Checkbox
                                      checked={form.modelagemSubtypes.includes('risco_automatico')}
                                      onCheckedChange={() => toggle('modelagemSubtypes', 'risco_automatico')}
                                      className="mt-0.5 shrink-0"
                                    />
                                    <div>
                                      <p className={`text-xs font-medium leading-snug ${form.modelagemSubtypes.includes('risco_automatico') ? 'text-rose-700' : ''}`}>Risco automático (plotter)</p>
                                      <p className="text-xs text-muted-foreground leading-snug">Impressão do encaixe em papel largo via plotter</p>
                                    </div>
                                  </label>
                                  {form.modelagemSubtypes.includes('risco_automatico') && (
                                    <div className="flex items-center gap-2 pl-1">
                                      <p className="text-xs text-muted-foreground whitespace-nowrap">Largura máxima do papel:</p>
                                      <input
                                        type="text"
                                        placeholder="Ex: 180 cm"
                                        value={form.modelagemRiscoLargura}
                                        onChange={e => set('modelagemRiscoLargura', e.target.value)}
                                        className="w-28 text-xs border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-muted-foreground"
                                      />
                                    </div>
                                  )}
                                </div>

                              </div>
                            )}
                          </div>

                          {/* Acabamento — expandível */}
                          <div className="space-y-2">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                              ${form.personalizacaoTecnicas.includes('acabamento')
                                ? 'bg-orange-50 border-orange-400'
                                : 'border-border hover:border-orange-200 hover:bg-orange-50/30'}`}>
                              <Checkbox
                                checked={form.personalizacaoTecnicas.includes('acabamento')}
                                onCheckedChange={() => toggle('personalizacaoTecnicas', 'acabamento')}
                                className="mt-0.5 shrink-0"
                              />
                              <div>
                                <p className={`text-sm font-medium leading-snug ${form.personalizacaoTecnicas.includes('acabamento') ? 'text-orange-700' : ''}`}>Acabamento</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Ilhós, rebite, caseado, travete, entretelagem</p>
                              </div>
                            </label>

                            {form.personalizacaoTecnicas.includes('acabamento') && (
                              <div className="ml-4 pl-4 border-l-2 border-orange-200 space-y-1.5">
                                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Serviços de acabamento</p>
                                {[
                                  { value: 'acab_ilhos',        label: 'Ilhós',              desc: 'Aplicação de ilhós metálicos ou plásticos em peças' },
                                  { value: 'acab_rebite',       label: 'Rebite',             desc: 'Fixação decorativa ou estrutural com rebite' },
                                  { value: 'acab_caseado_norm', label: 'Caseado Normal',      desc: 'Casa de botão reta, para camisas, calças e jaquetas' },
                                  { value: 'acab_caseado_olho', label: 'Caseado Olho',        desc: 'Casa de botão com olho arredondado — paletós e calças sociais' },
                                  { value: 'acab_travete',      label: 'Travete',             desc: 'Reforço em pontos de tensão — bolsos, alças, zíperes' },
                                  { value: 'acab_entretelagem', label: 'Entretelagem',        desc: 'Aplicação de entretela termocolante ou costurada para estrutura' },
                                  { value: 'acab_passadoria',   label: 'Passadoria',          desc: 'Passagem a ferro ou prensa para acabamento e apresentação da peça' },
                                  { value: 'acab_embalagem',    label: 'Embalagem',           desc: 'Sacola, caixa, papel de seda ou embalagem com marca do cliente' },
                                ].map(item => {
                                  const sel = form.acabamentoServicos.includes(item.value);
                                  return (
                                    <label key={item.value} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                                      ${sel ? 'bg-orange-50 border-orange-400' : 'border-border hover:border-orange-200 hover:bg-orange-50/30'}`}>
                                      <Checkbox
                                        checked={sel}
                                        onCheckedChange={() => toggle('acabamentoServicos', item.value)}
                                        className="mt-0.5 shrink-0"
                                      />
                                      <div>
                                        <p className={`text-xs font-medium leading-snug ${sel ? 'text-orange-700' : ''}`}>{item.label}</p>
                                        <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Corte — expandível */}
                          <div className="space-y-2">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                              ${form.personalizacaoTecnicas.includes('corte')
                                ? 'bg-violet-50 border-violet-400'
                                : 'border-border hover:border-violet-200 hover:bg-violet-50/30'}`}>
                              <Checkbox
                                checked={form.personalizacaoTecnicas.includes('corte')}
                                onCheckedChange={() => toggle('personalizacaoTecnicas', 'corte')}
                                className="mt-0.5 shrink-0"
                              />
                              <div>
                                <p className={`text-sm font-medium leading-snug ${form.personalizacaoTecnicas.includes('corte') ? 'text-violet-700' : ''}`}>Corte</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Manual (faca) ou automático (faca CNC / laser)</p>
                              </div>
                            </label>

                            {form.personalizacaoTecnicas.includes('corte') && (
                              <div className="ml-4 pl-4 border-l-2 border-violet-200 space-y-1.5">
                                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">Tipo de corte</p>
                                {[
                                  { value: 'corte_manual_faca', label: 'Manual — Faca', desc: 'Corte à mão com faca ou bisturi sobre encaixe impresso' },
                                  { value: 'corte_automatico_faca', label: 'Automático — Faca CNC', desc: 'Ploter de corte com faca vibratória — rapidez e precisão em série' },
                                  { value: 'corte_laser', label: 'Automático — Laser', desc: 'Corte a laser — bordas seladas, ideal para sintéticos e tecidos técnicos' },
                                ].map(item => {
                                  const sel = form.corteSubtypes.includes(item.value);
                                  return (
                                    <label key={item.value} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                                      ${sel ? 'bg-violet-50 border-violet-400' : 'border-border hover:border-violet-200 hover:bg-violet-50/30'}`}>
                                      <Checkbox
                                        checked={sel}
                                        onCheckedChange={() => toggle('corteSubtypes', item.value)}
                                        className="mt-0.5 shrink-0"
                                      />
                                      <div>
                                        <p className={`text-xs font-medium leading-snug ${sel ? 'text-violet-700' : ''}`}>{item.label}</p>
                                        <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fornecedor de Aviamentos */}
              {isAviamentos && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="text-base">🧵</span> Aviamentos fornecidos
                  </h3>
                  <p className="text-xs text-muted-foreground -mt-2">Marque todos os tipos que você vende</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'av_botoes',     label: 'Botões',               desc: 'Plástico, metal, madeira, pressão, mola...' },
                      { value: 'av_ziperes',    label: 'Zíperes',              desc: 'Nylon, metal, invisível, aquazip...' },
                      { value: 'av_elasticos',  label: 'Elásticos',            desc: 'Chato, redondo, cós, lingerie...' },
                      { value: 'av_velcro',     label: 'Velcro / Fecho Mágico', desc: 'Rolo ou cortado, diversas larguras' },
                      { value: 'av_fivelas',    label: 'Fivelas e Argolas',    desc: 'Metal ou plástico para cintos, alças e bolsas' },
                      { value: 'av_rebites',    label: 'Rebites e Ilhós',      desc: 'Metálicos para jeans, calçados e bolsas' },
                      { value: 'av_entretelas', label: 'Entretelas',           desc: 'Termocolante, costurada, flizeline...' },
                      { value: 'av_linhas',     label: 'Linhas de Costura',    desc: 'Poliéster, algodão, overloque, cerzideira...' },
                      { value: 'av_etiquetas',  label: 'Etiquetas',            desc: 'Bordada, impressa, termocolante, tecida...' },
                      { value: 'av_tags',       label: 'Tags e Hang Tags',     desc: 'Papelão, papel, plástico — personalizadas ou genéricas' },
                      { value: 'av_cadarcos',   label: 'Cadarços e Cordões',   desc: 'Redondo, chato, encerado, elástico...' },
                      { value: 'av_outros',     label: 'Outros aviamentos',    desc: 'Passadores, reguladores, snap, presilhas...' },
                    ].map(item => {
                      const sel = form.aviamentosServicos.includes(item.value);
                      return (
                        <label key={item.value} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                          ${sel ? 'bg-teal-50 border-teal-400' : 'border-border hover:border-teal-200 hover:bg-teal-50/30'}`}>
                          <Checkbox checked={sel} onCheckedChange={() => toggle('aviamentosServicos', item.value)} className="mt-0.5 shrink-0" />
                          <div>
                            <p className={`text-sm font-medium leading-snug ${sel ? 'text-teal-700' : ''}`}>{item.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fornecedor de Tecidos */}
              {isTecidos && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="text-base">🪢</span> Tipos de tecido fornecidos
                  </h3>
                  <p className="text-xs text-muted-foreground -mt-2">Marque todos os grupos que você vende em rolo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'tec_malha',     label: 'Malha',                desc: 'Jersey, ribana, moletom, suplex, malha fria, canelado...' },
                      { value: 'tec_plano',     label: 'Plano',                desc: 'Algodão, viscose, linho, popeline, cambraia, voil...' },
                      { value: 'tec_denim',     label: 'Denim / Jeans',        desc: 'Jeans cru, colorido, destroyed, stretch...' },
                      { value: 'tec_tecnico',   label: 'Técnico / Esportivo',  desc: 'Dry-fit, neoprene, tactel, softshell, helanca...' },
                      { value: 'tec_sintetico', label: 'Sintético',            desc: 'Nylon, poliéster, tafetá, forro, brim...' },
                      { value: 'tec_couro',     label: 'Couro / Sintético',    desc: 'Couro natural, PU, PVC, verniz...' },
                      { value: 'tec_outros',    label: 'Outros',               desc: 'Renda, tule, tela, não-tecido, TNT...' },
                    ].map(item => {
                      const sel = form.tecidosTipos.includes(item.value);
                      return (
                        <label key={item.value} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                          ${sel ? 'bg-indigo-50 border-indigo-400' : 'border-border hover:border-indigo-200 hover:bg-indigo-50/30'}`}>
                          <Checkbox checked={sel} onCheckedChange={() => toggle('tecidosTipos', item.value)} className="mt-0.5 shrink-0" />
                          <div>
                            <p className={`text-sm font-medium leading-snug ${sel ? 'text-indigo-700' : ''}`}>{item.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tinturaria / Beneficiamento */}
              {isTinturaria && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <span className="text-base">🎨</span> Tinturaria / Beneficiamento
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Informe o substrato, fibras e processos que você realiza</p>
                  </div>

                  {/* Substrato */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Substrato trabalhado</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'sub_malha', label: 'Malha',  desc: 'Tecidos de malha (jersey, ribana, suplex, moletom...)' },
                        { value: 'sub_plano', label: 'Plano',  desc: 'Tecidos planos (algodão, viscose, denim, popeline...)' },
                      ].map(item => {
                        const sel = form.tinturariaSubstrato.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${sel ? 'bg-cyan-50 border-cyan-400' : 'border-border hover:border-cyan-200 hover:bg-cyan-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('tinturariaSubstrato', item.value)} className="mt-0.5 shrink-0" />
                            <div>
                              <p className={`text-sm font-medium leading-snug ${sel ? 'text-cyan-700' : ''}`}>{item.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fibra principal */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fibra principal processada</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'fib_algodao',   label: 'Algodão' },
                        { value: 'fib_poliester',  label: 'Poliéster' },
                        { value: 'fib_poliamida',  label: 'Poliamida (Nylon)' },
                        { value: 'fib_viscose',    label: 'Viscose / Modal' },
                        { value: 'fib_elastano',   label: 'Elastano / Lycra' },
                        { value: 'fib_mista',      label: 'Mista / Blend' },
                      ].map(item => {
                        const sel = form.tinturariaFibras.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all
                            ${sel ? 'bg-cyan-50 border-cyan-400' : 'border-border hover:border-cyan-200 hover:bg-cyan-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('tinturariaFibras', item.value)} className="shrink-0" />
                            <span className={`text-sm font-medium ${sel ? 'text-cyan-700' : ''}`}>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Processos */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Processos realizados</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { value: 'tint_tingimento_rolo',   label: 'Tingimento em rolo',        desc: 'Coloração de tecido em rolo — antes da confecção' },
                        { value: 'tint_tingimento_fio',    label: 'Tingimento de fio',          desc: 'Coloração do fio antes da tecelagem ou malharia' },
                        { value: 'tint_dublagem',          label: 'Dublagem',                  desc: 'União de dois tecidos com cola ou calor' },
                        { value: 'tint_cirre',             label: 'Cirre',                     desc: 'Acabamento brilhante e impermeável sobre o tecido' },
                        { value: 'tint_estonagem_rolo',    label: 'Estonagem em rolo',         desc: 'Envelhecimento do tecido — pedra ou enzima' },
                        { value: 'tint_amaciamento',       label: 'Amaciamento',               desc: 'Tratamento para toque mais macio e confortável' },
                        { value: 'tint_impermeabilizacao', label: 'Impermeabilização',         desc: 'Coating DWR ou PU para repelir água' },
                        { value: 'tint_outros',            label: 'Outros beneficiamentos',    desc: 'Antimofo, antiodor, sanforização, mercerização...' },
                      ].map(item => {
                        const sel = form.tinturariaServicos.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                            ${sel ? 'bg-cyan-50 border-cyan-400' : 'border-border hover:border-cyan-200 hover:bg-cyan-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('tinturariaServicos', item.value)} className="mt-0.5 shrink-0" />
                            <div>
                              <p className={`text-sm font-medium leading-snug ${sel ? 'text-cyan-700' : ''}`}>{item.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Facção de Malharia */}
              {isMalharia && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <span className="text-base">🧶</span> Facção de Malharia
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Tipo de maquinário e fibras que você produz</p>
                  </div>

                  {/* Tipo de malharia */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de malharia</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'malh_circular',   label: 'Circular',    desc: 'Tear circular — jersey, ribana, moletom, canelado, suplex' },
                        { value: 'malh_retilinha',  label: 'Retilínea',   desc: 'Tear retilíneo — tricô técnico, malha estruturada, Wholegarment' },
                        { value: 'malh_urdume',     label: 'Urdume (Raschel)', desc: 'Rede, renda, tule, guipure, tecido de urdume' },
                        { value: 'malh_outros',     label: 'Outros',      desc: 'Tear específico não listado acima' },
                      ].map(item => {
                        const sel = form.malhariaTipos.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${sel ? 'bg-emerald-50 border-emerald-400' : 'border-border hover:border-emerald-200 hover:bg-emerald-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('malhariaTipos', item.value)} className="mt-0.5 shrink-0" />
                            <div>
                              <p className={`text-sm font-medium leading-snug ${sel ? 'text-emerald-700' : ''}`}>{item.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fibra */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fibra principal produzida</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'fib_algodao',   label: 'Algodão' },
                        { value: 'fib_poliester',  label: 'Poliéster' },
                        { value: 'fib_poliamida',  label: 'Poliamida (Nylon)' },
                        { value: 'fib_viscose',    label: 'Viscose / Modal' },
                        { value: 'fib_elastano',   label: 'Elastano / Lycra' },
                        { value: 'fib_mista',      label: 'Mista / Blend' },
                      ].map(item => {
                        const sel = form.malhariaFibras.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all
                            ${sel ? 'bg-emerald-50 border-emerald-400' : 'border-border hover:border-emerald-200 hover:bg-emerald-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('malhariaFibras', item.value)} className="shrink-0" />
                            <span className={`text-sm font-medium ${sel ? 'text-emerald-700' : ''}`}>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tecelagem */}
              {isTecelagem && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <span className="text-base">🪡</span> Tecelagem
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Tipo de tear e fibras que você produz em tecido plano</p>
                  </div>

                  {/* Tipo de tear */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de tear</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'tec_jato_ar',    label: 'Jato de Ar',     desc: 'Alta velocidade — popeline, cambraia, voil, percal, tafetá' },
                        { value: 'tec_rapier',      label: 'Rapier',         desc: 'Versátil — brim, sarja, denim, oxford, tweed, lona' },
                        { value: 'tec_jacquard',    label: 'Jacquard',       desc: 'Tecidos com padrão na estrutura — gobelin, brocado, damasco' },
                        { value: 'tec_lancadeira',  label: 'Lançadeira',     desc: 'Tear convencional — artesanal, tecidos especiais e nicho' },
                        { value: 'tec_outros',      label: 'Outros',         desc: 'Tear circular de plano ou outra tecnologia' },
                      ].map(item => {
                        const sel = form.tecelagemTipos.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${sel ? 'bg-amber-50 border-amber-400' : 'border-border hover:border-amber-200 hover:bg-amber-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('tecelagemTipos', item.value)} className="mt-0.5 shrink-0" />
                            <div>
                              <p className={`text-sm font-medium leading-snug ${sel ? 'text-amber-700' : ''}`}>{item.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fibra */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fibra principal tecida</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'fib_algodao',   label: 'Algodão' },
                        { value: 'fib_linho',      label: 'Linho' },
                        { value: 'fib_poliester',  label: 'Poliéster' },
                        { value: 'fib_viscose',    label: 'Viscose / Modal' },
                        { value: 'fib_seda',       label: 'Seda / Acetato' },
                        { value: 'fib_mista',      label: 'Mista / Blend' },
                      ].map(item => {
                        const sel = form.tecelagemFibras.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all
                            ${sel ? 'bg-amber-50 border-amber-400' : 'border-border hover:border-amber-200 hover:bg-amber-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('tecelagemFibras', item.value)} className="shrink-0" />
                            <span className={`text-sm font-medium ${sel ? 'text-amber-700' : ''}`}>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco Fios */}
              {isFios && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="text-base">🪡</span> Fios — fibras e finalidade
                  </h3>

                  {/* Fibra */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Fibra principal fornecida</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'fio_algodao',    label: 'Algodão' },
                        { value: 'fio_poliester',  label: 'Poliéster' },
                        { value: 'fio_poliamida',  label: 'Poliamida (Nylon)' },
                        { value: 'fio_viscose',    label: 'Viscose / Rayon' },
                        { value: 'fio_elastano',   label: 'Elastano / Lycra' },
                        { value: 'fio_la',         label: 'Lã' },
                        { value: 'fio_acrilico',   label: 'Acrílico' },
                        { value: 'fio_linho',      label: 'Linho' },
                        { value: 'fio_misto',      label: 'Misto / Blend' },
                      ].map(item => {
                        const sel = form.fiosFibras.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all
                            ${sel ? 'bg-teal-50 border-teal-400' : 'border-border hover:border-teal-200 hover:bg-teal-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('fiosFibras', item.value)} className="shrink-0" />
                            <span className={`text-sm font-medium ${sel ? 'text-teal-700' : ''}`}>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Finalidade */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Finalidade / Uso do fio</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { value: 'fin_costura',          label: 'Linha de costura',           desc: 'Poliéster, algodão ou core-spun para máquinas de costura' },
                        { value: 'fin_bordado',          label: 'Linha de bordado',           desc: 'Poliéster ou rayon brilhante para bordadeiras' },
                        { value: 'fin_malharia_circ',    label: 'Fio para malharia circular', desc: 'Cone para tear circular — jersey, ribana, interlock' },
                        { value: 'fin_malharia_ret',     label: 'Fio para malharia retilínea', desc: 'Cone para V-bed — tricô, cardigan, suéter' },
                        { value: 'fin_tecelagem',        label: 'Fio para tecelagem',          desc: 'Urdume e trama para teares planos' },
                        { value: 'fin_artesanal',        label: 'Fio artesanal (crochê/tricô)', desc: 'Novelo para uso manual ou semimecanizado' },
                      ].map(item => {
                        const sel = form.fiosFinalidade.includes(item.value);
                        return (
                          <label key={item.value} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all
                            ${sel ? 'bg-teal-50 border-teal-400' : 'border-border hover:border-teal-200 hover:bg-teal-50/30'}`}>
                            <Checkbox checked={sel} onCheckedChange={() => toggle('fiosFinalidade', item.value)} className="mt-0.5 shrink-0" />
                            <div>
                              <p className={`text-xs font-medium leading-snug ${sel ? 'text-teal-700' : ''}`}>{item.label}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Serviços de Facção / Private Label */}
              {isFaccao && (
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Factory className="w-4 h-4" /> O que sua facção oferece
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Marque todos os serviços que você executa</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { value: 'modelagem',   label: 'Modelagem',            desc: 'A partir de mockup ou ficha técnica' },
                      { value: 'risco',       label: 'Risco',                desc: 'Encaixe e risco para o corte' },
                      { value: 'corte',       label: 'Corte',                desc: 'Corte do tecido' },
                      { value: 'bordado',     label: 'Bordado',              desc: 'Bordado na peça' },
                      { value: 'estamparia',  label: 'Estamparia',           desc: 'Qualquer técnica de estampa' },
                      { value: 'lavanderia',  label: 'Lavanderia',           desc: 'Tratamento da peça' },
                      { value: 'acabamento',  label: 'Acabamento',           desc: 'Passadoria, etiquetagem, etc.' },
                      { value: 'embalagem',   label: 'Embalagem',            desc: 'Entrega embalada e etiquetada' },
                    ].map(s => {
                      const sel = form.faccaoServicos.includes(s.value);
                      return (
                        <label key={s.value} className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                          ${sel ? 'bg-violet-50 border-violet-400' : 'border-border hover:border-violet-200 hover:bg-violet-50/40'}`}>
                          <Checkbox checked={sel} onCheckedChange={() => toggle('faccaoServicos', s.value)} className="mt-0.5 shrink-0" />
                          <div>
                            <p className={`text-sm font-medium leading-snug ${sel ? 'text-violet-700' : ''}`}>{s.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{s.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Estrutura de produção */}
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estrutura de produção</p>
                    <p className="text-xs text-muted-foreground">Como você executa esses serviços?</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {[
                        { value: 'interna',       label: 'Toda interna',       desc: 'Tudo feito na própria estrutura' },
                        { value: 'terceirizada',  label: 'Toda terceirizada',  desc: 'Parceiros externos para todos os processos' },
                        { value: 'mista',         label: 'Mista / Parcial',    desc: 'Parte interna, parte com parceiros' },
                      ].map(e => (
                        <label key={e.value} className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all flex-1
                          ${form.faccaoEstrutura === e.value ? 'bg-emerald-50 border-emerald-400' : 'border-border hover:border-emerald-200 hover:bg-emerald-50/40'}`}>
                          <input
                            type="radio"
                            name="faccaoEstrutura"
                            value={e.value}
                            checked={form.faccaoEstrutura === e.value}
                            onChange={() => set('faccaoEstrutura', e.value)}
                            className="mt-0.5 shrink-0 accent-emerald-600"
                          />
                          <div>
                            <p className={`text-sm font-medium leading-snug ${form.faccaoEstrutura === e.value ? 'text-emerald-700' : ''}`}>{e.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{e.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Maquinário — só para Oficina de Costura (sem Facção/PL) */}
              {maqFiltradas.length > 0 && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Maquinário</h3>
                    <p className="text-xs text-muted-foreground mt-1">Marque todas as máquinas que sua oficina possui</p>
                  </div>

                  {showGrupos ? (
                    /* Com grupos: quando há mistura de tipos (ex: costura + bordado) */
                    <div className="space-y-4">
                      {Array.from(new Set(maqFiltradas.map(m => m.grupo))).map(grupo => {
                        const maqsDoGrupo = maqFiltradas.filter(m => m.grupo === grupo);
                        return (
                          <div key={grupo}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                              <span className="h-px flex-1 bg-border" />
                              {grupo}
                              <span className="h-px flex-1 bg-border" />
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {maqsDoGrupo.map(m => (
                                <label key={m.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                                  ${form.maquinas.includes(m.id) ? 'bg-amber-50 border-amber-400 text-amber-800 font-medium' : 'border-border hover:border-amber-200 hover:bg-amber-50/40'}`}>
                                  <Checkbox checked={form.maquinas.includes(m.id)} onCheckedChange={() => toggle('maquinas', m.id)} />
                                  <span className="text-sm leading-tight">{m.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Lista plana — sem separações de grupo */
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {maqFiltradas.map(m => (
                        <label key={m.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                          ${form.maquinas.includes(m.id) ? 'bg-amber-50 border-amber-400 text-amber-800 font-medium' : 'border-border hover:border-amber-200 hover:bg-amber-50/40'}`}>
                          <Checkbox checked={form.maquinas.includes(m.id)} onCheckedChange={() => toggle('maquinas', m.id)} />
                          <span className="text-sm leading-tight">{m.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sobre o negócio */}
              <div className={`rounded-2xl border p-6 space-y-3 ${isOutros ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Award className="w-4 h-4" /> Sobre o seu negócio
                  {isOutros && <span className="text-xs font-normal normal-case tracking-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full ml-1">Obrigatório para "Outros"</span>}
                </h3>
                {isOutros && (
                  <p className="text-xs text-amber-700 -mt-1">
                    Descreva o tipo de serviço que você oferece. Isso nos ajuda a entender melhor seu negócio e, se houver demanda, criaremos campos específicos para você.
                  </p>
                )}
                <Textarea
                  placeholder={isOutros
                    ? 'Ex: Faço sublimação em tecido sintético, atendo facções de uniformes esportivos...'
                    : 'Ex: Somos uma oficina de costura em SP com 10 anos de experiência. Trabalhamos com malha fitness e moda casual. Atendemos marcas de pequeno e médio porte...'}
                  rows={isOutros ? 5 : 4}
                  value={form.additionalInfo}
                  onChange={e => set('additionalInfo', e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Quanto mais detalhar, maiores as chances de aprovação</p>
              </div>

              {/* Fotos e Vídeos */}
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Fotos e Vídeos do Estabelecimento
                    <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground ml-1">(opcional)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fachada, ambiente interno, maquinário, área de produção — quanto mais completo, mais confiança você passa. Até 8 arquivos (fotos ou vídeos).
                  </p>
                </div>

                {/* Grid de arquivos adicionados */}
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaFiles.map(item => (
                      <div key={item.id} className="relative group rounded-xl border overflow-hidden bg-slate-50">
                        {/* Preview */}
                        <div className="aspect-video flex items-center justify-center bg-slate-100 relative">
                          {item.preview ? (
                            <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                          ) : item.file.type.startsWith('video/') ? (
                            <div className="flex flex-col items-center gap-1 text-slate-400">
                              <Video className="w-8 h-8" />
                              <span className="text-xs truncate max-w-[80px]">{item.file.name}</span>
                            </div>
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                          )}

                          {/* Loading overlay */}
                          {item.uploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                          )}

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeMedia(item.id)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>

                          {/* Upload error */}
                          {item.error && (
                            <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                              <p className="text-white text-xs font-medium px-2 text-center">{item.error}</p>
                            </div>
                          )}
                        </div>

                        {/* Tipo selector */}
                        <div className="p-1.5">
                          <select
                            value={item.type}
                            onChange={e => setMediaFiles(prev => prev.map(f => f.id === item.id ? { ...f, type: e.target.value as MediaType } : f))}
                            className="w-full text-xs rounded-lg border px-2 py-1 bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400"
                          >
                            <option value="fachada">📍 Fachada</option>
                            <option value="interno">🏭 Interno</option>
                            <option value="maquinario">⚙️ Maquinário</option>
                            <option value="outro">📁 Outro</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão de adicionar */}
                {mediaFiles.length < 8 && (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-violet-200 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/40 transition-colors text-center">
                    <Upload className="w-6 h-6 text-violet-400" />
                    <div>
                      <p className="text-sm font-medium text-violet-700">Adicionar fotos ou vídeos</p>
                      <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, MP4, MOV · Máx. {8 - mediaFiles.length} arquivo{8 - mediaFiles.length !== 1 ? 's' : ''} restante{8 - mediaFiles.length !== 1 ? 's' : ''}</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={e => addMediaFiles(e.target.files)}
                    />
                  </label>
                )}

                {mediaFiles.length >= 8 && (
                  <p className="text-xs text-center text-muted-foreground">Limite de 8 arquivos atingido</p>
                )}
              </div>
            </div>

            {/* === Sidebar === */}
            <div className="space-y-6">

              {/* Capacidade + Qtd Mínima */}
              <div className="bg-white rounded-2xl border p-5 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Factory className="w-4 h-4" /> Capacidade
                </h3>
                {isProducao && (
                  <div className="space-y-1.5">
                    <Label>Produção diária <span className="text-destructive">*</span></Label>
                    <Select value={form.productionCapacity} onValueChange={v => { set('productionCapacity', v); setFieldErrors(p => ({ ...p, productionCapacity: '' })); }}>
                      <SelectTrigger className={fieldErrors.productionCapacity ? 'border-destructive' : ''}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {CAPACIDADES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {fieldErrors.productionCapacity && <p className="text-xs text-destructive">{fieldErrors.productionCapacity}</p>}
                  </div>
                )}
                <div className="space-y-2" data-field-error={!!fieldErrors.qtdMinima || undefined}>
                  <Label>Lote mínimo por modelo <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground -mt-1">Menor quantidade que você aceita por referência/modelo</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {LOTE_MINIMO.map(op => {
                      const sel = form.qtdMinima === op.value;
                      return (
                        <label key={op.value} className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all
                          ${sel ? 'bg-violet-50 border-violet-400' : fieldErrors.qtdMinima ? 'border-destructive/40 hover:border-violet-200' : 'border-border hover:border-violet-200 hover:bg-violet-50/30'}`}>
                          <input
                            type="radio"
                            name="qtdMinima"
                            value={op.value}
                            checked={sel}
                            onChange={() => { set('qtdMinima', op.value); setFieldErrors(p => ({ ...p, qtdMinima: '' })); }}
                            className="accent-violet-600 shrink-0"
                          />
                          <div className="flex items-center justify-between w-full gap-2 min-w-0">
                            <span className={`text-sm font-medium ${sel ? 'text-violet-700' : ''}`}>{op.label}</span>
                            <span className={`text-xs shrink-0 px-2 py-0.5 rounded-full font-medium
                              ${sel ? 'bg-violet-100 text-violet-600' : 'bg-muted text-muted-foreground'}`}>
                              {op.badge}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.qtdMinima && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.qtdMinima}</p>
                  )}
                </div>
              </div>

              {/* Resumo do que foi selecionado */}
              {(form.tiposOficina.length > 0 || form.linhas.length > 0 || form.familias.length > 0 || form.maquinas.length > 0 || form.personalizacao.length > 0) && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-3 text-sm">
                  <p className="font-semibold text-violet-700">Resumo do cadastro</p>
                  {form.tiposOficina.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Tipo</p>
                      <p className="text-xs">{form.tiposOficina.join(', ')}</p>
                    </div>
                  )}
                  {form.linhas.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Linha</p>
                      <div className="flex gap-1 flex-wrap">
                        {form.linhas.map(l => (
                          <span key={l} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium capitalize">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {form.familias.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Famílias ({form.familias.length})</p>
                      <div className="flex gap-1 flex-wrap">
                        {form.familias.map(f => (
                          <span key={f} className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{f.split('/')[0].trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {form.maquinas.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Máquinas ({form.maquinas.length})</p>
                      <p className="text-xs text-muted-foreground">
                        {form.maquinas.map(id => MAQUINARIO.find(m => m.id === id)?.label ?? id).join(' · ')}
                      </p>
                    </div>
                  )}
                </div>
              )}


              {/* Erro */}
              {erro && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3">{erro}</div>
              )}

              {/* Submit */}
              <div className="space-y-3">
                <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 text-base font-semibold">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <>Enviar Cadastro para Análise</>}
                </Button>
                <Link href="/hub/comunidade/fornecedores">
                  <Button type="button" variant="outline" className="w-full">Cancelar</Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground leading-relaxed">Seus dados são usados apenas para contato e análise do perfil.</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
