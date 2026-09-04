/**
 * growthAssetBranding.ts
 *
 * Post-processing step for growth assets:
 * downloads the raw AI image from object storage,
 * applies tenant branding (logo + footer + optional headline),
 * uploads the branded version, and returns the new storage path.
 *
 * The raw image is kept as-is; only the composed version is exposed.
 */

import { randomUUID }         from "node:crypto";
import { objectStorageClient } from "./objectStorage";
import { applyTenantBranding }  from "./imageBranding";
import { logger }               from "./logger";

// ── helpers ───────────────────────────────────────────────────────────────────

function resolveBucketAndDir(): { bucketName: string; dirInBucket: string } {
  const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
  const clean      = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
  const slashIdx   = clean.indexOf("/");
  const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
  const dirInBucket= slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
  return { bucketName, dirInBucket };
}

async function downloadToBuffer(storagePath: string): Promise<Buffer> {
  // storagePath format: /objects/<path>
  if (!storagePath.startsWith("/objects/")) {
    throw new Error(`[growthAssetBranding] invalid storagePath: ${storagePath}`);
  }
  const relativePath = storagePath.slice("/objects/".length); // e.g. growth-assets/r2pb/…/uuid.png
  const { bucketName, dirInBucket } = resolveBucketAndDir();
  const objectName = dirInBucket ? `${dirInBucket}/${relativePath}` : relativePath;
  const file = objectStorageClient.bucket(bucketName).file(objectName);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = file.createReadStream();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return Buffer.concat(chunks);
}

async function uploadBuffer(
  buf: Buffer,
  mimeType: string,
  tenantId: string,
  campaignId: string | null,
): Promise<string> {
  const uid        = randomUUID();
  const ext        = mimeType === "image/jpeg" ? "jpg" : "png";
  const assetPath  = `growth-assets/${tenantId}/${campaignId ?? "no-campaign"}/branded-${uid}.${ext}`;
  const { bucketName, dirInBucket } = resolveBucketAndDir();
  const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

  await objectStorageClient
    .bucket(bucketName)
    .file(objectName)
    .save(buf, { contentType: mimeType, resumable: false });

  return `/objects/${assetPath}`;
}

// ── main export ───────────────────────────────────────────────────────────────

export interface BrandingOptions {
  rawStoragePath: string;   // /objects/growth-assets/…
  tenantId: string;
  campaignId: string | null;
  headline?: string | null; // shown as overlay text on the image
  /** "feed" → 1024×1280 portrait 4:5; "story"/"reel" → 1024×1536 vertical 9:16 */
  slotType?: "feed" | "story" | "reel" | null;
}

/**
 * Downloads the raw image, applies tenant branding, uploads the branded version.
 * Returns the new storage path — use this as the asset's outputUrl.
 */
export async function applyBrandingToStoredImage(opts: BrandingOptions): Promise<string> {
  const { rawStoragePath, tenantId, campaignId, headline, slotType } = opts;

  // feed → 4:5 portrait (1024×1280); story/reel → 9:16 (1024×1536); unknown → square
  const outputHeight =
    slotType === "story" || slotType === "reel" ? 1536 :
    slotType === "feed"                         ? 1280 :
    1024;

  const rawBuffer     = await downloadToBuffer(rawStoragePath);
  // Rotate through 4 layout variants for creative variety — determined by current second mod 4
  const layoutVariant = Math.floor(Date.now() / 1000) % 4;

  const brandedBuffer = await applyTenantBranding(
    rawBuffer,
    tenantId,
    1024,           // output width
    "auto",         // auto-detect light/dark for logo
    headline ?? undefined,
    outputHeight,
    layoutVariant,
  );

  const branded = await uploadBuffer(brandedBuffer, "image/png", tenantId, campaignId);
  logger.info({ tenantId, campaignId, branded }, "[growthAssetBranding] branded image uploaded");
  return branded;
}
