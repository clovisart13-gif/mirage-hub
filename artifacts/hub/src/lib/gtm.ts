/**
 * Google Tag Manager — utilitário centralizado
 *
 * Inicialização: chamar gtmInit() uma vez em main.tsx.
 * Eventos: gtmEvent({ event: "nome_do_evento", ...props })
 *
 * Requer VITE_GTM_ID no ambiente (ex: GTM-XXXXXXX).
 * Se ausente, todas as chamadas são silenciosas (sem erro).
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;

/** Inicializa o GTM — chamar uma vez antes de qualquer evento. */
export function gtmInit(): void {
  if (!GTM_ID || GTM_ID === "%VITE_GTM_ID%" || GTM_ID.trim() === "") return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.appendChild(script);

    // noscript fallback
    const ns = document.createElement("noscript");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.cssText = "display:none;visibility:hidden";
    ns.appendChild(iframe);
    document.body.prepend(ns);
  } catch {
    // silencioso se GTM falhar
  }
}

/** Empurra um evento para o dataLayer do GTM. */
export function gtmEvent(payload: Record<string, unknown>): void {
  if (!GTM_ID || GTM_ID === "%VITE_GTM_ID%" || GTM_ID.trim() === "") return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
  } catch {
    // GTM bloqueado por ad-blocker — silencioso
  }
}
