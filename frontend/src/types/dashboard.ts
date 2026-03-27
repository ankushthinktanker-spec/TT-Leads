export type LeadOwner = {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
};

export type LeadFollowup = {
    _id: string;
    name: string;
    company?: string;
    status: string;
    nextFollowUpDate?: string;
    followUpType?: string;
    owner?: LeadOwner | null;
};

export type LeadFollowupBuckets = {
    overdue: LeadFollowup[];
    today: LeadFollowup[];
    upcoming: LeadFollowup[];
};

export type PipelineRow = {
    stage: string;
    count: number;
};

export type StuckLead = {
    leadId: string;
    name: string;
    company?: string;
    stage: string;
    owner?: LeadOwner | null;
    daysStuck: number;
};

export type DashboardKpis = {
    wonCount?: number;
    lostCount?: number;
    avgFirstResponseMins?: number;
    totalLeads?: number;
    newLeads?: number;
    openLeads?: number;
    qualifiedLeads?: number;
    followUpsDueToday?: number;
};

export type DashboardSourceRow = {
    source: string;
    won: number;
    leads: number;
    conversionRate: number;
};

export type DashboardAlerts = {
    noFirstResponse?: unknown[];
    stuckLeads?: unknown[];
    highValueNoNext?: unknown[];
    hotNoMeeting?: unknown[];
    duplicateLeads?: unknown[];
};

export type DashboardActivity = {
    _id: string;
    subject: string;
    type?: string;
    activityDate?: string;
};

export type UpcomingSubscription = {
    _id: string;
    name: string;
    vendorName?: string;
    renewDate: string;
};

export type DashboardData = {
    kpis?: DashboardKpis;
    followups?: { leads?: LeadFollowupBuckets };
    pipeline?: { byStageCount?: PipelineRow[]; stuckLeads?: unknown[] };
    sources?: DashboardSourceRow[];
    recentActivity?: DashboardActivity[];
    alerts?: DashboardAlerts;
};
