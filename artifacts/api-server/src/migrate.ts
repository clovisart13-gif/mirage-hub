import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createBillingPaymentConfirmationsTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_payment_confirmations (
        payment_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        plano_id TEXT NOT NULL,
        periodo TEXT NOT NULL CHECK (periodo IN ('mensal', 'anual')),
        expira_em DATE NOT NULL,
        confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_payment_confirmations_tenant
      ON billing_payment_confirmations (tenant_id, confirmed_at DESC)
    `);
    logger.info({ msg: "✅ Tabela billing_payment_confirmations OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela billing_payment_confirmations", error: msg });
  }
}
export async function addWhatsappToConfiguracoesEmpresaIfNeeded() {
  try {
    await pool.query(`
      ALTER TABLE configuracoes_empresa
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20)
    `);
    logger.info({ msg: "✅ configuracoes_empresa.whatsapp OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar configuracoes_empresa.whatsapp", error: msg });
  }
}
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
    if (count === 0) {
      logger.info({ msg: "🔄 brand_blueprints vazio — aplicando seed Mirage e R2PB..." });
      await pool.query(`
        INSERT INTO brand_blueprints (
          company_slug, nome_marca, segmento, descricao, proposito, promessa, diferencial,
          publico_principal, dores, desejos, tom_de_voz, adjetivos, estilo_visual,
          referencias_esteticas, produto_principal, objetivo_atual, created_at, updated_at
        ) VALUES
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
    }

    // Upsert do contexto de marketing institucional do Mirage (sempre aplicado para corrigir dados legados)
    await pool.query(`
      INSERT INTO brand_blueprints (
        company_slug, nome_marca, segmento, descricao, proposito, promessa, diferencial,
        publico_principal, dores, desejos, tom_de_voz, adjetivos, estilo_visual,
        referencias_esteticas, produto_principal, objetivo_atual, created_at, updated_at
      ) VALUES (
        'mirage', 'Hub Mirage / Moda Conecta', 'Ecossistema e comunidade do mercado têxtil brasileiro',
        'Hub Mirage é o ecossistema de inteligência comercial, curadoria e comunidade para o mercado têxtil brasileiro. O Moda Conecta é a plataforma de conexão entre marcas, compradores e fornecedores verificados.',
        'conectar marcas, compradores e fornecedores do mercado têxtil com curadoria e inteligência',
        'encontrar os parceiros certos no mercado têxtil com segurança, curadoria e eficiência',
        'único ecossistema têxtil com curadoria real — não é marketplace genérico, é rede qualificada',
        'marcas de moda, compradores B2B, lojistas e estilistas que buscam fornecedores verificados',
        '["dificuldade de encontrar fornecedores confiáveis","falta de curadoria no mercado têxtil","desperdício de tempo com parceiros não qualificados"]'::jsonb,
        '["rede qualificada de fornecedores","conexão direta sem intermediários","inteligência de mercado têxtil"]'::jsonb,
        'Institucional, premium, limpo — sem jargão de fábrica. Tom de ecossistema e comunidade, não de indústria.',
        '["curado","confiável","conectado","institucional","premium"]'::jsonb,
        'Clean e institucional — branco, grafite, acento índigo. Ambiente de conexão e networking, não de chão de fábrica.',
        'LinkedIn (networking profissional), Faire (marketplace curado), Nuvemshop (ecossistema)',
        'conexão curada entre marcas e fornecedores têxteis via Moda Conecta',
        'atrair marcas e compradores para o Moda Conecta e escalar a rede de fornecedores verificados',
        NOW(), NOW()
      )
      ON CONFLICT (company_slug) DO UPDATE SET
        nome_marca = EXCLUDED.nome_marca,
        segmento = EXCLUDED.segmento,
        descricao = EXCLUDED.descricao,
        proposito = EXCLUDED.proposito,
        promessa = EXCLUDED.promessa,
        diferencial = EXCLUDED.diferencial,
        publico_principal = EXCLUDED.publico_principal,
        dores = EXCLUDED.dores,
        desejos = EXCLUDED.desejos,
        tom_de_voz = EXCLUDED.tom_de_voz,
        adjetivos = EXCLUDED.adjetivos,
        estilo_visual = EXCLUDED.estilo_visual,
        referencias_esteticas = EXCLUDED.referencias_esteticas,
        produto_principal = EXCLUDED.produto_principal,
        objetivo_atual = EXCLUDED.objetivo_atual,
        updated_at = NOW()
    `);
    logger.info({ msg: "✅ brand_blueprints OK (mirage context atualizado)" });
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
    // Colunas da área comercial unificada (adicionadas depois)
    await pool.query(`
      ALTER TABLE comercial_leads
        ADD COLUMN IF NOT EXISTS empresa VARCHAR(255),
        ADD COLUMN IF NOT EXISTS segmento VARCHAR(100),
        ADD COLUMN IF NOT EXISTS classificacao VARCHAR(50) DEFAULT 'lead',
        ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS triagem_session_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS diagnostico_triado BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS formulario_enviado_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS obs TEXT
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

  // ── Cleanup: remove linhas duplicadas com tenant_id como slug (não UUID) ─────
  // Quando ambos existem (slug + UUID para o mesmo phone), o slug fica com
  // human_in_control=false e sabota a proteção HIC. Remove os slugs stale.
  try {
    const cleanupResult = await pool.query(`
      DELETE FROM lead_conversation_state slug_row
      WHERE slug_row.tenant_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
        AND EXISTS (
          SELECT 1 FROM lead_conversation_state uuid_row
          WHERE uuid_row.tenant_id SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            AND uuid_row.phone = slug_row.phone
        )
    `);
    const deleted = cleanupResult.rowCount ?? 0;
    if (deleted > 0) {
      logger.info({ msg: `✅ Removidas ${deleted} linhas duplicadas de lead_conversation_state com tenant_id como slug` });
    } else {
      logger.info({ msg: "✅ lead_conversation_state: sem linhas duplicadas de slug para remover" });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao limpar duplicatas de slug em lead_conversation_state", error: msg });
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

  // ── Colunas de hipótese em growth_campaigns ──────────────────────────────────
  try {
    await pool.query(`
      ALTER TABLE growth_campaigns
        ADD COLUMN IF NOT EXISTS nicho TEXT,
        ADD COLUMN IF NOT EXISTS intencao_criativa TEXT,
        ADD COLUMN IF NOT EXISTS estagio_funil TEXT,
        ADD COLUMN IF NOT EXISTS hipoteses JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS promessas_camp JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS dores_camp JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS ctas_camp JSONB DEFAULT '[]'
    `);
    logger.info({ msg: "✅ growth_campaigns: colunas de hipótese OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas de hipótese em growth_campaigns", error: msg });
  }

  // ── Coluna creative_mode em growth_campaigns ─────────────────────────────────
  try {
    await pool.query(`
      ALTER TABLE growth_campaigns
        ADD COLUMN IF NOT EXISTS creative_mode TEXT
    `);
    logger.info({ msg: "✅ growth_campaigns: coluna creative_mode OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar creative_mode em growth_campaigns", error: msg });
  }

  // ── Colunas de hipótese em growth_campaign_slots ─────────────────────────────
  try {
    await pool.query(`
      ALTER TABLE growth_campaign_slots
        ADD COLUMN IF NOT EXISTS hypothesis_angle TEXT,
        ADD COLUMN IF NOT EXISTS target_context TEXT,
        ADD COLUMN IF NOT EXISTS pain_point TEXT,
        ADD COLUMN IF NOT EXISTS promise TEXT,
        ADD COLUMN IF NOT EXISTS creative_style TEXT,
        ADD COLUMN IF NOT EXISTS hook_type TEXT,
        ADD COLUMN IF NOT EXISTS cta_type TEXT,
        ADD COLUMN IF NOT EXISTS usage_type TEXT DEFAULT 'organic'
    `);
    logger.info({ msg: "✅ growth_campaign_slots: colunas de hipótese OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas de hipótese em growth_campaign_slots", error: msg });
  }

  // ── Coluna de arquétipo criativo em growth_campaign_slots ─────────────────────
  try {
    await pool.query(`
      ALTER TABLE growth_campaign_slots
        ADD COLUMN IF NOT EXISTS creative_archetype TEXT
    `);
    logger.info({ msg: "✅ growth_campaign_slots: coluna creative_archetype OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar creative_archetype em growth_campaign_slots", error: msg });
  }

  // ── Backfill arquétipos em slots existentes sem arquétipo ──────────────────
  try {
    const result = await pool.query(`
      UPDATE growth_campaign_slots
      SET creative_archetype = CASE
        WHEN slot_type = 'feed' THEN CASE slot_index
          WHEN 1 THEN 'authority'
          WHEN 2 THEN 'process'
          WHEN 3 THEN 'conversion_cta'
          WHEN 4 THEN 'product'
          WHEN 5 THEN 'behind_scenes'
          WHEN 6 THEN 'social_proof'
          WHEN 7 THEN 'brand_positioning'
          ELSE 'launch_teaser'
        END
        WHEN slot_type = 'story' THEN CASE slot_index
          WHEN 1 THEN 'authority'
          WHEN 2 THEN 'process'
          WHEN 3 THEN 'conversion_cta'
          ELSE 'product'
        END
        WHEN slot_type = 'reel' THEN CASE slot_index
          WHEN 1 THEN 'launch_teaser'
          ELSE 'conversion_cta'
        END
        ELSE 'authority'
      END
      WHERE creative_archetype IS NULL
    `);
    const updated = (result as any).rowCount ?? 0;
    if (updated > 0) {
      logger.info({ msg: `✅ Backfill arquétipos: ${updated} slot(s) atualizados` });
    } else {
      logger.info({ msg: "✅ Backfill arquétipos: todos os slots já tinham arquétipo" });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha no backfill de creative_archetype", error: msg });
  }

  // ── Colunas de performance futura em growth_assets ───────────────────────────
  try {
    await pool.query(`
      ALTER TABLE growth_assets
        ADD COLUMN IF NOT EXISTS impressions INTEGER,
        ADD COLUMN IF NOT EXISTS ctr NUMERIC(6,4),
        ADD COLUMN IF NOT EXISTS hook_strength_score NUMERIC(5,2),
        ADD COLUMN IF NOT EXISTS save_rate NUMERIC(6,4),
        ADD COLUMN IF NOT EXISTS qualified_lead_rate NUMERIC(6,4),
        ADD COLUMN IF NOT EXISTS best_for_segment TEXT,
        ADD COLUMN IF NOT EXISTS distribution_signal TEXT
    `);
    logger.info({ msg: "✅ growth_assets: colunas de performance OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas de performance em growth_assets", error: msg });
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

  // ── Colunas de triagem R2PB em lead_conversation_state ──────────────────────
  try {
    await pool.query(`
      ALTER TABLE lead_conversation_state
        ADD COLUMN IF NOT EXISTS diagnostico_triado BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS diagnostico_action VARCHAR(50),
        ADD COLUMN IF NOT EXISTS form_sent_at TIMESTAMPTZ
    `);
    logger.info({ msg: "✅ Colunas triagem R2PB em lead_conversation_state OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas triagem R2PB", error: msg });
  }
}

// ── Camada soberana de jornada do lead ────────────────────────────────────────
export async function createLeadJourneyTablesIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_journey (
        id                    VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id             VARCHAR(100)  NOT NULL,
        phone                 VARCHAR(30)   NOT NULL,
        nome                  VARCHAR(255),
        origem                VARCHAR(100),
        canal_atual           VARCHAR(50),
        status                VARCHAR(50)   NOT NULL DEFAULT 'novo',
        etapa_atual           VARCHAR(255),
        pergunta_pendente     TEXT,
        pipeline_atual        VARCHAR(100),
        departamento_destino  VARCHAR(100),
        responsavel_humano    VARCHAR(255),
        responsavel_id        VARCHAR(100),
        ultima_interacao      TIMESTAMPTZ,
        created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, phone)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS lead_journey_tenant_status_idx
        ON lead_journey (tenant_id, status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS lead_journey_tenant_updated_idx
        ON lead_journey (tenant_id, updated_at DESC)
    `);
    logger.info({ msg: "✅ Tabela lead_journey OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela lead_journey", error: msg });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_journey_events (
        id              VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       VARCHAR(100) NOT NULL,
        phone           VARCHAR(30)  NOT NULL,
        evento          VARCHAR(100) NOT NULL,
        status_anterior VARCHAR(50),
        status_novo     VARCHAR(50),
        dados           JSONB,
        origem          VARCHAR(100),
        criado_por      VARCHAR(100),
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS lead_journey_events_tenant_phone_idx
        ON lead_journey_events (tenant_id, phone)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS lead_journey_events_tenant_created_idx
        ON lead_journey_events (tenant_id, created_at DESC)
    `);
    logger.info({ msg: "✅ Tabela lead_journey_events OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela lead_journey_events", error: msg });
  }
}

export async function createParceirosTablesIfNeeded(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parceiros_producao (
        id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        VARCHAR(50)  NOT NULL,
        nome             TEXT         NOT NULL,
        whatsapp         VARCHAR(20)  NOT NULL,
        area             TEXT         NOT NULL,
        subtipo          TEXT,
        tipo_malha       TEXT,
        qtde_costureiros TEXT,
        tipos_maquina    TEXT[],
        linha_produto    TEXT[],
        tipos_acabamento TEXT[],
        estado           VARCHAR(2),
        cidade           TEXT,
        bairro           TEXT,
        status           TEXT         NOT NULL DEFAULT 'prospecto',
        obs              TEXT,
        formulario_enviado_at TIMESTAMPTZ,
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS parceiros_producao_tenant_idx ON parceiros_producao (tenant_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS parceiros_producao_area_idx   ON parceiros_producao (tenant_id, area)`);
    await pool.query(`ALTER TABLE parceiros_producao ADD COLUMN IF NOT EXISTS email TEXT`);
    await pool.query(`ALTER TABLE parceiros_producao ADD COLUMN IF NOT EXISTS encaminhado_mc_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE parceiros_producao ADD COLUMN IF NOT EXISTS cotacao_enviada_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE parceiros_producao ADD COLUMN IF NOT EXISTS cotacao_resposta TEXT`);
    logger.info({ msg: "✅ Tabela parceiros_producao OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela parceiros_producao", error: msg });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidatos_rh (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  VARCHAR(50) NOT NULL,
        nome       TEXT        NOT NULL,
        whatsapp   VARCHAR(20) NOT NULL,
        area       TEXT        NOT NULL,
        estado     VARCHAR(2),
        cidade     TEXT,
        bairro     TEXT,
        status     TEXT        NOT NULL DEFAULT 'novo',
        obs        TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS candidatos_rh_tenant_idx ON candidatos_rh (tenant_id)`);
    await pool.query(`ALTER TABLE candidatos_rh ADD COLUMN IF NOT EXISTS email TEXT`);
    await pool.query(`ALTER TABLE candidatos_rh ADD COLUMN IF NOT EXISTS encaminhado_mc_at TIMESTAMPTZ`);
    logger.info({ msg: "✅ Tabela candidatos_rh OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela candidatos_rh", error: msg });
  }

  // ── Cotações ──────────────────────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cotacoes (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   VARCHAR(50) NOT NULL,
        numero      VARCHAR(20) NOT NULL,
        titulo      TEXT        NOT NULL,
        mensagem    TEXT,
        status      TEXT        NOT NULL DEFAULT 'enviada',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS cotacoes_tenant_idx ON cotacoes (tenant_id)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cotacao_destinatarios (
        id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        cotacao_id          UUID        NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
        parceiro_id         UUID        NOT NULL,
        parceiro_nome       TEXT        NOT NULL,
        parceiro_whatsapp   TEXT        NOT NULL,
        enviado_at          TIMESTAMPTZ,
        resposta            TEXT,
        resposta_at         TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS cotacao_dest_cotacao_idx ON cotacao_destinatarios (cotacao_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS cotacao_dest_parceiro_idx ON cotacao_destinatarios (parceiro_id)`);
    logger.info({ msg: "✅ Tabelas cotacoes + cotacao_destinatarios OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabelas de cotações", error: msg });
  }
}

