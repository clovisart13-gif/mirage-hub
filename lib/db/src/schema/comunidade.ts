/**
 * ============================================================
 *  SCHEMA COMUNIDADE — Ecossistema Mirage
 * ============================================================
 *  Marketplace R2PB: fornecedores, cotações, feed, fórum, vagas
 *  Migrado do Manus (MySQL) para PostgreSQL com Drizzle ORM
 * ============================================================
 */

import {
  pgTable,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const uuid = (name: string) =>
  varchar(name, { length: 36 }).default(sql`gen_random_uuid()`);

// ─── PERFIS DA COMUNIDADE ─────────────────────────────────────
export const comunidadeProfiles = pgTable("comunidade_profiles", {
  id:        uuid("id").primaryKey(),
  tenantId:  varchar("tenant_id", { length: 36 }).notNull(),
  userId:    varchar("user_id", { length: 36 }).notNull(),

  userType:    text("user_type").notNull().default("cliente"),  // 'cliente' | 'fornecedor'
  profileType: text("profile_type").default("lead_qualificado"), // 'cliente_ativo' | 'lead_qualificado' | 'mentor_consultor'

  professionalTitle: text("professional_title"),
  areaOfExpertise:   text("area_of_expertise"),
  bio:               text("bio"),
  profilePhoto:      text("profile_photo"),
  coverPhoto:        text("cover_photo"),

  // Endereço
  cep:          varchar("cep", { length: 10 }),
  endereco:     text("endereco"),
  numero:       varchar("numero", { length: 20 }),
  complemento:  varchar("complemento", { length: 100 }),
  bairro:       varchar("bairro", { length: 100 }),
  cidade:       varchar("cidade", { length: 100 }),
  estado:       varchar("estado", { length: 2 }),
  latitude:     numeric("latitude", { precision: 10, scale: 8 }),
  longitude:    numeric("longitude", { precision: 11, scale: 8 }),

  // Avaliações (calculado)
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews:  integer("total_reviews").default(0).notNull(),

  // Fornecedor
  serviceTypes:        jsonb("service_types"),   // string[]
  productionCapacity:  text("production_capacity"), // 'pequena'|'media'|'grande'
  fabricTypes:         jsonb("fabric_types"),    // string[]
  equipments:          text("equipments"),
  certifications:      text("certifications"),
  averageDeliveryDays: integer("average_delivery_days"),
  minimumOrderValue:   numeric("minimum_order_value", { precision: 10, scale: 2 }),
  serviceRegion:       text("service_region"),   // 'local'|'estadual'|'nacional'|'internacional'
  isPrivateLabel:      boolean("is_private_label").default(false),

  // Cliente
  businessType:        text("business_type"),
  businessSegment:     jsonb("business_segment"),  // string[]
  averageOrderVolume:  text("average_order_volume"),
  orderFrequency:      text("order_frequency"),
  servicesNeeded:      jsonb("services_needed"),   // string[]

  // Curadoria R2PB
  approvalStatus:    text("approval_status").default("pendente").notNull(), // 'pendente'|'aprovado'|'recusado'
  verifiedByAdmin:   boolean("verified_by_admin").default(false).notNull(),
  recommendedByAdmin:boolean("recommended_by_admin").default(false).notNull(),
  adminReview:       text("admin_review"),
  adminRating:       integer("admin_rating"),
  approvedAt:        timestamp("approved_at", { withTimezone: true }),

  // Assinatura na comunidade
  subscriptionPlan:      text("subscription_plan").default("gratuito"),
  subscriptionStatus:    text("subscription_status").default("ativo"),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),

  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  ativo:               boolean("ativo").default(true).notNull(),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserTenant: unique().on(t.tenantId, t.userId),
  idxTenant:      index("idx_com_profiles_tenant").on(t.tenantId),
  idxUserType:    index("idx_com_profiles_user_type").on(t.userType, t.approvalStatus),
}));

