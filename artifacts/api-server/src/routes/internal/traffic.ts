/**
 * Internal Traffic Routes — GA4 + Meta Ads
 * Requer secrets: GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_JSON, META_ADS_ACCESS_TOKEN, META_ADS_ACCOUNT_ID
 */
import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

const INTERNAL_KEY = process.env["MARKETING_INTERNAL_API_KEY"] ?? "";

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = req.headers["x-internal-key"];
  if (!INTERNAL_KEY) return next(); // sem key configurada, aceita tudo (dev)
  if (key !== INTERNAL_KEY) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── Helpers GA4 ───────────────────────────────────────────────────────────────

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(sa.private_key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`GA4 token error: ${err}`);
  }
  const tokenData = await tokenRes.json() as { access_token: string };
  return tokenData.access_token;
}

async function fetchGA4Report(propertyId: string, accessToken: string, days: number) {
  const endDate = "today";
  const startDate = `${days}daysAgo`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
    ],
    dimensions: [],
  };

  const overviewRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!overviewRes.ok) throw new Error(`GA4 report error: ${await overviewRes.text()}`);
  const overviewData = await overviewRes.json() as { rows?: Array<{ metricValues: Array<{ value: string }> }> };

  // Top páginas
  const pagesRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        dimensions: [{ name: "pagePath" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
    }
  );
  const pagesData = await pagesRes.json() as { rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> };

  // Origens de tráfego
  const sourcesRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        dimensions: [{ name: "sessionDefaultChannelGrouping" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
    }
  );
  const sourcesData = await sourcesRes.json() as { rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> };

  const row = overviewData.rows?.[0]?.metricValues ?? [];
  return {
    periodo: `últimos ${days} dias`,
    visao_geral: {
      sessoes: parseInt(row[0]?.value ?? "0"),
      usuarios_ativos: parseInt(row[1]?.value ?? "0"),
      pageviews: parseInt(row[2]?.value ?? "0"),
      bounce_rate: parseFloat((parseFloat(row[3]?.value ?? "0") * 100).toFixed(1)),
      duracao_media_seg: parseFloat(parseFloat(row[4]?.value ?? "0").toFixed(0)),
    },
    top_paginas: (pagesData.rows ?? []).map(r => ({
      pagina: r.dimensionValues[0]?.value,
      pageviews: parseInt(r.metricValues[0]?.value ?? "0"),
      usuarios: parseInt(r.metricValues[1]?.value ?? "0"),
    })),
    origens: (sourcesData.rows ?? []).map(r => ({
      canal: r.dimensionValues[0]?.value,
      sessoes: parseInt(r.metricValues[0]?.value ?? "0"),
      usuarios: parseInt(r.metricValues[1]?.value ?? "0"),
    })),
  };
}

// ── Helpers Meta Ads ──────────────────────────────────────────────────────────

async function fetchMetaAdsData(accountId: string, accessToken: string, days: number) {
  const datePreset = days <= 7 ? "last_7d" : days <= 30 ? "last_30d" : "last_90d";

  // Visão geral da conta
  const overviewRes = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,impressions,reach,clicks,cpm,cpc,actions&date_preset=${datePreset}&access_token=${accessToken}`
  );
  if (!overviewRes.ok) throw new Error(`Meta Ads error: ${await overviewRes.text()}`);
  const overviewData = await overviewRes.json() as { data?: Array<Record<string, string>> };

  // Campanhas
  const campaignsRes = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=name,status,insights{spend,impressions,reach,clicks,actions}&date_preset=${datePreset}&access_token=${accessToken}&limit=10`
  );
  const campaignsData = await campaignsRes.json() as {
    data?: Array<{
      name: string;
      status: string;
      insights?: { data?: Array<Record<string, unknown>> };
    }>;
  };

  const overview = overviewData.data?.[0] ?? {};
  const leads = (overview.actions as unknown as Array<{ action_type: string; value: string }> | undefined)
    ?.find(a => a.action_type === "lead")?.value ?? "0";

  const spend = parseFloat(overview["spend"] as string ?? "0");
  const leadsNum = parseInt(leads);
  const cpl = leadsNum > 0 ? parseFloat((spend / leadsNum).toFixed(2)) : null;

  return {
    periodo: datePreset,
    visao_geral: {
      gasto_brl: spend,
      impressoes: parseInt((overview["impressions"] as string) ?? "0"),
      alcance: parseInt((overview["reach"] as string) ?? "0"),
      cliques: parseInt((overview["clicks"] as string) ?? "0"),
      cpm: parseFloat((overview["cpm"] as string) ?? "0"),
      cpc: parseFloat((overview["cpc"] as string) ?? "0"),
      leads: leadsNum,
      cpl_brl: cpl,
    },
    campanhas: (campaignsData.data ?? []).map(c => {
      const ins = c.insights?.data?.[0] as Record<string, unknown> | undefined ?? {};
      const cLeads = (ins.actions as Array<{ action_type: string; value: string }> | undefined)
        ?.find(a => a.action_type === "lead")?.value ?? "0";
      const cSpend = parseFloat((ins["spend"] as string) ?? "0");
      const cLeadsNum = parseInt(cLeads);
      return {
        nome: c.name,
        status: c.status,
        gasto: cSpend,
        impressoes: parseInt((ins["impressions"] as string) ?? "0"),
        cliques: parseInt((ins["clicks"] as string) ?? "0"),
        leads: cLeadsNum,
        cpl: cLeadsNum > 0 ? parseFloat((cSpend / cLeadsNum).toFixed(2)) : null,
      };
    }),
  };
}

