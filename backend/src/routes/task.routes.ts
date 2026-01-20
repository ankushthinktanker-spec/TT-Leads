import express from 'express';
import {
    getTasks,
    getTask,
    createTask,
    updateTask,
    completeTask,
    deleteTask
} from '../controllers/task.controller';
import { protect } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('tasks', 'view'), getTasks)
    .post(checkPermission('tasks', 'create'), createTask);

router.route('/:id')
    .get(checkPermission('tasks', 'view'), getTask)
    .put(checkPermission('tasks', 'edit'), updateTask)
    .delete(checkPermission('tasks', 'delete'), deleteTask);

router.patch('/:id/complete', checkPermission('tasks', 'status_change'), completeTask);

export default router;
