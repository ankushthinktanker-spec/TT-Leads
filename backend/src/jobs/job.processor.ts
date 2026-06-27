import { JobType, JobPayload } from './job.types';
import { sendMail } from '../services/email.service';

/**
 * JobProcessor
 * Decouples the work from the primary HTTP requester thread.
 * Contains the execution logic for every background task.
 */
export class JobProcessor {
    private static resolveTenantId<T extends JobType>(payload: JobPayload[T]): string | undefined {
        if ('tenantId' in payload && typeof payload.tenantId === 'string') {
            return payload.tenantId;
        }

        return undefined;
    }
    
    /**
     * Entrypoint for every background worker job.
     */
    static async handleJob<T extends JobType>(type: T, payload: JobPayload[T]): Promise<unknown> {
        console.debug(`[Worker] Started processing job: ${type} for tenant: ${this.resolveTenantId(payload) || 'global'}`);

        switch (type) {
            case JobType.SEND_EMAIL:
                return await this.processSendEmail(payload as JobPayload[JobType.SEND_EMAIL]);
            case JobType.SYNC_LEAD_ANALYTICS:
                return await this.processSyncAnalytics(payload as JobPayload[JobType.SYNC_LEAD_ANALYTICS]);
            default:
                console.warn(`[Worker] Unknown job type: ${type}. Skipping.`);
                return null;
        }
    }

    private static async processSendEmail(payload: JobPayload[JobType.SEND_EMAIL]) {
        return await sendMail({
            to: payload.to,
            subject: payload.subject,
            html: payload.htmlContent
        });
    }

    private static async processSyncAnalytics(_payload: JobPayload[JobType.SYNC_LEAD_ANALYTICS]) {
        // Placeholder for future heavyweight analytical syncing logic
        console.info(`[Worker] Analytics sync for lead: ${_payload.leadId} simulated.`);
        return true;
    }
}
