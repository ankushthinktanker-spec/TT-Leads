import type { DomainEvent, DomainEventHandler } from './domain-event';

export interface EventBus {
    publish<TPayload = Record<string, unknown>>(event: DomainEvent<TPayload>): Promise<void>;
    subscribe<TPayload = Record<string, unknown>>(
        eventName: string,
        handler: DomainEventHandler<TPayload>
    ): () => void;
}
