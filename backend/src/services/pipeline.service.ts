import Pipeline, { IPipeline } from '../models/pipeline.model';
import type { FilterQuery } from 'mongoose';

export const listPipelines = async (
    tenantId: string,
    filter: FilterQuery<IPipeline>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
) => {
    // Force tenant isolation
    const finalFilter = { ...filter, tenantId };

    const items = await Pipeline.find(finalFilter)
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const total = await Pipeline.countDocuments(finalFilter);
    return { items, total };
};

export const createPipeline = async (tenantId: string, data: Partial<IPipeline>) => {
    return Pipeline.create({ ...data, tenantId });
};

export const updatePipeline = async (tenantId: string, id: string, data: Partial<IPipeline>) =>
    Pipeline.findOneAndUpdate({ _id: id, tenantId }, { $set: data }, { new: true, runValidators: true });

export const deletePipeline = async (tenantId: string, id: string) =>
    Pipeline.findOneAndDelete({ _id: id, tenantId });

export const getPipelineById = async (tenantId: string, id: string) =>
    Pipeline.findOne({ _id: id, tenantId }).populate('createdBy', 'firstName lastName email');

export const addPipelineStage = async (tenantId: string, id: string, stage: { name: string; order: number }) =>
    Pipeline.findOneAndUpdate(
        { _id: id, tenantId },
        { $push: { stages: stage } },
        { new: true, runValidators: true }
    );

export const updatePipelineStage = async (tenantId: string, id: string, stageId: string, update: Partial<{ name: string; order: number }>) =>
    Pipeline.findOneAndUpdate(
        { _id: id, tenantId, 'stages._id': stageId },
        {
            $set: {
                ...(update.name !== undefined ? { 'stages.$.name': update.name } : {}),
                ...(update.order !== undefined ? { 'stages.$.order': update.order } : {})
            }
        },
        { new: true, runValidators: true }
    );

export const deletePipelineStage = async (tenantId: string, id: string, stageId: string) =>
    Pipeline.findOneAndUpdate(
        { _id: id, tenantId },
        { $pull: { stages: { _id: stageId } } },
        { new: true, runValidators: true }
    );

export const reorderPipelineStages = async (tenantId: string, id: string, stages: Array<{ stageId: string; order: number }>) => {
    const pipeline = await Pipeline.findOne({ _id: id, tenantId });
    if (!pipeline) return null;
    const stageMap = new Map(stages.map((stage) => [stage.stageId, stage.order]));
    pipeline.stages = pipeline.stages.map((stage) => {
        const order = stageMap.get(stage._id?.toString() || '');
        return {
            _id: stage._id,
            name: stage.name,
            order: order ?? stage.order
        };
    });
    pipeline.stages.sort((a, b) => a.order - b.order);
    await pipeline.save();
    return pipeline;
};
