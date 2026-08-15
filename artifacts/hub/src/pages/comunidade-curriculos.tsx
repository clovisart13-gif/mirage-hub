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
import { FileText, Search, Plus, MapPin, Star, Clock, Briefcase, Send, Phone } from 'lucide-react';

const FUNCOES = ['Todas', 'Costureira', 'Modelista', 'Bordadeira', 'Estamparia', 'Gestor', 'Auxiliar', 'Cortador', 'Designer'];
const DISPONIBILIDADE = ['Todas', 'Imediata', 'Em 15 dias', 'Em 30 dias'];

const CURRICULOS_EXEMPLO = [
  { id: 1, nome: 'Rosana A.', funcao: 'Costureira', experiencia: '8 anos', cidade: 'São Paulo', estado: 'SP', disponibilidade: 'Imediata', skills: ['Costura Reta', 'Overloque', 'Travete'], destaque: true, data: 'há 2 dias',
    bio: 'Costureira experiente em moda feminina e fitness. Já trabalhei em facções de médio porte em SP. Busco oportunidade CLT ou PJ por hora.', contato: '(11) 97001-1122' },
  { id: 2, nome: 'João M.', funcao: 'Modelista', experiencia: '12 anos', cidade: 'Americana', estado: 'SP', disponibilidade: 'Em 15 dias', skills: ['Modelagem Plana', 'Moulage', 'CAD'], destaque: false, data: 'há 3 dias',
    bio: 'Modelista sênior especializado em moda casual e sportswear. Atuo com modelagem manual e digital (CAD). Aceito projetos por demanda.', contato: '(19) 98765-4400' },
  { id: 3, nome: 'Carla P.', funcao: 'Bordadeira', experiencia: '5 anos', cidade: 'Belo Horizonte', estado: 'MG', disponibilidade: 'Imediata', skills: ['Bordado Computadorizado', 'Richelieu', 'Patch'], destaque: false, data: 'há 4 dias',
    bio: 'Bordadeira com domínio em máquinas computadorizadas de múltiplas cabeças. Faço digitalização de matrizes também.', contato: '(31) 99100-3344' },
  { id: 4, nome: 'Marco R.', funcao: 'Gestor', experiencia: '15 anos', cidade: 'Fortaleza', estado: 'CE', disponibilidade: 'Em 30 dias', skills: ['Gestão de Produção', 'Lean', 'Qualidade'], destaque: true, data: 'há 5 dias',
    bio: 'Gestor de produção têxtil com experiência em implantação de lean em confecções. Já gerenciei equipes de até 40 colaboradores.', contato: '(85) 98877-5500' },
  { id: 5, nome: 'Ana S.', funcao: 'Designer', experiencia: '6 anos', cidade: 'Rio de Janeiro', estado: 'RJ', disponibilidade: 'Imediata', skills: ['Criação de Moda', 'Illustrator', 'Trend'], destaque: false, data: 'há 6 dias',
    bio: 'Designer de moda formada, especialista em desenvolvimento de coleções sazonais. Trabalho com pesquisa de tendências e criação de estampas.', contato: '(21) 99500-7788' },
];

const FUNC_ICON_COLOR: Record<string, string> = {
  Costureira: 'bg-rose-100 text-rose-700',
  Modelista: 'bg-blue-100 text-blue-700',
  Bordadeira: 'bg-violet-100 text-violet-700',
  Estamparia: 'bg-orange-100 text-orange-700',
  Gestor: 'bg-slate-100 text-slate-700',
  Auxiliar: 'bg-gray-100 text-gray-700',
  Cortador: 'bg-amber-100 text-amber-700',
  Designer: 'bg-pink-100 text-pink-700',
};

