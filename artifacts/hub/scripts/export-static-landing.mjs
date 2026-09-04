import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const hubRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(hubRoot, "../..");
const buildDir = path.join(hubRoot, ".static-landing-build", "sistema");
const assetsDir = path.join(workspaceRoot, "attached_assets");
const deliveryDir = path.join(workspaceRoot, ".tmp-lp-mirage-delivery");

const [css, js, logo] = await Promise.all([
  readFile(path.join(buildDir, "landing.css"), "utf8"),
  readFile(path.join(buildDir, "landing.js"), "utf8"),
  readFile(path.join(buildDir, "mirage_logo_dark_transparent.png")),
]);

const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;
const selfContainedBundle = js.replaceAll("/mirage_logo_dark_transparent.png", logoDataUrl);
const gtmId = "GTM-MXF7FNQ9";

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Sistema Mirage | Gestão para Confecção" />
  <title>Sistema Mirage | Gestão para Confecção</title>
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>
  <style>${css}</style>
</head>
<body>
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <div id="root"></div>
  <script>${selfContainedBundle}</script>
</body>
</html>`;

await writeFile(path.join(assetsDir, "lp-sistema-mirage.html"), html);

await rm(deliveryDir, { recursive: true, force: true });
await mkdir(path.join(deliveryDir, "lp-sistema-mirage"), { recursive: true });
await mkdir(path.join(deliveryDir, "lp-black-mirage"), { recursive: true });
await writeFile(path.join(deliveryDir, "lp-sistema-mirage", "index.html"), html);
await writeFile(
  path.join(deliveryDir, "lp-black-mirage", "index.html"),
  await readFile(path.join(assetsDir, "lp-black-mirage.html")),
);
await writeFile(
  path.join(deliveryDir, "LEIA-ME.txt"),
  "Publique cada index.html no diretório correspondente do domínio.\n\n" +
    "LP oficial de campanha: /lp-sistema-mirage\n" +
    "A LP Sistema Mirage já inclui o container GTM-MXF7FNQ9.\n",
);

const outputZip = path.join(assetsDir, "lps-mirage-para-marcus.zip");
await rm(outputZip, { force: true });
execFileSync("zip", ["-q", "-r", outputZip, "lp-sistema-mirage", "lp-black-mirage", "LEIA-ME.txt"], {
  cwd: deliveryDir,
});

console.log(`HTML e ZIP atualizados em ${assetsDir}`);