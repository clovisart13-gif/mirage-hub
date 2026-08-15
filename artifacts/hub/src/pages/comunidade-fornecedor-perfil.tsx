import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Star, MapPin, ArrowLeft, Loader2,
  Briefcase, Clock, Shield, Image as ImageIcon, MessageCircle, CheckCircle
} from 'lucide-react';
import { SeloVerificado, SeloRecomendado } from '@/components/comunidade/SelosR2PB';

interface Review {
  id: string;
  ratingValue: number;
  ratingDeadline: number;
  ratingQuality: number;
  ratingService: number;
  rating: string;
  comment: string;
  createdAt: string;
}

interface FornecedorDetail {
  id: string;
  professionalTitle: string | null;
  areaOfExpertise: string | null;
  bio: string | null;
  profilePhoto: string | null;
  coverPhoto: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  averageRating: string | null;
  totalReviews: number;
  verifiedByAdmin: boolean;
  recommendedByAdmin: boolean;
  isPrivateLabel: boolean;
  averageDeliveryDays: number | null;
  serviceRegion: string | null;
  minimumOrderValue: string | null;
  productionCapacity: string | null;
  specialties: { name: string | null; level: number | null; code: string | null; observations: string | null }[];
  photos: { id: string; photoUrl: string; photoType: string; caption: string | null }[];
  reviews: Review[];
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => onChange(i)} type="button">
            <Star className={`w-5 h-5 transition-colors ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ComunidadeFornecedorPerfil() {
  const { id } = useParams<{ id: string }>();
  const [fornecedor, setFornecedor] = useState<FornecedorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [avaliacao, setAvaliacao] = useState({
    ratingValue: 0, ratingDeadline: 0, ratingQuality: 0, ratingService: 0, comment: ''
  });

  useEffect(() => {
    if (!id) return;
    apiFetch(`/comunidade/fornecedores/${id}`)
      .then(setFornecedor)
      .catch(() => setFornecedor(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAvaliar = async () => {
    const { ratingValue, ratingDeadline, ratingQuality, ratingService, comment } = avaliacao;
    if (!ratingValue || !ratingDeadline || !ratingQuality || !ratingService) {
      toast.error('Avalie todos os critérios'); return;
    }
    if (!comment.trim()) { toast.error('Adicione um comentário'); return; }
    setEnviandoAvaliacao(true);
    try {
      await apiFetch(`/comunidade/fornecedores/${id}/avaliacoes`, {
        method: 'POST',
        body: JSON.stringify(avaliacao),
      });
      toast.success('Avaliação enviada!');
      setAvaliacao({ ratingValue: 0, ratingDeadline: 0, ratingQuality: 0, ratingService: 0, comment: '' });
      const updated = await apiFetch(`/comunidade/fornecedores/${id}`);
      setFornecedor(updated);
    } catch (e: any) {
      let msg = e.message;
      try { msg = JSON.parse(msg)?.error || msg; } catch {}
      toast.error(msg);
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  if (loading) return (
    <KanbanLayout>
      <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>
    </KanbanLayout>
  );

  if (!fornecedor) return (
    <KanbanLayout>
      <div className="p-8 text-center space-y-3">
        <p className="text-lg font-semibold">Fornecedor não encontrado</p>
        <Link href="/hub/comunidade/fornecedores">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        </Link>
      </div>
    </KanbanLayout>
  );

  const avgRating = Number(fornecedor.averageRating || 0);

  return (
    <KanbanLayout>
      <div className="p-4 space-y-6 w-full overflow-auto">
        {/* Voltar */}
        <Link href="/hub/comunidade/fornecedores">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar aos fornecedores
          </Button>
        </Link>

        {/* Cover */}
        <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-200 to-purple-300">
          {fornecedor.coverPhoto && (
            <img src={fornecedor.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Header do perfil */}
        <div className="relative -mt-16 px-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-28 h-28 rounded-2xl border-4 border-background bg-gradient-to-br from-violet-100 to-purple-200 overflow-hidden shadow-lg flex-shrink-0">
              {fornecedor.profilePhoto
                ? <img src={fornecedor.profilePhoto} alt={fornecedor.professionalTitle ?? ''} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-violet-400">
                    {(fornecedor.professionalTitle || 'F')[0].toUpperCase()}
                  </div>
              }
            </div>

            <div className="flex-1 bg-card rounded-2xl shadow-md p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{fornecedor.professionalTitle || 'Fornecedor'}</h1>
                    {fornecedor.isPrivateLabel && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">🏆 Private Label</Badge>
                    )}
                  </div>
                  {fornecedor.areaOfExpertise && <p className="text-muted-foreground">{fornecedor.areaOfExpertise}</p>}
                  <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                    {fornecedor.verifiedByAdmin && <SeloVerificado size="md" />}
                    {fornecedor.recommendedByAdmin && <SeloRecomendado size="md" />}
                    {(fornecedor.cidade || fornecedor.estado) && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {[fornecedor.bairro, fornecedor.cidade, fornecedor.estado].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="text-xl font-bold">{avgRating.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{fornecedor.totalReviews} avaliações</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Star, label: 'Avaliação', value: `${avgRating.toFixed(1)} / 5` },
            { icon: MessageCircle, label: 'Avaliações', value: String(fornecedor.totalReviews) },
            { icon: Clock, label: 'Prazo médio', value: fornecedor.averageDeliveryDays ? `${fornecedor.averageDeliveryDays} dias` : '—' },
            { icon: Shield, label: 'Atende', value: fornecedor.serviceRegion === 'nacional' ? 'Nacional' : fornecedor.serviceRegion === 'local' ? 'Local' : fornecedor.serviceRegion ?? '—' },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-violet-100 p-2 rounded-lg"><Icon className="w-5 h-5 text-violet-600" /></div>
                <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold text-sm">{value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sobre">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="sobre">Sobre</TabsTrigger>
            <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações ({fornecedor.totalReviews})</TabsTrigger>
            <TabsTrigger value="avaliar">Avaliar</TabsTrigger>
          </TabsList>

          {/* Sobre */}
          <TabsContent value="sobre" className="space-y-4 mt-4">
            {fornecedor.bio && (
              <Card><CardHeader><CardTitle className="text-base">Sobre</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{fornecedor.bio}</p></CardContent>
              </Card>
            )}
            {fornecedor.specialties?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Especialidades</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {fornecedor.specialties.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                      <CheckCircle className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        {s.observations && <p className="text-xs text-muted-foreground mt-0.5">{s.observations}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Portfólio */}
          <TabsContent value="portfolio" className="mt-4">
            {fornecedor.photos?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {fornecedor.photos.map(p => (
                  <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-muted relative group">
                    <img src={p.photoUrl} alt={p.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    {p.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-xs p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                        {p.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma foto no portfólio ainda.</p>
              </div>
            )}
          </TabsContent>

          {/* Avaliações */}
          <TabsContent value="avaliacoes" className="mt-4 space-y-3">
            {fornecedor.reviews?.length > 0 ? fornecedor.reviews.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <StarRating value={Math.round(Number(r.rating))} />
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-sm">{r.comment}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                    <span>Custo-benefício: {r.ratingValue}/5</span>
                    <span>Prazo: {r.ratingDeadline}/5</span>
                    <span>Qualidade: {r.ratingQuality}/5</span>
                    <span>Atendimento: {r.ratingService}/5</span>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Seja o primeiro a avaliar este fornecedor.</p>
              </div>
            )}
          </TabsContent>

          {/* Avaliar */}
          <TabsContent value="avaliar" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Sua Avaliação</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <RatingInput label="Custo-benefício" value={avaliacao.ratingValue} onChange={v => setAvaliacao(a => ({ ...a, ratingValue: v }))} />
                  <RatingInput label="Cumprimento de prazo" value={avaliacao.ratingDeadline} onChange={v => setAvaliacao(a => ({ ...a, ratingDeadline: v }))} />
                  <RatingInput label="Qualidade do trabalho" value={avaliacao.ratingQuality} onChange={v => setAvaliacao(a => ({ ...a, ratingQuality: v }))} />
                  <RatingInput label="Atendimento" value={avaliacao.ratingService} onChange={v => setAvaliacao(a => ({ ...a, ratingService: v }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Comentário *</Label>
                  <Textarea
                    rows={4}
                    placeholder="Conte sua experiência com este fornecedor..."
                    value={avaliacao.comment}
                    onChange={e => setAvaliacao(a => ({ ...a, comment: e.target.value }))}
                  />
                </div>
                <Button onClick={handleAvaliar} disabled={enviandoAvaliacao} className="bg-violet-600 hover:bg-violet-700">
                  {enviandoAvaliacao && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enviar Avaliação
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </KanbanLayout>
  );
}
