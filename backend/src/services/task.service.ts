import { taskRepository } from '../repositories/task.repository';
import { AppError } from '../middleware/errorHandler';
import { ITask } from '../models/task.model';
import { JobType } from '../jobs/job.types';
import { queue } from '../services/queue.service';
import mongoose from 'mongoose';

type TaskCreateInput = Omit<ITask, 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

/**
 * TaskService
 * Encapsulates the core business logic for Tasks.
 * Strictly relies on the TaskRepository to interact with the database,
 * inherently enforcing the multi-tenant constraints for all functions.
 */
export class TaskService {
    
    /**
     * Create a new task and notify the assignee if it's high priority.
     */
    async createTask(tenantId: string, payload: Partial<TaskCreateInput>, createdById: string): Promise<ITask> {
        const task = await taskRepository.create(tenantId, {
            ...payload,
            createdBy: new mongoose.Types.ObjectId(createdById)
        });

        // 📍 Step 4 Architecture Integration: Offload high-priority notification to background
        if (task.priority === 'High') {
            queue.enqueue(JobType.SEND_EMAIL, {
                to: 'assignee@example.com', // Placeholder: would resolve actual user email
                subject: 'High Priority Task Assigned',
                htmlContent: `<h3>Urgent: New Task Assigned</h3><p>${task.title} is due on ${task.dueDate}.</p>`,
                tenantId: tenantId
            });
        }

        return task;
    }

    /**
     * Retrieve a specific task securely.
     */
    async getTaskById(tenantId: string, taskId: string): Promise<ITask> {
        const task = await taskRepository.findById(tenantId, taskId, {
            populate: [
                { path: 'assignedTo', select: 'firstName lastName email avatar' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]
        });

        if (!task) {
            throw new AppError('Task not found or unauthorized access', 404);
        }

        return task;
    }

    /**
     * Mark a task as completed with audit-ready lifecycle management.
     */
    async completeTask(tenantId: string, taskId: string, userId: string): Promise<ITask> {
        const task = await this.getTaskById(tenantId, taskId);

        // Security check: Only the assignee or creator can complete a task
        if (task.assignedTo.toString() !== userId && task.createdBy.toString() !== userId) {
            throw new AppError('Not authorized to complete this task', 403);
        }

        return await taskRepository.updateById(tenantId, taskId, {
            status: 'Completed',
            completedAt: new Date()
        }) as ITask;
    }

    /**
     * Get a performance summary of all tasks within the tenant context.
     */
    async getSummary(tenantId: string) {
        return await taskRepository.getTaskSummary(tenantId);
    }
}

export const taskService = new TaskService();