// ─── ESPECIALIDADES HIERÁRQUICAS ──────────────────────────────
// Nível 1 = Fase (Estamparia), 2 = Categoria (Silk Screen), 3 = Especialidade (Serigrafia)
export const comunidadeEspecialidades = pgTable("comunidade_especialidades", {
  id:           uuid("id").primaryKey(),
  tenantId:     varchar("tenant_id", { length: 36 }).notNull(),
  parentId:     varchar("parent_id", { length: 36 }),              // null = fase raiz
  code:         varchar("code", { length: 50 }).notNull(),
  name:         text("name").notNull(),
  level:        integer("level").notNull(),                        // 1|2|3
  displayOrder: integer("display_order").default(0).notNull(),
  ativo:        boolean("ativo").default(true).notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqCode:  unique().on(t.tenantId, t.code),
  idxTenant: index("idx_com_esp_tenant").on(t.tenantId, t.level),
}));

// ─── ESPECIALIDADES DO FORNECEDOR (N:N) ───────────────────────
export const comunidadeSupplierSpecialties = pgTable("comunidade_supplier_specialties", {
  id:           uuid("id").primaryKey(),
  profileId:    varchar("profile_id", { length: 36 }).notNull(),
  specialtyId:  varchar("specialty_id", { length: 36 }).notNull(),
  observations: text("observations"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.profileId, t.specialtyId),
}));

