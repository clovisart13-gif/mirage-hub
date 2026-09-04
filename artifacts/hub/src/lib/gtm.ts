/**
 * Google Tag Manager — utilitário centralizado
 *
 * Inicialização: chamar gtmInit() uma vez em main.tsx.
 * Eventos: gtmEvent({ event: "nome_do_evento", ...props })
 *
 * O container Mirage pode ser sobrescrito por VITE_GTM_ID. A medição é
 * carregada apenas nas rotas públicas da jornada comercial do Mirage.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const configuredGtmId = import.meta.env.VITE_GTM_ID as string | undefined;
const GTM_ID = configuredGtmId && configuredGtmId !== "%VITE_GTM_ID%" && configuredGtmId.trim()
  ? configuredGtmId
  : "GTM-MXF7FNQ9";

const MIRAGE_ACQUISITION_PATHS = new Set([
  "/",
  "/lp-sistema-mirage",
  "/lp-black-mirage",
  "/criar-conta",
]);

function isMirageAcquisitionJourney() {
  return MIRAGE_ACQUISITION_PATHS.has(window.location.pathname);
}

/** Inicializa o GTM — chamar uma vez antes de qualquer evento. */
export function gtmInit(): void {
  if (!isMirageAcquisitionJourney()) return;
  try {
    if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`)) return;
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
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
  } catch {
    // GTM bloqueado por ad-blocker — silencioso
  }
}

/**
 * Eventos da aquisição do Mirage. Dados pessoais não devem ser incluídos
 * nos parâmetros enviados para o GTM.
 */
export function mirageFunnelEvent(event: string, properties: Record<string, unknown> = {}): void {
  gtmEvent({
    event,
    product_context: "mirage_hub",
    tenant_context: "mirage",
    acquisition_journey: "self_serve_trial",
    page_path: window.location.pathname,
    page_title: document.title,
    ...properties,
  });
}
