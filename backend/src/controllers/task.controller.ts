import { Response, NextFunction } from 'express';
import Task, { ITask } from '../models/task.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { createTaskSchema, updateTaskSchema } from '../validators/task.validator';
import mongoose, { FilterQuery } from 'mongoose';
import User from '../models/user.model';
import Lead from '../models/lead.model';
import Company from '../models/company.model';
import Proposal from '../models/proposal.model';
import Activity from '../models/activity.model';

const resolveRelatedModel = async (relatedTo?: { model: string; id: string }) => {
    if (!relatedTo?.model || !relatedTo?.id) return;

    const model = relatedTo.model;
    if (model === 'Lead') return Lead.findById(relatedTo.id);
    if (model === 'Company') return Company.findById(relatedTo.id);
    if (model === 'Proposal') return Proposal.findById(relatedTo.id);
    if (model === 'Activity') return Activity.findById(relatedTo.id);
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

        // Build filter
        type TaskFilter = FilterQuery<ITask> & {
            dueDate?: { $gte?: Date; $lte?: Date };
        };
        const filter: TaskFilter = {};

        // If not admin, show only assigned tasks
        if (req.user!.role !== 'Admin') {
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

        const tasks = await Task.find(filter)
            .select('title status priority taskType assignedTo createdBy relatedTo dueDate completedAt createdAt')
            .populate('relatedTo.id')
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await Task.countDocuments(filter);

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
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid task identifier', 400);
        }

        const task = await Task.findById(req.params.id)
            .populate('relatedTo.id')
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email');

        if (!task) {
            throw new AppError('Task not found', 404);
        }

        // Check access
        if (
            req.user!.role !== 'Admin' &&
            task.assignedTo.toString() !== req.user!._id.toString() &&
            task.createdBy.toString() !== req.user!._id.toString()
        ) {
            throw new AppError('Not authorized to view this task', 403);
        }

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

        if (!mongoose.isValidObjectId(assignedTo)) {
            throw new AppError('Invalid assigned user identifier', 400);
        }

        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            throw new AppError('Assigned user not found', 404);
        }

        if (relatedTo?.id && !mongoose.isValidObjectId(relatedTo.id)) {
            throw new AppError('Invalid related identifier', 400);
        }

        if (relatedTo?.id) {
            const relatedRecord = await resolveRelatedModel(relatedTo);
            if (!relatedRecord) {
                throw new AppError('Related record not found', 404);
            }
        }

        const payload: Record<string, unknown> = {
            ...value,
            assignedTo,
            relatedTo,
            createdBy: req.user!._id
        };
        delete payload.relatedType;
        delete payload.relatedId;

        const task = await Task.create(payload);

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

        const task = await Task.findById(req.params.id);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        // Check access
        if (
            req.user!.role !== 'Admin' &&
            task.assignedTo.toString() !== req.user!._id.toString() &&
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
            const assignedUser = await User.findById(assignedTo);
            if (!assignedUser) {
                throw new AppError('Assigned user not found', 404);
            }
        }

        if (relatedTo?.id && !mongoose.isValidObjectId(relatedTo.id)) {
            throw new AppError('Invalid related identifier', 400);
        }

        if (relatedTo?.id) {
            const relatedRecord = await resolveRelatedModel(relatedTo);
            if (!relatedRecord) {
                throw new AppError('Related record not found', 404);
            }
        }

        const update: Record<string, unknown> = {
            ...value,
            ...(assignedTo ? { assignedTo } : {}),
            ...(relatedTo ? { relatedTo } : {})
        };
        delete update.relatedType;
        delete update.relatedId;

        if (value.status === 'Completed' && !value.completedAt) {
            update.completedAt = new Date();
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true, runValidators: true }
        )
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email');

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
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid task identifier', 400);
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        // Check if assigned to user
        if (task.assignedTo.toString() !== req.user!._id.toString() && req.user!.role !== 'Admin') {
            throw new AppError('Not authorized to complete this task', 403);
        }

        task.status = 'Completed';
        await task.save();

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
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw new AppError('Invalid task identifier', 400);
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        // Only creator or admin can delete
        if (task.createdBy.toString() !== req.user!._id.toString() && req.user!.role !== 'Admin') {
            throw new AppError('Not authorized to delete this task', 403);
        }

        await task.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
