import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { apiFetch } from '@/lib/api';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import ComunidadeNav from '@/components/comunidade/ComunidadeNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  SeloVerificadoCompacto, SeloRecomendadoCompacto,
  SeloVerificado, SeloRecomendado
} from '@/components/comunidade/SelosR2PB';
import {
  Search, Star, MapPin, Filter, X, Loader2, Users,
  Navigation, Crosshair, ChevronDown, Info, Tag, UserPlus,
  CheckCircle, Award
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Especialidade { name: string; code: string; }
interface Localidade { label: string; cidade: string | null; bairro: string | null; estado: string | null; lat: string | null; lng: string | null; }
interface Fornecedor {
  id: string;
  professionalTitle: string | null;
  areaOfExpertise: string | null;
  bio: string | null;
  profilePhoto: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  averageRating: string | null;
  totalReviews: number;
  verifiedByAdmin: boolean;
  recommendedByAdmin: boolean;
  isPrivateLabel: boolean;
  productionCapacity: string | null;
  specialties: Especialidade[];
}

const CATEGORIAS = ['Todos', 'Estamparia', 'Bordado', 'Costura', 'Modelagem', 'Corte', 'Acabamento', 'Lavanderia', 'Tecidos'];

const CAPACIDADES = [
  { label: 'Qualquer capacidade', value: '' },
  { label: 'Até 30 peças/dia', value: 'ate_30' },
  { label: '30 a 70 peças/dia', value: '30_70' },
  { label: '70 a 200 peças/dia', value: '70_200' },
  { label: '200 a 500 peças/dia', value: '200_500' },
  { label: 'Acima de 500 peças/dia', value: '500_mais' },
];

const LOTE_MINIMO_FILTRO = [
  { label: 'Qualquer lote mínimo por modelo', value: '' },
  { label: 'A partir de 1 peça/modelo', value: '1_5' },
  { label: 'A partir de 6 peças/modelo', value: '6_12' },
  { label: 'A partir de 13 peças/modelo', value: '13_30' },
  { label: 'A partir de 31 peças/modelo', value: '31_60' },
  { label: 'A partir de 61 peças/modelo', value: '61_120' },
  { label: 'A partir de 121 peças/modelo', value: '121_300' },
  { label: 'A partir de 301 peças/modelo', value: '301_600' },
];

const MIN_RATINGS = [
  { label: 'Todas', value: '0' },
  { label: '3+ estrelas', value: '3' },
  { label: '4+ estrelas', value: '4' },
  { label: '4.5+ estrelas', value: '4.5' },
];

const RAIOS = [5, 10, 25, 50, 100];

function capacidadeLabel(val: string | null): string {
  if (!val) return '';
  return CAPACIDADES.find(c => c.value === val)?.label ?? val;
}

export default function ComunidadeFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [minRating, setMinRating] = useState('0');
  const [capacidade, setCapacidade] = useState('');
  const [loteMinimo, setLoteMinimo] = useState('');
  const [privateLabel, setPrivateLabel] = useState(false);
  const [somenteVerificados, setSomenteVerificados] = useState(false);
  const [somenteRecomendados, setSomenteRecomendados] = useState(false);

  // Localidade (texto + autocomplete)
  const [localidadeInput, setLocalidadeInput] = useState('');
  const [localidadeFiltro, setLocalidadeFiltro] = useState('');
  const [localidadeSugestoes, setLocalidadeSugestoes] = useState<Localidade[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const localidadeRef = useRef<HTMLDivElement>(null);

  // Geolocalização + raio
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [raio, setRaio] = useState(25);
  const [geoAtivo, setGeoAtivo] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoErro, setGeoErro] = useState('');

  const filtrosAtivos = [
    categoria !== 'Todos',
    minRating !== '0',
    capacidade !== '',
    loteMinimo !== '',
    privateLabel,
    somenteVerificados,
    somenteRecomendados,
    localidadeFiltro !== '',
    geoAtivo,
  ].filter(Boolean).length;

  // Autocomplete de localidade
  const buscarLocalidades = useCallback(async (q: string) => {
    if (q.length < 2) { setLocalidadeSugestoes([]); return; }
    try {
      const data = await apiFetch(`/comunidade/fornecedores/localidades?q=${encodeURIComponent(q)}`);
      setLocalidadeSugestoes(data || []);
      setShowSugestoes(true);
    } catch { setLocalidadeSugestoes([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscarLocalidades(localidadeInput), 300);
    return () => clearTimeout(t);
  }, [localidadeInput, buscarLocalidades]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (localidadeRef.current && !localidadeRef.current.contains(e.target as Node)) {
        setShowSugestoes(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Carregar fornecedores
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (busca) qs.set('busca', busca);
      if (minRating !== '0') qs.set('minRating', minRating);
      if (capacidade) qs.set('capacidade', capacidade);
      if (loteMinimo) qs.set('loteMinimo', loteMinimo);
      if (privateLabel) qs.set('privateLabel', 'true');
      if (somenteVerificados) qs.set('somenteVerificados', 'true');
      if (somenteRecomendados) qs.set('somenteRecomendados', 'true');
      if (localidadeFiltro) qs.set('localidade', localidadeFiltro);
      if (geoAtivo && userLat !== null && userLng !== null) {
        qs.set('lat', String(userLat));
        qs.set('lng', String(userLng));
        qs.set('raio', String(raio));
      }

      const data = await apiFetch(`/comunidade/fornecedores?${qs}`);
      let result: Fornecedor[] = data || [];

      // Filtro de categoria no frontend (por especialidade)
      if (categoria !== 'Todos') {
        result = result.filter(f =>
          f.specialties?.some(s => s.name?.toLowerCase().includes(categoria.toLowerCase()))
        );
      }

      setFornecedores(result);
    } catch {
      setFornecedores([]);
    } finally {
      setLoading(false);
    }
  }, [busca, minRating, capacidade, loteMinimo, privateLabel, somenteVerificados, somenteRecomendados, localidadeFiltro, geoAtivo, userLat, userLng, raio, categoria]);

  useEffect(() => { load(); }, [load]);

  const limparFiltros = () => {
    setBusca('');
    setCategoria('Todos');
    setMinRating('0');
    setCapacidade('');
    setLoteMinimo('');
    setPrivateLabel(false);
    setSomenteVerificados(false);
    setSomenteRecomendados(false);
    setLocalidadeInput('');
    setLocalidadeFiltro('');
    setGeoAtivo(false);
    setUserLat(null);
    setUserLng(null);
    setRaio(25);
    setGeoErro('');
  };

  const ativarGeolocalizacao = () => {
    if (!navigator.geolocation) { setGeoErro('Geolocalização não suportada neste browser.'); return; }
    setGeoLoading(true);
    setGeoErro('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGeoAtivo(true);
        setGeoLoading(false);
        // Limpa filtro de texto ao ativar geo
        setLocalidadeInput('');
        setLocalidadeFiltro('');
      },
      () => {
        setGeoErro('Não foi possível obter sua localização. Verifique as permissões do browser.');
        setGeoLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const desativarGeo = () => {
    setGeoAtivo(false);
    setUserLat(null);
    setUserLng(null);
    setGeoErro('');
  };

  return (
    <KanbanLayout>
      <ComunidadeNav />
      <div className="p-6 space-y-5 w-full">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-600" />
              Fornecedores
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? 'Carregando...' : `${fornecedores.length} fornecedor${fornecedores.length !== 1 ? 'es' : ''} encontrado${fornecedores.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(v => !v)}
            className={showFilters ? 'border-violet-500 text-violet-700' : ''}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtros
            {filtrosAtivos > 0 && (
              <Badge className="ml-2 bg-violet-600 text-white text-xs px-1.5 py-0">{filtrosAtivos}</Badge>
            )}
            <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Busca principal */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 max-w-lg"
            placeholder="Buscar por nome, especialidade ou descrição..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <Card className="border-violet-100">
            <CardContent className="p-5 space-y-5">

              {/* Linha 1: Categoria + Avaliação + Capacidade */}
              <div className="flex flex-wrap gap-5 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categoria</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliação mínima</Label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MIN_RATINGS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Capacidade produtiva</Label>
                  <Select value={capacidade} onValueChange={setCapacidade}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Qualquer capacidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPACIDADES.map(c => (
                        <SelectItem key={c.value || 'all'} value={c.value || 'all'}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lote mínimo por modelo</Label>
                  <Select value={loteMinimo} onValueChange={setLoteMinimo}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Qualquer lote mínimo" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOTE_MINIMO_FILTRO.map(l => (
                        <SelectItem key={l.value || 'all'} value={l.value || 'all'}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linha 2: Localidade com autocomplete */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Localidade
                </Label>
                <div ref={localidadeRef} className="relative max-w-sm">
                  <Input
                    placeholder="Digite cidade, bairro ou estado..."
                    value={localidadeInput}
                    onChange={e => {
                      setLocalidadeInput(e.target.value);
                      if (!e.target.value) setLocalidadeFiltro('');
                    }}
                    onFocus={() => { if (localidadeSugestoes.length > 0) setShowSugestoes(true); }}
                    disabled={geoAtivo}
                    className={geoAtivo ? 'opacity-50' : ''}
                  />
                  {localidadeInput && !geoAtivo && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => { setLocalidadeInput(''); setLocalidadeFiltro(''); setLocalidadeSugestoes([]); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {showSugestoes && localidadeSugestoes.length > 0 && !geoAtivo && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {localidadeSugestoes.map((s, i) => (
                        <button
                          key={i}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 flex items-center gap-2"
                          onClick={() => {
                            setLocalidadeInput(s.label);
                            setLocalidadeFiltro(s.cidade ?? s.bairro ?? s.estado ?? s.label);
                            setShowSugestoes(false);
                          }}
                        >
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          {s.label}
                        </button>
                      ))}
                      {localidadeInput.length >= 2 && (
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 text-violet-600 font-medium border-t"
                          onClick={() => {
                            setLocalidadeFiltro(localidadeInput);
                            setShowSugestoes(false);
                          }}
                        >
                          <Search className="w-3 h-3 inline mr-1" />
                          Buscar "{localidadeInput}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {localidadeFiltro && !geoAtivo && (
                  <p className="text-xs text-violet-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Filtrando por: <strong>{localidadeFiltro}</strong>
                  </p>
                )}
              </div>

              {/* Linha 3: Raio de distância */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Crosshair className="w-3 h-3" /> Raio de distância
                </Label>
                {!geoAtivo ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={ativarGeolocalizacao}
                      disabled={geoLoading}
                      className="border-violet-200 text-violet-700 hover:bg-violet-50"
                    >
                      {geoLoading ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Obtendo localização...</>
                      ) : (
                        <><Navigation className="w-3.5 h-3.5 mr-1.5" /> Usar minha localização</>
                      )}
                    </Button>
                    {geoErro && <p className="text-xs text-destructive">{geoErro}</p>}
                    <p className="text-xs text-muted-foreground">Ativa o filtro por distância em relação à sua localização atual</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-sm">
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Localização ativa — filtrando a <strong>{raio} km</strong> de você</span>
                      <button onClick={desativarGeo} className="text-muted-foreground hover:text-destructive ml-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={RAIOS.length - 1}
                        step={1}
                        value={RAIOS.indexOf(raio) >= 0 ? RAIOS.indexOf(raio) : 2}
                        onChange={e => setRaio(RAIOS[Number(e.target.value)])}
                        className="w-full accent-violet-600"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        {RAIOS.map(r => <span key={r}>{r} km</span>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Linha 4: Checkboxes */}
              <div className="flex flex-wrap gap-6 pt-1 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={privateLabel}
                    onCheckedChange={v => setPrivateLabel(Boolean(v))}
                  />
                  <span className="text-sm flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-violet-500" />
                    Aceita Private Label
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                        <p className="font-semibold mb-1">O que é Private Label?</p>
                        <p>O fornecedor produz as peças sem marca própria, permitindo que você venda com a <strong>sua etiqueta e marca</strong>. Ideal para quem quer criar uma linha autoral sem ter fábrica própria.</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={somenteVerificados}
                    onCheckedChange={v => setSomenteVerificados(Boolean(v))}
                  />
                  <span className="text-sm flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Somente Verificados R2PB
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={somenteRecomendados}
                    onCheckedChange={v => setSomenteRecomendados(Boolean(v))}
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Somente Recomendados R2PB
                  </span>
                </label>
              </div>

              {/* Limpar filtros */}
              {filtrosAtivos > 0 && (
                <div className="pt-1">
                  <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-muted-foreground h-7 px-2">
                    <X className="w-3.5 h-3.5 mr-1" /> Limpar todos os filtros ({filtrosAtivos})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tags de filtros ativos (resumo rápido) */}
        {filtrosAtivos > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2">
            {categoria !== 'Todos' && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCategoria('Todos')}>
                {categoria} <X className="w-3 h-3" />
              </Badge>
            )}
            {minRating !== '0' && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setMinRating('0')}>
                {minRating}+ ★ <X className="w-3 h-3" />
              </Badge>
            )}
            {capacidade && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCapacidade('')}>
                {capacidadeLabel(capacidade)} <X className="w-3 h-3" />
              </Badge>
            )}
            {localidadeFiltro && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setLocalidadeInput(''); setLocalidadeFiltro(''); }}>
                <MapPin className="w-3 h-3" /> {localidadeFiltro} <X className="w-3 h-3" />
              </Badge>
            )}
            {geoAtivo && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={desativarGeo}>
                <Navigation className="w-3 h-3" /> {raio} km <X className="w-3 h-3" />
              </Badge>
            )}
            {privateLabel && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setPrivateLabel(false)}>
                Private Label <X className="w-3 h-3" />
              </Badge>
            )}
            {somenteVerificados && (
              <button onClick={() => setSomenteVerificados(false)} className="flex items-center gap-1 group">
                <SeloVerificado size="sm" />
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            )}
            {somenteRecomendados && (
              <button onClick={() => setSomenteRecomendados(false)} className="flex items-center gap-1 group">
                <SeloRecomendado size="sm" />
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Grid de resultados */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : fornecedores.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-lg">Nenhum fornecedor encontrado</p>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou ampliar o raio de busca.</p>
            <Button variant="outline" size="sm" onClick={limparFiltros}>Limpar filtros</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {fornecedores.map(f => (
              <Card key={f.id} className="overflow-hidden hover:shadow-lg transition-all group border">
                {/* Foto / Banner */}
                <div className="h-36 bg-gradient-to-br from-violet-100 to-purple-200 relative overflow-hidden">
                  {f.profilePhoto && (
                    <img src={f.profilePhoto} alt={f.professionalTitle ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {f.recommendedByAdmin && <SeloRecomendadoCompacto />}
                    {f.verifiedByAdmin && <SeloVerificadoCompacto />}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-white/90 rounded-full px-2 py-0.5 flex items-center gap-1 text-sm font-bold shadow">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {Number(f.averageRating || 0).toFixed(1)}
                  </div>
                  {f.isPrivateLabel && (
                    <div className="absolute bottom-2 left-2 bg-violet-600/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Private Label
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-base leading-tight">{f.professionalTitle || 'Fornecedor'}</h3>
                    {f.areaOfExpertise && <p className="text-xs text-muted-foreground mt-0.5">{f.areaOfExpertise}</p>}
                  </div>

                  {f.bio && <p className="text-xs text-muted-foreground line-clamp-2">{f.bio}</p>}

                  {f.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {f.specialties.slice(0, 3).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s.name}</Badge>
                      ))}
                      {f.specialties.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{f.specialties.length - 3}</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[f.bairro, f.cidade, f.estado].filter(Boolean).join(', ') || 'Localização não informada'}
                    </span>
                    <span>{f.totalReviews} {f.totalReviews !== 1 ? 'avaliações' : 'avaliação'}</span>
                  </div>

                  {f.productionCapacity && (
                    <p className="text-xs text-muted-foreground">
                      Capacidade: <span className="font-medium text-foreground">{capacidadeLabel(f.productionCapacity)}</span>
                    </p>
                  )}

                  <Link href={`/hub/comunidade/fornecedores/${f.id}`}>
                    <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700 mt-1">
                      Ver Perfil
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CTA — Cadastre-se na comunidade */}
        <div className="mt-8 rounded-2xl border bg-gradient-to-br from-violet-50 to-emerald-50 dark:from-violet-950/30 dark:to-emerald-950/30 p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-violet-600" />
              Faça parte da Moda Conecta
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Seja você um fornecedor que quer aparecer no diretório, ou uma confecção procurando parceiros — cadastre-se gratuitamente.
            </p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link href={`/hub/comunidade/cadastro-fornecedor${categoria !== 'Todos' ? `?tipo=${encodeURIComponent(categoria)}` : ''}`}>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white text-sm">
                Sou Fornecedor
              </Button>
            </Link>
            <Link href="/hub/comunidade/cadastro-cliente">
              <Button variant="outline" className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-sm">
                Sou Confeccionista
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </KanbanLayout>
  );
}
