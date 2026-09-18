import { execFile } from "child_process";
import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { objectStorageClient } from "./objectStorage";
import { logger, redactDatabaseCredentials } from "./logger";
import { logOperationalEvent } from "../routes/operational-events";

const execFileAsync = promisify(execFile);

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? "";
const BACKUP_PREFIX = "db-backups/heliumdb";
const MAX_BACKUPS = 10;
const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

let backupTimer: ReturnType<typeof setInterval> | null = null;

export async function runDbBackup(): Promise<{ ok: boolean; fileName?: string; sizeKb?: number; error?: string }> {
  if (!BUCKET_ID) {
    const msg = "DEFAULT_OBJECT_STORAGE_BUCKET_ID não configurado — backup ignorado";
    logger.warn({ msg });
    return { ok: false, error: msg };
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${BACKUP_PREFIX}/${ts}.sql`;
  const tempFilePath = join(tmpdir(), `mirage-db-backup-${randomUUID()}.sql`);

  try {
    logger.info({ msg: "🔄 Iniciando backup do banco de dados...", fileName });

    const databaseUrl = process.env.DATABASE_URL ?? "";

    // Grava o dump diretamente em disco para não limitar o tamanho pelo stdout/maxBuffer.
    await execFileAsync(
      "pg_dump",
      [databaseUrl, "--no-password", "-Fp", "--file", tempFilePath],
      { timeout: 120_000 }
    );

    const dumpStats = await stat(tempFilePath);
    const sizeKb = Math.round(dumpStats.size / 1024);

    // Faz upload por stream para o mesmo destino no GCS.
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const file = bucket.file(fileName);
    await pipeline(createReadStream(tempFilePath), file.createWriteStream({
      resumable: false,
      contentType: "text/plain",
      metadata: {
        metadata: {
          created: new Date().toISOString(),
          sizeKb: String(sizeKb),
        },
      },
    }));

    logger.info({ msg: "✅ Backup salvo com sucesso", fileName, sizeKb });

    // Rotação: mantém apenas os últimos MAX_BACKUPS
    await rotateBackups(bucket);

    return { ok: true, fileName, sizeKb };
  } catch (err: any) {
    const msg = redactDatabaseCredentials(err.message ?? String(err));
    logger.error({ msg: "❌ Falha no backup do banco", error: msg });
    await logOperationalEvent({
      eventType: "db_backup_failure",
      severity: "critical",
      module: "database",
      description: `Falha no backup automático do banco: ${msg}`,
      metadata: { fileName },
    });
    return { ok: false, error: msg };
  } finally {
    await unlink(tempFilePath).catch(() => undefined);
  }
}

async function rotateBackups(bucket: ReturnType<typeof objectStorageClient.bucket>): Promise<void> {
  try {
    const [files] = await bucket.getFiles({ prefix: `${BACKUP_PREFIX}/` });
    const sorted = files
      .filter(f => f.name.endsWith(".sql"))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (sorted.length > MAX_BACKUPS) {
      const toDelete = sorted.slice(0, sorted.length - MAX_BACKUPS);
      for (const f of toDelete) {
        await f.delete();
        logger.info({ msg: "🗑 Backup antigo removido", file: f.name });
      }
    }
  } catch (err: any) {
    logger.warn({ msg: "Aviso: falha na rotação de backups", error: err.message });
  }
}

export async function listDbBackups(): Promise<Array<{ name: string; created: string; sizeKb: number }>> {
  if (!BUCKET_ID) return [];
  try {
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const [files] = await bucket.getFiles({ prefix: `${BACKUP_PREFIX}/` });
    const result = files
      .filter(f => f.name.endsWith(".sql"))
      .sort((a, b) => b.name.localeCompare(a.name))
      .map(f => ({
        name: f.name.replace(`${BACKUP_PREFIX}/`, ""),
        created: f.metadata?.timeCreated ?? "",
        sizeKb: Number(f.metadata?.size ?? 0) / 1024,
      }));
    return result;
  } catch {
    return [];
  }
}

export function startBackupScheduler(): void {
  if (!BUCKET_ID) {
    logger.warn({ msg: "⚠️ Backup automático desativado — DEFAULT_OBJECT_STORAGE_BUCKET_ID ausente" });
    return;
  }

  // Primeiro backup 2 minutos após o startup
  setTimeout(() => {
    runDbBackup().then(r => {
      if (r.ok) logger.info({ msg: "✅ Backup inicial concluído", ...r });
    });
  }, 2 * 60 * 1000);

  // Backup a cada 6 horas
  backupTimer = setInterval(() => {
    runDbBackup().then(r => {
      if (!r.ok) logger.error({ msg: "❌ Backup agendado falhou", error: r.error });
    });
  }, BACKUP_INTERVAL_MS);

  logger.info({ msg: "⏱ Backup automático agendado a cada 6h. Primeiro backup em 2 min." });
}
