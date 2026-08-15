/**
 * MarkdownContent — renderizador de markdown completamente isolado do reconciliador React.
 *
 * Usa `ref` + `useEffect` para setar innerHTML de forma imperativa, totalmente fora do
 * ciclo de reconciliação do React. Isso elimina definitivamente o erro `insertBefore`:
 * React vê apenas um <div> vazio sem filhos gerenciados — nunca tenta reconciliar
 * o conteúdo HTML gerado pelo marked/DOMPurify.
 */

import { memo, useRef, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Configuração global do marked — GFM ativo (tabelas, strikethrough, etc.)
marked.setOptions({ gfm: true, breaks: true });

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent = memo(({ content, className }: MarkdownContentProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const raw = marked.parse(content) as string;
    const clean = DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "s", "del", "code", "pre",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li", "blockquote",
        "table", "thead", "tbody", "tr", "th", "td",
        "a", "hr", "img", "span", "div",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
    });
    // Imperativo — React não vê nem gerencia esses filhos
    ref.current.innerHTML = clean;
  }, [content]);

  // React renderiza apenas um <div> vazio — nunca reconcilia os filhos do markdown
  return <div ref={ref} className={className} />;
});

MarkdownContent.displayName = "MarkdownContent";

export default MarkdownContent;
