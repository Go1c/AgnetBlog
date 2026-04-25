import type { Prisma, SyncStatus } from '@/lib/generated/prisma/client';

import { db } from '@/lib/db';

export function createSyncJob(data: Prisma.SyncJobCreateInput) {
  return db.syncJob.create({ data });
}

export function findSyncJobById(id: string) {
  return db.syncJob.findUnique({ where: { id } });
}

export function listSyncJobs(args?: Prisma.SyncJobFindManyArgs) {
  return db.syncJob.findMany(args);
}

export function listSyncJobsByStatus(status: SyncStatus, take = 20) {
  return db.syncJob.findMany({
    where: { status },
    orderBy: { createdAt: 'asc' },
    take,
  });
}

export function updateSyncJob(id: string, data: Prisma.SyncJobUpdateInput) {
  return db.syncJob.update({
    where: { id },
    data,
  });
}

export function updateSyncJobStatus(
  id: string,
  status: SyncStatus,
  data: Omit<Prisma.SyncJobUpdateInput, 'status'> = {},
) {
  return db.syncJob.update({
    where: { id },
    data: { ...data, status },
  });
}
