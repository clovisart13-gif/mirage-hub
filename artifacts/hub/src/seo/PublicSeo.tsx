import { useEffect } from "react";
import { useLocation } from "wouter";
import { PUBLIC_PAGES, SEO_ORIGIN } from "./public-pages";

function setMeta(selector: string, content: string) {
  const tag = document.querySelector<HTMLMetaElement>(selector);
  if (tag && tag.content !== content) tag.content = content;
}

function setCanonical(href: string) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (link && link.getAttribute("href") !== href) link.setAttribute("href", href);
}

export default function PublicSeo() {
  const [location] = useLocation();
  useEffect(() => {
    const path = location.replace(/\/+$/, "") || "/";
    const page = PUBLIC_PAGES[path as keyof typeof PUBLIC_PAGES];
    // No changes to authenticated, account or transactional pages.
    if (!page && /^\/(?:hub|admin|operacoes|login|register|comecar|criar-conta|checkout|acesso|recuperar-senha|onboarding|ajuda|kanban-preview|kanban-shot)(?:\/|$)/.test(path)) return;

    const title = page?.title ?? "Página não encontrada | Mirage Hub";
    const description = page?.description ?? "A página solicitada não foi encontrada no Mirage Hub.";
    const canonical = SEO_ORIGIN + (page?.canonical ?? path);
    const robots = page && "robots" in page ? page.robots : page ? "index, follow" : "noindex, follow";

    const syncHead = () => {
      if (document.title !== title) document.title = title;
      setMeta('meta[name="description"]', description);
      setMeta('meta[name="robots"]', robots);
      setCanonical(canonical);
      setMeta('meta[property="og:title"]', title);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[property="og:url"]', canonical);
      setMeta('meta[name="twitter:title"]', title);
      setMeta('meta[name="twitter:description"]', description);
    };

    syncHead();
    // Restore public metadata if a later client script changes the head.
    const observer = new MutationObserver(syncHead);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["content", "href"],
    });
    return () => observer.disconnect();
  }, [location]);
  return null;
}