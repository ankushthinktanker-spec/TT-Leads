import SecurityEvent from '../models/security-event.model';

type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

interface SecurityEventInput {
    eventType: string;
    severity?: SecuritySeverity;
    userId?: string;
    ip?: string;
    userAgent?: string | string[];
    requestId?: string;
    metadata?: Record<string, unknown>;
}

export const logSecurityEvent = async (input: SecurityEventInput): Promise<void> => {
    try {
        await SecurityEvent.create({
            eventType: input.eventType,
            severity: input.severity || 'medium',
            userId: input.userId,
            ip: input.ip,
            userAgent: Array.isArray(input.userAgent) ? input.userAgent.join(';') : input.userAgent,
            requestId: input.requestId,
            metadata: input.metadata || {}
        });
    } catch {
        // Intentionally non-blocking
    }
};