export async function seedGrowthCampaignsIfNeeded() {
  try {
    // Garante tabela existe primeiro
    await pool.query(`
      CREATE TABLE IF NOT EXISTS growth_campaigns (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   VARCHAR(50) NOT NULL,
        name        TEXT        NOT NULL,
        objective   TEXT,
        channel     TEXT,
        source      TEXT,
        angulo      TEXT,
        oferta      TEXT,
        observacoes TEXT,
        status      TEXT        NOT NULL DEFAULT 'active',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS growth_campaigns_tenant_idx ON growth_campaigns (tenant_id)`);

    // Seed R2PB — Captação Marcas Premium (idempotente por nome+tenant)
    await pool.query(`
      INSERT INTO growth_campaigns (tenant_id, name, objective, channel, source, angulo, oferta, observacoes, status)
      SELECT 'r2pb',
             'R2PB — Captação Marcas Premium',
             'Captação de marcas premium para private label',
             'Instagram',
             'streetwear',
             'streetwear',
             'Diagnóstico inicial do projeto + produção private label premium',
             'Campanha seed — base da máquina de marketing R2PB',
             'active'
      WHERE NOT EXISTS (
        SELECT 1 FROM growth_campaigns WHERE tenant_id = 'r2pb' AND name = 'R2PB — Captação Marcas Premium'
      )
    `);

    logger.info({ msg: "✅ growth_campaigns seed OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao seed growth_campaigns", error: msg });
  }
}

