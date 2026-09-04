// Script temporário — cria criativo de tela real do Kanban no Growth
import { createRequire } from "module";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";

const require = createRequire(import.meta.url);

// pg
const pgPath = "/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg";
const { Pool } = require(pgPath);

// @google-cloud/storage
const storagePath = "/home/runner/workspace/node_modules/.pnpm/@google-cloud+storage@7.19.0/node_modules/@google-cloud/storage/build/cjs/src/index.js";
const { Storage } = require(storagePath);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const imgBuffer = readFileSync("/home/runner/workspace/screenshots/kanban-preview-creative.jpg");

const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
const clean      = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
const slashIdx   = clean.indexOf("/");
const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";

console.log("Bucket:", bucketName, "| Dir:", dirInBucket);

const storage = new Storage();
const uuid       = randomUUID();
const assetPath  = `growth-assets/mirage/product-screenshots/${uuid}.jpg`;
const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

await storage.bucket(bucketName).file(objectName).save(imgBuffer, {
  contentType: "image/jpeg",
  resumable: false,
});
const outputUrl = `/objects/${assetPath}`;
console.log("Upload OK:", outputUrl);

// Campanha
const campRes = await pool.query(
  `INSERT INTO growth_campaigns (tenant_id, name, objective, channel, source, creative_mode, status)
   VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
  ["mirage", "Kanban — Telas Reais", "Interface real do Kanban de Produção do Mirage Hub", "instagram", "product_screenshot", "product_screenshot", "active"]
);
const campaignId = campRes.rows[0].id;
console.log("Campaign:", campaignId);

// Slot
const slotRes = await pool.query(
  `INSERT INTO growth_campaign_slots (tenant_id, campaign_id, slot_type, slot_index, creative_axis, status)
   VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
  ["mirage", campaignId, "feed", 1, "Tela real — kanban", "pending_generation"]
);
const slotId = slotRes.rows[0].id;
console.log("Slot:", slotId);

const headline = "Controle de produção em tempo real — Mirage Hub";
const caption  = "Acompanhe cada Ordem de Produção em tempo real com o Kanban de Produção do Mirage Hub. 14 fases da confecção, prazos, CMO e equipe — numa interface visual intuitiva. 🎯 Menos planilha, mais controle.\n\n#MirageHub #Confecção #KanbanDeProdução #GestãoDeModa #TechFashion";

// Asset
const assetRes = await pool.query(
  `INSERT INTO growth_assets
     (tenant_id, campaign_id, asset_type, provider, title, output_url, headline, caption, status, source_pipeline, prompt_input)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
  ["mirage", campaignId, "image", "manual", "Kanban — Tela Real #1", outputUrl, headline, caption, "awaiting_approval", "product_screenshot",
   JSON.stringify({ module: "kanban", source: "hub_real_screen" })]
);
const assetId = assetRes.rows[0].id;
console.log("Asset:", assetId);

// Vincular
await pool.query(
  `UPDATE growth_campaign_slots SET asset_id=$1, status=$2 WHERE id=$3`,
  [assetId, "generated", slotId]
);

console.log("\n✅ DONE");
console.log("campaign_id =", campaignId);
console.log("asset_id    =", assetId);
console.log("output_url  =", outputUrl);
console.log("headline    =", headline);

await pool.end();
