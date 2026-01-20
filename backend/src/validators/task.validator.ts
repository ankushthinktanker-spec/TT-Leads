import Joi from 'joi';

export const createTaskSchema = Joi.object({
    title: Joi.string().required().messages({
        'any.required': 'Task title is required'
    }),
    description: Joi.string().optional(),
    taskType: Joi.string().valid('Follow-up', 'Reminder', 'General').optional(),
    relatedTo: Joi.object({
        model: Joi.string().valid('Lead', 'Proposal', 'Activity', 'Company').optional(),
        id: Joi.string().optional()
    }).optional(),
    relatedType: Joi.string().valid('Lead', 'Proposal', 'Activity', 'Company').optional(),
    relatedId: Joi.string().optional(),
    dueDate: Joi.date().required().messages({
        'any.required': 'Due date is required'
    }),
    reminderDate: Joi.date().optional(),
    priority: Joi.string().valid('High', 'Medium', 'Low').optional(),
    assignedTo: Joi.string().required().messages({
        'any.required': 'Assigned user is required'
    }),
    status: Joi.string().valid('Pending', 'In Progress', 'Completed', 'Cancelled').optional()
});

export const updateTaskSchema = Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    taskType: Joi.string().valid('Follow-up', 'Reminder', 'General').optional(),
    relatedTo: Joi.object({
        model: Joi.string().valid('Lead', 'Proposal', 'Activity', 'Company').optional(),
        id: Joi.string().optional()
    }).optional(),
    relatedType: Joi.string().valid('Lead', 'Proposal', 'Activity', 'Company').optional(),
    relatedId: Joi.string().optional(),
    dueDate: Joi.date().optional(),
    reminderDate: Joi.date().optional(),
    priority: Joi.string().valid('High', 'Medium', 'Low').optional(),
    assignedTo: Joi.string().optional(),
    status: Joi.string().valid('Pending', 'In Progress', 'Completed', 'Cancelled').optional(),
    completedAt: Joi.date().optional()
});
