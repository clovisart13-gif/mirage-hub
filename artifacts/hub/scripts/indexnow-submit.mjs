import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "www.gestaomirage.com.br";
const ORIGIN = `https://${HOST}`;
const KEY = "c30fd0a648c1bac52f5c857c1731cfef";
const keyLocation = `${ORIGIN}/${KEY}.txt`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function validateUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.host !== HOST ||
      url.username || url.password || url.search || url.hash) {
    throw new Error(`A URL deve ser HTTPS, sem query/hash e do domínio ${HOST}: ${value}`);
  }
  return url.href;
}

function decodeXml(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ({
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
  })[entity]);
}

async function main() {
  const localKey = await readFile(path.join(root, "public", `${KEY}.txt`), "utf8");
  if (localKey.trim() !== KEY || !/^[a-f0-9]{32}\s*$/.test(localKey)) {
    throw new Error("Arquivo local de verificação IndexNow inválido.");
  }

  const sitemapResponse = await fetch(`${ORIGIN}/sitemap.xml`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!sitemapResponse.ok) throw new Error(`Sitemap publicado: HTTP ${sitemapResponse.status}`);
  const sitemap = await sitemapResponse.text();
  const publishedUrls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
    .map(([, loc]) => validateUrl(decodeXml(loc.trim())));
  if (!sitemap.includes("<urlset") || publishedUrls.length === 0) {
    throw new Error("O sitemap publicado não contém URLs válidas.");
  }

  const argumentsList = process.argv.slice(2);
  const urlList = [...new Set(argumentsList.length
    ? argumentsList.map(validateUrl)
    : publishedUrls)];
  for (const url of urlList) {
    if (!publishedUrls.includes(url)) {
      throw new Error(`URL não consta no sitemap publicado: ${url}`);
    }
  }

  // Do not submit unless production serves the exact public key file, not the SPA fallback.
  const keyResponse = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) });
  const body = await keyResponse.text();
  const contentType = keyResponse.headers.get("content-type") ?? "";
  if (keyResponse.status !== 200 || !contentType.toLowerCase().startsWith("text/plain") ||
      body.trim() !== KEY || !/^[a-f0-9]{32}\s*$/.test(body)) {
    throw new Error(`Chave IndexNow indisponível em produção (HTTP ${keyResponse.status}, Content-Type: ${contentType}). Nenhuma URL enviada.`);
  }

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation, urlList }),
    signal: AbortSignal.timeout(15000),
  });
  console.log(`IndexNow: HTTP ${response.status} — ${urlList.length} URL(s)`);
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow recusou o envio: HTTP ${response.status} ${await response.text()}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});