export default function ComunidadeCurriculos() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [busca, setBusca] = useState('');
  const [funcao, setFuncao] = useState('Todas');
  const [disponibilidade, setDisponibilidade] = useState('Todas');
  const [curriculoAberto, setCurriculoAberto] = useState<typeof CURRICULOS_EXEMPLO[0] | null>(null);
  const [cadastrarOpen, setCadastrarOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', funcao: 'Costureira', cidade: '', experiencia: '', disponibilidade: 'Imediata', bio: '', contato: '' });

  const filtrados = CURRICULOS_EXEMPLO.filter(c =>
    (funcao === 'Todas' || c.funcao === funcao) &&
    (disponibilidade === 'Todas' || c.disponibilidade === disponibilidade) &&
    (!busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.funcao.toLowerCase().includes(busca.toLowerCase()))
  );

  function cadastrar() {
    if (!form.nome.trim() || !form.bio.trim()) {
      toast({ title: 'Preencha nome e apresentação', variant: 'destructive' });
      return;
    }
    setCadastrarOpen(false);
    setForm({ nome: '', funcao: 'Costureira', cidade: '', experiencia: '', disponibilidade: 'Imediata', bio: '', contato: '' });
    toast({ title: '✅ Currículo cadastrado!', description: 'Seu perfil será revisado e publicado em breve.' });
  }

  return (
    <KanbanLayout>
      <ComunidadeNav />
      <div className="p-6 space-y-6 w-full">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" /> Currículos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Encontre profissionais qualificados do setor têxtil</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setCadastrarOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Cadastrar Currículo
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou função..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={funcao} onValueChange={setFuncao}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Função" />
            </SelectTrigger>
            <SelectContent>
              {FUNCOES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={disponibilidade} onValueChange={setDisponibilidade}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Disponibilidade" />
            </SelectTrigger>
            <SelectContent>
              {DISPONIBILIDADE.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {filtrados.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="font-semibold">Nenhum currículo encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros.</p>
            </div>
          ) : (
            filtrados.map(c => (
              <div
                key={c.id}
                onClick={() => setCurriculoAberto(c)}
                className={`bg-card border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer group
                  ${c.destaque ? 'border-indigo-300 ring-1 ring-indigo-100' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0
                    ${FUNC_ICON_COLOR[c.funcao] ?? 'bg-gray-100 text-gray-600'}`}>
                    {c.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold group-hover:text-indigo-600 transition-colors">{c.nome}</h3>
                      <Badge className={`text-xs border-0 ${FUNC_ICON_COLOR[c.funcao] ?? 'bg-gray-100 text-gray-600'}`}>{c.funcao}</Badge>
                      {c.destaque && <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs flex items-center gap-0.5"><Star className="w-3 h-3" /> Destaque</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{c.experiencia} de experiência</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.cidade}, {c.estado}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Disponível: {c.disponibilidade}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.skills.map(s => (
                        <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-xs shrink-0"
                    onClick={e => { e.stopPropagation(); setCurriculoAberto(c); }}
                  >
                    Ver currículo
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA vaga */}
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-indigo-700">Contratando para sua confecção?</p>
            <p className="text-sm text-muted-foreground mt-1">Publique uma vaga e encontre profissionais qualificados.</p>
          </div>
          <Button
            variant="outline"
            className="border-indigo-400 text-indigo-700 hover:bg-indigo-50 shrink-0"
            onClick={() => navigate('/hub/comunidade/vagas')}
          >
            <Plus className="w-4 h-4 mr-2" /> Publicar Vaga
          </Button>
        </div>
      </div>

      {/* Dialog: Ver Currículo */}
      {curriculoAberto && (
        <Dialog open onOpenChange={() => setCurriculoAberto(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0
                  ${FUNC_ICON_COLOR[curriculoAberto.funcao] ?? 'bg-gray-100 text-gray-600'}`}>
                  {curriculoAberto.nome.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {curriculoAberto.nome}
                    {curriculoAberto.destaque && <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs"><Star className="w-3 h-3 mr-0.5" />Destaque</Badge>}
                  </div>
                  <p className="text-sm font-normal text-muted-foreground">{curriculoAberto.funcao}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{curriculoAberto.experiencia} de experiência</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{curriculoAberto.cidade}, {curriculoAberto.estado}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Disponível: {curriculoAberto.disponibilidade}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-sm leading-relaxed">
                {curriculoAberto.bio}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Habilidades</p>
                <div className="flex flex-wrap gap-1.5">
                  {curriculoAberto.skills.map(s => (
                    <span key={s} className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Contato</p>
                  <p className="text-sm font-semibold">{curriculoAberto.contato}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setCurriculoAberto(null)}>Fechar</Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    const digits = curriculoAberto.contato.replace(/\D/g, '');
                    const intl = digits.startsWith('55') ? digits : `55${digits}`;
                    window.open(`https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(`Olá, ${curriculoAberto.nome.split(' ')[0]}! Vi seu currículo no Moda Conecta e tenho interesse em conversar.`)}`, '_blank');
                  }}
                >
                  <Send className="w-4 h-4 mr-1.5" /> Entrar em contato
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Cadastrar Currículo */}
      <Dialog open={cadastrarOpen} onOpenChange={setCadastrarOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> Cadastrar Currículo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Nome completo *</label>
                <Input placeholder="Seu nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Função</label>
                <Select value={form.funcao} onValueChange={v => setForm(f => ({ ...f, funcao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNCOES.filter(f => f !== 'Todas').map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Experiência</label>
                <Input placeholder="Ex: 5 anos" value={form.experiencia} onChange={e => setForm(f => ({ ...f, experiencia: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Cidade / UF</label>
                <Input placeholder="Ex: São Paulo, SP" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Disponibilidade</label>
                <Select value={form.disponibilidade} onValueChange={v => setForm(f => ({ ...f, disponibilidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Imediata', 'Em 15 dias', 'Em 30 dias'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Apresentação *</label>
              <Textarea placeholder="Fale sobre sua experiência, habilidades e o que busca..." rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">WhatsApp / Contato</label>
              <Input placeholder="(11) 99999-9999" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCadastrarOpen(false)}>Cancelar</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={cadastrar}>
                <Send className="w-4 h-4 mr-1.5" /> Cadastrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </KanbanLayout>
  );
}
