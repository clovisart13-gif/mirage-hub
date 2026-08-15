import { useState } from 'react';
import { useLocation } from 'wouter';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import ComunidadeNav from '@/components/comunidade/ComunidadeNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Search, Plus, MapPin, Clock, Building2, ChevronRight, Send, Phone } from 'lucide-react';

const TIPOS = ['Todos', 'Costureira', 'Modelista', 'Bordadeira', 'Estamparia', 'Gestor', 'Auxiliar', 'Cortador'];
const REGIMES = ['Todos', 'CLT', 'PJ', 'Diarista', 'Temporário'];

const VAGAS_EXEMPLO = [
  { id: 1, cargo: 'Costureira de Malha', empresa: 'Confecções Bella Moda', cidade: 'São Paulo', estado: 'SP', regime: 'CLT', salario: 'R$ 1.800 – 2.200', tipo: 'Costureira', data: 'há 1 dia', urgente: true,
    descricao: 'Buscamos costureira experiente em malha para produção de linha fitness. Experiência mínima de 2 anos em costura reta e overloque. Horário comercial, benefícios CLT.' },
  { id: 2, cargo: 'Modelista Sênior', empresa: 'Studio Fashion', cidade: 'Belo Horizonte', estado: 'MG', regime: 'PJ', salario: 'A combinar', tipo: 'Modelista', data: 'há 2 dias', urgente: false,
    descricao: 'Modelista sênior para desenvolvimento de peças femininas. Domínio de modelagem plana e moulage. PJ, projetos por demanda.' },
  { id: 3, cargo: 'Auxiliar de Produção', empresa: 'Facção Rápida Ind.', cidade: 'Americana', estado: 'SP', regime: 'CLT', salario: 'R$ 1.400', tipo: 'Auxiliar', data: 'há 3 dias', urgente: true,
    descricao: 'Auxiliar para apoio geral na produção: etiquetagem, embalagem e suporte às costureiras. Sem experiência necessária, treinamento fornecido.' },
  { id: 4, cargo: 'Bordadeira Computadorizada', empresa: 'Bordados & Arte', cidade: 'Fortaleza', estado: 'CE', regime: 'CLT', salario: 'R$ 1.600 – 2.000', tipo: 'Bordadeira', data: 'há 4 dias', urgente: false,
    descricao: 'Bordadeira para operação de bordadeiras computadorizadas. Experiência em digitalização de matrizes é diferencial.' },
  { id: 5, cargo: 'Gestor de Produção', empresa: 'Grupo Textil ABC', cidade: 'Rio de Janeiro', estado: 'RJ', regime: 'CLT', salario: 'R$ 4.000 – 5.500', tipo: 'Gestor', data: 'há 5 dias', urgente: false,
    descricao: 'Gestor para coordenar linha de produção com 15 colaboradores. Experiência em gestão têxtil, conhecimento em lean manufacturing.' },
];

