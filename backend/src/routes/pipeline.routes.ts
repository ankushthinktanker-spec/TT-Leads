import express from 'express';
import {
    getPipelines,
    getPipeline,
    createPipelineHandler,
    updatePipelineHandler,
    deletePipelineHandler,
    addPipelineStageHandler,
    updatePipelineStageHandler,
    deletePipelineStageHandler,
    reorderPipelineStagesHandler
} from '../controllers/pipeline.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('pipelines', 'view'), getPipelines)
    .post(checkPermission('pipelines', 'create'), createPipelineHandler);

router.route('/:id')
    .get(checkPermission('pipelines', 'view'), getPipeline)
    .put(checkPermission('pipelines', 'edit'), updatePipelineHandler)
    .delete(authorize('Admin', 'Manager'), checkPermission('pipelines', 'delete'), deletePipelineHandler);

router.post('/:id/stages', checkPermission('pipelines', 'edit'), addPipelineStageHandler);
router.put('/:id/stages/:stageId', checkPermission('pipelines', 'edit'), updatePipelineStageHandler);
router.delete('/:id/stages/:stageId', checkPermission('pipelines', 'edit'), deletePipelineStageHandler);
router.patch('/:id/reorder-stages', checkPermission('pipelines', 'edit'), reorderPipelineStagesHandler);

export default router;
