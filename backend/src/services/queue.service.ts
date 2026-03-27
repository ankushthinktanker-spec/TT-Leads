import { JobType, JobPayload } from '../jobs/job.types';
import { JobProcessor } from '../jobs/job.processor';
import {
    createQueueJobCompletedEvent,
    createQueueJobEnqueuedEvent,
    createQueueJobFailedEvent,
    createQueueJobStartedEvent,
    InMemoryEventBus
} from '../app/common/events';

/**
 * QueueService
 * Global infrastructure for offloading work to background tasks.
 * Architected to be pluggable:
 * - Local Dev: Executes asynchronously in-memory.
 * - Production: Easily swaps to BullMQ/Redis for cluster-wide job distribution.
 */
export class QueueService {
    private readonly eventBus = new InMemoryEventBus();

    /**
     * Enqueue a job for background processing.
     * Returns immediately after registering the request.
     */
    async enqueue<T extends JobType>(type: T, payload: JobPayload[T]): Promise<void> {
        console.info(`[Queue] Delegating job ${type} to background processing...`);
        await this.eventBus.publish(createQueueJobEnqueuedEvent({
            jobType: type,
            tenantId: this.resolveTenantId(payload)
        }));

        // For this local setup (No Redis/BullMQ detected), we simulate background work
        // by spawning it into the NodeJS microtask queue without awaiting it in the main flow.
        this.runInBackground(type, payload);
    }

    /**
     * Allows observers such as audit, telemetry, or monitoring to subscribe
     * without coupling them directly to queue implementation details.
     */
    subscribe(eventName: string, handler: Parameters<InMemoryEventBus['subscribe']>[1]): () => void {
        return this.eventBus.subscribe(eventName, handler);
    }

    /**
     * Private runner to simulate a separate worker thread until Redis is introduced.
     */
    private async runInBackground<T extends JobType>(type: T, payload: JobPayload[T]): Promise<void> {
        setImmediate(async () => {
            try {
                await this.eventBus.publish(createQueueJobStartedEvent({
                    jobType: type,
                    tenantId: this.resolveTenantId(payload)
                }));
                await JobProcessor.handleJob(type, payload);
                console.info(`[Queue] Job ${type} finished successfully.`);
                await this.eventBus.publish(createQueueJobCompletedEvent({
                    jobType: type,
                    tenantId: this.resolveTenantId(payload)
                }));
            } catch (error) {
                console.error(`[Queue] CRITICAL: Job ${type} failed to execute in background!`, error);
                await this.eventBus.publish(createQueueJobFailedEvent({
                    jobType: type,
                    tenantId: this.resolveTenantId(payload),
                    errorMessage: error instanceof Error ? error.message : 'Unknown queue error'
                }));
            }
        });
    }

    private resolveTenantId<T extends JobType>(payload: JobPayload[T]): string | undefined {
        if ('tenantId' in payload && typeof payload.tenantId === 'string') {
            return payload.tenantId;
        }

        return undefined;
    }
}

export const queue = new QueueService();
