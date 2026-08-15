import { useState } from 'react';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  MessageCircle, ExternalLink, ArrowLeft, Users, Bot,
  TrendingUp, Bell, BarChart3, Zap, CheckCircle2, CalendarClock, Loader2, Send,
} from 'lucide-react';

const CRM_URL = 'https://mirage.wts.chat';

const features = [
  { icon: Bot, title: 'Robô SDR Mirage', desc: 'Atende leads no WhatsApp 24h e qualifica automaticamente antes de passar para o time.' },
  { icon: Users, title: 'Pipeline de Vendas', desc: 'Funil visual com todos os leads organizados por etapa — do primeiro contato ao fechamento.' },
  { icon: Bell, title: 'Notificações em Tempo Real', desc: 'Alertas instantâneos quando um lead qualificado entra no pipeline ou responde uma mensagem.' },
  { icon: BarChart3, title: 'Relatórios de Performance', desc: 'Taxa de conversão, tempo médio de resposta e desempenho por atendente.' },
  { icon: Zap, title: 'Respostas Automáticas', desc: 'Sequências de mensagens automáticas para nutrir leads sem esforço manual.' },
  { icon: TrendingUp, title: 'Integração com o Ecossistema', desc: 'Leads convertidos são registrados automaticamente no ERP Mirage para geração de pedido.' },
];

function DispararConfirmacaoReuniao() {
  const [leadName, setLeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName.trim() || !phone.trim() || !scheduledAt) {
      toast.error('Preencha nome, telefone e data/hora da reunião.');
      return;
    }
    setLoading(true);
    try {
      const isoScheduledAt = new Date(scheduledAt).toISOString();
      const res = await apiFetch('/crm/agendamento', {
        method: 'POST',
        body: JSON.stringify({
          lead_name: leadName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          scheduled_at: isoScheduledAt,
          meeting_link: meetingLink.trim() || undefined,
          source: 'crm_manual_hub',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error ? JSON.stringify(data.error) : 'Falha ao registrar agendamento');
      }
      if (data.dispatched) {
        toast.success('Confirmação de reunião enviada com sucesso!');
      } else {
        toast.warning('Agendamento registrado, mas o disparo ao n8n falhou ou não está configurado. Verifique com o suporte técnico.');
      }
      setLeadName('');
      setPhone('');
      setEmail('');
      setScheduledAt('');
      setMeetingLink('');
    } catch (err: any) {
      toast.error(`Erro ao disparar confirmação: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
          <CalendarClock size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Disparar confirmação de reunião</h2>
          <p className="text-xs text-muted-foreground">
            Use esta ação quando marcar a etiqueta "reunião agendada" em um lead no CRM — envia a confirmação e o lembrete por WhatsApp.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="leadName">Nome do lead *</Label>
          <Input id="leadName" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Ex: Maria Silva, Ateliê X" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scheduledAt">Data e hora da reunião *</Label>
          <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail (opcional)</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lead@empresa.com" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="meetingLink">Link da reunião (opcional)</Label>
          <Input id="meetingLink" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />}
            Enviar confirmação por WhatsApp
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CRMApp() {
  return (
    <KanbanLayout>
      <div className="px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 p-8 text-white">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">CRM Mirage</h1>
                  <p className="text-orange-100 text-sm">SDR Inteligente via WhatsApp</p>
                </div>
              </div>
              <p className="text-orange-50 leading-relaxed">
                Sistema de CRM com inteligência artificial para o setor têxtil. O robô Mirage 
                atende seus leads no WhatsApp, qualifica automaticamente e passa apenas os 
                prospects certos para seu time fechar.
              </p>
              <div className="flex flex-wrap gap-2">
                {['WhatsApp Business', 'IA de Qualificação', 'Pipeline Visual', 'Relatórios'].map(tag => (
                  <span key={tag} className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <a href={CRM_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-white text-orange-700 hover:bg-orange-50 gap-2 w-full sm:w-auto font-semibold shadow-lg">
                  <ExternalLink size={16} />
                  Acessar CRM Mirage
                </Button>
              </a>
              <p className="text-xs text-orange-200 text-center">Abre em nova aba · mirage.wts.chat</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { stat: '24h', label: 'Atendimento contínuo' },
            { stat: '3x', label: 'Mais leads qualificados' },
            { stat: '0', label: 'Leads perdidos por demora' },
          ].map(s => (
            <div key={s.label} className="text-center p-4 rounded-xl border bg-card">
              <p className="text-2xl font-bold text-orange-600">{s.stat}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Funcionalidades</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.title} className="flex gap-3 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <f.icon size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Como funciona</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Robô atende o primeiro contato', desc: 'Assim que o lead envia mensagem no WhatsApp, o Mirage responde instantaneamente e inicia a qualificação.' },
              { step: '2', title: 'Lead qualificado vai para o pipeline', desc: 'Se o perfil bate com seu cliente ideal, o robô passa para o atendente humano com todo o histórico registrado.' },
              { step: '3', title: 'Time fecha o negócio', desc: 'Seus consultores recebem apenas leads qualificados e prontos para proposta. Sem perda de tempo com contatos fora do perfil.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4 p-4 rounded-xl border bg-card">
                <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ação manual: disparar confirmação de reunião */}
        <DispararConfirmacaoReuniao />

        {/* CTA final */}
        <div className="rounded-2xl border bg-orange-50 dark:bg-orange-950/20 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-orange-600 shrink-0" size={24} />
            <div>
              <p className="font-semibold">Acesso incluído no seu plano</p>
              <p className="text-sm text-muted-foreground">Entre no sistema agora para configurar seu robô Mirage.</p>
            </div>
          </div>
          <a href={CRM_URL} target="_blank" rel="noopener noreferrer">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
              <ExternalLink size={14} />
              Abrir CRM Mirage
            </Button>
          </a>
        </div>
      </div>
    </KanbanLayout>
  );
}
