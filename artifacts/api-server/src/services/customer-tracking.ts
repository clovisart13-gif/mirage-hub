import { db, hubCustomerTracking } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { createHubCustomerTrackingTableIfNeeded } from "../migrate";

export async function customerTracking(scopeIds: string[]) {
  await createHubCustomerTrackingTableIfNeeded();
  const records = new Map<string, typeof hubCustomerTracking.$inferSelect>();
  for (let start = 0; start < scopeIds.length; start += 500) {
    const rows = await db.select().from(hubCustomerTracking)
      .where(inArray(hubCustomerTracking.scopeId, scopeIds.slice(start, start + 500)));
    for (const row of rows) records.set(row.scopeId, row);
  }
  return records;
}