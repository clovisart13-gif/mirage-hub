import { useState } from 'react';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import ComunidadeNav from '@/components/comunidade/ComunidadeNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Search, Plus, MapPin, Clock, Tag, Send, Phone, X } from 'lucide-react';

const CATEGORIAS = ['Todas', 'Maquinário', 'Tecidos & Malhas', 'Aviamentos', 'Sobras de Estoque', 'Equipamentos', 'Outros'];

const ANUNCIOS_EXEMPLO = [
  { id: 1, titulo: 'Máquina de Costura Reta Juki DDL-8700 — Seminova', categoria: 'Maquinário', preco: 'R$ 2.800', cidade: 'São Paulo', estado: 'SP', data: 'há 1 dia', destaque: true,
    descricao: 'Máquina de costura reta Juki DDL-8700 em ótimo estado. Usada por apenas 1 ano em produção leve. Acompanha mesa e motor servo. Retirada em Mooca/SP.' , contato: '(11) 98765-4321' },
  { id: 2, titulo: 'Sobras de malha PV 30kg — várias cores', categoria: 'Sobras de Estoque', preco: 'R$ 8/kg', cidade: 'Americana', estado: 'SP', data: 'há 2 dias', destaque: false,
    descricao: 'Lote de sobras de malha PV em diversas cores (branco, preto, azul royal, vermelho). Mínimo 5kg por cor. Retirada em Americana ou envio por transportadora.', contato: '(19) 99234-5678' },
  { id: 3, titulo: 'Galoneira Yamata FY500 com mesa — em bom estado', categoria: 'Maquinário', preco: 'R$ 1.500', cidade: 'Recife', estado: 'PE', data: 'há 3 dias', destaque: false,
    descricao: 'Galoneira Yamata FY500 com mesa inclusa. Máquina funcionando bem, sem histórico de manutenção corretiva. Vendo por mudança de operação.', contato: '(81) 98100-2233' },
  { id: 4, titulo: 'Lote de botões e zíperes importados — 2.000 unidades', categoria: 'Aviamentos', preco: 'R$ 350 lote', cidade: 'Fortaleza', estado: 'CE', data: 'há 4 dias', destaque: true,
    descricao: 'Lote de botões de plástico (variados tamanhos) e zíperes importados. Ideal para confecção. Lote fechado, não vendemos separado.', contato: '(85) 97654-3322' },
  { id: 5, titulo: 'Overlock Brother 5 fios — usada, funcionando', categoria: 'Maquinário', preco: 'R$ 950', cidade: 'Belo Horizonte', estado: 'MG', data: 'há 5 dias', destaque: false,
    descricao: 'Overlock Brother 5 fios em funcionamento. Último ajuste feito há 3 meses. Ótima para quem está iniciando ou quer expandir produção.', contato: '(31) 98877-6655' },
  { id: 6, titulo: 'Estoque de voil 100% poliéster — 150 metros', categoria: 'Tecidos & Malhas', preco: 'R$ 12/m', cidade: 'Rio de Janeiro', estado: 'RJ', data: 'há 1 semana', destaque: false,
    descricao: '150 metros de voil 100% poliéster na cor branca. Lote completo ou parcial a partir de 30m. Tecido sem uso, estoque de coleção cancelada.', contato: '(21) 97001-8844' },
];

const CAT_COLOR: Record<string, string> = {
  'Maquinário': 'bg-slate-100 text-slate-700',
  'Tecidos & Malhas': 'bg-blue-100 text-blue-700',
  'Aviamentos': 'bg-amber-100 text-amber-700',
  'Sobras de Estoque': 'bg-emerald-100 text-emerald-700',
  'Equipamentos': 'bg-violet-100 text-violet-700',
  'Outros': 'bg-gray-100 text-gray-700',
};

