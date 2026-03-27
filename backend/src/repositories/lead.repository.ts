import { BaseRepository } from './base.repository';
import Lead, { ILead } from '../models/lead.model';
import { QueryOptions } from 'mongoose';

/**
 * LeadRepository
 * Extends BaseRepository to handle Lead-specific database queries.
 * Inherits the required tenantId injection for all read/write/update methods.
 */
export class LeadRepository extends BaseRepository<ILead> {
    constructor() {
        super(Lead);
    }

    /**
     * Finds a lead exclusively bound to the tenant by its system ID or leadNumber.
     */
    async findByLeadNumber(tenantId: string, leadNumber: string, options?: QueryOptions): Promise<ILead | null> {
        return this.findOne(tenantId, { leadNumber }, options);
    }

    /**
     * Executes advanced pipeline queries for completely custom stats while injecting the tenant scope.
     */
    async aggregatePipelineMetrics(tenantId: string) {
        return this.model.aggregate([
            { $match: this.enforceTenantScope(tenantId, {}) },
            {
                $group: {
                    _id: '$lifecycleStage',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$dealValue' }
                }
            }
        ]).exec();
    }

    /**
     * Intelligent KPI Analysis
     * Calculates Win/Loss ratios and pipeline health for the specific tenant context.
     */
    async getConversionIntelligence(tenantId: string) {
        return this.model.aggregate([
            { $match: this.enforceTenantScope(tenantId, {}) },
            {
                $facet: {
                    "conversionSummary": [
                        {
                            $group: {
                                _id: null,
                                totalLeads: { $sum: 1 },
                                wonLeads: { $sum: { $cond: [{ $eq: ["$status", "Won"] }, 1, 0] } },
                                totalDealValue: { $sum: "$dealValue" },
                                avgDealValue: { $avg: "$dealValue" }
                            }
                        }
                    ],
                    "stageBreakdown": [
                        { $group: { _id: "$status", count: { $sum: 1 } } }
                    ]
                }
            }
        ]);
    }
}

export const leadRepository = new LeadRepository();
