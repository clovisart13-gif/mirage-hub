import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle, ArrowLeft, MapPin, User, Mail, Phone, Loader2,
  Search, ShoppingBag, Tag, Home, Instagram, Globe, Store,
  Shirt, Package
} from 'lucide-react';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const TIPOS_PERFIL = [
  { value: 'dono_marca',   label: 'Dono(a) de Marca',    icon: '🏷️', desc: 'Marca própria, coleções, private label' },
  { value: 'lojista',      label: 'Lojista',              icon: '🏪', desc: 'Loja física, multimarca, boutique' },
  { value: 'revendedor',   label: 'Revendedor(a)',         icon: '🛍️', desc: 'Revenda, atacado, distribuidora' },
  { value: 'estilista',    label: 'Estilista / Designer',  icon: '✂️', desc: 'Criação e produção própria' },
  { value: 'confeccionista', label: 'Confeccionista',      icon: '🧵', desc: 'Busca parceiros e insumos' },
  { value: 'outro',        label: 'Outro',                 icon: '💼', desc: 'Outro tipo de negócio têxtil' },
];

const SEGMENTOS = [
  'Moda Feminina', 'Moda Masculina', 'Moda Infantil', 'Moda Íntima / Lingerie',
  'Moda Praia / Fitness', 'Jeanswear', 'Moda Evangélica', 'Moda Plus Size',
  'Moda Festa / Noiva', 'Uniformes / Workwear', 'Streetwear / Urban', 'Moda Pet',
];

const LOTE_MODELO = [
  { value: '1_5',      label: '1 a 5 peças/modelo',       badge: 'Sob medida' },
  { value: '6_12',     label: '6 a 12 peças/modelo',      badge: 'Micro série' },
  { value: '13_30',    label: '13 a 30 peças/modelo',     badge: 'Pequena série' },
  { value: '31_60',    label: '31 a 60 peças/modelo',     badge: 'Piloto' },
  { value: '61_120',   label: '61 a 120 peças/modelo',    badge: 'Pequena marca' },
  { value: '121_300',  label: '121 a 300 peças/modelo',   badge: 'Em crescimento' },
  { value: '301_600',  label: '301 a 600 peças/modelo',   badge: 'Média produção' },
  { value: '601_1000', label: '601 a 1.000 peças/modelo', badge: 'Consolidada' },
  { value: '1000_mais',label: 'Acima de 1.000/modelo',    badge: 'Grande produção' },
];

const VOLUME_MENSAL = [
  { label: 'Até 500 peças/mês',           value: 'ate_500' },
  { label: '500 a 2.000 peças/mês',        value: '500_2000' },
  { label: '2.000 a 10.000 peças/mês',     value: '2000_10000' },
  { label: '10.000 a 50.000 peças/mês',    value: '10000_50000' },
  { label: 'Acima de 50.000 peças/mês',    value: '50000_mais' },
];

const SERVICOS = [
  'Facção Completa', 'Costura', 'Bordado', 'Estamparia', 'Modelagem',
  'Corte', 'Lavanderia', 'Tecidos e Malhas', 'Aviamentos', 'Embalagem & Etiquetagem',
  'Private Label / Marca Própria', 'Tinturaria / Beneficiamento',
];

const BADGE_COLORS: Record<string, string> = {
  'Sob medida':    'bg-violet-100 text-violet-700',
  'Micro série':   'bg-blue-100 text-blue-700',
  'Pequena série': 'bg-cyan-100 text-cyan-700',
  'Piloto':        'bg-teal-100 text-teal-700',
  'Pequena marca': 'bg-emerald-100 text-emerald-700',
  'Em crescimento':'bg-green-100 text-green-700',
  'Média produção':'bg-amber-100 text-amber-700',
  'Consolidada':   'bg-orange-100 text-orange-700',
  'Grande produção':'bg-red-100 text-red-700',
};

