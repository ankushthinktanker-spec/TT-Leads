import { BaseRepository } from './base.repository';
import Task, { ITask } from '../models/task.model';

/**
 * TaskRepository
 * Extends BaseRepository to handle Task-specific database queries.
 * Inherits the mandatory tenantId injection for all read/write/update methods.
 */
export class TaskRepository extends BaseRepository<ITask> {
    constructor() {
        super(Task);
    }

    /**
     * Find overdue tasks for a specific user within a tenant scope.
     */
    async findOverdueTasks(tenantId: string, userId: string): Promise<ITask[]> {
        const now = new Date();
        return this.find(tenantId, {
            assignedTo: userId,
            status: { $ne: 'Completed' },
            dueDate: { $lt: now }
        }, { sort: { dueDate: 1 } });
    }

    /**
     * Get a summary of task statuses for a tenant.
     */
    async getTaskSummary(tenantId: string) {
        return this.model.aggregate([
            { $match: this.enforceTenantScope(tenantId, {}) },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]).exec();
    }
}

export const taskRepository = new TaskRepository();
