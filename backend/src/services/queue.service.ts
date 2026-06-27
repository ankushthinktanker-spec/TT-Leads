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
     * Private runner with exponential-backoff retry (up to MAX_ATTEMPTS).
     * Uses setImmediate to yield the event loop before each attempt so the
     * HTTP response is never blocked by job execution.
     */
    private runInBackground<T extends JobType>(type: T, payload: JobPayload[T], attempt = 1): void {
        const MAX_ATTEMPTS = 3;

        setImmediate(async () => {
            try {
                await this.eventBus.publish(createQueueJobStartedEvent({
                    jobType: type,
                    tenantId: this.resolveTenantId(payload)
                }));
                await JobProcessor.handleJob(type, payload);
                console.info(`[Queue] Job ${type} completed successfully (attempt ${attempt}/${MAX_ATTEMPTS}).`);
                await this.eventBus.publish(createQueueJobCompletedEvent({
                    jobType: type,
                    tenantId: this.resolveTenantId(payload)
                }));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown queue error';
                console.error(`[Queue] Job ${type} failed on attempt ${attempt}/${MAX_ATTEMPTS}: ${errorMessage}`);

                if (attempt < MAX_ATTEMPTS) {
                    // Exponential backoff: 500 ms, 1000 ms
                    const delayMs = Math.pow(2, attempt - 1) * 500;
                    console.info(`[Queue] Retrying job ${type} in ${delayMs} ms...`);
                    setTimeout(() => this.runInBackground(type, payload, attempt + 1), delayMs);
                } else {
                    console.error(`[Queue] CRITICAL: Job ${type} permanently failed after ${MAX_ATTEMPTS} attempts.`);
                    await this.eventBus.publish(createQueueJobFailedEvent({
                        jobType: type,
                        tenantId: this.resolveTenantId(payload),
                        errorMessage
                    }));
                }
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
