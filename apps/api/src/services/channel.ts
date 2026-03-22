import { db } from '@secretaria/db';
import { channels } from '@secretaria/db';
import { eq, and } from 'drizzle-orm';

export async function listChannels(clinicId: string) {
  return db.select().from(channels).where(eq(channels.clinicId, clinicId));
}

export async function getChannel(clinicId: string, type: string) {
  const [channel] = await db.select().from(channels)
    .where(and(eq(channels.clinicId, clinicId), eq(channels.type, type)))
    .limit(1);
  return channel;
}

export async function upsertChannel(clinicId: string, type: string, data: { name: string; config: Record<string, unknown>; enabled: boolean }) {
  const existing = await getChannel(clinicId, type);
  if (existing) {
    const [updated] = await db.update(channels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(channels.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(channels)
    .values({ clinicId, type, ...data })
    .returning();
  return created;
}

export async function updateChannelStatus(clinicId: string, type: string, status: string) {
  await db.update(channels)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(channels.clinicId, clinicId), eq(channels.type, type)));
}
