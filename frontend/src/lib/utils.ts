import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const LEAD_STATUS_OPTIONS = [
    'New',
    'Contacted',
    'Qualified',
    'Needs Analysis',
    'Proposal Sent',
    'Negotiation',
    'Won',
    'Lost',
    'Nurture',
] as const;

export function getLeadStatusClasses(status: string): string {
    switch (status) {
        case 'New':
            return 'status-neutral';
        case 'Contacted':
            return 'status-warning';
        case 'Qualified':
            return 'status-success';
        case 'Needs Analysis':
            return 'bg-brand-500/15 text-brand-300';
        case 'Proposal Sent':
            return 'bg-brand-500/20 text-brand-200';
        case 'Negotiation':
            return 'status-warning';
        case 'Won':
            return 'status-success';
        case 'Lost':
            return 'status-danger';
        case 'Nurture':
            return 'bg-teal-500/15 text-teal-300';
        default:
            return 'status-neutral';
    }
}

export function getDealStatusClasses(status: string): string {
    switch (status) {
        case 'Open':
            return 'status-warning';
        case 'Won':
            return 'status-success';
        case 'Lost':
            return 'status-danger';
        default:
            return 'status-neutral';
    }
}

export function getSubscriptionStatusClasses(status: string): string {
    switch (status) {
        case 'Active':
            return 'status-success';
        case 'Paused':
            return 'status-warning';
        case 'Cancelled':
            return 'status-danger';
        case 'Expired':
            return 'status-neutral';
        default:
            return 'status-neutral';
    }
}
