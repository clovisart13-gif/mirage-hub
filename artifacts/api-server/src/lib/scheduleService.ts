/**
 * scheduleService.ts — Campaign Scheduling layer
 *
 * Responsibilities:
 *   1. generateSlotsForCampaign — creates N slots for a campaign period
 *   2. autoAllocateCreative     — assigns approved creative to first empty slot
 *   3. deriveDefaultStageFocus  — maps day position to funnel stage
 */

import { db, campaignScheduleSlots, machineCreatives } from "@workspace/db";
import { eq, and, asc, isNull } from "drizzle-orm";

// ── Stage focus by funnel position ────────────────────────────────────────────

function deriveDefaultStageFocus(dayIndex: number, total: number): string {
  const pct = dayIndex / Math.max(total - 1, 1);
  if (pct < 0.25) return "autoridade";
  if (pct < 0.50) return "prova_social";
  if (pct < 0.75) return "consideração";
  return "conversão";
}

// ── Slot ordering priority for creative auto-allocation ───────────────────────
// Authoritative content first → proof/objection handling mid → CTA last

const STAGE_PRIORITY: Record<string, number> = {
  autoridade:    1,
  prova_social:  2,
  consideração:  3,
  conversão:     4,
};

function stagePriorityFor(funnelStage: string | null | undefined): number {
  if (!funnelStage) return 99;
  const key = funnelStage.toLowerCase().replace(/[^a-záéíóúãõç_]/g, "_");
  for (const [k, v] of Object.entries(STAGE_PRIORITY)) {
    if (key.includes(k)) return v;
  }
  return 99;
}

// ── generateSlotsForCampaign ──────────────────────────────────────────────────

export async function generateSlotsForCampaign(opts: {
  campaignId: string;
  companySlug: string;
  periodDays: number;
  startDate: Date;
  defaultSlotTime?: string;
  channel?: string;
  weeklyPlan?: Array<{ week?: number; focus?: string; stage_focus?: string }>;
}): Promise<void> {
  const {
    campaignId,
    companySlug,
    periodDays,
    startDate,
    defaultSlotTime = "09:00",
    channel = "Instagram Feed",
    weeklyPlan = [],
  } = opts;

  // Delete only empty slots so existing scheduled/published ones survive
  await db
    .delete(campaignScheduleSlots)
    .where(
      and(
        eq(campaignScheduleSlots.campaignBlueprintId, campaignId),
        eq(campaignScheduleSlots.status, "empty"),
      ),
    );

  const [hourStr, minStr] = defaultSlotTime.split(":");
  const hour = parseInt(hourStr ?? "9", 10);
  const min  = parseInt(minStr ?? "0", 10);

  // Build a week→focus map from AI weekly_plan if available
  const weekFocusMap: Record<number, string> = {};
  for (const w of weeklyPlan) {
    const weekNum = w.week ?? 0;
    const focus   = w.focus ?? w.stage_focus ?? "";
    if (focus) weekFocusMap[weekNum] = focus;
  }

  const values: (typeof campaignScheduleSlots.$inferInsert)[] = [];

  for (let i = 0; i < periodDays; i++) {
    // Slot datetime: start_date + i days at slot time in Brasília (UTC-3)
    const slotDate = new Date(startDate);
    slotDate.setDate(slotDate.getDate() + i);
    slotDate.setUTCHours(hour + 3, min, 0, 0); // convert BRT→UTC

    // Prefer AI weekly_plan focus, fallback to algorithmic derivation
    const weekNum    = Math.floor(i / 7) + 1;
    const stageFocus = weekFocusMap[weekNum] ?? deriveDefaultStageFocus(i, periodDays);

    values.push({
      campaignBlueprintId: campaignId,
      companySlug,
      creativeId: null,
      channel,
      scheduledAt: slotDate,
      slotOrder: i + 1,
      stageFocus,
      status: "empty",
    });
  }

  if (values.length > 0) {
    await db.insert(campaignScheduleSlots).values(values);
  }
}

// ── autoAllocateCreative ──────────────────────────────────────────────────────

export async function autoAllocateCreative(opts: {
  creativeId: string;
  campaignId: string;
  companySlug: string;
  funnelStage?: string | null;
}): Promise<{ slotId: string; scheduledAt: Date } | null> {
  const { creativeId, campaignId, funnelStage } = opts;

  // Get all empty slots for this campaign
  const emptySlots = await db
    .select()
    .from(campaignScheduleSlots)
    .where(
      and(
        eq(campaignScheduleSlots.campaignBlueprintId, campaignId),
        eq(campaignScheduleSlots.status, "empty"),
      ),
    )
    .orderBy(asc(campaignScheduleSlots.slotOrder));

  if (emptySlots.length === 0) return null;

  // Try to find a slot whose stage_focus aligns with creative's funnel_stage
  const creativePriority = stagePriorityFor(funnelStage);
  const aligned = emptySlots.find(
    s => stagePriorityFor(s.stageFocus) === creativePriority,
  );
  const slot = aligned ?? emptySlots[0]!;

  // Assign creative → slot
  await db
    .update(campaignScheduleSlots)
    .set({ creativeId, status: "scheduled", updatedAt: new Date() })
    .where(eq(campaignScheduleSlots.id, slot.id));

  // Stamp scheduledAt on the creative (status unchanged — stays "approved")
  await db
    .update(machineCreatives)
    .set({ scheduledAt: slot.scheduledAt, updatedAt: new Date() })
    .where(eq(machineCreatives.id, creativeId));

  return { slotId: slot.id, scheduledAt: slot.scheduledAt };
}

// ── unassignCreativeFromSlot ──────────────────────────────────────────────────

export async function unassignCreativeFromSlot(slotId: string): Promise<void> {
  const [slot] = await db
    .select()
    .from(campaignScheduleSlots)
    .where(eq(campaignScheduleSlots.id, slotId))
    .limit(1);

  if (!slot) return;

  // Clear slot
  await db
    .update(campaignScheduleSlots)
    .set({ creativeId: null, status: "empty", updatedAt: new Date() })
    .where(eq(campaignScheduleSlots.id, slotId));

  // Clear scheduledAt on the creative if it was assigned
  if (slot.creativeId) {
    await db
      .update(machineCreatives)
      .set({ scheduledAt: null, updatedAt: new Date() })
      .where(eq(machineCreatives.id, slot.creativeId));
  }
}

// ── markSlotPublished ─────────────────────────────────────────────────────────

export async function markSlotPublished(campaignId: string, creativeId: string): Promise<void> {
  await db
    .update(campaignScheduleSlots)
    .set({ status: "published", updatedAt: new Date() })
    .where(
      and(
        eq(campaignScheduleSlots.campaignBlueprintId, campaignId),
        eq(campaignScheduleSlots.creativeId, creativeId),
      ),
    );
}
