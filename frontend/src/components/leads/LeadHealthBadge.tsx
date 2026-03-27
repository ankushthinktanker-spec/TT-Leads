import { Lead } from '../../store/slices/leadSlice';

const resolveHealth = (lead: Lead): 'UNHEALTHY' | 'OVERDUE' | 'DUE_TODAY' | 'SCHEDULED' => {
    if (lead.leadHealth) return lead.leadHealth;
    if (!lead.nextFollowUpDate) return 'UNHEALTHY';
    const next = new Date(lead.nextFollowUpDate);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    if (next < startOfToday) return 'OVERDUE';
    if (next >= startOfToday && next <= endOfToday) return 'DUE_TODAY';
    return 'SCHEDULED';
};

const getHealthClasses = (health: string) => {
    switch (health) {
        case 'OVERDUE':
            return 'bg-red-500/10 text-red-400 border-red-500/30';
        case 'DUE_TODAY':
            return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        case 'SCHEDULED':
            return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

const LeadHealthBadge = ({ lead, className = '' }: { lead: Lead; className?: string }) => {
    const health = resolveHealth(lead);
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getHealthClasses(health)} ${className}`}>
            {health.replace('_', ' ')}
        </span>
    );
};

export default LeadHealthBadge;