export async function createTexintelTablesIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS texintel_companies (
        id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        cnpj                 TEXT        NOT NULL UNIQUE,
        razao_social         TEXT,
        nome_fantasia        TEXT,
        situacao             TEXT,
        abertura             TEXT,
        atividade_principal  TEXT,
        municipio            TEXT,
        uf                   TEXT,
        website              TEXT,
        dores                JSONB,
        faturamento_estimado TEXT,
        fit_crm              INTEGER,
        fit_erp              INTEGER,
        fit_plm              INTEGER,
        fit_comunidade       INTEGER,
        modulo_recomendado   TEXT,
        justificativa        TEXT,
        raw_analysis         TEXT,
        scraping_content     TEXT,
        status               TEXT        DEFAULT 'pending',
        error_message        TEXT,
        processed_at         TIMESTAMPTZ,
        created_at           TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS texintel_companies_status_idx  ON texintel_companies (status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS texintel_companies_modulo_idx  ON texintel_companies (modulo_recomendado)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS texintel_companies_created_idx ON texintel_companies (created_at DESC)`);
    // Colunas adicionadas após criação inicial (idempotente)
    await pool.query(`ALTER TABLE texintel_companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
    await pool.query(`ALTER TABLE texintel_companies ADD COLUMN IF NOT EXISTS raw_analysis TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE texintel_companies ADD COLUMN IF NOT EXISTS error_message TEXT`).catch(() => {});
    logger.info({ msg: "✅ Tabela texintel_companies OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela texintel_companies", error: msg });
  }
}

export async function createAgentHandoffsTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_handoffs (
        id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status              TEXT        NOT NULL DEFAULT 'pending',
        origin_agent        TEXT        NOT NULL DEFAULT 'athos',
        target_agent        TEXT        NOT NULL DEFAULT 'replit',
        title               TEXT        NOT NULL,
        context             TEXT,
        instruction         TEXT        NOT NULL,
        relevant_files      JSONB,
        acceptance_criteria TEXT,
        result_summary      TEXT,
        result_payload      JSONB,
        error_message       TEXT,
        priority            TEXT        NOT NULL DEFAULT 'normal',
        tags                JSONB,
        claimed_at          TIMESTAMPTZ,
        completed_at        TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS agent_handoffs_status_idx    ON agent_handoffs (status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS agent_handoffs_target_idx    ON agent_handoffs (target_agent)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS agent_handoffs_created_at_idx ON agent_handoffs (created_at DESC)`);
    logger.info({ msg: "✅ Tabela agent_handoffs OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabela agent_handoffs", error: msg });
  }
}

export async function addGrowthAssetsPublishColumnsIfNeeded() {
  try {
    // Adiciona colunas de publicação interna em growth_assets
    await pool.query(`
      ALTER TABLE growth_assets
        ADD COLUMN IF NOT EXISTS publish_destination TEXT,
        ADD COLUMN IF NOT EXISTS scheduled_at        TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS published_at        TIMESTAMPTZ
    `);
    // Adiciona valores ao enum growth_asset_status (idempotente via DO block)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'growth_asset_status'::regtype AND enumlabel = 'scheduled') THEN
          ALTER TYPE growth_asset_status ADD VALUE 'scheduled' AFTER 'approved';
        END IF;
      END$$;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'growth_asset_status'::regtype AND enumlabel = 'publish_failed') THEN
          ALTER TYPE growth_asset_status ADD VALUE 'publish_failed' AFTER 'scheduled';
        END IF;
      END$$;
    `);
    // Adiciona coluna meta em growth_campaigns
    await pool.query(`
      ALTER TABLE growth_campaigns ADD COLUMN IF NOT EXISTS meta JSONB
    `);
    logger.info({ msg: "✅ growth_assets: colunas de publicação OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar colunas de publicação em growth_assets", error: msg });
  }
}

export async function addPlmProdutosClienteIdIfNeeded() {
  try {
    await pool.query(`ALTER TABLE plm_produtos ADD COLUMN IF NOT EXISTS cliente_id integer`);
    logger.info({ msg: "✅ plm_produtos: coluna cliente_id OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar cliente_id em plm_produtos", error: msg });
  }
}

export async function addPlmProdutosReferenciaClienteIfNeeded() {
  try {
    await pool.query(`
      ALTER TABLE plm_produtos
        ADD COLUMN IF NOT EXISTS referencia_cliente varchar(100),
        ADD COLUMN IF NOT EXISTS link_modelagem text
    `);
    logger.info({ msg: "✅ plm_produtos: referência do cliente + link de modelagem OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar referencia_cliente em plm_produtos", error: msg });
  }
}

