import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformWithEsbuild } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist/public");
const shell = await readFile(path.join(output, "index.html"), "utf8");
const source = await readFile(path.join(root, "src/seo/public-pages.ts"), "utf8");
const compiled = await transformWithEsbuild(source, "public-pages.ts", { loader: "ts" });
const { PUBLIC_PAGES, SEO_ORIGIN } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.code).toString("base64")}`
);
const sitemapHints = {
  "/": ["weekly", "1.0"],
  "/lp-sistema-mirage": ["monthly", "0.9"],
  "/kanban-producao-confeccao": ["monthly", "0.9"],
  "/moda-conecta/fundadores": ["weekly", "0.8"],
  "/planos": ["monthly", "0.7"],
  "/privacidade": ["monthly", "0.3"],
  "/termos": ["monthly", "0.3"],
};
const canonicalPaths = [...new Set(Object.values(PUBLIC_PAGES)
  .filter(page => page.robots !== "noindex, follow")
  .map(page => page.canonical))];
const lastmod = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const xmlEscape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${canonicalPaths.map(canonical => {
  const [changefreq, priority] = sitemapHints[canonical] ?? ["weekly", "0.5"];
  return `  <url>
    <loc>${xmlEscape(SEO_ORIGIN + canonical)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join("\n")}
