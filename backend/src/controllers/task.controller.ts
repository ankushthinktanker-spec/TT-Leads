import { Response, NextFunction } from 'express';
import Task, { ITask } from '../models/task.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { createTaskSchema, updateTaskSchema } from '../validators/task.validator';
import mongoose, { FilterQuery } from 'mongoose';
import { taskRepository } from '../repositories/task.repository';
import { taskService } from '../services/task.service';
import User from '../models/user.model';
import Lead from '../models/lead.model';
import Company from '../models/company.model';
import Proposal from '../models/proposal.model';
import Activity from '../models/activity.model';
import { writeAuditLog } from '../services/audit.service';

const resolveRelatedModel = async (tenantId: string, relatedTo?: { model: string; id: string }) => {
    if (!relatedTo?.model || !relatedTo?.id) return;

    const query = { _id: relatedTo.id, tenantId };
    const model = relatedTo.model;
    if (model === 'Lead') return Lead.findOne(query);
    if (model === 'Company') return Company.findOne(query);
    if (model === 'Proposal') return Proposal.findOne(query);
    if (model === 'Activity') return Activity.findOne(query);
    return null;
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 10,
            assignedTo,
            status,
            priority,
            taskType,
            dueDateStart,
            dueDateEnd,
            sortBy = 'dueDate',
            sortOrder = 'asc'
        } = req.query;

        // Build filter - Critical Tenant Isolation
        type TaskFilter = FilterQuery<ITask> & {
            dueDate?: { $gte?: Date; $lte?: Date };
        };
        const filter: TaskFilter = { tenantId: req.tenantId! };

        // RBAC constraints
        if (req.user!.role !== 'Admin' && req.user!.role !== 'Manager') {
            filter.assignedTo = req.user!._id;
        } else if (assignedTo) {
            filter.assignedTo = assignedTo;
        }

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (taskType) filter.taskType = taskType;

        // Due date range filter
        if (dueDateStart || dueDateEnd) {
            filter.dueDate = {};
            if (dueDateStart) filter.dueDate.$gte = new Date(dueDateStart as string);
            if (dueDateEnd) filter.dueDate.$lte = new Date(dueDateEnd as string);
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const tasks = await taskRepository.find(req.tenantId!, filter, {
            select: 'title status priority taskType assignedTo createdBy relatedTo dueDate completedAt createdAt',
            populate: [
                { path: 'relatedTo.id' },
                { path: 'assignedTo', select: 'firstName lastName email' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ],
            sort,
            skip,
            limit: Number(limit)
        });

        const total = await taskRepository.count(req.tenantId!, filter);

        res.status(200).json({
            success: true,
            data: {
                tasks,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
export const getTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const task = await taskService.getTaskById(req.tenantId!, req.params.id);

        res.status(200).json({
            success: true,
            data: { task }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
export const createTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { error, value } = createTaskSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const assignedTo = value.assignedTo === 'current-user' ? req.user!._id : value.assignedTo;
        const relatedTo = value.relatedTo || (
            value.relatedType && value.relatedId
                ? { model: value.relatedType, id: value.relatedId }
                : undefined
        );

        const task = await taskService.createTask(req.tenantId!, {
            ...value,
            assignedTo,
            relatedTo
        }, req.user!._id.toString());

        // 📍 SECURITY: Audit Log Creation
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'CREATE',
            entityType: 'Task',
            entityId: task._id.toString(),
            ip: req.ip,
            changes: task.toObject() as any
        });

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: { task }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid task identifier', 400);
        }

        const { error, value } = updateTaskSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const task = await Task.findOne({ _id: req.params.id, tenantId: req.tenantId! });
        if (!task) {
            throw new AppError('Task not found in your organization', 404);
        }

        const beforeUpdate = task.toObject();

        // Check access
        if (
            req.user!.role !== 'Admin' && req.user!.role !== 'Manager' &&
            task.assignedTo?.toString() !== req.user!._id.toString() &&
            task.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to update this task', 403);
        }

        const assignedTo = value.assignedTo === 'current-user' ? req.user!._id : value.assignedTo;
        const relatedTo = value.relatedTo || (
            value.relatedType && value.relatedId
                ? { model: value.relatedType, id: value.relatedId }
                : undefined
        );

        if (assignedTo && !mongoose.isValidObjectId(assignedTo)) {
            throw new AppError('Invalid assigned user identifier', 400);
        }

        if (assignedTo) {
            const assignedUser = await User.findOne({ _id: assignedTo, tenantId: req.tenantId! });
            if (!assignedUser) {
                throw new AppError('Assigned user not found in your organization', 404);
            }
        }

        if (relatedTo?.id && !mongoose.isValidObjectId(relatedTo.id)) {
            throw new AppError('Invalid related identifier', 400);
        }

        if (relatedTo?.id) {
            const relatedRecord = await resolveRelatedModel(req.tenantId!, relatedTo);
            if (!relatedRecord) {
                throw new AppError('Related record not found in your organization', 404);
            }
        }

        const update: Record<string, unknown> = {
            ...value,
            ...(assignedTo ? { assignedTo } : {}),
            ...(relatedTo ? { relatedTo } : {})
        };
        delete update.relatedType;
        delete update.relatedId;

        if (value.status === 'Completed' && !task.completedAt) {
            update.completedAt = new Date();
        }

        const updatedTask = await Task.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId! },
            { $set: update },
            { new: true, runValidators: true }
        )
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email');

        if (!updatedTask) {
            throw new AppError('Update failed: Task not found', 404);
        }

        // 📍 SECURITY: Audit Log Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'UPDATE',
            entityType: 'Task',
            entityId: updatedTask._id.toString(),
            ip: req.ip,
            changes: { before: beforeUpdate as any, after: updatedTask.toObject() as any }
        });

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: { task: updatedTask }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark task as complete
// @route   PATCH /api/tasks/:id/complete
// @access  Private
export const completeTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const task = await taskService.completeTask(
            req.tenantId!,
            req.params.id,
            req.user!._id.toString()
        );

        // 📍 SECURITY: Audit Log Status Update
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'STATUS_UPDATE',
            entityType: 'Task',
            entityId: (task as any)._id?.toString() || req.params.id,
            ip: req.ip,
            changes: { status: 'Completed' }
        });

        res.status(200).json({
            success: true,
            message: 'Task marked as complete',
            data: { task }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const task = await taskService.getTaskById(req.tenantId!, req.params.id);

        // Access check: Only creator, manager or admin can delete
        if (
            task.createdBy.toString() !== req.user!._id.toString() &&
            req.user!.role !== 'Admin' && req.user!.role !== 'Manager'
        ) {
            throw new AppError('Not authorized to delete this task', 403);
        }

        // 📍 SECURITY: Audit Log Delete
        await writeAuditLog({
            tenantId: req.tenantId!,
            actorId: req.user!._id.toString(),
            action: 'DELETE',
            entityType: 'Task',
            entityId: req.params.id,
            ip: req.ip,
            changes: (task as any).toObject ? (task as any).toObject() : task
        });

        await taskRepository.deleteById(req.tenantId!, req.params.id);

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