// ── Rotas ─────────────────────────────────────────────────────────────────────

router.get("/api/internal/traffic/ga4", requireInternalKey, async (req: Request, res: Response) => {
  const propertyId = process.env["GA4_PROPERTY_ID"];
  const serviceAccountJson = process.env["GA4_SERVICE_ACCOUNT_JSON"];
  if (!propertyId || !serviceAccountJson) {
    res.status(503).json({
      error: "GA4 não configurado",
      missing: [...(!propertyId ? ["GA4_PROPERTY_ID"] : []), ...(!serviceAccountJson ? ["GA4_SERVICE_ACCOUNT_JSON"] : [])],
      instrucoes: "Adicione os secrets GA4_PROPERTY_ID e GA4_SERVICE_ACCOUNT_JSON nas configurações do Replit.",
    });
    return;
  }
  try {
    const days = parseInt((req.query["days"] as string) ?? "7");
    const token = await getGoogleAccessToken(serviceAccountJson);
    const data = await fetchGA4Report(propertyId, token, days);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/api/internal/traffic/meta-ads", requireInternalKey, async (req: Request, res: Response) => {
  const accountId = process.env["META_ADS_ACCOUNT_ID"];
  const accessToken = process.env["META_ADS_ACCESS_TOKEN"];
  if (!accountId || !accessToken) {
    res.status(503).json({
      error: "Meta Ads não configurado",
      missing: [...(!accountId ? ["META_ADS_ACCOUNT_ID"] : []), ...(!accessToken ? ["META_ADS_ACCESS_TOKEN"] : [])],
      instrucoes: "Adicione os secrets META_ADS_ACCOUNT_ID (formato: act_XXXXXXXX) e META_ADS_ACCESS_TOKEN nas configurações do Replit.",
    });
    return;
  }
  try {
    const days = parseInt((req.query["days"] as string) ?? "7");
    const data = await fetchMetaAdsData(accountId, accessToken, days);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/api/internal/traffic/summary", requireInternalKey, async (req: Request, res: Response) => {
  const days = parseInt((req.query["days"] as string) ?? "7");
  const results: Record<string, unknown> = { periodo_dias: days };

  const propertyId = process.env["GA4_PROPERTY_ID"];
  const serviceAccountJson = process.env["GA4_SERVICE_ACCOUNT_JSON"];
  if (propertyId && serviceAccountJson) {
    try {
      const token = await getGoogleAccessToken(serviceAccountJson);
      results["ga4"] = await fetchGA4Report(propertyId, token, days);
    } catch (err) {
      results["ga4"] = { erro: String(err) };
    }
  } else {
    results["ga4"] = { nao_configurado: true, missing: ["GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT_JSON"] };
  }

  const accountId = process.env["META_ADS_ACCOUNT_ID"];
  const accessToken = process.env["META_ADS_ACCESS_TOKEN"];
  if (accountId && accessToken) {
    try {
      results["meta_ads"] = await fetchMetaAdsData(accountId, accessToken, days);
    } catch (err) {
      results["meta_ads"] = { erro: String(err) };
    }
  } else {
    results["meta_ads"] = { nao_configurado: true, missing: ["META_ADS_ACCOUNT_ID", "META_ADS_ACCESS_TOKEN"] };
  }

  res.json(results);
});

export default router;