export async function addPlmCommercialTraceabilityIfNeeded() {
  try {
    await pool.query(`
      ALTER TABLE fichas_custo
        ADD COLUMN IF NOT EXISTS codigo_cliente varchar(100),
        ADD COLUMN IF NOT EXISTS origem varchar(30) NOT NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS plm_produto_id integer,
        ADD COLUMN IF NOT EXISTS plm_ficha_tecnica_id integer;
      ALTER TABLE plm_fichas_tecnicas
        ADD COLUMN IF NOT EXISTS referencia varchar(100),
        ADD COLUMN IF NOT EXISTS referencia_cliente varchar(100),
        ADD COLUMN IF NOT EXISTS etiqueta_composicao_url text,
        ADD COLUMN IF NOT EXISTS familia_medidas_id integer,
        ADD COLUMN IF NOT EXISTS pedido_item_id varchar,
        ADD COLUMN IF NOT EXISTS grade_id varchar;
      CREATE TABLE IF NOT EXISTS plm_familias_medidas (
        id serial PRIMARY KEY,
        tenant_id varchar(100) NOT NULL,
        nome varchar(100) NOT NULL,
        campos jsonb NOT NULL DEFAULT '[]'::jsonb,
        mockup_url text,
        ativo boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS plm_familias_medidas_tenant_nome_uidx
        ON plm_familias_medidas(tenant_id, nome);
      CREATE INDEX IF NOT EXISTS plm_familias_medidas_tenant_idx
        ON plm_familias_medidas(tenant_id);
      INSERT INTO plm_familias_medidas (tenant_id, nome, campos)
      SELECT DISTINCT fc.tenant_id, trim(fc.familia),
        CASE WHEN lower(trim(fc.familia)) LIKE '%camiseta%'
          THEN '[{"chave":"torax","nome":"Tórax","unidade":"cm","ordem":1},{"chave":"ombro","nome":"Ombro","unidade":"cm","ordem":2},{"chave":"comprimento","nome":"Comprimento","unidade":"cm","ordem":3},{"chave":"manga","nome":"Manga","unidade":"cm","ordem":4},{"chave":"boca_manga","nome":"Boca da manga","unidade":"cm","ordem":5},{"chave":"punho","nome":"Punho","unidade":"cm","ordem":6}]'::jsonb
          ELSE '[]'::jsonb END
      FROM fichas_custo fc
      WHERE fc.familia IS NOT NULL AND trim(fc.familia) <> ''
      ON CONFLICT (tenant_id, nome) DO NOTHING;
      ALTER TABLE itens_orcamento_custos
        ADD COLUMN IF NOT EXISTS plm_produto_id integer,
        ADD COLUMN IF NOT EXISTS plm_ficha_tecnica_id integer;
      ALTER TABLE itens_pedido
        ADD COLUMN IF NOT EXISTS ficha_custo_id varchar,
        ADD COLUMN IF NOT EXISTS plm_produto_id integer,
        ADD COLUMN IF NOT EXISTS plm_ficha_tecnica_id integer,
        ADD COLUMN IF NOT EXISTS referencia_cliente varchar(100);
      ALTER TABLE referencias
        ADD COLUMN IF NOT EXISTS plm_produto_id integer,
        ADD COLUMN IF NOT EXISTS plm_ficha_tecnica_id integer,
        ADD COLUMN IF NOT EXISTS referencia_cliente varchar(100);
      CREATE INDEX IF NOT EXISTS fichas_custo_plm_produto_idx ON fichas_custo(plm_produto_id);
      CREATE INDEX IF NOT EXISTS itens_orcamento_plm_produto_idx ON itens_orcamento_custos(plm_produto_id);
      CREATE INDEX IF NOT EXISTS itens_pedido_plm_produto_idx ON itens_pedido(plm_produto_id);
      CREATE INDEX IF NOT EXISTS referencias_plm_produto_idx ON referencias(plm_produto_id);
    `);
    logger.info({ msg: "✅ rastreabilidade PLM ↔ Comercial ↔ Kanban OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar rastreabilidade PLM ↔ Comercial ↔ Kanban", error: msg });
  }
}

export async function addPlmPilotagemWorkflowIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plm_processos (
        id serial PRIMARY KEY,
        tenant_id varchar(100) NOT NULL,
        nome varchar(120) NOT NULL,
        sequencia integer NOT NULL,
        ativo boolean NOT NULL DEFAULT true,
        created_by text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS plm_processos_tenant_nome_uidx
        ON plm_processos(tenant_id, nome);
      CREATE INDEX IF NOT EXISTS plm_processos_tenant_sequencia_idx
        ON plm_processos(tenant_id, sequencia);
      CREATE TABLE IF NOT EXISTS plm_processo_etapas (
        id serial PRIMARY KEY,
        processo_id integer NOT NULL,
        nome varchar(120) NOT NULL,
        sequencia integer NOT NULL,
        ativo boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS plm_processo_etapas_processo_idx
        ON plm_processo_etapas(processo_id, sequencia);
      DROP INDEX IF EXISTS plm_processo_etapas_processo_nome_uidx;
      CREATE INDEX IF NOT EXISTS plm_processo_etapas_processo_nome_idx
        ON plm_processo_etapas(processo_id, nome);
      ALTER TABLE plm_pilotos
        ADD COLUMN IF NOT EXISTS cliente_id integer,
        ADD COLUMN IF NOT EXISTS processo_id integer,
        ADD COLUMN IF NOT EXISTS modelagem_id integer,
        ADD COLUMN IF NOT EXISTS referencia varchar(100),
        ADD COLUMN IF NOT EXISTS referencia_cliente varchar(100),
        ADD COLUMN IF NOT EXISTS tamanho_piloto varchar(30),
        ADD COLUMN IF NOT EXISTS link_modelagem text,
        ADD COLUMN IF NOT EXISTS data_inicio date,
        ADD COLUMN IF NOT EXISTS data_prevista date,
         ADD COLUMN IF NOT EXISTS data_termino_real date,
         ADD COLUMN IF NOT EXISTS motivo_reprovacao text,
         ADD COLUMN IF NOT EXISTS imagem_aprovacao_url text;
      ALTER TABLE plm_aprovacoes
        ADD COLUMN IF NOT EXISTS piloto_id integer,
        ADD COLUMN IF NOT EXISTS processo_etapa_id integer;
      CREATE INDEX IF NOT EXISTS plm_aprovacoes_piloto_idx
        ON plm_aprovacoes(piloto_id);
      CREATE INDEX IF NOT EXISTS plm_aprovacoes_piloto_etapa_idx
        ON plm_aprovacoes(piloto_id, processo_etapa_id);
    `);
    logger.info({ msg: "✅ pilotagem PLM: processos, sequência e campos do piloto OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao preparar fluxo de pilotagem PLM", error: msg });
  }
}

export async function createMarketingPromptSettingsIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_prompt_settings (
        id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id            TEXT        NOT NULL UNIQUE,
        image_prompt_master  TEXT,
        video_prompt_master  TEXT,
        negative_prompt      TEXT,
        feed_prompt_modifier TEXT,
        story_prompt_modifier TEXT,
        reel_prompt_modifier TEXT,
        authority_prompt_block TEXT,
        process_prompt_block   TEXT,
        lifestyle_prompt_block TEXT,
        product_prompt_block   TEXT,
        color_direction        TEXT,
        casting_direction      TEXT,
        scenario_direction     TEXT,
        active               BOOLEAN     NOT NULL DEFAULT true,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS mps_tenant_idx ON marketing_prompt_settings (tenant_id)`);
    // Adicionar colunas de Texto na Imagem e Chamada do Post (idempotente)
    const newCols: [string, string][] = [
      ["text_overlay_required",          "BOOLEAN DEFAULT true"],
      ["image_headline_primary",          "TEXT"],
      ["image_headline_variations",       "TEXT"],
      ["image_text_style_instruction",    "TEXT"],
      ["feed_text_overlay_instruction",   "TEXT"],
      ["story_text_overlay_instruction",  "TEXT"],
      ["reel_text_overlay_instruction",   "TEXT"],
      ["post_caption_cta_primary",        "TEXT"],
      ["post_caption_cta_variations",     "TEXT"],
      ["post_caption_tone",               "TEXT"],
      ["post_caption_structure",          "TEXT"],
      ["post_caption_instruction_master", "TEXT"],
      ["feed_caption_modifier",           "TEXT"],
      ["story_caption_modifier",          "TEXT"],
      ["reel_caption_modifier",           "TEXT"],
    ];
    for (const [col, def] of newCols) {
      await pool.query(`ALTER TABLE marketing_prompt_settings ADD COLUMN IF NOT EXISTS ${col} ${def}`);
    }
    // Seed padrão para r2pb se ainda não existe
    await pool.query(`
      INSERT INTO marketing_prompt_settings (
        tenant_id, image_prompt_master, negative_prompt,
        feed_prompt_modifier, story_prompt_modifier, reel_prompt_modifier,
        authority_prompt_block, process_prompt_block, lifestyle_prompt_block, product_prompt_block,
        color_direction, casting_direction, scenario_direction,
        text_overlay_required,
        image_headline_primary, image_headline_variations, image_text_style_instruction,
        feed_text_overlay_instruction, story_text_overlay_instruction, reel_text_overlay_instruction,
        post_caption_cta_primary, post_caption_cta_variations,
        post_caption_tone, post_caption_structure, post_caption_instruction_master,
        feed_caption_modifier, story_caption_modifier, reel_caption_modifier
      ) VALUES (
        'r2pb',
        'Criar campanha publicitária premium para a R2PB Confecções com foco em captação de marcas de streetwear premium que buscam produção private label com estrutura real de fábrica. Cada criativo deve transmitir autoridade, sofisticação, capacidade produtiva, confiança, domínio técnico e percepção de parceiro industrial premium. Os criativos devem mostrar que a R2PB desenvolve e produz coleção com padrão elevado, indo além de imagens bonitas. A campanha precisa comunicar estrutura, processo, segurança, qualidade e capacidade real de execução. É obrigatório variar fortemente os criativos entre si. Não repetir o mesmo modelo, o mesmo conjunto de moletom, o mesmo enquadramento, a mesma pose, a mesma composição visual ou a mesma peça dominante em todos os slots. A campanha deve parecer anúncio de captação premium, não lookbook genérico, não editorial monótono e não catálogo vazio.',
        'Sem texto legível na imagem. Sem look book de modelo único. Sem moletom cinza liso sem cor. Evitar repetição de mesmo look, mesmo modelo, mesmo cenário. Sem estética de IA barata, sem plástico.',
        'Criar feed com cara de anúncio premium e autoridade de fábrica. Cada peça deve ter proposta comercial clara, composição forte e foco em captação de marcas. Variar entre produto, bastidor, processo, estrutura e percepção de marca premium. Evitar feed puramente editorial.',
        'Criar stories verticais com linguagem nativa de anúncio, leitura imediata e proposta comercial clara. Variar entre autoridade, processo, produto e transformação da ideia em coleção. Não gerar apenas adaptação fraca do feed.',
        'Criar conceito de reel premium com ritmo visual, prova de processo, percepção de fábrica organizada e linguagem de anúncio para captação. A capa do reel deve comunicar autoridade e intenção comercial.',
        'Transmitir autoridade de fábrica premium, domínio técnico, organização operacional, experiência em private label, confiança para marcas em crescimento e capacidade real de executar coleção com consistência.',
        'Mostrar mesa de desenvolvimento, modelagem, corte, costura, revisão, acabamento, detalhes de construção, matéria-prima, manipulação técnica do produto, organização fabril e percepção de produção premium real.',
        'Usar lifestyle apenas como apoio estratégico, nunca como base repetitiva da campanha. Quando houver modelo, variar styling, atitude, ambiente, composição e energia visual. O lifestyle deve reforçar valor de marca e não substituir a autoridade de fábrica.',
        'Variar entre camisetas premium, moletons, calças, conjuntos, oversized, básicos sofisticados, detalhes de acabamento, costura, caimento, tecido e peças em desenvolvimento. Não concentrar a campanha inteira em um único conjunto de moletom.',
        'Evitar campanha apagada, monocromática e sem vida. Trabalhar contraste, profundidade e variedade controlada de cores premium. Usar neutros com inteligência, mas nunca deixar todos os criativos iguais ou visualmente mortos.',
        'Variar perfis, presença humana, poses, enquadramentos e linguagem corporal. Não repetir um único modelo dominante em todos os criativos. Alternar entre modelo, mãos em processo, close de produto e composições sem rosto quando fizer sentido.',
        'Variar entre fábrica premium organizada, mesa de criação, araras, bastidores de desenvolvimento, close de tecido, costura, acabamento, showroom enxuto e fundos limpos premium. Evitar cenário único repetido em toda a campanha.',
        true,
        'Sua marca, nossa produção premium',
        E'Private label para marcas que querem escalar\nDa ideia à coleção com padrão premium\nSua coleção com estrutura de fábrica real\nStreetwear premium com produção de verdade\nMais que roupa bonita: produção com consistência',
        'Texto curto, forte, legível, premium, com contraste alto, hierarquia clara e composição integrada ao layout. Nunca gerar peça sem headline visível.',
        'Todo feed deve conter headline sobreposta obrigatória com leitura clara e aparência de anúncio premium.',
        'Todo story deve conter texto grande, leitura imediata e estrutura visual de anúncio vertical.',
        'A capa/thumbnail do reel deve conter headline forte em português e aparência comercial premium.',
        'Fale com a R2PB e transforme sua ideia em uma coleção com produção premium de verdade.',
        E'Descubra como produzir sua marca com estrutura real.\nLeve sua coleção para um padrão premium de produção.\nConstrua sua próxima coleção com um parceiro de private label.\nSua marca pode crescer com produção mais segura e profissional.',
        'Premium, comercial, seguro, consultivo e objetivo.',
        'Abrir com headline forte, desenvolver com benefício principal, reforçar autoridade e fechar com CTA direto para marcas interessadas em produzir coleção própria.',
        'Criar legendas com linguagem comercial premium, foco em captação de marcas, clareza de proposta e percepção de autoridade industrial. Evitar legenda genérica, vaga ou puramente inspiracional.',
        'Legenda com mais contexto, valor percebido e construção de autoridade.',
        'Legenda curta, direta e imediata, com CTA claro.',
        'Legenda dinâmica, com gancho inicial forte e CTA objetivo.'
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        image_prompt_master              = EXCLUDED.image_prompt_master,
        negative_prompt                  = EXCLUDED.negative_prompt,
        feed_prompt_modifier             = EXCLUDED.feed_prompt_modifier,
        story_prompt_modifier            = EXCLUDED.story_prompt_modifier,
        reel_prompt_modifier             = EXCLUDED.reel_prompt_modifier,
        authority_prompt_block           = EXCLUDED.authority_prompt_block,
        process_prompt_block             = EXCLUDED.process_prompt_block,
        lifestyle_prompt_block           = EXCLUDED.lifestyle_prompt_block,
        product_prompt_block             = EXCLUDED.product_prompt_block,
        color_direction                  = EXCLUDED.color_direction,
        casting_direction                = EXCLUDED.casting_direction,
        scenario_direction               = EXCLUDED.scenario_direction,
        text_overlay_required            = EXCLUDED.text_overlay_required,
        image_headline_primary           = EXCLUDED.image_headline_primary,
        image_headline_variations        = EXCLUDED.image_headline_variations,
        image_text_style_instruction     = EXCLUDED.image_text_style_instruction,
        feed_text_overlay_instruction    = EXCLUDED.feed_text_overlay_instruction,
        story_text_overlay_instruction   = EXCLUDED.story_text_overlay_instruction,
        reel_text_overlay_instruction    = EXCLUDED.reel_text_overlay_instruction,
        post_caption_cta_primary         = EXCLUDED.post_caption_cta_primary,
        post_caption_cta_variations      = EXCLUDED.post_caption_cta_variations,
        post_caption_tone                = EXCLUDED.post_caption_tone,
        post_caption_structure           = EXCLUDED.post_caption_structure,
        post_caption_instruction_master  = EXCLUDED.post_caption_instruction_master,
        feed_caption_modifier            = EXCLUDED.feed_caption_modifier,
        story_caption_modifier           = EXCLUDED.story_caption_modifier,
        reel_caption_modifier            = EXCLUDED.reel_caption_modifier,
        updated_at                       = NOW()
    `);
    logger.info({ msg: "✅ Tabela marketing_prompt_settings OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar marketing_prompt_settings", error: msg });
  }
}

export async function addHubAccessTokenToPreCadastros() {
  try {
    await pool.query(`
      ALTER TABLE comunidade_pre_cadastros
        ADD COLUMN IF NOT EXISTS hub_access_token VARCHAR(64) UNIQUE,
        ADD COLUMN IF NOT EXISTS hub_magic_link TEXT
    `);
    logger.info({ msg: "✅ comunidade_pre_cadastros: colunas hub_access_token + hub_magic_link OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao adicionar hub_access_token", error: msg });
  }
}

