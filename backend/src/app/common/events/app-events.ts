import type { JobType } from '../../../jobs/job.types';
import type { DomainEvent } from './domain-event';

export const AppEventName = {
    QueueJobEnqueued: 'queue.job.enqueued',
    QueueJobStarted: 'queue.job.started',
    QueueJobCompleted: 'queue.job.completed',
    QueueJobFailed: 'queue.job.failed'
} as const;

export interface QueueJobEventPayload {
    jobType: JobType;
    tenantId?: string;
}

export interface QueueJobFailedEventPayload extends QueueJobEventPayload {
    errorMessage: string;
}

export const createQueueJobEnqueuedEvent = (
    payload: QueueJobEventPayload
): DomainEvent<QueueJobEventPayload> => ({
    name: AppEventName.QueueJobEnqueued,
    occurredAt: new Date(),
    payload
});

export const createQueueJobStartedEvent = (
    payload: QueueJobEventPayload
): DomainEvent<QueueJobEventPayload> => ({
    name: AppEventName.QueueJobStarted,
    occurredAt: new Date(),
    payload
});

export const createQueueJobCompletedEvent = (
    payload: QueueJobEventPayload
): DomainEvent<QueueJobEventPayload> => ({
    name: AppEventName.QueueJobCompleted,
    occurredAt: new Date(),
    payload
});

export const createQueueJobFailedEvent = (
    payload: QueueJobFailedEventPayload
): DomainEvent<QueueJobFailedEventPayload> => ({
    name: AppEventName.QueueJobFailed,
    occurredAt: new Date(),
    payload
});