export default function ComunidadeVagas() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [regime, setRegime] = useState('Todos');
  const [vagaAberta, setVagaAberta] = useState<typeof VAGAS_EXEMPLO[0] | null>(null);
  const [publicarOpen, setPublicarOpen] = useState(false);
  const [form, setForm] = useState({ cargo: '', empresa: '', cidade: '', regime: 'CLT', salario: '', descricao: '' });

  const vagasFiltradas = VAGAS_EXEMPLO.filter(v =>
    (tipo === 'Todos' || v.tipo === tipo) &&
    (regime === 'Todos' || v.regime === regime) &&
    (!busca || v.cargo.toLowerCase().includes(busca.toLowerCase()) || v.empresa.toLowerCase().includes(busca.toLowerCase()))
  );

  function publicarVaga() {
    if (!form.cargo.trim() || !form.empresa.trim()) {
      toast({ title: 'Preencha cargo e empresa', variant: 'destructive' });
      return;
    }
    setPublicarOpen(false);
    setForm({ cargo: '', empresa: '', cidade: '', regime: 'CLT', salario: '', descricao: '' });
    toast({ title: '✅ Vaga publicada!', description: 'Sua vaga será revisada e publicada em breve.' });
  }

  return (
    <KanbanLayout>
      <ComunidadeNav />
      <div className="p-6 space-y-6 w-full">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-rose-600" /> Vagas do Setor
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{vagasFiltradas.length} vaga{vagasFiltradas.length !== 1 ? 's' : ''} disponíve{vagasFiltradas.length !== 1 ? 'is' : 'l'}</p>
          </div>
          <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => setPublicarOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Publicar Vaga
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar vaga ou empresa..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={regime} onValueChange={setRegime}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Regime" />
            </SelectTrigger>
            <SelectContent>
              {REGIMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de vagas */}
        <div className="space-y-3">
          {vagasFiltradas.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="font-semibold">Nenhuma vaga encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou publique uma vaga.</p>
            </div>
          ) : (
            vagasFiltradas.map(v => (
              <div
                key={v.id}
                onClick={() => setVagaAberta(v)}
                className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h3 className="font-bold text-base group-hover:text-rose-600 transition-colors">{v.cargo}</h3>
                      {v.urgente && (
                        <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">Urgente</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{v.empresa}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.cidade}, {v.estado}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">{v.regime}</Badge>
                      <span className="font-medium text-foreground">{v.salario}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{v.data}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-xs" onClick={e => { e.stopPropagation(); setVagaAberta(v); }}>
                      Ver vaga <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA publicar currículo */}
        <div className="rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-rose-700">Procurando emprego no setor?</p>
            <p className="text-sm text-muted-foreground mt-1">Cadastre seu currículo e seja encontrado por confecções.</p>
          </div>
          <Button
            variant="outline"
            className="border-rose-400 text-rose-700 hover:bg-rose-50 shrink-0"
            onClick={() => navigate('/hub/comunidade/curriculos')}
          >
            <Briefcase className="w-4 h-4 mr-2" /> Cadastrar Currículo
          </Button>
        </div>
      </div>

      {/* Dialog: Ver Vaga */}
      {vagaAberta && (
        <Dialog open onOpenChange={() => setVagaAberta(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-start gap-2">
                <Building2 className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                {vagaAberta.cargo}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div>
                <p className="font-semibold text-sm">{vagaAberta.empresa}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{vagaAberta.cidade}, {vagaAberta.estado}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">{vagaAberta.regime}</Badge>
                  <span className="font-medium text-foreground">{vagaAberta.salario}</span>
                </div>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-sm leading-relaxed">
                {vagaAberta.descricao}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setVagaAberta(null)}>Fechar</Button>
                <Button
                  className="bg-rose-600 hover:bg-rose-700"
                  onClick={() => {
                    setVagaAberta(null);
                    toast({ title: '✅ Candidatura enviada!', description: 'A empresa receberá seu perfil em breve.' });
                  }}
                >
                  <Send className="w-4 h-4 mr-1.5" /> Me candidatar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Publicar Vaga */}
      <Dialog open={publicarOpen} onOpenChange={setPublicarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-600" /> Publicar Vaga
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Cargo *</label>
                <Input placeholder="Ex: Costureira de Malha" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Empresa *</label>
                <Input placeholder="Nome da empresa" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Cidade</label>
                <Input placeholder="Ex: São Paulo" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Regime</label>
                <Select value={form.regime} onValueChange={v => setForm(f => ({ ...f, regime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['CLT', 'PJ', 'Diarista', 'Temporário'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Salário</label>
                <Input placeholder="Ex: R$ 1.800 – 2.200 ou A combinar" value={form.salario} onChange={e => setForm(f => ({ ...f, salario: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Descrição da vaga</label>
                <Textarea placeholder="Requisitos, responsabilidades e benefícios..." rows={3} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="resize-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPublicarOpen(false)}>Cancelar</Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={publicarVaga}>
                <Send className="w-4 h-4 mr-1.5" /> Publicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </KanbanLayout>
  );
}