// ─── FOTOS DO FORNECEDOR ──────────────────────────────────────
export const comunidadeSupplierPhotos = pgTable("comunidade_supplier_photos", {
  id:           uuid("id").primaryKey(),
  profileId:    varchar("profile_id", { length: 36 }).notNull(),
  photoUrl:     text("photo_url").notNull(),
  photoType:    text("photo_type").notNull(), // 'fachada'|'maquinario'|'espaco'|'trabalho'
  caption:      varchar("caption", { length: 255 }),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── AVALIAÇÕES ───────────────────────────────────────────────
export const comunidadeReviews = pgTable("comunidade_reviews", {
  id:                uuid("id").primaryKey(),
  reviewerId:        varchar("reviewer_id", { length: 36 }).notNull(),
  reviewedProfileId: varchar("reviewed_profile_id", { length: 36 }).notNull(),

  ratingValue:    integer("rating_value").notNull(),    // custo-benefício 1-5
  ratingDeadline: integer("rating_deadline").notNull(), // prazo 1-5
  ratingQuality:  integer("rating_quality").notNull(),  // qualidade 1-5
  ratingService:  integer("rating_service").notNull(),  // atendimento 1-5
  rating:         numeric("rating", { precision: 3, scale: 2 }).notNull(), // média

  comment:   text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq:    unique().on(t.reviewerId, t.reviewedProfileId),
  idxProf: index("idx_com_reviews_profile").on(t.reviewedProfileId),
}));

// ─── PRÉ-CADASTROS ────────────────────────────────────────────
export const comunidadePreCadastros = pgTable("comunidade_pre_cadastros", {
  id:       uuid("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),

  name:     text("name").notNull(),
  email:    varchar("email", { length: 320 }).notNull(),
  phone:    varchar("phone", { length: 20 }),
  cidade:   varchar("cidade", { length: 100 }),
  estado:   varchar("estado", { length: 2 }),
  userType: text("user_type").notNull(), // 'cliente'|'fornecedor'

  specialtyIds:       jsonb("specialty_ids"),   // number[]
  productionCapacity: varchar("production_capacity", { length: 100 }),
  portfolioUrl:       text("portfolio_url"),
  additionalInfo:     text("additional_info"),

  status:          text("status").default("pendente").notNull(),
  rejectionReason: text("rejection_reason"),
  notaInterna:     text("nota_interna"),
  scoreQualidade:  integer("score_qualidade").default(0),

  formData:  jsonb("form_data"),    // all detailed form fields as JSON
  mediaUrls: jsonb("media_urls"),   // { url: string, type: 'fachada'|'interno'|'maquinario'|'outro', name: string }[]

  source:      varchar("source", { length: 100 }),
  utmSource:   varchar("utm_source", { length: 100 }),
  utmMedium:   varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),

  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  approvedAt:     timestamp("approved_at", { withTimezone: true }),
  hubAccessToken: varchar("hub_access_token", { length: 64 }).unique(),
  hubMagicLink:   text("hub_magic_link"),
});

export type ComunidadeProfile    = typeof comunidadeProfiles.$inferSelect;
export type ComunidadeEspecialidade = typeof comunidadeEspecialidades.$inferSelect;
export type ComunidadeReview     = typeof comunidadeReviews.$inferSelect;

// ─── MODA CONECTA — LEADS FASE FUNDADORA ──────────────────────
export const modaConectaLeads = pgTable("moda_conecta_leads", {
  id:             uuid("id").primaryKey(),
  createdAt:      timestamp("created_at",  { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp("updated_at",  { withTimezone: true }).defaultNow().notNull(),

  companySlug:    varchar("company_slug",    { length: 100 }).notNull().default("mirage"),
  campaignSource: varchar("campaign_source", { length: 200 }),

  fullName:     text("full_name").notNull(),
  email:        varchar("email",       { length: 320 }).notNull(),
  phone:        varchar("phone",       { length: 30 }),
  whatsapp:     varchar("whatsapp",    { length: 30 }),
  companyName:  text("company_name"),
  city:         varchar("city",        { length: 100 }),
  state:        varchar("state",       { length: 2 }),
  cep:          varchar("cep",         { length: 9 }),
  neighborhood: varchar("neighborhood",{ length: 150 }),
  addressLine:  text("address_line"),
  instagram:    varchar("instagram",   { length: 200 }),
  website:      text("website"),

  roleInChain:        text("role_in_chain"),
  specialties:        jsonb("specialties"),
  productionCapacity: varchar("production_capacity", { length: 100 }),
  mainNeed:           text("main_need"),
  mainOffer:          text("main_offer"),
  photoUrls:          jsonb("photo_urls").$type<string[]>(),

  // novo | em_revisao | incompleto | aprovado | rejeitado | convite_enviado
  status: text("status").notNull().default("novo"),

  reviewNotes: text("review_notes"),
  reviewedBy:  varchar("reviewed_by", { length: 200 }),
  reviewedAt:  timestamp("reviewed_at",  { withTimezone: true }),
  approvedAt:  timestamp("approved_at",  { withTimezone: true }),

  inviteToken:  varchar("invite_token", { length: 128 }),
  inviteSentAt: timestamp("invite_sent_at", { withTimezone: true }),

  isContacted:  boolean("is_contacted").default(false),
  contactedAt:  timestamp("contacted_at", { withTimezone: true }),

  utmSource:   varchar("utm_source",   { length: 100 }),
  utmMedium:   varchar("utm_medium",   { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),

  lgpdConsent:   boolean("lgpd_consent").default(false).notNull(),
  lgpdConsentAt: timestamp("lgpd_consent_at", { withTimezone: true }),
}, (t) => ({
  idxEmail:   index("idx_mc_leads_email").on(t.email),
  idxStatus:  index("idx_mc_leads_status").on(t.status),
  idxCreated: index("idx_mc_leads_created").on(t.createdAt),
  idxSlug:    index("idx_mc_leads_slug").on(t.companySlug),
}));

export type ModaConectaLead = typeof modaConectaLeads.$inferSelect;

// ─── Form tokens — link curto permanente para pré-preenchimento ───────────────
import { varchar } from "drizzle-orm/pg-core";

export const formTokens = pgTable("form_tokens", {
  token:     varchar("token", { length: 16 }).primaryKey(),
  params:    jsonb("params").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FormToken = typeof formTokens.$inferSelect;
