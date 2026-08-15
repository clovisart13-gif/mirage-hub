import { useState, useEffect, useRef } from 'react';
import { useParams, useSearch, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { printFichaTecnica } from '@/lib/print-ficha-tecnica';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, Loader2, Printer, ImagePlus, X, FileText, Download, Paperclip } from 'lucide-react';

const GRADES = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];
const MEDIDAS_CAMPOS = ['Comprimento Total', 'Largura Ombro', 'Busto', 'Cintura', 'Quadril', 'Manga', 'Entrepernas', 'Punho'];

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  em_revisao: { label: 'Em Revisão', color: 'bg-amber-100 text-amber-700' },
  aprovada: { label: 'Aprovada', color: 'bg-green-100 text-green-700' },
} as const;

type MaoDeObraItem = { operacao: string; maquina: string; tempo_min: string; custo: string; observacao: string };
const emptyMdo = (): MaoDeObraItem => ({ operacao: '', maquina: '', tempo_min: '', custo: '', observacao: '' });

// ── Upload helper via presigned URL ──────────────────────────────────────────
async function uploadFile(file: File): Promise<string> {
  const meta = await apiFetch('/storage/uploads/request-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  await fetch(meta.uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  return `/api/storage/objects${meta.objectPath}`;
}

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i.test(url);
}

function fileLabel(url: string) {
  try {
    const parts = new URL(url, window.location.origin).pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return url.split('/').pop() ?? 'arquivo';
  }
}

