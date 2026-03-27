import crypto from 'crypto';
import AuditLog from '../models/audit-log.model';

interface AuditInput {
    tenantId: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    ip?: string;
    requestId?: string;
    changes?: Record<string, unknown>;
}

const serialize = (value: unknown): string => {
    try {
        return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
    } catch {
        return '{}';
    }
};

export const writeAuditLog = async (input: AuditInput): Promise<void> => {
    try {
        const latest = await AuditLog.findOne().sort({ createdAt: -1 }).select('hash').lean();
        const previousHash = latest?.hash || 'GENESIS';
        // Cryptographically bind the tenant context into the secure ledger payload
        const payload = `${previousHash}|${input.tenantId}|${input.action}|${input.entityType}|${input.entityId || ''}|${serialize(input.changes || {})}`;
        const hash = crypto.createHash('sha256').update(payload).digest('hex');

        await AuditLog.create({
            tenantId: input.tenantId,
            actorId: input.actorId,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            ip: input.ip,
            requestId: input.requestId,
            changes: input.changes || {},
            previousHash,
            hash
        });
    } catch {
        // Non-blocking audit fallback
    }
};