</urlset>
`;
await writeFile(path.join(output, "sitemap.xml"), sitemap);
const contentSource = await readFile(path.join(root, "src/seo/public-content.ts"), "utf8");
const contentCompiled = await transformWithEsbuild(contentSource, "public-content.ts", { loader: "ts" });
const { PUBLIC_CONTENT, publicPlanPrices } = await import(
  `data:text/javascript;base64,${Buffer.from(contentCompiled.code).toString("base64")}`
);

// Never publish static prices that differ from the source of /billing/catalogo.
const catalogSource = await readFile(path.join(root, "../api-server/src/routes/billing/index.ts"), "utf8");
const catalogPlans = catalogSource.split("export const PLANOS = [")[1]?.split("export const TRIAL_APPS")[0];
if (!catalogPlans) throw new Error("Catálogo de planos não encontrado; verifique os preços do snapshot.");
for (const plan of publicPlanPrices) {
  const match = catalogPlans.match(new RegExp(`id: "${plan.id}",\\s*nome: "([^"]+)",\\s*descricao: "([^"]+)",\\s*preco_mensal: (\\d+),[\\s\\S]*?apps_incluidos: \\[([^\\]]+)\\],\\s*limites: \\{ usuarios: (-?\\d+)`));
  const appNames = { kanban: "Kanban Mirage", orcamento: "Orçamento Mirage", comunidade: "Moda Conecta", plm: "PLM Mirage", financeiro: "Financeiro Mirage", crm: "CRM Mirage", erp: "ERP Mirage" };
  const apps = match?.[4].match(/"[^"]+"/g)?.map(key => appNames[key.slice(1, -1)]);
  const users = Number(match?.[5]) === -1 ? "Usuários ilimitados" : `Até ${match?.[5]} usuários`;
  if (!match || match[1] !== plan.name || match[2] !== plan.description || Number(match[3]) !== plan.monthly ||
    JSON.stringify(apps) !== JSON.stringify(plan.apps) || users !== plan.users) {
    throw new Error(`Snapshot /planos divergente do catálogo: ${plan.id}`);
  }
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function replaceHead(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`Head base sem tag esperada: ${pattern}`);
  return html.replace(pattern, replacement);
}

function renderSnapshot(content, route) {
  const sections = content.sections.map(section => `
      <section style="margin-top:3rem"><h2 style="font-size:1.75rem;line-height:1.25;font-weight:700;margin-bottom:1rem">${escapeHtml(section.title)}</h2>
        ${(section.paragraphs ?? []).map(text => `<p>${escapeHtml(text)}</p>`).join("\n        ")}
        ${section.items?.length ? `<${section.ordered ? "ol" : "ul"}>${section.items.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</${section.ordered ? "ol" : "ul"}>` : ""}
        ${section.table ? `<table><thead><tr><th scope="col">Critério</th>${section.table.headers.map(h => `<th scope="col">${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${section.table.rows.map(([label, ...cells]) => `<tr><th scope="row">${escapeHtml(label)}</th>${cells.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : ""}
        ${section.note ? `<p><small>${escapeHtml(section.note)}</small></p>` : ""}
        ${(section.plans ?? []).map(plan => {
          const annual = Math.round(plan.monthly * 12 * 0.8);
          return `<article><h3>${escapeHtml(plan.name)}</h3><p>${escapeHtml(plan.description)}</p>
          <p>R$ ${plan.monthly.toLocaleString("pt-BR")}/mês</p>
          <p>R$ ${Math.round(annual / 12).toLocaleString("pt-BR")}/mês · R$ ${annual.toLocaleString("pt-BR")}/ano · sem implantação</p>
          <ul>${[...plan.apps, plan.users].map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></article>`;
        }).join("\n        ")}
      </section>`).join("");
  const faq = content.faq?.length ? `
      <section style="margin-top:3rem"><h2 style="font-size:1.75rem;font-weight:700">${escapeHtml(content.faqTitle)}</h2>
        ${content.faq.map(({ q, a }) => `<article style="margin-top:1.25rem"><h3 style="font-weight:700">${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></article>`).join("\n        ")}
      </section>` : "";
  const light = route === "/planos" || route === "/privacidade" || route === "/termos";
  return `<main aria-label="${escapeHtml(content.h1)}" style="min-height:100vh;padding:clamp(4rem,9vw,9rem) max(1.5rem,calc((100vw - 72rem)/2));background:${light ? "#fff" : "#101016"};color:${light ? "#171717" : "#f8fafc"};font:16px/1.65 system-ui,sans-serif">
      <h1 style="font-size:clamp(2.25rem,4vw,3.75rem);line-height:1.15;font-weight:800;max-width:44rem">${escapeHtml(content.h1)}</h1>
      <p style="font-size:1.125rem;max-width:44rem;margin-top:1.5rem">${escapeHtml(content.intro)}</p>
      ${(content.introExtra ?? []).map(text => `<p>${escapeHtml(text)}</p>`).join("")}
      ${(content.actions ?? []).map(({ text, href }) => `<a href="${escapeHtml(href)}" style="display:inline-block;margin:1rem 1rem 0 0;color:#c4b5fd">${escapeHtml(text)}</a>`).join("")}
      ${sections}${faq}
      ${content.finalCta ? `<p><a href="${escapeHtml(content.finalCta.href)}">${escapeHtml(content.finalCta.text)}</a></p>` : ""}
    </main>`;
}

function jsonLd(data) {
  // Prevent textual content from closing the script element.
  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`;
}

function pageHtml(page, route) {
  const url = SEO_ORIGIN + page.canonical;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const canonical = escapeHtml(url);
  let html = shell;
  html = replaceHead(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = replaceHead(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`);
  html = replaceHead(html, /<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${page.robots ?? "index, follow"}" />`);
  html = replaceHead(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`);
  for (const [property, content] of [
    ["og:title", title], ["og:description", description], ["og:url", canonical],
  ]) {
    html = replaceHead(html, new RegExp(`<meta property="${property}" content="[^"]*" \\/>`), `<meta property="${property}" content="${content}" />`);
  }
  for (const [name, content] of [
    ["twitter:title", title], ["twitter:description", description],
  ]) {
    html = replaceHead(html, new RegExp(`<meta name="${name}" content="[^"]*" \\/>`), `<meta name="${name}" content="${content}" />`);
  }
  const contentRoute = route === "/lp-sistema" ? "/lp-sistema-mirage"
    : route === "/lp-modaconecta" ? "/moda-conecta/fundadores" : route;
  const content = PUBLIC_CONTENT[contentRoute];
  if (!content && page.robots !== "noindex, follow") {
    throw new Error(`Conteúdo de snapshot ausente para rota indexável: ${route}`);
  }
  if (content) {
    if (page.robots === "noindex, follow") throw new Error(`Snapshot indexável em rota noindex: ${route}`);
    const schemas = [];
    if (route !== "/") schemas.push({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Mirage Hub", item: SEO_ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: content.h1, item: url },
      ],
    });
    if (content.faq?.length) schemas.push({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: content.faq.map(({ q, a }) => ({
        "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a },
      })),
    });
    html = replaceHead(html, /<\/head>/, `${schemas.map(jsonLd).join("\n    ")}\n  </head>`);
    html = replaceHead(html, /<div id="root"><\/div>/,
      `<div id="root">${renderSnapshot(content, route)}</div>`);
  }
  return html;
}

for (const [route, page] of Object.entries(PUBLIC_PAGES)) {
  const html = pageHtml(page, route);
  const destination = route === "/" ? path.join(output, "index.html") : path.join(output, route.slice(1));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html);
  console.log(`Head público: ${route} → ${path.relative(output, destination)}`);
}