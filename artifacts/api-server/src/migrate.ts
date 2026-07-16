import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createCampaignMetricsTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_slug TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        publication_id UUID,
        channel TEXT NOT NULL DEFAULT 'instagram',
        external_post_id TEXT,
        metric_date DATE NOT NULL,
        impressions INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        profile_visits INTEGER DEFAULT 0,
        link_clicks INTEGER DEFAULT 0,
        direct_messages INTEGER DEFAULT 0,
        leads_generated INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign
        ON campaign_metrics (company_slug, campaign_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_metrics_publication
        ON campaign_metrics (publication_id)
    `);
    logger.info({ msg: "✅ Tabela campaign_metrics OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela campaign_metrics", error: msg });
  }
}

export async function createCampaignPublicationsTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_publications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_slug TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        content_item_id UUID,
        asset_id UUID,
        channel TEXT NOT NULL DEFAULT 'instagram',
        caption TEXT,
        scheduled_at TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'scheduled',
        external_post_id TEXT,
        external_account_id TEXT,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_publications_campaign
        ON campaign_publications (company_slug, campaign_id)
    `);
    logger.info({ msg: "✅ Tabela campaign_publications OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela campaign_publications", error: msg });
  }
}

export async function createCampaignAssetsTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_slug TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        content_item_id UUID,
        asset_type TEXT NOT NULL DEFAULT 'image',
        storage_path TEXT NOT NULL,
        prompt_used TEXT,
        status TEXT NOT NULL DEFAULT 'ready',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign
        ON campaign_assets (company_slug, campaign_id)
    `);
    logger.info({ msg: "✅ Tabela campaign_assets OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela campaign_assets", error: msg });
  }
}

export async function seedContentPackIfNeeded() {
  try {
    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM content_pack_items WHERE campaign_id != 'test-ping'"
    );
    const count = parseInt(result.rows[0]?.count ?? "0", 10);

    if (count > 0) {
      logger.info({ msg: "✅ content_pack_items já tem dados", count });
      return;
    }

    logger.info({ msg: "🔄 content_pack_items vazio — aplicando seed de campanha R2PB..." });

    const sqlFile = path.join(__dirname, "content-pack-seed.sql");
    const databaseUrl = process.env["DATABASE_URL"];

    if (!databaseUrl) {
      logger.error({ msg: "❌ DATABASE_URL não configurado, seed abortado" });
      return;
    }

    execFileSync("psql", [databaseUrl, "-f", sqlFile, "-v", "ON_ERROR_STOP=0"], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
      encoding: "utf8",
    });

    const after = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM content_pack_items WHERE campaign_id != 'test-ping'"
    );
    const afterCount = parseInt(after.rows[0]?.count ?? "0", 10);
    logger.info({ msg: "✅ Seed content_pack concluído", itens_inseridos: afterCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha no seed content_pack", error: msg });
  }
}

export async function seedCampaignAssetsIfNeeded() {
  try {
    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM campaign_assets"
    );
    const count = parseInt(result.rows[0]?.count ?? "0", 10);

    if (count > 0) {
      logger.info({ msg: "✅ campaign_assets já tem dados", count });
      return;
    }

    logger.info({ msg: "🔄 campaign_assets vazio — aplicando seed R2PB..." });

    await pool.query(`
      INSERT INTO campaign_assets (company_slug, campaign_id, asset_type, storage_path, created_at)
      VALUES
        ('r2pb', 'r2pb_1778948949951', 'story_frame',    '/objects/campaign-assets/r2pb/r2pb_1778948949951/5837c4fe-0285-4e87-a3e7-05dd49970a81.jpg',    NOW()),
        ('r2pb', 'r2pb_1778948949951', 'carousel_slide', '/objects/campaign-assets/r2pb/r2pb_1778948949951/c4608c3c-32cc-4756-b2a6-de46fa0472e1.jpg', NOW()),
        ('r2pb', 'r2pb_1778948949951', 'feed_image',     '/objects/campaign-assets/r2pb/r2pb_1778948949951/8d62b492-c4e6-43ca-8a57-e175f9e7c6a9.jpg',     NOW())
      ON CONFLICT DO NOTHING
    `);

    logger.info({ msg: "✅ Seed campaign_assets R2PB concluído", inseridos: 3 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha no seed campaign_assets", error: msg });
  }
}

export async function seedBrandBlueprintsIfNeeded() {
  try {
    // Garante que a tabela existe (produção pode não ter rodado push-force)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brand_blueprints (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_slug text NOT NULL UNIQUE,
        nome_marca text,
        segmento text,
        descricao text,
        proposito text,
        promessa text,
        diferencial text,
        publico_principal text,
        dores jsonb DEFAULT '[]',
        desejos jsonb DEFAULT '[]',
        tom_de_voz text,
        adjetivos jsonb DEFAULT '[]',
        estilo_visual text,
        referencias_esteticas text,
        produto_principal text,
        objetivo_atual text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);

    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM brand_blueprints"
    );
    const count = parseInt(result.rows[0]?.count ?? "0", 10);
    if (count > 0) {
      logger.info({ msg: "✅ brand_blueprints já tem dados", count });
      return;
    }
    logger.info({ msg: "🔄 brand_blueprints vazio — aplicando seed Mirage e R2PB..." });
    await pool.query(`
      INSERT INTO brand_blueprints (
        company_slug, nome_marca, segmento, descricao, proposito, promessa, diferencial,
        publico_principal, dores, desejos, tom_de_voz, adjetivos, estilo_visual,
        referencias_esteticas, produto_principal, objetivo_atual, created_at, updated_at
      ) VALUES
      (
        'mirage', 'Mirage', 'SaaS para confecção brasileira',
        'Plataforma operacional que digitaliza e organiza a produção têxtil brasileira.',
        'organizar e profissionalizar a operação da confecção brasileira',
        'dar clareza operacional e digitalização prática para confecções',
        'única plataforma construída por quem vive o chão de fábrica têxtil',
        'confecções pequenas e médias em profissionalização',
        ARRAY['perda de controle da produção','custo invisível de retrabalho','dependência de planilhas'],
        ARRAY['visibilidade total da operação','redução de desperdício','profissionalização do negócio'],
        'Próximo, direto, prático — sem jargão de TI',
        ARRAY['organizado','prático','confiável','brasileiro'],
        'Clean industrial — tons neutros com acento em roxo/índigo',
        'Notion, Linear, monday.com — adaptado para o chão de fábrica',
        'hub operacional para confecção',
        'converter trials e validar aquisição',
        NOW(), NOW()
      ),
      (
        'r2pb', 'R2PB', 'private label premium',
        'Produção private label para marcas premium de moda, streetwear e fitness.',
        'entregar produção premium que preserve e fortaleça a marca do cliente',
        'produção private label premium com qualidade e previsibilidade',
        'capacidade industrial com sensibilidade de marca — não só fábrica, parceiro de produto',
        'marcas premium de streetwear, fitness e alfaiataria',
        ARRAY['fábricas que não entendem o posicionamento da marca','baixa previsibilidade de entrega','qualidade inconsistente'],
        ARRAY['parceiro que entende branding','produção que eleva o produto','processo transparente'],
        'Profissional, parceiro, orientado a detalhe — tom de quem entende moda',
        ARRAY['premium','preciso','parceiro','confiável'],
        'Elegante e técnico — preto, branco, detalhes em dourado ou grafite',
        'Everlane (processo transparente), Cuyana (qualidade sem exagero)',
        'produção private label premium',
        'gerar leads qualificados de marcas premium',
        NOW(), NOW()
      )
      ON CONFLICT (company_slug) DO NOTHING
    `);
    logger.info({ msg: "✅ Seed brand_blueprints concluído" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha no seed brand_blueprints", error: msg });
  }
}

export async function runMigrationIfNeeded() {
  try {
    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM pedidos"
    );
    const count = parseInt(result.rows[0]?.count ?? "0", 10);

    if (count > 0) {
      logger.info({ msg: "✅ Banco já tem dados, migração não necessária", pedidos: count });
      return;
    }

    logger.info({ msg: "🔄 Banco vazio detectado, iniciando migração de dados..." });

    const sqlFile = path.join(__dirname, "migration-seed.sql");
    const databaseUrl = process.env["DATABASE_URL"];

    if (!databaseUrl) {
      logger.error({ msg: "❌ DATABASE_URL não configurado, migração abortada" });
      return;
    }

    execFileSync("psql", [databaseUrl, "-f", sqlFile, "-v", "ON_ERROR_STOP=0"], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
      encoding: "utf8",
    });

    const after = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM pedidos"
    );
    const afterCount = parseInt(after.rows[0]?.count ?? "0", 10);
    logger.info({ msg: "✅ Migração concluída", pedidos_importados: afterCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha na migração de dados", error: msg });
  }
}

export async function createHelenaTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS helena_card_migrations (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(100) NOT NULL DEFAULT '',
        card_id VARCHAR(36) NOT NULL,
        card_title VARCHAR(500) NOT NULL,
        card_key VARCHAR(50),
        outcome VARCHAR(10) NOT NULL,
        source_step_id VARCHAR(36) NOT NULL,
        source_step_title VARCHAR(255),
        contact_name VARCHAR(255),
        contact_phone VARCHAR(100),
        monetary_amount NUMERIC(12,2),
        destination_card_id VARCHAR(36),
        migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Adicionar tenant_id se a tabela já existia sem a coluna (migração incremental)
    await pool.query(`
      ALTER TABLE helena_card_migrations
        ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) NOT NULL DEFAULT ''
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_helena_migrations_tenant
        ON helena_card_migrations (tenant_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_helena_migrations_outcome
        ON helena_card_migrations (outcome)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_helena_migrations_migrated_at
        ON helena_card_migrations (migrated_at DESC)
    `);
    // Corrigir registros gravados como 'unknown' antes de ter o parâmetro ?tenant na URL
    await pool.query(`
      UPDATE helena_card_migrations SET tenant_id = 'r2pb' WHERE tenant_id = 'unknown'
    `);
    logger.info({ msg: "✅ Tabela helena_card_migrations OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela helena_card_migrations", error: msg });
  }
}

export async function fixCmoHistoricoIfNeeded() {
  try {
    const result = await pool.query<{ count: string; total: string }>(
      "SELECT COUNT(*)::text as count, COALESCE(SUM(cmo), 0)::text as total FROM movimentacoes WHERE fase_origem = fase_destino AND cmo > 0"
    );
    const count = parseInt(result.rows[0]?.count ?? "0", 10);
    if (count === 0) {
      logger.info({ msg: "✅ CMO histórico OK — sem registros a corrigir" });
      return;
    }
    await pool.query(`
      UPDATE movimentacoes
      SET cmo_previsto = cmo_previsto + cmo,
          cmo = 0
      WHERE fase_origem = fase_destino
        AND cmo > 0
    `);
    logger.info({ msg: "✅ CMO histórico corrigido", registros: count, cmo_centavos: result.rows[0]?.total });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao corrigir CMO histórico", error: msg });
  }
}

export async function seedHelenaHistoricoIfNeeded() {
  try {
    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM helena_card_migrations WHERE tenant_id = 'r2pb'"
    );
    const count = parseInt(result.rows[0]?.count ?? "0", 10);
    if (count > 0) {
      logger.info({ msg: "✅ helena_card_migrations já tem dados para r2pb", count });
      return;
    }

    logger.info({ msg: "🔄 helena_card_migrations vazio — inserindo 19 registros históricos R2PB..." });

    // Datas baseadas no nome da etapa: GANHO MARÇO = março/2026
    // "REPIQUE 19 MAIO" no título = ordem de maio, mas o GANHO foi em março
    // Todos os 19 cards estavam na etapa "GANHO MARÇO" → data = março 2026
    await pool.query(`
      INSERT INTO helena_card_migrations
        (id, tenant_id, card_id, card_title, card_key, outcome, source_step_id, source_step_title,
         contact_name, contact_phone, monetary_amount, destination_card_id, migrated_at)
      VALUES
        ('d67c5941-3a0f-4d0b-8d60-d2520b512c09','r2pb','5806fd79-b649-4bd7-8fc0-f42d1d0d8f5e','Letícia Ferreira, Be Green','PCP-24','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Letícia Ferreira, Be Green','+55 11976529521',6829.60,'075fe275-4f13-4b43-b0ee-c3b483583b64','2026-03-01T10:00:00Z'),
        ('7d578eca-722d-4d6d-9682-ac4ac520b685','r2pb','41025735-31a4-419b-9ec0-773ef80c4675','Sandra Beccaro, Ladies of the Road','PCP-130','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Sandra Beccaro, Ladies of the Road','+55 11996167020',1000.00,'40a6f6b9-d640-48ff-8d58-6cded9a4a906','2026-03-02T10:00:00Z'),
        ('681ab5ef-7c85-4df9-b506-a0679b00573c','r2pb','5e828d4d-7788-46c6-acec-2ceab65b15de','Ricard Alves, Games(11) 94446-1032','PCP-72','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Ricard Alves, Games','+55 11944461032',700.00,'9b1892cd-b894-4ce4-9e39-9d5e96ef293e','2026-03-03T10:00:00Z'),
        ('a35841ec-ced9-4e9f-a666-b410102d3879','r2pb','9b13a26e-5ed0-4d15-ad19-d5f3bc96c0a0','Nathalia, Bag2go ABRIL','PCP-283','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Nathalia, Bag2go','+55 11999117722',6438.53,'cefcd726-dbd1-42de-bf01-aa6c43ee163c','2026-03-04T10:00:00Z'),
        ('2fb4c7b7-8d6d-449c-9b41-954145ffec93','r2pb','a0d60b96-c70d-466b-846f-9de1d95fd3fe','Maria Clara Quinderé, Stark Bank TECIDO FINO','PCP-284','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Maria Clara Quinderé, Stark Bank','+55 85981922997',19548.00,'63596f81-925a-4987-97fd-56326e1999c2','2026-03-05T10:00:00Z'),
        ('b776ddae-cdea-4480-9d27-c9b131ba3b2d','r2pb','1399897f-4f13-455e-bea6-08bd86ab3c13','Antonio Artigas, starstarstar 2','PCP-75','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Antonio Artigas, starstarstar','+55 21974026186',14080.00,'36ed9ff7-f46e-4734-9c0d-6cc507a1c593','2026-03-06T10:00:00Z'),
        ('745f61de-a7c5-4868-89a6-6277b1d78f53','r2pb','166f5725-3d6e-4528-ace7-1cb16bf26665','Tamara, SUPER BOUTIQUE(65) 99972-4699','PCP-244','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Tamara, SUPER BOUTIQUE','+55 65999724699',3980.00,'ba8c962e-e074-4525-b0e7-dfdb30141094','2026-03-07T10:00:00Z'),
        ('83a3e86d-f862-44bc-828e-a4f13575633c','r2pb','c060cd09-aae2-4af2-b15e-cc026908052f','Vincenzo Barbagallo, DIRT DAD','PCP-226','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Vincenzo Barbagallo, DIRT DAD','+55 19992245710',5391.36,'e045f176-8edd-4110-b2fd-6cac5475dee9','2026-03-08T10:00:00Z'),
        ('b087b2c9-83a5-4558-a238-4da38a72b15b','r2pb','5f932f46-c2fa-4e94-9555-71c9a404df74','Janaina Cruvinel Rosa','PCP-334','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Janaina Cruvinel Rosa','+55 11976464619',1639.80,'74596538-6311-47c8-a97f-fbf023fbfa45','2026-03-09T10:00:00Z'),
        ('766a39bd-5de8-46c1-a648-c9f23629c518','r2pb','62a86c26-0d41-47c6-a046-1b16929f26dc','Pedro, kenoa labs (BONÉ)','PCP-308','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Pedro, kenoa labs','+55 82988111000',200.00,'1c6c6fbb-1c78-4fd5-84a3-42bae3715a40','2026-03-10T10:00:00Z'),
        ('9b35013a-7f7f-4b0c-a214-2bb426ff37ab','r2pb','19e48ba8-fe38-44f6-98fb-00f05ba40c29','Diogo, Berço Eletrico(11) 97277-3827','PCP-272','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Diogo, Berço Eletrico','+55 11972773827',10640.40,'42dd3e28-a485-4a76-afe6-3ba79fc063e0','2026-03-11T10:00:00Z'),
        ('8443e7f9-c4e9-4ecc-bbec-bc4e846c6274','r2pb','853c845b-84c4-4320-bac5-10a924a4a618','Ingrid e frederico, éliou','PCP-21','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Ingrig, éliou','+55 27999958989',80258.00,'80d58ca7-140f-4748-86b3-dfeff1ddbf30','2026-03-12T10:00:00Z'),
        ('8ed4f888-550d-44fb-8c93-f8137d4a9930','r2pb','3a4097de-8754-46f8-a195-c1c07c1a1788','Maria Mendes, TALCHÁ','PCP-456','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Maria Mendes, TALCHÁ','+55 11991191591',4104.00,'67abefa1-f487-477e-b0fc-a1b482d629e5','2026-03-13T10:00:00Z'),
        ('e1e37c88-1d6f-4470-99ca-a781eb543144','r2pb','787764f7-abd0-4cfe-a28b-3705afb14609','Felipe Vetturi, Naice Company - PEDIDO JAQUETA','PCP-339','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Felipe Vetturi, Naice Company','+55 11971890052',7292.00,'bbf59b1a-3be7-4c63-9f42-d89a7a199426','2026-03-14T10:00:00Z'),
        ('a7cfa249-dfad-4a22-a862-3c10005a09e8','r2pb','538ec8f8-f21d-4bd7-afbc-2d0aa5ec5941','Victoria, CAFÉ COM LEITE+972 543217444','PCP-434','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Victoria, CAFÉ COM LEITE','+972 543217444',7226.46,'d63c8c0f-7567-4d60-b477-648b5666ff50','2026-03-15T10:00:00Z'),
        ('941f3eb3-442e-4312-b9f2-26c2daed77ec','r2pb','94cb4b7a-5954-44ef-9b18-857a01815ae0','Tais e Adriano, ESSENCIA DO ALTO(11) 98762-5608','PCP-422','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Tais e Adriano, ESSENCIA DO ALTO','+55 11987625608',5054.40,'7bab14be-6928-4f0e-a29e-385828de8d86','2026-03-16T10:00:00Z'),
        ('f3e1f7f4-90d4-4b94-b242-2a7344b4bb06','r2pb','8b7a1cdf-8bed-44fe-9b75-0ce93aa9ba2a','Felipe Vetturi, Naice Company - REPIQUE 19 MAIO','PCP-542','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Felipe Vetturi, Naice Company','+55 11971890052',4980.00,'8a096e5e-b9b3-4db4-8004-da30635c9408','2026-03-17T10:00:00Z'),
        ('2515bb91-e0aa-44e7-8b8a-d67a67ce016a','r2pb','b14aa53d-8dc1-4e5c-bce5-08f885daeebe','Paola Merlin, LOUMI (17) 99788-0024','PCP-95','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Paola Merlin, LOUMI','+55 17997880024',21142.80,'7af73af3-85cf-480c-9e1f-b5388112c880','2026-03-18T10:00:00Z'),
        ('1a4b7426-1d89-4f23-b030-c3591ac8b3de','r2pb','97eae84b-382a-443c-bc3e-e9341ac57eb7','Felipe, ARENO (13) 99608-9876','PCP-468','WON','cc9d7e65-d118-4799-8377-e869a76403c2','GANHO MARÇO','Felipe, ARENO','+55 13996089876',8179.20,'b192dcb7-a9dc-4f72-ae9f-0f056d265a58','2026-03-19T10:00:00Z')
      ON CONFLICT (id) DO NOTHING
    `);

    logger.info({ msg: "✅ Seed helena_card_migrations R2PB concluído", inseridos: 19 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha no seed helena_card_migrations", error: msg });
  }
}

export async function fixDuplicateOrcamentoNumbers() {
  try {
    const { rows: duplicates } = await pool.query<{ tenant_id: string; numero: string; total: string }>(`
      SELECT tenant_id, numero, COUNT(*) as total
      FROM orcamentos_custos
      WHERE ativo = true
      GROUP BY tenant_id, numero
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length === 0) {
      logger.info({ msg: "✅ Nenhum numero de orçamento duplicado encontrado" });
      return;
    }

    logger.info({ msg: `⚠️ ${duplicates.length} numero(s) de orçamento duplicados — corrigindo...` });
    let totalCorrigidos = 0;

    for (const dup of duplicates) {
      const { rows: affected } = await pool.query<{ id: string }>(
        `SELECT id FROM orcamentos_custos WHERE tenant_id = $1 AND numero = $2 AND ativo = true ORDER BY created_at ASC`,
        [dup.tenant_id, dup.numero]
      );

      const toRenumber = affected.slice(1);
      for (const o of toRenumber) {
        const ano = new Date().getFullYear();
        const prefix = `ORC-${ano}-`;
        const { rows: seqRows } = await pool.query<{ max_seq: string }>(
          `SELECT MAX(CAST(SUBSTRING(numero FROM '[0-9]+$') AS INTEGER)) AS max_seq
           FROM orcamentos_custos
           WHERE tenant_id = $1 AND numero LIKE $2`,
          [dup.tenant_id, `${prefix}%`]
        );
        const maxSeq = seqRows[0]?.max_seq != null ? parseInt(String(seqRows[0].max_seq), 10) : 0;
        const seq = maxSeq + 1;
        const novoNumero = `${prefix}${String(seq).padStart(4, "0")}`;
        await pool.query(
          `UPDATE orcamentos_custos SET numero = $1, updated_at = NOW() WHERE id = $2`,
          [novoNumero, o.id]
        );
        totalCorrigidos++;
        logger.info({ msg: `  ↳ Orçamento ${o.id}: ${dup.numero} → ${novoNumero}` });
      }
    }

    logger.info({ msg: `✅ ${totalCorrigidos} orçamento(s) renumerados com sucesso` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao corrigir números de orçamento duplicados", error: msg });
  }
}

