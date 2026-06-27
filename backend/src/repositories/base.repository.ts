import { Model, FilterQuery, UpdateQuery, Document, QueryOptions } from 'mongoose';
import { AppError } from '../middleware/errorHandler';

/**
 * BaseRepository
 * A strongly-typed generic repository to enforce multi-tenant isolation.
 * Automatically injects the tenantId into all database read/write/update operations.
 * Never allow external services to use Model.find() directly.
 */
export class BaseRepository<T extends Document> {
    protected model: Model<T>;

    constructor(model: Model<T>) {
        this.model = model;
    }

    /**
     * Enforces that every query executed through this repository has a tenantId explicitly defined.
     */
    protected enforceTenantScope(tenantId: string, query: FilterQuery<T> = {}): FilterQuery<T> {
        if (!tenantId) {
            throw new AppError('CRITICAL: Attempted to execute repository action without a tenantId constraint.', 500);
        }
        return { ...query, tenantId };
    }

    async findById(tenantId: string, id: string, options?: QueryOptions): Promise<T | null> {
        return this.model.findOne(this.enforceTenantScope(tenantId, { _id: id } as FilterQuery<T>), null, options).exec();
    }

    async findOne(tenantId: string, query: FilterQuery<T>, options?: QueryOptions): Promise<T | null> {
        return this.model.findOne(this.enforceTenantScope(tenantId, query), null, options).exec();
    }

    async find(tenantId: string, query: FilterQuery<T> = {}, options?: QueryOptions): Promise<T[]> {
        return this.model.find(this.enforceTenantScope(tenantId, query), null, options).exec();
    }

    async create(tenantId: string, data: Partial<T>): Promise<T> {
        // Force the tenantId into the creation payload
        const payload = { ...data, tenantId };
        const document = new this.model(payload);
        return document.save() as unknown as Promise<T>;
    }

    async updateById(tenantId: string, id: string, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
        return this.model.findOneAndUpdate(
            this.enforceTenantScope(tenantId, { _id: id } as FilterQuery<T>),
            update,
            { new: true, runValidators: true, ...options }
        ).exec();
    }

    async deleteById(tenantId: string, id: string): Promise<T | null> {
        return this.model.findOneAndDelete(
            this.enforceTenantScope(tenantId, { _id: id } as FilterQuery<T>)
        ).exec();
    }

    async count(tenantId: string, query: FilterQuery<T> = {}): Promise<number> {
        return this.model.countDocuments(this.enforceTenantScope(tenantId, query)).exec();
    }

    async exists(tenantId: string, query: FilterQuery<T>): Promise<{ _id: unknown } | null> {
        return this.model.exists(this.enforceTenantScope(tenantId, query));
    }
}