export default function CadastroComunidadeCliente() {
  const [step, setStep] = useState<'form' | 'sucesso'>('form');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  // Prefill via query params (enviados pelo Pipeline de Curadoria)
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

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
          name:      p.pf_name      || prev.name,
          nomeMarca: p.pf_marca     || prev.nomeMarca,
          email:     p.pf_email     || prev.email,
          phone:     p.pf_phone     || prev.phone,
          instagram: p.pf_instagram || prev.instagram,
          cep:       p.pf_cep       || prev.cep,
          bairro:    p.pf_bairro    || prev.bairro,
          cidade:    p.pf_cidade    || prev.cidade,
          estado:    p.pf_estado    || prev.estado,
        }));
      })
      .catch(() => {/* fallback para ?pf_* direto se existirem */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState({
    // Tipo de perfil
    tiposPerfil: [] as string[],

    // Dados pessoais / empresa
    name:      sp.get('pf_name')    ?? '',
    nomeMarca: sp.get('pf_marca')   ?? '',
    email:     sp.get('pf_email')   ?? '',
    phone:     sp.get('pf_phone')   ?? '',
    site:      '',
    instagram: sp.get('pf_instagram') ?? '',

    // Localização
    cep:    sp.get('pf_cep')    ?? '',
    bairro: sp.get('pf_bairro') ?? '',
    cidade: sp.get('pf_cidade') ?? '',
    estado: sp.get('pf_estado') ?? '',

    // O que procura
    segmentos: [] as string[],
    loteModelo: '',
    volumeMensal: '',
    servicos: [] as string[],
    additionalInfo: '',
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleItem = (field: 'tiposPerfil' | 'segmentos' | 'servicos', val: string) => {
    setForm(f => ({
      ...f,
      [field]: (f[field] as string[]).includes(val)
        ? (f[field] as string[]).filter(x => x !== val)
        : [...(f[field] as string[]), val],
    }));
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
    if (!form.name.trim() || !form.email.trim()) {
      setErro('Nome e e-mail são obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const loteLabel = LOTE_MODELO.find(l => l.value === form.loteModelo)?.label;
      const volLabel  = VOLUME_MENSAL.find(v => v.value === form.volumeMensal)?.label;

      const linhas = [
        form.tiposPerfil.length   ? `Perfil: ${form.tiposPerfil.map(t => TIPOS_PERFIL.find(p => p.value === t)?.label).join(', ')}` : '',
        form.nomeMarca            ? `Marca/loja: ${form.nomeMarca}` : '',
        form.site                 ? `Site: ${form.site}` : '',
        form.instagram            ? `Instagram: ${form.instagram}` : '',
        form.segmentos.length     ? `Segmentos: ${form.segmentos.join(', ')}` : '',
        loteLabel                 ? `Lote típico por modelo: ${loteLabel}` : '',
        volLabel                  ? `Volume mensal estimado: ${volLabel}` : '',
        form.servicos.length      ? `Serviços buscados: ${form.servicos.join(', ')}` : '',
        form.bairro               ? `Bairro: ${form.bairro}` : '',
        form.additionalInfo       ? `\nDetalhes: ${form.additionalInfo}` : '',
      ].filter(Boolean).join('\n');

      await apiFetch('/comunidade/pre-cadastro', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: 'mirage', // cadastro de cliente é feature do Hub Mirage, não da R2PB privada
          userType: 'cliente',
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          cidade: form.cidade.trim() || undefined,
          estado: form.estado || undefined,
          additionalInfo: linhas || undefined,
          source: 'cadastro-cliente',
        }),
      });
      setStep('sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar cadastro. Tente novamente.';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Tela de sucesso ─── */
  if (step === 'sucesso') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cadastro recebido!</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Nossa equipe vai analisar seu perfil e entrar em contato pelo e-mail informado para indicar os melhores fornecedores da Moda Conecta para o seu negócio.
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-left space-y-2">
            <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <Search className="w-4 h-4" /> Enquanto isso...
            </p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Explore o diretório de fornecedores verificados</li>
              <li>Filtre por especialidade, localização e lote mínimo</li>
              <li>Veja perfis e avaliações de outros clientes</li>
            </ul>
          </div>
          <Link href="/hub/comunidade/fornecedores">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Explorar Fornecedores Agora</Button>
          </Link>
          <Link href="/hub/comunidade">
            <Button variant="outline" className="w-full">Voltar para a Comunidade</Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Formulário ─── */
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
            <h1 className="font-bold text-sm sm:text-base text-foreground truncate">Quero Encontrar Fornecedores</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Moda Conecta — Cadastro de Comprador / Marca</p>
          </div>
        </div>
      </div>

      {/* Sticky submit bar — mobile only */}
      <div className="fixed bottom-0 inset-x-0 z-20 lg:hidden bg-white border-t shadow-lg px-4 py-3">
        <button
          type="submit"
          form="cliente-form"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : 'Quero Encontrar Fornecedores'}
        </button>
      </div>

      <div className="px-4 sm:px-6 py-6 sm:py-8 pb-28 lg:pb-8 max-w-6xl mx-auto">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-xl">Conecte-se com os melhores fornecedores têxteis</h2>
                <p className="text-emerald-100 text-sm mt-1 leading-relaxed max-w-lg">
                  Preencha seu perfil e nossa equipe te indica fornecedores verificados R2PB adequados ao seu volume, segmento e localização — sem custo e sem intermediários.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-6 lg:border-l lg:border-white/20 lg:pl-6 text-center shrink-0">
              <div><p className="text-2xl font-bold">500+</p><p className="text-xs text-emerald-200">fornecedores na rede</p></div>
              <div><p className="text-2xl font-bold">Grátis</p><p className="text-xs text-emerald-200">sem custo pra você</p></div>
              <div><p className="text-2xl font-bold">Direto</p><p className="text-xs text-emerald-200">sem intermediários</p></div>
            </div>
          </div>
        </div>

        <form id="cliente-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Coluna principal ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Tipo de perfil */}
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Store className="w-4 h-4" /> Meu Perfil <span className="text-xs font-normal normal-case tracking-normal">(selecione todos que se aplicam)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {TIPOS_PERFIL.map(tp => {
                    const selecionado = form.tiposPerfil.includes(tp.value);
                    return (
                      <button
                        key={tp.value}
                        type="button"
                        onClick={() => toggleItem('tiposPerfil', tp.value)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${selecionado ? 'border-emerald-500 bg-emerald-50' : 'border-border hover:border-emerald-200 bg-white'}`}
                      >
                        <span className="text-xl">{tp.icon}</span>
                        <p className={`font-semibold text-sm mt-1 ${selecionado ? 'text-emerald-700' : 'text-foreground'}`}>{tp.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{tp.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dados pessoais / empresa */}
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <User className="w-4 h-4" /> Seus Dados
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Seu nome <span className="text-destructive">*</span></Label>
                    <Input id="name" placeholder="Ex: Maria Silva" value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nomeMarca" className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Nome da marca / loja
                    </Label>
                    <Input id="nomeMarca" placeholder="Ex: Fashion Brand, Loja da Maria..." value={form.nomeMarca} onChange={e => set('nomeMarca', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> E-mail <span className="text-destructive">*</span>
                    </Label>
                    <Input id="email" type="email" placeholder="seu@email.com.br" value={form.email} onChange={e => set('email', e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> WhatsApp / Telefone
                    </Label>
                    <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="site" className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Site
                    </Label>
                    <Input id="site" type="url" placeholder="https://suamarca.com.br" value={form.site} onChange={e => set('site', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="instagram" className="flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </Label>
                    <div className="flex items-center">
                      <span className="bg-muted border border-r-0 rounded-l-md px-3 py-2 text-sm text-muted-foreground">@</span>
                      <Input
                        id="instagram"
                        placeholder="suamarca"
                        value={form.instagram}
                        onChange={e => set('instagram', e.target.value.replace('@', ''))}
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Localização */}
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Home className="w-4 h-4" /> Onde você está?
                  <span className="text-xs font-normal text-muted-foreground normal-case tracking-normal ml-1">(para indicarmos fornecedores próximos)</span>
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
                      {cepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-emerald-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Preenche automaticamente</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" placeholder="Ex: Centro" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" placeholder="Ex: São Paulo" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
                  </div>
                </div>
                <div className="max-w-xs">
                  <Label>Estado</Label>
                  <Select value={form.estado} onValueChange={v => set('estado', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* O que você procura */}
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Search className="w-4 h-4" /> O que você procura?
                </h3>
                <Textarea
                  placeholder="Ex: Preciso de uma facção para 800 peças de camisetas femininas em malha. Prefiro SP. Trabalho com coleções sazonais e estou lançando uma nova linha primavera/verão..."
                  rows={5}
                  value={form.additionalInfo}
                  onChange={e => set('additionalInfo', e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Quanto mais detalhar, melhor conseguimos indicar o fornecedor certo para o seu negócio</p>
              </div>
            </div>

            {/* ── Coluna lateral ── */}
            <div className="space-y-6">

              {/* Segmento de moda */}
              <div className="bg-white rounded-2xl border p-6 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Shirt className="w-4 h-4" /> Segmento de Moda
                </h3>
                <p className="text-xs text-muted-foreground">Selecione os segmentos que trabalha</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {SEGMENTOS.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-foreground">
                      <Checkbox checked={form.segmentos.includes(s)} onCheckedChange={() => toggleItem('segmentos', s)} />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lote típico por modelo */}
              <div className="bg-white rounded-2xl border p-6 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4" /> Lote Típico por Modelo
                </h3>
                <p className="text-xs text-muted-foreground leading-snug">Quantas peças você costuma pedir por referência/modelo?</p>
                <div className="space-y-2">
                  {LOTE_MODELO.map(l => {
                    const sel = form.loteModelo === l.value;
                    return (
                      <label
                        key={l.value}
                        className={`flex items-center justify-between gap-2 cursor-pointer p-2 rounded-lg border transition-all ${sel ? 'border-emerald-400 bg-emerald-50' : 'border-transparent hover:bg-muted'}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="loteModelo"
                            value={l.value}
                            checked={sel}
                            onChange={() => set('loteModelo', l.value)}
                            className="accent-emerald-600"
                          />
                          <span className="text-sm">{l.label}</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${BADGE_COLORS[l.badge] || 'bg-gray-100 text-gray-600'}`}>
                          {l.badge}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Volume mensal */}
              <div className="bg-white rounded-2xl border p-6 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Volume Mensal Total</h3>
                <Select value={form.volumeMensal} onValueChange={v => set('volumeMensal', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o volume" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLUME_MENSAL.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Serviços buscados */}
              <div className="bg-white rounded-2xl border p-6 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Serviços Buscados
                </h3>
                <p className="text-xs text-muted-foreground">Selecione todos que precisa</p>
                <div className="space-y-2">
                  {SERVICOS.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-foreground">
                      <Checkbox checked={form.servicos.includes(s)} onCheckedChange={() => toggleItem('servicos', s)} />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Info localidade */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm space-y-2">
                <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Por que o endereço?
                </p>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Usamos sua localização para indicar fornecedores próximos a você, facilitando a logística e o relacionamento direto.
                </p>
              </div>

              {/* Erro */}
              {erro && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3">
                  {erro}
                </div>
              )}

              {/* Submit */}
              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                    : 'Quero Encontrar Fornecedores'
                  }
                </Button>
                <Link href="/hub/comunidade/fornecedores">
                  <Button type="button" variant="outline" className="w-full">Cancelar</Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                  Seus dados são usados apenas para te conectar com fornecedores adequados. Não compartilhamos com terceiros.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
