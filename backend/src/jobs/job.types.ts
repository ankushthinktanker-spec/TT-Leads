/**
 * Job Registry and Types
 * Defines all background work that can be offloaded for high-performance processing.
 */

export enum JobType {
    SEND_EMAIL = 'SEND_EMAIL',
    GENERATE_PROPOSAL_PDF = 'GENERATE_PROPOSAL_PDF',
    SYNC_LEAD_ANALYTICS = 'SYNC_LEAD_ANALYTICS',
    CLEANUP_EXPIRED_TOKENS = 'CLEANUP_EXPIRED_TOKENS',
    NOTIFY_TEAMMembers = 'NOTIFY_TEAM_MEMBERS'
}

export interface JobPayload {
    [JobType.SEND_EMAIL]: {
        to: string;
        subject: string;
        htmlContent: string;
        tenantId: string;
    };
    [JobType.GENERATE_PROPOSAL_PDF]: {
        proposalId: string;
        tenantId: string;
    };
    [JobType.SYNC_LEAD_ANALYTICS]: {
        leadId: string;
        tenantId: string;
    };
    [JobType.NOTIFY_TEAMMembers]: {
        userIds: string[];
        message: string;
        tenantId: string;
    };
    [JobType.CLEANUP_EXPIRED_TOKENS]: {
        // No payload needed
    };
}

export interface IJob<T extends JobType> {
    id: string;
    type: T;
    payload: JobPayload[T];
    attempts: number;
    createdAt: Date;
}
