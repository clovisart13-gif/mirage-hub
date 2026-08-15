/**
 * Selos oficiais da R2PB para fornecedores e clientes da Comunidade.
 * Dois níveis: Verificado (emerald) e Recomendado (gold).
 */

interface SeloProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LOGO = '/r2pb-logo.ico';

/* ─── Verificado R2PB ─── */
export function SeloVerificado({ size = 'md', className = '' }: SeloProps) {
  const dims: Record<string, { w: number; h: number; logo: number; fontSize: number; gap: number }> = {
    sm:  { w: 90,  h: 26,  logo: 16, fontSize: 9,  gap: 4  },
    md:  { w: 128, h: 34,  logo: 22, fontSize: 11, gap: 5  },
    lg:  { w: 160, h: 42,  logo: 28, fontSize: 13, gap: 6  },
  };
  const d = dims[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-sm select-none ${className}`}
      style={{ paddingLeft: d.gap, paddingRight: d.gap + 2, paddingTop: 2, paddingBottom: 2, fontSize: d.fontSize, height: d.h }}
      title="Verificado pela R2PB — perfil auditado e aprovado pela equipe da Rede"
    >
      {/* shield SVG */}
      <svg width={d.logo - 4} height={d.logo - 2} viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M10 1L2 4.5V10C2 15.25 5.5 20.1 10 21.5C14.5 20.1 18 15.25 18 10V4.5L10 1Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 11L9 13L13 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* logo R2PB */}
      <img
        src={LOGO}
        alt="R2PB"
        style={{ width: d.logo, height: d.logo, objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />

      <span style={{ letterSpacing: '0.02em' }}>Verificado R2PB</span>
    </span>
  );
}

/* ─── Recomendado R2PB ─── */
export function SeloRecomendado({ size = 'md', className = '' }: SeloProps) {
  const dims: Record<string, { logo: number; fontSize: number; gap: number; height: number }> = {
    sm:  { logo: 16, fontSize: 9,  gap: 4, height: 26 },
    md:  { logo: 22, fontSize: 11, gap: 5, height: 34 },
    lg:  { logo: 28, fontSize: 13, gap: 6, height: 42 },
  };
  const d = dims[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-white font-bold shadow-sm select-none ${className}`}
      style={{ paddingLeft: d.gap, paddingRight: d.gap + 2, paddingTop: 2, paddingBottom: 2, fontSize: d.fontSize, height: d.height }}
      title="Recomendado pela R2PB — fornecedor curado e indicado pela equipe da Rede"
    >
      {/* star SVG */}
      <svg width={d.logo - 6} height={d.logo - 6} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
      </svg>

      {/* logo R2PB */}
      <img
        src={LOGO}
        alt="R2PB"
        style={{ width: d.logo, height: d.logo, objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />

      <span style={{ letterSpacing: '0.02em' }}>Recomendado R2PB</span>
    </span>
  );
}

/* ─── Versão compacta para cards (só ícone + sigla) ─── */
export function SeloVerificadoCompacto({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 shadow select-none ${className}`}
      title="Verificado pela R2PB"
    >
      <svg width="10" height="12" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 1L2 4.5V10C2 15.25 5.5 20.1 10 21.5C14.5 20.1 18 15.25 18 10V4.5L10 1Z" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 11L9 13L13 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <img src={LOGO} alt="" style={{ width: 14, height: 14, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      Verificado
    </span>
  );
}

export function SeloRecomendadoCompacto({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 shadow select-none ${className}`}
      title="Recomendado pela R2PB"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
      <img src={LOGO} alt="" style={{ width: 14, height: 14, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      R2PB
    </span>
  );
}