export default function PLMFichaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const qc = useQueryClient();
  const isNew = id === 'nova';
  const produtoId = params.get('produto_id');

  const [titulo, setTitulo] = useState('');
  const [familia, setFamilia] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [tipoCostura, setTipoCostura] = useState('');
  const [instrucaoLavagem, setInstrucaoLavagem] = useState('');
  const [bordadoEstampa, setBordadoEstampa] = useState('');
  const [aviamentos, setAviamentos] = useState('');
  const [status, setStatus] = useState<string>('rascunho');
  const [medidas, setMedidas] = useState<Record<string, Record<string, string>>>({});
  const [componentes, setComponentes] = useState<Array<{ nome: string; descricao: string; quantidade: string }>>([]);
  const [maoDeObra, setMaoDeObra] = useState<MaoDeObraItem[]>([]);
  const [fotoPrincipalUrl, setFotoPrincipalUrl] = useState('');
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const produtoPreenchidoRef = useRef(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [printing, setPrinting] = useState(false);

  const fotoInputRef = useRef<HTMLInputElement>(null);
  const galeriaInputRef = useRef<HTMLInputElement>(null);

  const { data: ficha, isLoading } = useQuery({
    queryKey: ['plm-ficha', id],
    queryFn: () => apiFetch(`/plm/fichas/${id}`),
    enabled: !isNew && !!id,
  });

  const { data: produto } = useQuery({
    queryKey: ['plm-produto', isNew ? produtoId : ficha?.produto_id?.toString()],
    queryFn: () => apiFetch(`/plm/produtos/${isNew ? produtoId : ficha?.produto_id}`),
    enabled: !!(isNew ? produtoId : ficha?.produto_id),
  });

  const { data: clientes } = useQuery({
    queryKey: ['plm-clientes'],
    queryFn: () => apiFetch('/plm/clientes'),
  });

  const { data: empresa } = useQuery({
    queryKey: ['empresa'],
    queryFn: () => apiFetch('/tenants/empresa'),
    staleTime: 10 * 60 * 1000,
  });

  // Nova ficha a partir de um produto: pré-preenche título e cliente do produto
  useEffect(() => {
    if (isNew && produto && !produtoPreenchidoRef.current) {
      produtoPreenchidoRef.current = true;
      const prod = (produto as any)?.produto ?? produto;
      setTitulo((prod as any).nome ?? '');
      const cid = (prod as any).cliente_id;
      if (cid) setClienteId(String(cid));
    }
  }, [produto, isNew]);

  useEffect(() => {
    if (!isNew && ficha && !initialized) {
      setTitulo(ficha.titulo ?? '');
      setFamilia(ficha.familia ?? '');
      setClienteId(ficha.cliente_id ? String(ficha.cliente_id) : '');
      setObservacoes(ficha.observacoes ?? '');
      setTipoCostura(ficha.tipo_costura ?? '');
      setInstrucaoLavagem(ficha.instrucao_lavagem ?? '');
      setBordadoEstampa(ficha.bordado_estampa ?? '');
      setAviamentos(ficha.aviamentos ?? '');
      setStatus(ficha.status ?? 'rascunho');
      setMedidas((ficha.medidas as any) ?? {});
      setComponentes((ficha.componentes as any) ?? []);
      setMaoDeObra((ficha.mao_de_obra as any) ?? []);
      setFotoPrincipalUrl(ficha.foto_principal_url ?? '');
      setGaleriaUrls((ficha.galeria_urls as any) ?? []);
      setInitialized(true);
    }
  }, [ficha, isNew, initialized]);

  const save = useMutation({
    mutationFn: (data: any) => isNew
      ? apiFetch('/plm/fichas', { method: 'POST', body: JSON.stringify({ produto_id: produtoId, ...data }), headers: { 'Content-Type': 'application/json' } })
      : apiFetch(`/plm/fichas/${id}`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-fichas'] });
      qc.invalidateQueries({ queryKey: ['plm-ficha', id] });
      toast.success(isNew ? 'Ficha técnica criada!' : 'Ficha atualizada!');
      if (isNew) window.history.back();
    },
    onError: () => toast.error('Erro ao salvar ficha'),
  });

  const handleSave = () => {
    save.mutate({
      titulo, familia,
      cliente_id: clienteId || null,
      observacoes, tipo_costura: tipoCostura,
      instrucao_lavagem: instrucaoLavagem,
      bordado_estampa: bordadoEstampa,
      aviamentos, status, medidas, componentes,
      mao_de_obra: maoDeObra,
      foto_principal_url: fotoPrincipalUrl || null,
      galeria_urls: galeriaUrls.length > 0 ? galeriaUrls : null,
    });
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const clienteObj = clienteId
        ? (clientes ?? []).find((c: any) => String(c.id) === clienteId)
        : null;
      const produtoData = produto?.produto ?? produto;
      const fichaData = {
        ...ficha,
        titulo, familia, observacoes, tipo_costura: tipoCostura,
        instrucao_lavagem: instrucaoLavagem, bordado_estampa: bordadoEstampa,
        aviamentos, status, medidas, componentes, mao_de_obra: maoDeObra,
        foto_principal_url: fotoPrincipalUrl || ficha?.foto_principal_url,
        galeria_urls: galeriaUrls.length > 0 ? galeriaUrls : (ficha?.galeria_urls ?? []),
      };
      printFichaTecnica({ ficha: fichaData, produto: produtoData, cliente: clienteObj ?? null, empresa });
    } finally {
      setPrinting(false);
    }
  };

  // ── Upload foto principal ─────────────────────────────────────────────────
  const handleFotoPrincipal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const url = await uploadFile(file);
      setFotoPrincipalUrl(url);
      toast.success('Foto principal enviada');
    } catch {
      const reader = new FileReader();
      reader.onload = ev => setFotoPrincipalUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
      toast.info('Imagem carregada localmente. Salve a ficha para confirmar.');
    } finally {
      setUploadingFoto(false);
      e.target.value = '';
    }
  };

  // ── Upload galeria / artes / moldes (qualquer tipo de arquivo) ────────────
  const handleGaleria = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingFoto(true);
    try {
      const urls = await Promise.all(files.map(uploadFile));
      setGaleriaUrls(prev => [...prev, ...urls]);
      toast.success(`${urls.length} arquivo(s) adicionado(s)`);
    } catch {
      toast.error('Erro ao enviar arquivos. Tente novamente.');
    } finally {
      setUploadingFoto(false);
      e.target.value = '';
    }
  };

  const removeFotoPrincipal = () => setFotoPrincipalUrl('');
  const removeGaleria = (i: number) => setGaleriaUrls(prev => prev.filter((_, j) => j !== i));

  const setMedida = (campo: string, grade: string, val: string) =>
    setMedidas(prev => ({ ...prev, [campo]: { ...(prev[campo] ?? {}), [grade]: val } }));

  const addComponente = () => setComponentes(c => [...c, { nome: '', descricao: '', quantidade: '' }]);
  const removeComponente = (i: number) => setComponentes(c => c.filter((_, j) => j !== i));
  const updateComponente = (i: number, field: string, val: string) =>
    setComponentes(c => c.map((item, j) => j === i ? { ...item, [field]: val } : item));

  const addMdo = () => setMaoDeObra(m => [...m, emptyMdo()]);
  const removeMdo = (i: number) => setMaoDeObra(m => m.filter((_, j) => j !== i));
  const updateMdo = (i: number, field: string, val: string) =>
    setMaoDeObra(m => m.map((item, j) => j === i ? { ...item, [field]: val } : item));

  const backHref = produto ? `/hub/plm/produtos/${isNew ? produtoId : ficha?.produto_id}` : '/hub/plm/fichas';

  if (!isNew && isLoading) return (
    <PLMLayout><div className="p-6"><Skeleton className="h-64 rounded-xl" /></div></PLMLayout>
  );

  return (
    <PLMLayout>
      {/* inputs de arquivo ocultos */}
      <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoPrincipal} />
      <input ref={galeriaInputRef} type="file" accept="image/*,application/pdf,.ai,.eps,.dxf,.dwg,.cdr,.svg,.psd,.indd" multiple className="hidden" onChange={handleGaleria} />

      <div className="p-6 space-y-6 max-w-screen-lg mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href={backHref}>
              <button className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{isNew ? 'Nova Ficha Técnica' : (titulo || `Ficha Técnica v${ficha?.versao}`)}</h1>
              {produto && <p className="text-sm text-muted-foreground">Produto: {produto.produto?.nome ?? produto?.nome}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isNew && (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isNew && (
              <Button variant="outline" onClick={handlePrint} disabled={printing} className="gap-2">
                {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                Imprimir / PDF
              </Button>
            )}
            <Button onClick={handleSave} disabled={save.isPending} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="geral">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="medidas">Medidas</TabsTrigger>
            <TabsTrigger value="componentes">Componentes</TabsTrigger>
            <TabsTrigger value="mdo">Mão de Obra</TabsTrigger>
            <TabsTrigger value="imagens">Imagens</TabsTrigger>
          </TabsList>

          {/* ── Geral ─────────────────────────────────────────────────────── */}
          <TabsContent value="geral" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Título</Label>
                  <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Camiseta Básica — Verão 25" />
                </div>
                <div className="space-y-1.5">
                  <Label>Família</Label>
                  <Input value={familia} onChange={e => setFamilia(e.target.value)} placeholder="Ex: Básicos" />
                </div>
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select value={clienteId || 'none'} onValueChange={v => setClienteId(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(clientes ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Especificações</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo de costura</Label>
                  <Input value={tipoCostura} onChange={e => setTipoCostura(e.target.value)} placeholder="Ex: Overlock 3 fios + Galoneira" />
                </div>
                <div className="space-y-1.5">
                  <Label>Instrução de lavagem</Label>
                  <Input value={instrucaoLavagem} onChange={e => setInstrucaoLavagem(e.target.value)} placeholder="Ex: Lavar a 30°C" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Bordado / Estampa</Label>
                  <Textarea value={bordadoEstampa} onChange={e => setBordadoEstampa(e.target.value)} rows={2} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Aviamentos</Label>
                  <Textarea value={aviamentos} onChange={e => setAviamentos(e.target.value)} rows={2} placeholder="Ex: Etiqueta bordada, linha 120, botão..." />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Medidas ───────────────────────────────────────────────────── */}
          <TabsContent value="medidas" className="mt-4">
            <Card>
              <CardContent className="p-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground">Campo</th>
                      {GRADES.map(g => <th key={g} className="p-2 font-medium text-muted-foreground text-center">{g}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {MEDIDAS_CAMPOS.map(campo => (
                      <tr key={campo} className="border-t">
                        <td className="p-2 font-medium text-sm whitespace-nowrap">{campo}</td>
                        {GRADES.map(grade => (
                          <td key={grade} className="p-1">
                            <Input
                              className="w-16 h-7 text-xs text-center px-1"
                              value={medidas[campo]?.[grade] ?? ''}
                              onChange={e => setMedida(campo, grade, e.target.value)}
                              placeholder="—"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Componentes ───────────────────────────────────────────────── */}
          <TabsContent value="componentes" className="mt-4 space-y-3">
            {componentes.map((comp, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex gap-3 items-end">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={comp.nome} onChange={e => updateComponente(i, 'nome', e.target.value)} className="h-8 text-sm" /></div>
                    <div className="space-y-1"><Label className="text-xs">Tecido / Descrição</Label><Input value={comp.descricao} onChange={e => updateComponente(i, 'descricao', e.target.value)} className="h-8 text-sm" /></div>
                    <div className="space-y-1"><Label className="text-xs">Consumo / Qtd.</Label><Input value={comp.quantidade} onChange={e => updateComponente(i, 'quantidade', e.target.value)} className="h-8 text-sm" /></div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 shrink-0" onClick={() => removeComponente(i)}><Trash2 className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addComponente} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Adicionar componente</Button>
          </TabsContent>

          {/* ── Mão de Obra ───────────────────────────────────────────────── */}
          <TabsContent value="mdo" className="mt-4 space-y-3">
            {maoDeObra.map((mdo, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex gap-3 items-end">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Operação</Label><Input value={mdo.operacao} onChange={e => updateMdo(i, 'operacao', e.target.value)} className="h-8 text-sm" /></div>
                    <div className="space-y-1"><Label className="text-xs">Máquina</Label><Input value={mdo.maquina} onChange={e => updateMdo(i, 'maquina', e.target.value)} className="h-8 text-sm" /></div>
                    <div className="space-y-1"><Label className="text-xs">Tempo (min)</Label><Input type="number" value={mdo.tempo_min} onChange={e => updateMdo(i, 'tempo_min', e.target.value)} className="h-8 text-sm" /></div>
                    <div className="space-y-1"><Label className="text-xs">Custo (R$)</Label><Input type="number" value={mdo.custo} onChange={e => updateMdo(i, 'custo', e.target.value)} className="h-8 text-sm" /></div>
                    <div className="space-y-1 sm:col-span-3"><Label className="text-xs">Observação</Label><Input value={mdo.observacao} onChange={e => updateMdo(i, 'observacao', e.target.value)} className="h-8 text-sm" /></div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 shrink-0" onClick={() => removeMdo(i)}><Trash2 className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addMdo} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Adicionar operação</Button>
          </TabsContent>

          {/* ── Imagens ───────────────────────────────────────────────────── */}
          <TabsContent value="imagens" className="mt-4 space-y-4">
            {/* Foto principal */}
            <Card>
              <CardHeader><CardTitle className="text-base">Foto Principal do Produto</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {fotoPrincipalUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={fotoPrincipalUrl}
                      alt="Foto principal"
                      className="max-h-56 max-w-full rounded-lg border object-contain bg-muted/20"
                    />
                    <button
                      onClick={removeFotoPrincipal}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fotoInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                  >
                    <ImagePlus className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Clique para adicionar a foto principal</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG — essa foto aparece na impressão</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={uploadingFoto}
                >
                  {uploadingFoto ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                  {fotoPrincipalUrl ? 'Trocar foto' : 'Selecionar foto'}
                </Button>
              </CardContent>
            </Card>

            {/* Artes, Moldes e Arquivos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Artes, Moldes e Referências</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Imagens, PDFs, arquivos AI/EPS, moldes DXF — qualquer arquivo técnico do produto
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {galeriaUrls.length > 0 && (
                  <div className="space-y-3">
                    {/* Imagens — grade de miniaturas */}
                    {galeriaUrls.some(isImageUrl) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Imagens</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {galeriaUrls.filter(isImageUrl).map((url) => {
                            const i = galeriaUrls.indexOf(url);
                            return (
                              <div key={i} className="relative group">
                                <img
                                  src={url}
                                  alt={`Imagem ${i + 1}`}
                                  className="w-full aspect-square object-cover rounded-lg border bg-muted/20"
                                />
                                <button
                                  onClick={() => removeGaleria(i)}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Não-imagens — lista de arquivos */}
                    {galeriaUrls.some(url => !isImageUrl(url)) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Arquivos Técnicos</p>
                        <div className="space-y-2">
                          {galeriaUrls.filter(url => !isImageUrl(url)).map((url) => {
                            const i = galeriaUrls.indexOf(url);
                            const name = fileLabel(url);
                            return (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 group">
                                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                <span className="flex-1 text-sm truncate">{name}</span>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Abrir arquivo"
                                >
                                  <Download size={14} />
                                </a>
                                <button
                                  onClick={() => removeGaleria(i)}
                                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {galeriaUrls.length === 0 && (
                  <div
                    onClick={() => galeriaInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                  >
                    <Paperclip className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Clique para adicionar artes, moldes ou referências</p>
                    <p className="text-xs text-muted-foreground mt-1">Imagens (JPG, PNG), PDFs, AI, EPS, DXF, SVG, PSD</p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => galeriaInputRef.current?.click()}
                  disabled={uploadingFoto}
                >
                  {uploadingFoto ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  Adicionar arquivo
                </Button>
                <p className="text-xs text-muted-foreground">
                  Aceita imagens, PDFs, AI, EPS, DXF, SVG, PSD — múltiplos arquivos ao mesmo tempo
                </p>
              </CardContent>
            </Card>

            {/* Dica de impressão */}
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <Printer className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-indigo-800">Impressão com imagens</p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  As imagens da galeria aparecem no PDF. Arquivos técnicos (PDF, DXF etc.) ficam listados como anexos mas não são incorporados na impressão.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PLMLayout>
  );
}