// ── Remove defaults de banco que aceitavam r2pb silenciosamente ───────────────
export async function dropDangerousColumnDefaultsIfNeeded() {
  try {
    // leads_espelho.tenant_id: remove DEFAULT 'r2pb' do banco — callers devem fornecer explicitamente
    await pool.query(`ALTER TABLE leads_espelho ALTER COLUMN tenant_id DROP DEFAULT`);
    logger.info({ msg: "✅ leads_espelho.tenant_id: DEFAULT removido — tenant obrigatório em todas inserções" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Ignora "column has no default" (já foi removido)
    if (!msg.includes("does not have a default")) {
      logger.error({ msg: "❌ Falha ao remover DEFAULT de leads_espelho.tenant_id", error: msg });
    }
  }
}

// ── tenant_id em mira_leads + meeting_webhook_url em sales_automation_config ──
export async function addTenantIsolationColumnsIfNeeded() {
  try {
    // mira_leads: adiciona tenant_id (default 'mirage' para registros existentes)
    await pool.query(`
      ALTER TABLE mira_leads
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'mirage'
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS mira_leads_tenant_idx ON mira_leads (tenant_id)
    `);

    // sales_automation_config: adiciona meeting_webhook_url por tenant
    await pool.query(`
      ALTER TABLE sales_automation_config
        ADD COLUMN IF NOT EXISTS meeting_webhook_url TEXT
    `);

    logger.info({ msg: "✅ Isolamento de tenant: mira_leads.tenant_id + sales_automation_config.meeting_webhook_url OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha em addTenantIsolationColumnsIfNeeded", error: msg });
  }
}

// Retroativamente migra tasks replit_agent_handoff que estejam em status "pending" para "pending_handoff"
export async function migrateReplitHandoffStatusIfNeeded() {
  try {
    const result = await pool.query(`
      UPDATE atos_tasks
      SET status = 'pending_handoff', updated_at = NOW()
      WHERE task_type = 'replit_agent_handoff'
        AND status = 'pending'
    `);
    if ((result.rowCount ?? 0) > 0) {
      logger.info({ msg: `✅ ${result.rowCount} task(s) replit_agent_handoff migradas para pending_handoff` });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha em migrateReplitHandoffStatusIfNeeded", error: msg });
  }
}

export async function createAtosTaskEventsIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS atos_task_events (
        id          SERIAL PRIMARY KEY,
        task_id     INTEGER NOT NULL REFERENCES atos_tasks(id),
        from_status TEXT,
        to_status   TEXT NOT NULL,
        origin      TEXT NOT NULL DEFAULT 'system',
        notes       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS atos_task_events_task_idx ON atos_task_events (task_id)`);
    logger.info({ msg: "✅ Tabela atos_task_events OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar atos_task_events", error: msg });
  }
}

// ── ATHOS MEMORY — seed de estado estratégico (roda no boot, idempotente) ────
export async function seedAthosStrategicMemoryIfNeeded() {
  try {
    // Só insere se o snapshot ainda não existe para "mirage"
    const existing = await pool.query(`SELECT id FROM executive_snapshots WHERE company_slug = 'mirage' LIMIT 1`);
    if (existing.rows.length > 0) {
      logger.info({ msg: "✅ ATHOS Memory seed — snapshot mirage já existe, pulando" });
      return;
    }

    // 1. Executive Snapshot
    await pool.query(`
      INSERT INTO executive_snapshots
        (company_slug, current_stage, status, summary_json, priorities_json, risks_json, opportunities_json, metrics_json, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [
      "mirage",
      "consolidation_growth",
      "validated",
      JSON.stringify({
        plataforma: "Mirage Hub — SaaS multi-tenant para confecção e moda",
        infra: "Replit (produção oficial) + Supabase (PostgreSQL prod) + n8n (Hetzner) + Vercel (futuros frontends standalone)",
        deploy: "Replit Deployments. Notificação WhatsApp obrigatória em cada startup de produção via Z-API.",
        tenants_ativos: ["r2pb", "moda-conecta"],
        modulos_operacionais: ["CRM/Pipeline", "Kanban PLM", "Marketing (Growth/Prompt Studio)", "Comunidade (Moda Conecta)", "Financeiro", "Mentor ATHOS", "TexIntel AI"],
        ultimo_update: "Agosto 2026 — Pipeline de Curadoria Moda Conecta consolidado; widget novos leads no dashboard; Admin → Curadoria redirecionado"
      }),
      JSON.stringify([
        { ref: "44", titulo: "TexIntel — Hub Integration (DB + API routes)", urgencia: "alta", status: "PENDING" },
        { ref: "45", titulo: "TexIntel AI — Pipeline Service (CNPJ + Scraping + Claude)", urgencia: "alta", status: "PENDING — aguarda #44" },
        { ref: "33", titulo: "Alertas do sistema chegarem ao admin sem Z-API próprio configurado", urgencia: "alta", status: "PENDING" },
        { ref: "17", titulo: "Salvar publicações do Fórum, Vagas e Anúncios no banco", urgencia: "media", status: "PENDING" },
        { ref: "18", titulo: "Conectar IA do Moda Conecta à API real", urgencia: "media", status: "PENDING" },
        { ref: "32", titulo: "Pré-cadastro público de fornecedor — tenant correto + revisão obrigatória", urgencia: "media", status: "PENDING" },
        { ref: "11", titulo: "Ver respostas do diagnóstico ao clicar em contato comercial", urgencia: "media", status: "PENDING" },
        { ref: "8",  titulo: "Pré-visualizar e aprovar imagem gerada antes de publicar no feed", urgencia: "media", status: "PENDING" },
        { ref: "7",  titulo: "Garantir que slots de autoridade/processo não gerem modelo de moda", urgencia: "media", status: "PENDING" },
        { ref: "9",  titulo: "Salvar legenda editada no asset antes de publicar", urgencia: "baixa", status: "PROPOSED" },
        { ref: "10", titulo: "Contador de caracteres na legenda", urgencia: "baixa", status: "PROPOSED" },
        { ref: "13", titulo: "Aplicar voz da R2PB automaticamente em novos tenants", urgencia: "baixa", status: "PROPOSED" },
        { ref: "14", titulo: "Testar se prompts da R2PB chegam na IA ao gerar imagem", urgencia: "baixa", status: "PROPOSED" },
        { ref: "1",  titulo: "Upgrade gpt-4.1-mini → gpt-5-mini", urgencia: "baixa", status: "PROPOSED" },
        { ref: "2",  titulo: "Upgrade gpt-4o-mini → gpt-5.4-mini", urgencia: "baixa", status: "PROPOSED" },
        { ref: "3",  titulo: "Upgrade gpt-4.1 → gpt-5", urgencia: "baixa", status: "PROPOSED" }
      ]),
      JSON.stringify([
        "TexIntel pipeline depende de scraping externo (CNPJ) — pode falhar silenciosamente sem tratamento de erro robusto",
        "drizzle-kit push interativo trava em shells não-interativos — sempre usar psql raw ou migrate.ts para novas tabelas em prod",
        "ffmpeg não garantido em prod sem declaração explícita de dependência de sistema — transcrição de áudio pode falhar",
        "Z-API exige Client-Token header — alertas sem canal configurado ficam mudos; task #33 resolve isso",
        "Multiagente (CARLA) desativado por feature flag MULTIAGENTE_ENABLED=false"
      ]),
      JSON.stringify([
        "TexIntel como produto standalone (Vercel) para prospecção de fornecedores — alto valor comercial",
        "Moda Conecta crescendo: Pipeline de Curadoria centralizado, formulário completo com checklist validado",
        "Growth multi-tenant pronto para escalar além da R2PB com filtro ?company_slug=",
        "ATHOS com memória estratégica persistente — pode orquestrar tarefas de forma autônoma via tools"
      ]),
      JSON.stringify({
        tasks_total: 17, tasks_pending: 10, tasks_proposed: 7, tasks_implemented: 1,
        modulos_com_db_persistencia: ["CRM", "Kanban", "Financeiro", "Marketing", "Comunidade", "Mentor", "TexIntel (pendente #44)"]
      })
    ]);

    // 2. Strategic Memory Entries
    const entries = [
      {
        entity_type: "company", entity_key: "mirage", category: "ops",
        title: "Pipeline de Curadoria Moda Conecta — consolidação concluída (ago/2026)",
        content: `Toda gestão de leads do Moda Conecta centralizada em /hub/comunidade (aba Pipeline). Ao clicar em um lead → busca formulário completo por email em comunidade_pre_cadastros → exibe checklist (obrigatórios: nome, telefone, cidade/estado, tipo, lote mínimo; complementares: capacidade, portfólio, fotos, info adicional) + barra de progresso. Botões "Aprovar formulário" / "Reprovar formulário" atuam no pre-cadastro SEM gerar acesso ao Hub. Widget de novos leads no dashboard (só super-admin): banner verde + link direto ao Pipeline. /admin/cadastros-moda-conecta agora é redirect automático para /hub/comunidade. DUAS TABELAS: moda_conecta_leads (pipeline) e comunidade_pre_cadastros (formulário, vinculado por email).`,
        source_type: "replit_agent", confidence_level: "verified",
        tags: ["moda-conecta","pipeline","curadoria","leads","hub"]
      },
      {
        entity_type: "company", entity_key: "mirage", category: "decision",
        title: "TexIntel AI — arquitetura e próximos passos (ALTA PRIORIDADE)",
        content: `Produto standalone de inteligência de fornecedores têxteis. Frontend: artifacts/texintel (Vite/React). Backend: artifacts/api-server. Task #44 (PENDING — ALTA): criar tabela texintel_searches + rotas /texintel/* no API server + auth interna x-internal-key. Task #45 (PENDING — bloqueada por #44): Pipeline Service — busca CNPJ Receita Federal + scraping site + análise Claude. Deploy futuro: Vercel para frontend standalone.`,
        source_type: "replit_agent", confidence_level: "high",
        tags: ["texintel","pipeline","cnpj","scraping","claude","prioridade-alta"]
      },
      {
        entity_type: "company", entity_key: "mirage", category: "ops",
        title: "Alertas do sistema sem Z-API próprio — task #33 (ALTA PRIORIDADE)",
        content: `Sistema precisa enviar alertas ao admin mesmo sem canal Z-API próprio configurado no tenant. Task #33 (PENDING): fallback — alertas críticos usam canal Z-API master (Mirage) em vez do canal do tenant. Sem isso: erros de produção, novos leads e eventos críticos ficam mudos para o admin.`,
        source_type: "replit_agent", confidence_level: "high",
        tags: ["alertas","z-api","admin","sistema","prioridade-alta"]
      },
      {
        entity_type: "company", entity_key: "mirage", category: "ops",
        title: "Marketing Module — estado atual e tasks abertas",
        content: `Growth multi-tenant testado na R2PB. Filtro por tenant via ?company_slug= ainda pendente. Prompt Studio R2PB configurado com voz de marca (task #5 — IMPLEMENTED). Tasks abertas: #8 pré-visualizar imagem antes de publicar (PENDING), #7 bloquear modelo de moda em slots de autoridade/processo (PENDING), #9 salvar legenda editada (PROPOSED), #10 contador de caracteres (PROPOSED), #14 testar prompts R2PB na IA (PROPOSED), #1/#2/#3 upgrades de modelo GPT (PROPOSED — baixa prioridade).`,
        source_type: "replit_agent", confidence_level: "high",
        tags: ["marketing","growth","prompt-studio","r2pb","imagem"]
      },
      {
        entity_type: "company", entity_key: "mirage", category: "ops",
        title: "Comunidade Moda Conecta — persistência e IA pendentes",
        content: `Tasks abertas: #17 salvar publicações do Fórum/Vagas/Anúncios no banco (sem isso dados se perdem ao recarregar), #18 conectar IA do Moda Conecta à API real (hoje usa stub), #32 pré-cadastro público de fornecedor com tenant correto + revisão obrigatória, #11 ver respostas do diagnóstico ao clicar em contato comercial no CRM, #13 aplicar voz da R2PB automaticamente em novos tenants.`,
        source_type: "replit_agent", confidence_level: "high",
        tags: ["comunidade","moda-conecta","forum","ia","pre-cadastro"]
      },
      {
        entity_type: "company", entity_key: "mirage", category: "decision",
        title: "Regras invioláveis de infraestrutura e deploy",
        content: `1. NOTIFICAÇÃO WHATSAPP obrigatória em todo startup de produção. Client-Token header obrigatório na Z-API. 2. drizzle-kit push TRAVA em shells não-interativos. Novas tabelas em produção: sempre via migrate.ts (idempotente no boot) ou psql direto na URL de produção. 3. ffmpeg não garantido em prod sem declaração explícita. 4. MULTIAGENTE_ENABLED=false — CARLA routing desativado, fallback para Joana. 5. OBRIGATÓRIO: ler docs/modules/00-index.md + módulo relevante ANTES de qualquer edição de módulo existente.`,
        source_type: "replit_agent", confidence_level: "verified",
        tags: ["infra","deploy","regras","drizzle","z-api","prod"]
      },
      {
        entity_type: "company", entity_key: "mirage", category: "decision",
        title: "Super-admin, multi-tenant e integrações estruturais",
        content: `Super-admin: clovisart13@gmail.com (SUPER_ADMIN_EMAIL hardcoded no Hub). Multi-tenant: R2PB = r2pb, Moda Conecta = moda-conecta. Helena (CRM) e VhSys (ERP) são white-labels revendidos pela Mirage — validar acesso API antes de qualquer dashboard ou automação. Banco de Parceiros: cotações com botões Sim/Não manuais (Z-API não envia botões interativos em números comuns). LP PRO: lead-classify detecta "vim pelo Plano PRO" → handoff imediato sem IA.`,
        source_type: "replit_agent", confidence_level: "verified",
        tags: ["super-admin","multi-tenant","r2pb","helena","vhsys","parceiros"]
      }
    ];

    for (const e of entries) {
      await pool.query(`
        INSERT INTO strategic_memory_entries
          (entity_type, entity_key, category, title, content, source_type, confidence_level, tags, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      `, [e.entity_type, e.entity_key, e.category, e.title, e.content, e.source_type, e.confidence_level, JSON.stringify(e.tags)]);
    }

    logger.info({ msg: "✅ ATHOS Memory seed concluído — 1 snapshot + 7 entradas estratégicas inseridas" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha no ATHOS Memory seed", error: msg });
  }
}

// ── ATHOS MEMORY — 4 tabelas de consciência estratégica ──────────────────────
export async function createAthosMemoryTablesIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_master_blueprints (
        id                  SERIAL PRIMARY KEY,
        company_slug        TEXT NOT NULL UNIQUE,
        company_name        TEXT NOT NULL,
        type                TEXT NOT NULL DEFAULT 'other',
        brand_identity_json  JSONB,
        positioning_json     JSONB,
        audience_json        JSONB,
        offers_json          JSONB,
        channels_json        JSONB,
        operations_json      JSONB,
        goals_json           JSONB,
        objections_json      JSONB,
        competitors_json     JSONB,
        visual_system_json   JSONB,
        strategic_notes_json JSONB,
        confidence_score     NUMERIC(4,1) DEFAULT 0,
        status              TEXT NOT NULL DEFAULT 'draft',
        updated_by          TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_intelligence_profiles (
        id                    SERIAL PRIMARY KEY,
        domain_key            TEXT NOT NULL UNIQUE,
        title                 TEXT NOT NULL,
        market_summary_json    JSONB,
        customer_behavior_json JSONB,
        pains_json             JSONB,
        opportunities_json     JSONB,
        threats_json           JSONB,
        competitors_json       JSONB,
        trends_json            JSONB,
        terminology_json       JSONB,
        confidence_score       NUMERIC(4,1) DEFAULT 0,
        status                TEXT NOT NULL DEFAULT 'draft',
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS strategic_memory_entries (
        id               SERIAL PRIMARY KEY,
        entity_type      TEXT NOT NULL,
        entity_key       TEXT NOT NULL,
        category         TEXT NOT NULL,
        title            TEXT NOT NULL,
        content          TEXT NOT NULL,
        source_type      TEXT NOT NULL DEFAULT 'manual',
        confidence_level TEXT NOT NULL DEFAULT 'medium',
        tags             JSONB,
        effective_from   TIMESTAMPTZ,
        effective_until  TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS sme_entity_idx ON strategic_memory_entries (entity_key, entity_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS sme_category_idx ON strategic_memory_entries (category)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS executive_snapshots (
        id                SERIAL PRIMARY KEY,
        company_slug      TEXT NOT NULL UNIQUE,
        summary_json       JSONB,
        priorities_json    JSONB,
        risks_json         JSONB,
        opportunities_json JSONB,
        metrics_json       JSONB,
        current_stage     TEXT,
        status            TEXT NOT NULL DEFAULT 'draft',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info({ msg: "✅ Tabelas ATHOS Memory OK (company_master_blueprints, market_intelligence_profiles, strategic_memory_entries, executive_snapshots)" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabelas ATHOS Memory", error: msg });
  }
}

export async function createFormTokensTableIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS form_tokens (
        token      VARCHAR(16)  PRIMARY KEY,
        params     JSONB        NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    logger.info({ msg: "✅ Tabela form_tokens OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar form_tokens", error: msg });
  }
}

export async function createGrowthCampaignSlotsIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS growth_campaign_slots (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       TEXT        NOT NULL,
        campaign_id     UUID        NOT NULL,
        slot_type       TEXT        NOT NULL CHECK (slot_type IN ('feed','story','reel')),
        slot_index      INTEGER     NOT NULL DEFAULT 1,
        planned_date    TEXT,
        creative_axis   TEXT,
        segment         TEXT,
        objective       TEXT,
        is_extra        BOOLEAN     NOT NULL DEFAULT false,
        status          TEXT        NOT NULL DEFAULT 'pending_generation',
        regeneration_of UUID,
        asset_id        UUID,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS gcs_campaign_idx ON growth_campaign_slots (campaign_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS gcs_status_idx   ON growth_campaign_slots (status)`);
    logger.info({ msg: "✅ Tabela growth_campaign_slots OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar growth_campaign_slots", error: msg });
  }
}

export async function createKanbanPreAgendamentosTablesIfNeeded() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pre_agendamentos (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR NOT NULL,
        pedido_id VARCHAR NOT NULL,
        numero VARCHAR(30) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        cliente_nome VARCHAR(255),
        cliente_email VARCHAR(320),
        cliente_telefone VARCHAR(50),
        endereco_cliente TEXT,
        cep_cliente VARCHAR(10),
        cidade_cliente VARCHAR(100),
        uf_cliente VARCHAR(2),
        subtotal_cents INTEGER NOT NULL DEFAULT 0,
        sinais_cents INTEGER NOT NULL DEFAULT 0,
        descontos_cents INTEGER NOT NULL DEFAULT 0,
        acrescimos_cents INTEGER NOT NULL DEFAULT 0,
        total_cents INTEGER NOT NULL DEFAULT 0,
        reverted_at TIMESTAMP,
        reverted_by VARCHAR,
        reverted_reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS pre_agendamentos_tenant_idx
        ON pre_agendamentos (tenant_id);
      CREATE INDEX IF NOT EXISTS pre_agendamentos_pedido_idx
        ON pre_agendamentos (pedido_id);
      CREATE INDEX IF NOT EXISTS pre_agendamentos_status_idx
        ON pre_agendamentos (tenant_id, status);

      CREATE TABLE IF NOT EXISTS pre_agendamento_itens (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR NOT NULL,
        pre_agendamento_id VARCHAR NOT NULL,
        pedido_item_id VARCHAR NOT NULL,
        referencia_id VARCHAR NOT NULL,
        referencia VARCHAR(100) NOT NULL,
        descricao TEXT,
        quantidade_cortada INTEGER NOT NULL DEFAULT 0,
        valor_unitario_cents INTEGER NOT NULL DEFAULT 0,
        valor_total_cents INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS pre_agendamento_itens_pre_idx
        ON pre_agendamento_itens (pre_agendamento_id);
      CREATE INDEX IF NOT EXISTS pre_agendamento_itens_ref_idx
        ON pre_agendamento_itens (tenant_id, referencia_id);

      CREATE TABLE IF NOT EXISTS pre_agendamento_ajustes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR NOT NULL,
        pre_agendamento_id VARCHAR NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        valor_cents INTEGER NOT NULL,
        origem VARCHAR(20) NOT NULL DEFAULT 'manual',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS pre_agendamento_ajustes_pre_idx
        ON pre_agendamento_ajustes (pre_agendamento_id);
      CREATE INDEX IF NOT EXISTS pre_agendamento_ajustes_tenant_idx
        ON pre_agendamento_ajustes (tenant_id);
    `);
    logger.info({ msg: "✅ Tabelas de pré-agendamento Kanban OK" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao criar tabelas de pré-agendamento Kanban", error: msg });
    throw err;
  }
}

export async function reconcileOfficialCutQuantitiesIfNeeded() {
  const migrationKey = "kanban_cut_quantity_reconcile_quick_threads_v1";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_reconciliations (
        migration_key TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        affected_references INTEGER NOT NULL DEFAULT 0,
        affected_stock INTEGER NOT NULL DEFAULT 0
      )
    `);
    const alreadyApplied = await client.query(
      `SELECT migration_key FROM data_reconciliations WHERE migration_key = $1`,
      [migrationKey],
    );
    if (alreadyApplied.rowCount) {
      await client.query("COMMIT");
      logger.info({ msg: "✅ Reconciliação de quantidades do Corte já aplicada" });
      return;
    }

    const refs = await client.query(`
      WITH ultimo_corte AS (
        SELECT DISTINCT ON (referencia_id, tenant_id)
          referencia_id,
          tenant_id,
          quantidade_conferida
        FROM movimentacoes
        WHERE fase_origem = 'corte'
          AND fase_destino IS NOT NULL
          AND fase_destino <> 'corte'
          AND quantidade_conferida IS NOT NULL
          AND quantidade_conferida >= 0
        ORDER BY referencia_id, tenant_id, created_at DESC, id DESC
      )
      UPDATE referencias r
      SET quantidade_cortada = c.quantidade_conferida,
          updated_at = NOW()
      FROM ultimo_corte c
      WHERE r.id = c.referencia_id
        AND r.tenant_id = c.tenant_id
        AND EXISTS (
          SELECT 1
          FROM configuracoes_empresa ce
          WHERE ce.tenant_id = r.tenant_id
            AND LOWER(ce.nome_empresa) = 'quick threads ltda'
        )
        AND COALESCE(r.quantidade_cortada, 0) = 0
        AND c.quantidade_conferida > 0
      RETURNING r.id
    `);

    const estoques = await client.query(`
      UPDATE estoque e
      SET qtd_cortada = r.quantidade_cortada,
          atualizado_em = NOW()
      FROM referencias r
      WHERE e.referencia_id = r.id
        AND e.tenant_id = r.tenant_id
        AND EXISTS (
          SELECT 1
          FROM configuracoes_empresa ce
          WHERE ce.tenant_id = e.tenant_id
            AND LOWER(ce.nome_empresa) = 'quick threads ltda'
        )
        AND COALESCE(e.qtd_cortada, 0) = 0
        AND COALESCE(r.quantidade_cortada, 0) > 0
      RETURNING e.id
    `);
    await client.query(
      `INSERT INTO data_reconciliations
        (migration_key, affected_references, affected_stock)
       VALUES ($1, $2, $3)`,
      [migrationKey, refs.rowCount ?? 0, estoques.rowCount ?? 0],
    );
    await client.query("COMMIT");

    logger.info({
      msg: "✅ Quantidades oficiais do Corte reconciliadas",
      referencias: refs.rowCount ?? 0,
      estoques: estoques.rowCount ?? 0,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "❌ Falha ao reconciliar quantidades do Corte", error: msg });
    throw err;
  } finally {
    client.release();
  }
}
// Migration helpers end here.
