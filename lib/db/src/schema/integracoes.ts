/**
 * ============================================================
 *  SCHEMA INTEGRAÇÕES MIRAGE
 * ============================================================
 *  Credenciais de integrações externas por tenant.
 *  Cada assinante configura suas próprias chaves de API
 *  para emissores de NF e plataformas de cobrança.
 *
 *  INTEGRAÇÕES SUPORTADAS:
 *  asaas    → Cobrança + NFS-e (nota fiscal de serviço)
 *  focusnfe → NF-e de produto (ICMS) via Focus NFe
 *  plugnotas→ NF-e / NFS-e via PlugNotas (em breve)
 * ============================================================
 */

import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  text,
  unique,
} from "drizzle-orm/pg-core";

export const tenantIntegracoes = pgTable(
  "tenant_integracoes",
  {
    id:         serial("id").primaryKey(),
    tenantId:   varchar("tenant_id", { length: 255 }).notNull(),
    chave:      varchar("chave", { length: 50 }).notNull(),
    ambiente:   varchar("ambiente", { length: 20 }).default("sandbox").notNull(),
    apiKey:     text("api_key"),
    config:     text("config"),
    ativo:      boolean("ativo").default(false).notNull(),
    testedAt:   timestamp("tested_at"),
    createdAt:  timestamp("created_at").defaultNow().notNull(),
    updatedAt:  timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqTenantChave: unique("tenant_integracoes_tenant_chave_key").on(t.tenantId, t.chave),
  }),
);
