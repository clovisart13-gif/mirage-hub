import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Printer, Share2, Check } from 'lucide-react';

type Formato = 'feed' | 'story' | 'banner';

const FORMATOS: { id: Formato; label: string; w: number; h: number; desc: string }[] = [
  { id: 'feed',   label: 'Post Feed',   w: 1080, h: 1080, desc: '1080×1080 · Instagram / Facebook' },
  { id: 'story',  label: 'Story',       w: 1080, h: 1920, desc: '1080×1920 · Stories & Reels' },
  { id: 'banner', label: 'Banner Web',  w: 1200, h: 628,  desc: '1200×628 · WhatsApp / LinkedIn' },
];

function QR({ url, size, darkBg }: { url: string; size: number; darkBg?: boolean }) {
  const fg = darkBg ? 'ffffff' : '0f0a1e';
  const bg = darkBg ? '0f0a1e' : 'ffffff';
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=${size}x${size}&margin=4&color=${fg}&bgcolor=${bg}`}
      alt="QR Code"
      style={{ width: size / 4, height: size / 4, borderRadius: 10, display: 'block' }}
    />
  );
}

/* ─────────────── FEED 1080×1080 ─────────────── */
function CardFeed({ url }: { url: string }) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0f0a1e', display: 'flex', flexDirection: 'column' }}>

      {/* BG glow */}
      <div style={{ position: 'absolute', top: -60, right: -80, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, #7c3aed60 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, #f59e0b30 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* TOP STRIP — oferta */}
      <div style={{ position: 'relative', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '18px 48px' }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#0f0a1e', textTransform: 'uppercase', letterSpacing: 3 }}>🎁 OFERTA DE LANÇAMENTO</span>
        <span style={{ width: 1, height: 16, background: '#0f0a1e', opacity: 0.3 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f0a1e' }}>Para os primeiros 500 fornecedores</span>
      </div>

      {/* MAIN */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 48px 20px' }}>

        {/* Category label */}
        <div style={{ color: '#a78bfa', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 16 }}>
          🧵 Você é fornecedor têxtil?
        </div>

        {/* Headline */}
        <h1 style={{ color: '#ffffff', fontWeight: 900, fontSize: 60, lineHeight: 1.05, margin: '0 0 12px', letterSpacing: -1.5 }}>
          Cadastre grátis<br />e ganhe
          <span style={{ color: '#f59e0b' }}> 30 dias<br />do Hub Mirage.</span>
        </h1>

        {/* What is it */}
        <p style={{ color: '#c4b5fd', fontSize: 18, lineHeight: 1.5, margin: '0 0 24px' }}>
          O Hub Mirage é a plataforma de gestão, pedidos e financeiro para confecções brasileiras — e você ganha acesso <strong style={{ color: '#fff' }}>completamente grátis</strong> ao se cadastrar no diretório.
        </p>

        {/* 3 pilares */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          {[
            { icon: '🎁', line1: '30 dias grátis', line2: 'Hub Mirage' },
            { icon: '👁️', line1: 'Apareça para', line2: '500+ confecções' },
            { icon: '🚫', line1: 'Zero comissão', line2: 'nos pedidos' },
          ].map(p => (
            <div key={p.line1} style={{ flex: 1, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 16, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{p.icon}</div>
              <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{p.line1}</div>
              <div style={{ color: '#c4b5fd', fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{p.line2}</div>
            </div>
          ))}
        </div>

        {/* CTA + QR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: 'rgba(245,158,11,0.1)', border: '2px solid #f59e0b', borderRadius: 20, padding: '20px 24px' }}>
          <QR url={url} size={288} />
          <div>
            <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: 20, marginBottom: 6 }}>← Escaneie para se cadastrar</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>É gratuito · Leva 5 minutos</div>
            <div style={{ color: '#a78bfa', fontSize: 13 }}>Vagas limitadas — somente 500 fornecedores</div>
          </div>
        </div>

        {/* Sem cartão */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>Sem cartão de crédito · Você só decide se assina <strong style={{ color: '#fff' }}>depois</strong> dos 30 dias</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 48px', borderTop: '1px solid rgba(167,139,250,0.15)' }}>
        <img src="/mirage-logo.png" alt="Mirage" style={{ height: 28, objectFit: 'contain', filter: 'brightness(0) invert(1) opacity(0.5)' }} />
        <span style={{ color: '#4c1d95', fontSize: 12, letterSpacing: 2 }}>mirage.app/hub/comunidade</span>
      </div>
    </div>
  );
}

/* ─────────────── STORY 1080×1920 ─────────────── */
function CardStory({ url }: { url: string }) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0f0a1e', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>

      {/* Blobs */}
      <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, #7c3aed50 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, #f59e0b28 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '38px 38px' }} />

      {/* OFERTA BANNER */}
      <div style={{ position: 'relative', background: '#f59e0b', textAlign: 'center', padding: '22px 32px' }}>
        <div style={{ fontWeight: 900, fontSize: 18, color: '#0f0a1e', textTransform: 'uppercase', letterSpacing: 3 }}>🎁 OFERTA DE LANÇAMENTO</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f0a1e', marginTop: 4 }}>Somente para os primeiros 500 fornecedores</div>
      </div>

      {/* Central block */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', gap: 36, textAlign: 'center' }}>

        <div style={{ color: '#a78bfa', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4 }}>
          🧵 Você é fornecedor têxtil?
        </div>

        <h1 style={{ color: '#ffffff', fontWeight: 900, fontSize: 80, lineHeight: 0.95, margin: 0, letterSpacing: -3 }}>
          Cadastre<br />grátis +<br />
          <span style={{ color: '#f59e0b' }}>30 dias<br />do Hub</span>
        </h1>

        <p style={{ color: '#c4b5fd', fontSize: 26, lineHeight: 1.45, margin: 0 }}>
          O <strong style={{ color: '#fff' }}>Hub Mirage</strong> é a plataforma de gestão para confecções brasileiras. Você ganha acesso completo de graça.
        </p>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 14 }}>
          {[
            { icon: '🎁', text: '30 dias grátis do Hub Mirage (gestão + pedidos + financeiro)' },
            { icon: '👁️', text: 'Seu negócio visto por 500+ confecções ativas' },
            { icon: '🚫', text: 'Sem comissão, sem taxa mensal, sem pegadinhas' },
            { icon: '⚡', text: 'Aprovação em até 2 dias úteis' },
          ].map(c => (
            <div key={c.text} style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 18, padding: '18px 22px', textAlign: 'left' }}>
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{c.icon}</span>
              <span style={{ color: '#e9d5ff', fontSize: 22, fontWeight: 600, lineHeight: 1.35 }}>{c.text}</span>
            </div>
          ))}
        </div>

        {/* QR */}
        <div style={{ width: '100%', background: 'rgba(245,158,11,0.1)', border: '2px solid #f59e0b', borderRadius: 28, padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <QR url={url} size={500} />
          <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }}>
            Escaneie · Cadastre-se · Ganhe
          </div>
          <div style={{ color: '#c4b5fd', fontSize: 20, textAlign: 'center', lineHeight: 1.4 }}>
            Formulário rápido · 5 minutos · Aprovação em 2 dias
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 24px' }}>
            <span style={{ fontSize: 22 }}>🔒</span>
            <span style={{ color: '#a78bfa', fontSize: 19, fontWeight: 600, lineHeight: 1.3 }}>Sem cartão de crédito · Decide se assina <strong style={{ color: '#fff' }}>só após 30 dias</strong></span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 60px 52px', borderTop: '1px solid rgba(167,139,250,0.15)' }}>
        <img src="/mirage-logo.png" alt="Mirage" style={{ height: 36, objectFit: 'contain', filter: 'brightness(0) invert(1) opacity(0.5)' }} />
        <span style={{ color: '#4c1d95', fontSize: 15, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>COMUNIDADE DE FORNECEDORES</span>
      </div>
    </div>
  );
}

/* ─────────────── BANNER 1200×628 ─────────────── */
function CardBanner({ url }: { url: string }) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0f0a1e', display: 'flex', alignItems: 'stretch' }}>

      {/* Blobs */}
      <div style={{ position: 'absolute', top: -60, left: '35%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, #7c3aed40 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '28px 28px' }} />

      {/* Oferta top strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '10px 0', zIndex: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: '#0f0a1e', textTransform: 'uppercase', letterSpacing: 3 }}>🎁 OFERTA DE LANÇAMENTO</span>
        <span style={{ width: 1, height: 14, background: '#0f0a1e', opacity: 0.3 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f0a1e' }}>30 dias do Hub Mirage GRÁTIS · Para os 500 primeiros fornecedores</span>
      </div>

      {/* LEFT: copy */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '52px 52px 28px' }}>
        <div style={{ color: '#a78bfa', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 14 }}>
          🧵 Fornecedor Têxtil?
        </div>
        <h1 style={{ color: '#ffffff', fontWeight: 900, fontSize: 44, lineHeight: 1.05, margin: '0 0 14px', letterSpacing: -1 }}>
          Cadastre-se grátis e<br />
          ganhe <span style={{ color: '#f59e0b' }}>30 dias do Hub Mirage.</span>
        </h1>
        <p style={{ color: '#c4b5fd', fontSize: 17, margin: '0 0 16px', lineHeight: 1.5 }}>
          Gestão, pedidos e financeiro para confecções — mais visibilidade para 500+ compradores.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {['🎁 30 dias grátis do Hub', '👁️ 500+ confecções', '🚫 Zero comissão'].map(t => (
            <div key={t} style={{ color: '#e9d5ff', fontWeight: 700, fontSize: 13, background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(167,139,250,0.3)', padding: '7px 13px', borderRadius: 999 }}>{t}</div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>Sem cartão · Decide se assina <strong style={{ color: '#fff' }}>só após 30 dias</strong></span>
        </div>

        {/* Logo */}
        <img src="/mirage-logo.png" alt="Mirage" style={{ height: 24, objectFit: 'contain', filter: 'brightness(0) invert(1) opacity(0.4)', marginTop: 8 }} />
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: 'linear-gradient(to bottom, transparent, rgba(167,139,250,0.4), transparent)', alignSelf: 'stretch', margin: '28px 0' }} />

      {/* RIGHT: QR */}
      <div style={{ position: 'relative', width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '52px 36px 28px' }}>
        <QR url={url} size={320} />
        <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }}>
          Escaneie e cadastre grátis
        </div>
        <div style={{ color: '#6d28d9', fontSize: 12, fontWeight: 600, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' }}>
          MIRAGE HUB
        </div>
      </div>
    </div>
  );
}

/* ─────────────── PAGE ─────────────── */
export default function ComunidadeCriativo() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [formato, setFormato] = useState<Formato>('feed');
  const [copiado, setCopiado] = useState(false);

  const url = window.location.origin + '/hub/comunidade/cadastro-fornecedor';
  const fmt = FORMATOS.find(f => f.id === formato)!;

  const handlePrint = () => window.print();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Barra superior */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="font-bold text-sm text-white">Criativo de Captação</h1>
            <p className="text-xs text-gray-400">Moda Conecta — compartilhe nas redes sociais e WhatsApp</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all border
              ${copiado ? 'bg-emerald-900/40 border-emerald-600 text-emerald-400' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiado ? 'Link copiado!' : 'Copiar link'}
          </button>
          <Button size="sm" onClick={handlePrint} className="bg-violet-600 hover:bg-violet-500">
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir / Salvar PDF
          </Button>
          <a
            href={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=1000x1000&margin=10&color=0f0a1e&bgcolor=ffffff`}
            download="qrcode-comunidade-mirage.png"
            target="_blank"
            rel="noreferrer"
          >
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar QR Code
            </Button>
          </a>
        </div>
      </div>

      {/* Seletor de formato */}
      <div className="px-6 py-5 flex items-center gap-3 print:hidden max-w-5xl mx-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-2">Formato:</p>
        {FORMATOS.map(f => (
          <button
            key={f.id}
            onClick={() => setFormato(f.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all
              ${formato === f.id
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-violet-500 hover:text-white'}`}
          >
            {f.label}
            <span className={`block text-xs font-normal mt-0.5 ${formato === f.id ? 'text-violet-200' : 'text-gray-500'}`}>{f.desc}</span>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="px-6 pb-12 max-w-5xl mx-auto print:p-0 print:max-w-none">
        <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5 print:rounded-none print:shadow-none">
          <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 text-xs text-gray-500 flex items-center gap-3 print:hidden">
            <span className="font-medium text-gray-300">{fmt.label}</span>
            <span>·</span>
            <span>{fmt.w}×{fmt.h}px</span>
            <span>·</span>
            <span className="text-amber-400 font-medium">Dica: Imprimir → Salvar como PDF para usar nas redes sociais</span>
          </div>
          <div
            ref={cardRef}
            style={{
              width: '100%',
              aspectRatio: formato === 'feed' ? '1/1' : formato === 'story' ? '9/16' : '1200/628',
              maxWidth: formato === 'story' ? '440px' : '100%',
              margin: '0 auto',
            }}
            className="print:w-full print:h-screen"
          >
            {formato === 'feed'   && <CardFeed   url={url} />}
            {formato === 'story'  && <CardStory  url={url} />}
            {formato === 'banner' && <CardBanner url={url} />}
          </div>
        </div>

        {/* Dicas de uso */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          {[
            { emoji: '📱', title: 'Instagram / Facebook', desc: 'Post Feed (quadrado) ou Story. Imprima como PDF e importe no Canva para personalizar com foto do seu negócio.' },
            { emoji: '💬', title: 'WhatsApp Business', desc: 'Use o Banner. Salve como PDF ou faça screenshot para enviar nos grupos de confeccionistas e clientes.' },
            { emoji: '🖨️', title: 'Flyer / Evento', desc: '"Imprimir / Salvar PDF" gera um PDF pronto para impressão. Ideal para feiras, showrooms e pontos de venda.' },
          ].map(d => (
            <div key={d.title} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="text-2xl mb-2">{d.emoji}</div>
              <p className="font-semibold text-sm mb-1 text-white">{d.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>

        {/* Estratégia de uso */}
        <div className="mt-4 bg-violet-950/50 border border-violet-800/40 rounded-xl p-5 print:hidden">
          <p className="text-xs font-bold text-violet-300 uppercase tracking-widest mb-3">Estratégia de divulgação sugerida</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-gray-300">
            {[
              { num: '1', title: 'Story diário', desc: 'Poste o Story com contagem regressiva de vagas disponíveis.' },
              { num: '2', title: 'Feed + fixar', desc: 'Post quadrado fixado no topo do perfil do negócio.' },
              { num: '3', title: 'WhatsApp grupos', desc: 'Banner nos grupos de confeccionistas com mensagem personalizada.' },
              { num: '4', title: 'Link na bio', desc: 'Coloque o link do cadastro diretamente na bio do Instagram.' },
            ].map(s => (
              <div key={s.num} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.num}</div>
                <div>
                  <p className="font-semibold text-white">{s.title}</p>
                  <p className="text-gray-400 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
