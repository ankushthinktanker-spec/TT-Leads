import type { DomainEvent, DomainEventHandler } from './domain-event';
import type { EventBus } from './event-bus';

export class InMemoryEventBus implements EventBus {
    private readonly handlers = new Map<string, Set<DomainEventHandler<unknown>>>();

    async publish<TPayload = Record<string, unknown>>(event: DomainEvent<TPayload>): Promise<void> {
        const handlers = this.handlers.get(event.name);
        if (!handlers?.size) return;

        await Promise.allSettled(
            Array.from(handlers).map((handler) => Promise.resolve(handler(event)))
        );
    }

    subscribe<TPayload = Record<string, unknown>>(
        eventName: string,
        handler: DomainEventHandler<TPayload>
    ): () => void {
        const handlers = this.handlers.get(eventName) ?? new Set<DomainEventHandler<TPayload>>();
        handlers.add(handler);
        this.handlers.set(eventName, handlers as Set<DomainEventHandler<unknown>>);

        return () => {
            const current = this.handlers.get(eventName);
            if (!current) return;

            current.delete(handler as DomainEventHandler<unknown>);
            if (!current.size) {
                this.handlers.delete(eventName);
            }
        };
    }
}
