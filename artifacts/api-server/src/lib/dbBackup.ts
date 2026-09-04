import { execFile } from "child_process";
import { promisify } from "util";
import { objectStorageClient } from "./objectStorage";
import { logger } from "./logger";
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

  try {
    logger.info({ msg: "🔄 Iniciando backup do banco de dados...", fileName });

    const databaseUrl = process.env.DATABASE_URL ?? "";

    // Executa pg_dump e captura o output em memória
    const { stdout } = await execFileAsync(
      "pg_dump",
      [databaseUrl, "--no-password", "-Fp"],
      { maxBuffer: 50 * 1024 * 1024, timeout: 120_000 }
    );

    const buffer = Buffer.from(stdout, "utf8");
    const sizeKb = Math.round(buffer.length / 1024);

    // Faz upload direto para o GCS via SDK
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const file = bucket.file(fileName);
    await file.save(buffer, {
      contentType: "text/plain",
      metadata: {
        created: new Date().toISOString(),
        sizeKb: String(sizeKb),
      },
    });

    logger.info({ msg: "✅ Backup salvo com sucesso", fileName, sizeKb });

    // Rotação: mantém apenas os últimos MAX_BACKUPS
    await rotateBackups(bucket);

    return { ok: true, fileName, sizeKb };
  } catch (err: any) {
    const msg = err.message ?? String(err);
    logger.error({ msg: "❌ Falha no backup do banco", error: msg });
    await logOperationalEvent({
      eventType: "db_backup_failure",
      severity: "critical",
      module: "database",
      description: `Falha no backup automático do banco: ${msg}`,
      metadata: { fileName },
    });
    return { ok: false, error: msg };
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
