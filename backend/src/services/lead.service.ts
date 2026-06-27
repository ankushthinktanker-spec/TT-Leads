import { FilterQuery } from 'mongoose';
import { AppError } from '../middleware/errorHandler';
import { leadRepository } from '../repositories/lead.repository';
import { ILead } from '../models/lead.model';

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
     * Example of strict business logic mapping without direct model mutations
     */
    async convertLeadToClient(tenantId: string, leadId: string) {
        const lead = await this.getLeadById(tenantId, leadId);
        
        if (lead.status === 'Won') {
            throw new AppError('Lead is already successfully converted', 400);
        }

        // Apply strict lifecycle mutation and use the repository pattern to enforce storage updates.
        lead.status = 'Won';
        lead.lifecycleStage = 'Customer';
        lead.convertedAt = new Date();

        return await leadRepository.updateById(tenantId, leadId, lead.toObject());
    }
}

export const leadService = new LeadService();