export default function ComunidadeAnuncios() {
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [anuncioAberto, setAnuncioAberto] = useState<typeof ANUNCIOS_EXEMPLO[0] | null>(null);
  const [publicarOpen, setPublicarOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', categoria: 'Maquinário', preco: '', cidade: '', descricao: '', contato: '' });

  const filtrados = ANUNCIOS_EXEMPLO.filter(a =>
    (categoria === 'Todas' || a.categoria === categoria) &&
    (!busca || a.titulo.toLowerCase().includes(busca.toLowerCase()))
  );

  function publicarAnuncio() {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      toast({ title: 'Preencha título e descrição', variant: 'destructive' });
      return;
    }
    setPublicarOpen(false);
    setForm({ titulo: '', categoria: 'Maquinário', preco: '', cidade: '', descricao: '', contato: '' });
    toast({ title: '✅ Anúncio publicado!', description: 'Seu anúncio será revisado e publicado em breve.' });
  }

  return (
    <KanbanLayout>
      <ComunidadeNav />
      <div className="p-6 space-y-6 w-full">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-amber-600" /> Classificados
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Maquinário, tecidos, aviamentos e oportunidades do setor</p>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setPublicarOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Publicar Anúncio
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar anúncios..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {filtrados.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="font-semibold">Nenhum anúncio encontrado</p>
            <p className="text-sm text-muted-foreground">Tente outros filtros ou publique um anúncio.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(a => (
              <div
                key={a.id}
                onClick={() => setAnuncioAberto(a)}
                className={`bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer group
                  ${a.destaque ? 'border-amber-300 ring-1 ring-amber-200' : ''}`}
              >
                {/* Imagem placeholder */}
                <div className="h-40 bg-gradient-to-br from-amber-50 to-slate-100 flex items-center justify-center relative">
                  <Tag className="w-12 h-12 text-amber-200" />
                  {a.destaque && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white border-0 text-xs">Destaque</Badge>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <Badge className={`text-xs border-0 ${CAT_COLOR[a.categoria] ?? 'bg-gray-100 text-gray-700'}`}>{a.categoria}</Badge>
                  <h3 className="font-semibold text-sm leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">{a.titulo}</h3>
                  <p className="text-lg font-bold text-amber-700">{a.preco}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.cidade}, {a.estado}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.data}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Ver Anúncio */}
      {anuncioAberto && (
        <Dialog open onOpenChange={() => setAnuncioAberto(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-start gap-2">
                <Tag className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                {anuncioAberto.titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`text-xs border-0 ${CAT_COLOR[anuncioAberto.categoria] ?? 'bg-gray-100'}`}>{anuncioAberto.categoria}</Badge>
                <span className="text-2xl font-bold text-amber-700">{anuncioAberto.preco}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{anuncioAberto.cidade}, {anuncioAberto.estado}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{anuncioAberto.data}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-sm leading-relaxed">
                {anuncioAberto.descricao}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Contato do anunciante</p>
                  <p className="text-sm font-semibold">{anuncioAberto.contato}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAnuncioAberto(null)}>Fechar</Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    const digits = anuncioAberto.contato.replace(/\D/g, '');
                    const intl = digits.startsWith('55') ? digits : `55${digits}`;
                    window.open(`https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(`Olá! Vi seu anúncio "${anuncioAberto.titulo}" no Moda Conecta e tenho interesse.`)}`, '_blank');
                  }}
                >
                  <Send className="w-4 h-4 mr-1.5" /> Entrar em contato
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Publicar Anúncio */}
      <Dialog open={publicarOpen} onOpenChange={setPublicarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" /> Publicar Anúncio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Título *</label>
              <Input placeholder="Ex: Máquina de costura Juki — seminova" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.filter(c => c !== 'Todas').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Preço</label>
                <Input placeholder="Ex: R$ 2.800 ou A combinar" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cidade / UF</label>
              <Input placeholder="Ex: São Paulo, SP" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição *</label>
              <Textarea placeholder="Descreva o item, estado de conservação, condições de venda..." rows={3} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Contato (WhatsApp ou telefone)</label>
              <Input placeholder="(11) 99999-9999" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPublicarOpen(false)}>Cancelar</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={publicarAnuncio}>
                <Send className="w-4 h-4 mr-1.5" /> Publicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </KanbanLayout>
  );
}
