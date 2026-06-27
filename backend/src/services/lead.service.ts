import mongoose, { FilterQuery } from 'mongoose';
import Lead, { ILead } from '../models/lead.model';
import { AppError } from '../middleware/errorHandler';
import { leadRepository } from '../repositories/lead.repository';

/**
 * LeadService
 * Encapsulates the core business logic for Leads.
 * Strictly relies on the LeadRepository to interact with the database,
 * inherently enforcing the multi-tenant constraints for all functions.
 */
export class LeadService {
    
    /**
     * Retrieve leads safely within the current tenant scope, resolving necessary relationships.
     */
    async getLeadsForTenant(
        tenantId: string, 
        filter: FilterQuery<ILead> = {}, 
        skip = 0, 
        limit = 50, 
        sortParam = '-createdAt'
    ): Promise<{ items: ILead[]; total: number }> {
        
        // Define repository options securely
        const queryOptions = {
            select: 'firstName lastName email phone company status source priority dealValue assignedTo ownerId createdBy createdAt nextFollowUpDate followUpType',
            populate: [
                { path: 'assignedTo', select: 'firstName lastName email' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ],
            sort: sortParam,
            skip,
            limit
        };

        // All DB operations delegate to the Multi-Tenant safe Repository layer
        const [leads, total] = await Promise.all([
            leadRepository.find(tenantId, filter, queryOptions),
            leadRepository.count(tenantId, filter)
        ]);

        return { items: leads || [], total };
    }

    /**
     * Look up a completely scoped Lead
     */
    async getLeadById(tenantId: string, leadId: string) {
        const queryOptions = {
            populate: [
                { path: 'assignedTo', select: 'firstName lastName email avatar' },
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'teamId', select: 'name' }
            ]
        };

        const lead = await leadRepository.findById(tenantId, leadId, queryOptions);
        
        if (!lead) {
            throw new AppError('Lead not found or does not belong to this tenant scope', 404);
        }

        return lead;
    }

    /**
     * Atomically convert a lead to client status.
     * Uses a conditional filter (status != Won) to prevent double-conversion race conditions.
     * Uses $set (not a document replacement) to avoid the immutable _id update error.
     */
    async convertLeadToClient(tenantId: string, leadId: string) {
        if (!mongoose.isValidObjectId(leadId)) {
            throw new AppError('Invalid lead identifier', 400);
        }

        // Atomic: only updates if status is NOT already 'Won'.
        // Prevents TOCTOU where two concurrent requests both pass the status check.
        const updated = await Lead.findOneAndUpdate(
            { _id: leadId, tenantId, status: { $ne: 'Won' } },
            { $set: { status: 'Won', lifecycleStage: 'Customer', convertedAt: new Date() } },
            { new: true, runValidators: true }
        );

        if (!updated) {
            // Distinguish between "not found" and "already Won"
            const existing = await leadRepository.findById(tenantId, leadId);
            if (!existing) {
                throw new AppError('Lead not found or unauthorized access', 404);
            }
            throw new AppError('Lead is already successfully converted', 400);
        }

        return updated;
    }
}

export const leadService = new LeadService();
