import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, ArrowLeft, MessageSquare, MapPin, Phone, Mail,
  ExternalLink, CheckCircle, Pencil, X, Save, Link2, ThumbsDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LOTE_LABELS: Record<string, string> = {
  '1-5':     '1 a 5 peças — Sob medida / Made-to-order',
  '6-12':    '6 a 12 peças — Micro série',
  '13-30':   '13 a 30 peças — Pequena série',
  '31-60':   '31 a 60 peças — Piloto de coleção',
  '61-120':  '61 a 120 peças — Pequena marca',
  '121-300': '121 a 300 peças — Marca em crescimento',
  '301-600': '301 a 600 peças — Média produção',
  '601-1000':'601 a 1.000 peças — Produção consolidada',
  '1000+':   'Acima de 1.000 peças — Grande produção',
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">{titulo}</h3>
      {children}
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{valor}</p>
    </div>
  );
}

function Tags({ label, valores }: { label: string; valores?: string[] }) {
  if (!valores?.length) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {valores.map(v => (
          <span key={v} className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full border border-violet-200">{v}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminVerCadastro() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const id = new URLSearchParams(window.location.search).get('id');

  const [cadastro, setCadastro] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [reprovando, setReprovando] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hubLink, setHubLink] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [showReprovar, setShowReprovar] = useState(false);
  const [motivoReprova, setMotivoReprova] = useState('');

  // campos editáveis
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editPortfolio, setEditPortfolio] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editAdditional, setEditAdditional] = useState('');

  useEffect(() => {
    if (!id) return;
    apiFetch(`/comunidade/admin/pre-cadastros/${id}`)
      .then(d => {
        setCadastro(d);
        setEditName(d.name ?? '');
        setEditPhone(d.phone ?? '');
        setEditCidade(d.cidade ?? '');
        setEditEstado(d.estado ?? '');
        setEditPortfolio(d.portfolioUrl ?? '');
        setEditCapacity(d.productionCapacity ?? '');
        setEditAdditional(d.additionalInfo ?? '');
      })
      .catch(() => toast({ title: 'Erro ao carregar cadastro', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [id]);

  const salvarEdicao = async () => {
    if (!cadastro) return;
    setSalvando(true);
    try {
      const updated = await apiFetch(`/comunidade/admin/pre-cadastros/${cadastro.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName, phone: editPhone, cidade: editCidade,
          estado: editEstado, portfolioUrl: editPortfolio,
          productionCapacity: editCapacity, additionalInfo: editAdditional,
        }),
      });
      setCadastro(updated);
      setEditMode(false);
      toast({ title: '✅ Cadastro atualizado' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const gerarLinkHub = async () => {
    if (!cadastro) return;
    setGerando(true);
    try {
      const res = await apiFetch(`/comunidade/admin/pre-cadastros/${cadastro.id}/gerar-link-hub`, { method: 'POST' });
      if (res?.hubLink) {
        setHubLink(res.hubLink);
        setCadastro((p: any) => ({ ...p, status: 'acesso_liberado' }));
        toast({ title: '🔗 Link gerado! Copie e envie por WhatsApp.' });
      } else {
        toast({ title: 'Não foi possível gerar o link', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao gerar link', description: err.message, variant: 'destructive' });
    } finally {
      setGerando(false);
    }
  };

  const copiarLink = async () => {
    if (!hubLink) return;
    await navigator.clipboard.writeText(hubLink);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2500);
  };

  const reprovar = async () => {
    if (!cadastro) return;
    setReprovando(true);
    try {
      await apiFetch(`/comunidade/admin/pre-cadastros/${cadastro.id}/reprovar`, {
        method: 'POST',
        body: JSON.stringify({ motivo: motivoReprova }),
      });
      setCadastro((p: any) => ({ ...p, status: 'reprovado' }));
      setShowReprovar(false);
      toast({ title: 'Cadastro reprovado' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setReprovando(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
    </div>
  );

  if (!cadastro) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <p>Cadastro não encontrado.</p>
      <Button variant="outline" onClick={() => navigate('/admin')}>Voltar ao admin</Button>
    </div>
  );

  const fd = cadastro.formData ?? {};
  const reprovado = cadastro.status === 'reprovado';
  const acessoLiberado = cadastro.status === 'acesso_liberado';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Cabeçalho */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Admin
            </Button>
            <div className="h-4 w-px bg-border" />
            <div>
              <p className="font-semibold text-sm">{editMode ? editName || cadastro.name : cadastro.name}</p>
              <p className="text-xs text-muted-foreground">
                Cadastro Moda Conecta ·{' '}
                <span className={
                  acessoLiberado ? 'text-teal-700 font-medium' :
                  reprovado ? 'text-red-600 font-medium' :
                  cadastro.status === 'formulario_preenchido' ? 'text-blue-700 font-medium' : 'text-muted-foreground'
                }>
                  {acessoLiberado ? '✅ Acesso liberado' :
                   reprovado ? '✗ Reprovado' :
                   cadastro.status === 'formulario_preenchido' ? '📋 Revisão Final' :
                   cadastro.status}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Editar / Salvar */}
            {!reprovado && (
              editMode ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)} className="gap-1">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={salvarEdicao} disabled={salvando} className="gap-1 bg-violet-600 hover:bg-violet-700 text-white">
                    {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar alterações
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
              )
            )}

            {/* Reprovar */}
            {!reprovado && !acessoLiberado && !editMode && (
              <Button size="sm" variant="outline" onClick={() => setShowReprovar(true)}
                className="gap-1 border-red-200 text-red-600 hover:bg-red-50">
                <ThumbsDown className="w-3.5 h-3.5" /> Reprovar
              </Button>
            )}

            {/* Gerar link Hub */}
            {!reprovado && !editMode && (
              acessoLiberado ? (
                <div className="flex items-center gap-2">
                  {hubLink && (
                    <Button size="sm" variant="outline" onClick={copiarLink} className="gap-1 text-teal-700 border-teal-300">
                      {linkCopiado ? <><CheckCircle className="w-3.5 h-3.5" /> Copiado!</> : <><Link2 className="w-3.5 h-3.5" /> Copiar link</>}
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    className="gap-1 border-teal-300 text-teal-700 hover:bg-teal-50"
                    onClick={gerarLinkHub} disabled={gerando}>
                    {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    {hubLink ? 'Regerar link' : 'Gerar link novamente'}
                  </Button>
                </div>
              ) : (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  onClick={gerarLinkHub}
                  disabled={gerando}>
                  {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Aprovar e Gerar Link do Hub
                </Button>
              )
            )}
          </div>
        </div>

        {/* Link do Hub após geração */}
        {hubLink && (
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <MessageSquare className="w-4 h-4 text-teal-700 shrink-0" />
              <p className="text-xs text-teal-800 font-mono truncate flex-1">{hubLink}</p>
              <button onClick={copiarLink}
                className="shrink-0 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors">
                {linkCopiado ? '✓ Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 px-1">
              Envie esse link por WhatsApp. O fornecedor vai criar a conta e já entra direto no Hub.
            </p>
          </div>
        )}
      </div>

      {/* Modal reprovar */}
      {showReprovar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold">Reprovar cadastro</h3>
            <Textarea
              rows={3}
              placeholder="Motivo da reprovação (opcional)..."
              value={motivoReprova}
              onChange={e => setMotivoReprova(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowReprovar(false)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={reprovar} disabled={reprovando}>
                {reprovando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Confirmar reprovação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        {/* Contato */}
        <Secao titulo="Dados de contato">
          {editMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nome / Empresa</p>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">E-mail</p>
                <p className="text-sm font-medium text-muted-foreground">{cadastro.email} <span className="text-[10px]">(não editável)</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
                <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="11999999999" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Site / Portfólio</p>
                <Input value={editPortfolio} onChange={e => setEditPortfolio(e.target.value)} placeholder="https://" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Nome / Empresa" valor={cadastro.name} />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">E-mail</p>
                <a href={`mailto:${cadastro.email}`} className="text-sm font-medium text-blue-600 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />{cadastro.email}
                </a>
              </div>
              {cadastro.phone && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">WhatsApp</p>
                  <a href={`https://wa.me/55${cadastro.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="text-sm font-medium text-green-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />{cadastro.phone}
                  </a>
                </div>
              )}
              {cadastro.portfolioUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Site / Portfólio</p>
                  <a href={cadastro.portfolioUrl} target="_blank" rel="noreferrer"
                    className="text-sm font-medium text-blue-600 flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" />{cadastro.portfolioUrl}
                  </a>
                </div>
              )}
            </div>
          )}
        </Secao>

        {/* Localização */}
        <Secao titulo="Localização">
          {editMode ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cidade</p>
                <Input value={editCidade} onChange={e => setEditCidade(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estado</p>
                <Input value={editEstado} onChange={e => setEditEstado(e.target.value)} maxLength={2} />
              </div>
            </div>
          ) : (
            (cadastro.cidade || cadastro.estado) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="font-medium">
                  {[cadastro.endereco, cadastro.numero, cadastro.complemento, cadastro.bairro, cadastro.cidade, cadastro.estado, cadastro.cep]
                    .filter(Boolean).join(', ')}
                </span>
              </div>
            )
          )}
        </Secao>

        {/* Tipo e disponibilidade */}
        {(fd.tiposOficina?.length || fd.aceitaServicoParcial !== undefined) && (
          <Secao titulo="Tipo de estabelecimento">
            <Tags label="Tipo" valores={fd.tiposOficina} />
            {fd.aceitaServicoParcial !== null && fd.aceitaServicoParcial !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Aceita serviço parcial?</p>
                <p className={`text-sm font-medium ${fd.aceitaServicoParcial ? 'text-emerald-700' : 'text-foreground'}`}>
                  {fd.aceitaServicoParcial
                    ? 'Sim — aceita pedidos avulsos por etapa'
                    : 'Não — apenas pacote completo'}
                </p>
              </div>
            )}
            {fd.isPrivateLabel && (
              <span className="inline-block text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">Aceita Private Label</span>
            )}
          </Secao>
        )}

        {/* Capacidade */}
        {(fd.qtdMinima || cadastro.productionCapacity) && (
          <Secao titulo="Capacidade de produção">
            {editMode ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Capacidade de produção</p>
                <Input value={editCapacity} onChange={e => setEditCapacity(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fd.qtdMinima && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Lote mínimo por modelo</p>
                    <p className="text-sm font-medium">{LOTE_LABELS[fd.qtdMinima] ?? fd.qtdMinima}</p>
                  </div>
                )}
                {cadastro.productionCapacity && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Capacidade de produção</p>
                    <p className="text-sm font-medium capitalize">{cadastro.productionCapacity}</p>
                  </div>
                )}
              </div>
            )}
          </Secao>
        )}

        {/* Especialidades detalhadas */}
        {[
          fd.linhas, fd.familias, fd.faccaoServicos, fd.personalizacao,
          fd.estampariaTecnicas, fd.bordadoTecnicas, fd.corteSubtypes, fd.modelagemSubtypes,
        ].some((v: any) => v?.length) && (
          <Secao titulo="Especialidades detalhadas">
            <div className="space-y-4">
              {[
                { label: 'Linhas de produto', val: fd.linhas },
                { label: 'Famílias de produto', val: fd.familias },
                { label: 'Serviços de facção', val: fd.faccaoServicos },
                { label: 'Personalização', val: fd.personalizacao },
                { label: 'Técnicas de personalização', val: fd.personalizacaoTecnicas },
                { label: 'Técnicas de estamparia', val: fd.estampariaTecnicas },
                { label: 'Técnicas de bordado', val: fd.bordadoTecnicas },
                { label: 'Lavanderia', val: fd.lavanderiaSubtypes },
                { label: 'Tratamentos lavanderia', val: fd.lavanderiaTratamentos },
                { label: 'Corte', val: fd.corteSubtypes },
                { label: 'Modelagem', val: fd.modelagemSubtypes },
                { label: 'Sistemas CAD', val: fd.modelagemCadSistemas },
                { label: 'Sistemas de risco', val: fd.riscoSistemas },
                { label: 'Acabamento', val: fd.acabamentoServicos },
                { label: 'Aviamentos', val: fd.aviamentosServicos },
                { label: 'Tipos de tecido', val: fd.tecidosTipos },
                { label: 'Tinturaria', val: fd.tinturariaServicos },
                { label: 'Malharia', val: fd.malhariaTipos },
                { label: 'Fios / Fibras', val: fd.fiosFibras },
              ].filter(i => Array.isArray(i.val) && i.val.length > 0).map(i => (
                <Tags key={i.label} label={i.label} valores={i.val} />
              ))}
              {fd.faccaoEstrutura && <Campo label="Estrutura de produção" valor={fd.faccaoEstrutura} />}
            </div>
          </Secao>
        )}

        {/* Informações adicionais */}
        <Secao titulo="Informações adicionais">
          {editMode ? (
            <Textarea
              rows={4}
              value={editAdditional}
              onChange={e => setEditAdditional(e.target.value)}
              placeholder="Informações adicionais sobre o fornecedor..."
            />
          ) : (
            cadastro.additionalInfo
              ? <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{cadastro.additionalInfo}</p>
              : <p className="text-sm text-muted-foreground italic">Nenhuma informação adicional</p>
          )}
        </Secao>

        {/* Fotos */}
        {Array.isArray(cadastro.mediaUrls) && cadastro.mediaUrls.length > 0 && (
          <Secao titulo={`Fotos enviadas (${cadastro.mediaUrls.length})`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cadastro.mediaUrls.map((m: any, i: number) => (
                <a key={i} href={m.url} target="_blank" rel="noreferrer" className="block">
                  <img src={m.url} alt={m.name ?? `foto ${i+1}`}
                    className="w-full aspect-square object-cover rounded-xl border hover:opacity-80 transition-opacity" />
                  {m.name && <p className="text-[10px] text-muted-foreground mt-1 truncate">{m.name}</p>}
                </a>
              ))}
            </div>
          </Secao>
        )}

        {/* Barra de ações final */}
        {!editMode && !reprovado && (
          <div className="bg-white border rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Próximo passo</p>
              <p className="text-sm font-medium">
                {acessoLiberado ? 'Acesso ao Hub já liberado para esse fornecedor.' : 'Gere o link de acesso ao Hub e envie por WhatsApp.'}
              </p>
            </div>
            <div className="flex gap-2">
              {!acessoLiberado && (
                <Button variant="outline" onClick={() => setShowReprovar(true)}
                  className="gap-1 border-red-200 text-red-600 hover:bg-red-50">
                  <ThumbsDown className="w-4 h-4" /> Reprovar
                </Button>
              )}
              {acessoLiberado ? (
                <div className="flex items-center gap-2">
                  {hubLink && (
                    <Button variant="outline" onClick={copiarLink} className="gap-1.5 text-teal-700 border-teal-300">
                      {linkCopiado ? <><CheckCircle className="w-4 h-4" /> Copiado!</> : <><Link2 className="w-4 h-4" /> Copiar link</>}
                    </Button>
                  )}
                  <Button variant="outline" onClick={gerarLinkHub} disabled={gerando}
                    className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50">
                    {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    {hubLink ? 'Regerar link' : 'Gerar link novamente'}
                  </Button>
                </div>
              ) : (
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={gerarLinkHub} disabled={gerando}>
                  {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Aprovar e Gerar Link do Hub
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