export async function fixCmoHerdadoEntresFases() {
  try {
    // Reseta referencias.cmo = 0 para cartões onde o CMO foi herdado indevidamente
    // da fase anterior (concluir-fase definia cmo, mas iniciar-proxima não resetava).
    // Regra: se o cartão tem cmo > 0 mas NÃO existe movimentação com
    //        fase_origem = fase_atual AND cmo > 0, o valor veio da fase anterior.
    const { rowCount } = await pool.query(`
      UPDATE referencias r
      SET cmo = 0, updated_at = NOW()
      WHERE r.cmo > 0
        AND r.ativo = true
        AND r.fase_atual != 'concluido'
        AND NOT EXISTS (
          SELECT 1 FROM movimentacoes m
          WHERE m.referencia_id = r.id
            AND m.fase_origem = r.fase_atual
            AND m.cmo > 0
        )
    `);
    if ((rowCount ?? 0) === 0) {
      logger.info({ msg: "✅ Nenhum CMO herdado incorretamente entre fases" });
    } else {
      logger.info({ msg: `✅ ${rowCount} cartão(ões) com CMO herdado corrigido(s) para zero` });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao corrigir CMO herdado entre fases", error: msg });
  }
}

export async function syncNumeroPedidoEmRelacionados() {
  try {
    // 1. referencias: tem pedido_id (UUID) → sync direto e seguro
    const { rowCount: refCount } = await pool.query(`
      UPDATE referencias r
      SET numero_pedido = p.numero_pedido
      FROM pedidos p
      WHERE r.pedido_id = p.id
        AND r.numero_pedido IS DISTINCT FROM p.numero_pedido
    `);

    // 2. estoque: sem pedido_id, usa numero_pedido como texto para achar o pedido certo
    const { rowCount: estoqueCount } = await pool.query(`
      UPDATE estoque e
      SET numero_pedido = p.numero_pedido
      FROM pedidos p
      WHERE e.tenant_id = p.tenant_id
        AND e.numero_pedido IS NOT NULL
        AND (
          -- número antigo com 3 dígitos sem ano: ex "066" → busca pedido cujo seq bate
          CAST(SUBSTRING(e.numero_pedido FROM '[0-9]+$') AS INTEGER) =
          CAST(SUBSTRING(p.numero_pedido FROM '[0-9]+$') AS INTEGER)
        )
        AND e.numero_pedido IS DISTINCT FROM p.numero_pedido
    `);

    if ((refCount ?? 0) === 0 && (estoqueCount ?? 0) === 0) {
      logger.info({ msg: "✅ referencias e estoque já com numero_pedido correto" });
    } else {
      logger.info({ msg: `✅ Sincronização concluída`, referencias: refCount ?? 0, estoque: estoqueCount ?? 0 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao sincronizar numero_pedido em referencias/estoque", error: msg });
  }
}

export async function syncPedidoNumbersToOrcamentos() {
  try {
    // Busca todos os orçamentos que foram enviados ao kanban e têm pedido vinculado
    const { rows } = await pool.query<{
      orc_id: string; orc_numero: string; pedido_id: string;
      numero_pedido: string; tenant_id: string;
    }>(`
      SELECT o.id as orc_id, o.numero as orc_numero, o.tenant_id,
             p.id as pedido_id, p.numero_pedido
      FROM orcamentos_custos o
      JOIN pedidos p ON p.id = o.pedido_id
      WHERE o.ativo = true AND o.enviado_para_kanban = true
    `);

    let corrigidos = 0;
    for (const row of rows) {
      // Extrai o seq numérico do número do orçamento (ex: ORC-2026-0067 → 67)
      const match = row.orc_numero.match(/(\d+)$/);
      if (!match) continue;
      const seq = parseInt(match[1], 10);
      const anoYY = new Date().getFullYear().toString().slice(-2);
      const numeroPedidoEsperado = `PED-${anoYY}-${String(seq).padStart(3, "0")}`;

      if (row.numero_pedido === numeroPedidoEsperado) continue;

      await pool.query(
        `UPDATE pedidos SET numero_pedido = $1, numero = $1, updated_at = NOW() WHERE id = $2`,
        [numeroPedidoEsperado, row.pedido_id]
      );
      corrigidos++;
      logger.info({ msg: `  ↳ Pedido ${row.pedido_id} (${row.orc_numero}): ${row.numero_pedido} → ${numeroPedidoEsperado}` });
    }

    if (corrigidos === 0) {
      logger.info({ msg: "✅ Números de pedidos já estão sincronizados com os orçamentos" });
    } else {
      logger.info({ msg: `✅ ${corrigidos} pedido(s) sincronizados com seus orçamentos` });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao sincronizar números de pedidos com orçamentos", error: msg });
  }
}

export async function fixDuplicatePedidoNumbers() {
  try {
    // Busca todos os numero_pedido duplicados por tenant
    const { rows: duplicates } = await pool.query<{ tenant_id: string; numero_pedido: string; total: string }>(`
      SELECT tenant_id, numero_pedido, COUNT(*) as total
      FROM pedidos
      WHERE numero_pedido IS NOT NULL
      GROUP BY tenant_id, numero_pedido
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length === 0) {
      logger.info({ msg: "✅ Nenhum numero_pedido duplicado encontrado" });
      return;
    }

    logger.info({ msg: `⚠️ ${duplicates.length} numero_pedido(s) duplicados encontrados — corrigindo...` });
    let totalCorrigidos = 0;

    for (const dup of duplicates) {
      // Busca todos os pedidos com esse número, ordenados por created_at (mantém o mais antigo)
      const { rows: affected } = await pool.query<{ id: string }>(
        `SELECT id FROM pedidos WHERE tenant_id = $1 AND numero_pedido = $2 ORDER BY created_at ASC`,
        [dup.tenant_id, dup.numero_pedido]
      );

      // Pula o primeiro (original), renumera os demais
      const toRenumber = affected.slice(1);
      for (const p of toRenumber) {
        // Gera próximo número sequencial para o tenant
        const ano = new Date().getFullYear().toString().slice(-2);
        const prefix = `PED-${ano}-`;
        const { rows: seqRows } = await pool.query<{ maxnum: string }>(
          `SELECT MAX(numero_pedido) as maxnum FROM pedidos WHERE tenant_id = $1 AND numero_pedido LIKE $2`,
          [dup.tenant_id, `${prefix}%`]
        );
        const maxNum = seqRows[0]?.maxnum ?? null;
        let seq = 1;
        if (maxNum) {
          const parts = maxNum.split("-");
          const lastSeq = parseInt(parts[parts.length - 1] ?? "0", 10);
          if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }
        const novoNumero = `${prefix}${String(seq).padStart(3, "0")}`;
        await pool.query(
          `UPDATE pedidos SET numero_pedido = $1, numero = $1 WHERE id = $2`,
          [novoNumero, p.id]
        );
        totalCorrigidos++;
        logger.info({ msg: `  ↳ Pedido ${p.id}: ${dup.numero_pedido} → ${novoNumero}` });
      }
    }

    logger.info({ msg: `✅ ${totalCorrigidos} pedido(s) renumerados com sucesso` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao corrigir numero_pedido duplicados", error: msg });
  }
}

export async function addMentorMessageMediaColumns() {
  try {
    await pool.query(`
      ALTER TABLE mentor_messages
        ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
        ADD COLUMN IF NOT EXISTS attachment_url text,
        ADD COLUMN IF NOT EXISTS metadata jsonb
    `);
    logger.info({ msg: "✅ mentor_messages: colunas de mídia OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas de mídia em mentor_messages", error: msg });
  }
}

// As duas tabelas abaixo (leads_espelho, comercial_leads) foram criadas via
// `drizzle-kit push`/psql direto no Postgres local de dev — isso NUNCA chega
// automaticamente ao banco de produção (Supabase), que só recebe schema por
// deploy + este arquivo de migração idempotente rodando no boot. Sem isso,
// consultas do ATHOS via Supabase REST retornam 404 "table not found in
// schema cache" mesmo com o código e o schema Drizzle corretos.
export async function createLeadsEspelhoTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads_espelho (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(100) NOT NULL DEFAULT 'r2pb',
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(50) NOT NULL,
        agendou BOOLEAN NOT NULL DEFAULT false,
        followup_sent BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS leads_espelho_tenant_email_idx
        ON leads_espelho (tenant_id, email)
    `);
    logger.info({ msg: "✅ Tabela leads_espelho OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela leads_espelho", error: msg });
  }
}

export async function createComercialLeadsTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comercial_leads (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(100) NOT NULL,
        lead_name VARCHAR(255),
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        canal VARCHAR(50),
        origem VARCHAR(100),
        handoff_reason VARCHAR(100),
        mensagem_recebida TEXT,
        pipeline_key VARCHAR(100),
        stage_key VARCHAR(100),
        responsavel_id VARCHAR(100),
        responsavel_nome VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'aberto',
        closed_at TIMESTAMPTZ,
        closed_by VARCHAR(100),
        last_handoff_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Migração incremental: caso a tabela já existisse sem os campos de
    // fechamento de atendimento (adicionados depois).
    await pool.query(`
      ALTER TABLE comercial_leads
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'aberto',
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS closed_by VARCHAR(100)
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS comercial_leads_tenant_phone_idx
        ON comercial_leads (tenant_id, phone)
    `);
    logger.info({ msg: "✅ Tabela comercial_leads OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela comercial_leads", error: msg });
  }
}

export async function createSalesAutomationConfigTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_automation_config (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(100) NOT NULL,
        crm_provider VARCHAR(50) NOT NULL DEFAULT 'helena',
        crm_base_url VARCHAR(500) NOT NULL DEFAULT 'https://api.wts.chat',
        crm_api_key VARCHAR(500),
        pipeline_vendas_id VARCHAR(100),
        pipeline_vendas_nome VARCHAR(255),
        pipeline_nutricao_id VARCHAR(100),
        pipeline_nutricao_nome VARCHAR(255),
        pipeline_starter_id VARCHAR(100),
        pipeline_starter_nome VARCHAR(255),
        pipeline_pos_vendas_id VARCHAR(100),
        pipeline_pos_vendas_nome VARCHAR(255),
        estagios JSONB,
        whatsapp_instances JSONB,
        msg_confirmacao TEXT,
        msg_lembrete TEXT,
        msg_reengajamento TEXT,
        msg_resgate TEXT,
        ativo BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sales_automation_config_tenant_idx
        ON sales_automation_config (tenant_id)
    `);
    logger.info({ msg: "✅ Tabela sales_automation_config OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela sales_automation_config", error: msg });
  }
}

export async function addAviamentoColumnsIfNeeded() {
  try {
    await pool.query(`
      ALTER TABLE itens_pedido
        ADD COLUMN IF NOT EXISTS is_aviamento BOOLEAN NOT NULL DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE itens_orcamento_custos
        ADD COLUMN IF NOT EXISTS is_aviamento BOOLEAN NOT NULL DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE itens_pedido
        ADD COLUMN IF NOT EXISTS is_desenvolvimento BOOLEAN NOT NULL DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE itens_orcamento_custos
        ADD COLUMN IF NOT EXISTS is_desenvolvimento BOOLEAN NOT NULL DEFAULT false
    `);
    logger.info({ msg: "✅ Colunas is_aviamento + is_desenvolvimento OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas aviamento/desenvolvimento", error: msg });
  }
}

export async function createLeadAiEventsTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_ai_events (
        id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id           VARCHAR(100) NOT NULL,
        phone               VARCHAR(50) NOT NULL,
        lead_name           VARCHAR(255),
        message_snippet     TEXT,
        lead_type           VARCHAR(50),
        intention           VARCHAR(50),
        objection           VARCHAR(50),
        suggested_response  TEXT,
        route               VARCHAR(30),
        operational_status  VARCHAR(50),
        prompt_tokens       VARCHAR(20),
        completion_tokens   VARCHAR(20),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS lead_ai_events_tenant_phone_idx
        ON lead_ai_events (tenant_id, phone)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS lead_ai_events_tenant_created_idx
        ON lead_ai_events (tenant_id, created_at)
    `);
    logger.info({ msg: "✅ Tabela lead_ai_events OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela lead_ai_events", error: msg });
  }

  // ── lead_conversation_state — estado conversacional por lead (V1.1) ──────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_conversation_state (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(100) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        conversation_status VARCHAR(20) NOT NULL DEFAULT 'active',
        turn_count INTEGER NOT NULL DEFAULT 0,
        max_turns INTEGER NOT NULL DEFAULT 3,
        conversation_goal VARCHAR(50),
        last_ai_response TEXT,
        last_lead_message TEXT,
        handoff_required BOOLEAN NOT NULL DEFAULT FALSE,
        handoff_reason VARCHAR(100),
        window_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, phone)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS lead_conv_state_status_idx
        ON lead_conversation_state (conversation_status, last_activity_at)
    `);
    logger.info({ msg: "✅ Tabela lead_conversation_state OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela lead_conversation_state", error: msg });
  }
}

export async function seedGrowthAssetsIfNeeded() {
  try {
    await pool.query(`
      INSERT INTO growth_assets
        (id, tenant_id, campaign_id, asset_type, provider, status, output_url, prompt_input, created_at, updated_at)
      VALUES
        (
          '08df4144-0706-455e-af24-2112073e7f9a',
          'r2pb',
          'd9da286c-a468-4fb6-90ae-c39d852d72d7',
          'image',
          'banana',
          'awaiting_approval',
          '/objects/growth-assets/r2pb/d9da286c-a468-4fb6-90ae-c39d852d72d7/9fd50a54-1c6f-480f-97a1-e7152bf9d4f5.png',
          '{"prompt":"ambiente industrial premium de confecção, peças streetwear e alfaiataria em acabamento elevado, luz limpa de estúdio, fotografia editorial fashion, tons neutros e profissionais, estética sofisticada premium brasileira","asset_type_hint":"image_premium"}',
          NOW(), NOW()
        ),
        (
          '9bc7725f-3842-4c94-919e-af157c47167a',
          'mirage',
          '0052c696-c644-4831-8a79-ada83939fb17',
          'image',
          'banana',
          'awaiting_approval',
          '/objects/growth-assets/mirage/0052c696-c644-4831-8a79-ada83939fb17/2d4886eb-ce1e-44ce-bfdf-e2f662758195.png',
          '{"prompt":"dashboard SaaS premium moderno para gestão de confecção brasileira, interface escura com detalhes em violeta, cards de KPI, kanban de produção, visual executivo B2B limpo e sofisticado","asset_type_hint":"image_premium"}',
          NOW(), NOW()
        )
      ON CONFLICT (id) DO NOTHING
    `);
    logger.info({ msg: "✅ Seed growth_assets OK (r2pb + mirage)" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao seed growth_assets", error: msg });
  }

  // ── Coluna ai_sdr_config em sales_automation_config ────────────────────────
  try {
    await pool.query(`
      ALTER TABLE sales_automation_config
        ADD COLUMN IF NOT EXISTS ai_sdr_config JSONB
    `);
    logger.info({ msg: "✅ ai_sdr_config column OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar ai_sdr_config", error: msg });
  }

  // ── Colunas human_in_control em lead_conversation_state ─────────────────────
  try {
    await pool.query(`
      ALTER TABLE lead_conversation_state
        ADD COLUMN IF NOT EXISTS human_in_control boolean NOT NULL DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE lead_conversation_state
        ADD COLUMN IF NOT EXISTS human_took_over_at timestamptz
    `);
    await pool.query(`
      ALTER TABLE lead_conversation_state
        ADD COLUMN IF NOT EXISTS human_agent_name varchar(255)
    `);
    logger.info({ msg: "✅ human_in_control columns in lead_conversation_state OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar human_in_control columns", error: msg });
  }

  // ── Colunas Joana: nome do lead e contexto de qualificação ───────────────────
  try {
    await pool.query(`
      ALTER TABLE lead_conversation_state
        ADD COLUMN IF NOT EXISTS lead_name varchar(255)
    `);
    await pool.query(`
      ALTER TABLE lead_conversation_state
        ADD COLUMN IF NOT EXISTS joana_context text
    `);
    logger.info({ msg: "✅ joana_context + lead_name columns in lead_conversation_state OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar joana_context columns", error: msg });
  }

  // ── Tabela ai_brand_config — configuração da IA por tenant/brand ────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_brand_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL UNIQUE,
        brand_name TEXT,
        posicionamento TEXT,
        publico_alvo TEXT,
        segmentos TEXT,
        criterios_qualificacao TEXT,
        perguntas_obrigatorias TEXT,
        tom_voz TEXT,
        regras_handoff TEXT,
        pode_prometer TEXT,
        nao_pode_prometer TEXT,
        msg_baixo_fit TEXT,
        msg_encaminhamento TEXT,
        msg_reposicionamento_preco TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    logger.info({ msg: "✅ Tabela ai_brand_config OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar ai_brand_config", error: msg });
  }

  // ── Colunas extras em growth_campaigns — source, angulo, oferta, observacoes ─
  try {
    await pool.query(`
      ALTER TABLE growth_campaigns
        ADD COLUMN IF NOT EXISTS source TEXT,
        ADD COLUMN IF NOT EXISTS angulo TEXT,
        ADD COLUMN IF NOT EXISTS oferta TEXT,
        ADD COLUMN IF NOT EXISTS observacoes TEXT
    `);
    logger.info({ msg: "✅ growth_campaigns: colunas source/angulo/oferta/observacoes OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas em growth_campaigns", error: msg });
  }

  // ── Tabela ai_agents — configuração multiagente por tenant ───────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_key TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        agent_role TEXT,
        tenant_id TEXT NOT NULL,
        brand_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        tone_of_voice TEXT,
        objective TEXT,
        allowed_intents TEXT[],
        required_questions JSONB,
        handoff_rules TEXT,
        forbidden_promises TEXT,
        fallback_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, agent_key)
      )
    `);
    logger.info({ msg: "✅ Tabela ai_agents OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar ai_agents", error: msg });
  }

  // ── Colunas multiagente em lead_conversation_state ─────────────────────────
  try {
    await pool.query(`
      ALTER TABLE lead_conversation_state
        ADD COLUMN IF NOT EXISTS current_agent TEXT,
        ADD COLUMN IF NOT EXISTS detected_intent TEXT,
        ADD COLUMN IF NOT EXISTS last_routing_reason TEXT,
        ADD COLUMN IF NOT EXISTS last_handoff_target TEXT
    `);
    logger.info({ msg: "✅ Colunas multiagente em lead_conversation_state OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas multiagente", error: msg });
  }
}
