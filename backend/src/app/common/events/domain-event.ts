export interface DomainEvent<TPayload = Record<string, unknown>> {
    name: string;
    occurredAt: Date;
    payload: TPayload;
}

export type DomainEventHandler<TPayload = Record<string, unknown>> = (
    event: DomainEvent<TPayload>
) => Promise<void> | void;
