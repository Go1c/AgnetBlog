import type { Prisma } from '@/lib/generated/prisma/client';

import { db } from '@/lib/db';

export function createAuditLog(data: Prisma.AuditLogCreateInput) {
  return db.auditLog.create({ data });
}

export function findAuditLogById(id: string) {
  return db.auditLog.findUnique({ where: { id } });
}

export function listAuditLogs(args?: Prisma.AuditLogFindManyArgs) {
  return db.auditLog.findMany(args);
}

export function listAuditLogsForTarget(targetType: string, targetId: string, take = 50) {
  return db.auditLog.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
