import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Share2, Compass } from 'lucide-react';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import InlineAlert from '../ui/InlineAlert';
import { DashboardData } from '../../types/dashboard';
import { useMemo } from 'react';
import PanelHeader from '../ui/PanelHeader';

interface DashboardSourcePerfProps {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

const DashboardSourcePerf = ({ data, loading, error, onRetry }: DashboardSourcePerfProps) => {
    const topSources = useMemo(() => {
        const sources = data?.sources || [];
        return [...sources].sort((a, b) => b.leads - a.leads).slice(0, 5);
    }, [data?.sources]);

    const maxLeads = useMemo(() => {
        return topSources.length ? Math.max(...topSources.map(s => s.leads)) : 0;
    }, [topSources]);

    return (
        <Card variant="panel" className="relative h-full overflow-hidden p-0">
            <div className="border-b border-slate-200/70 px-6 py-6">
                <PanelHeader
                    icon={Compass}
                    eyebrow="Acquisition"
                    title="Lead Sources"
                    description="Understand which channels are producing qualified volume and closed outcomes."
                    actions={
                        <Link
                            to="/reports/leads?groupBy=source"
                            className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                            View All
                            <ArrowRight size={14} />
                        </Link>
                    }
                />
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="space-y-6">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-8">
                        <InlineAlert
                            message="Failed to load source performance data."
                            onRetry={onRetry}
                        />
                    </div>
                ) : topSources.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                        <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-sm">
                            <Globe size={24} />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">No source data available</p>
                        <p className="text-xs text-slate-500 mt-1">Data will appear once leads are added.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {topSources.map((source) => {
                            const progress = maxLeads ? (source.leads / maxLeads) * 100 : 0;
                            return (
                                <div key={source.source} className="group relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-200 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-200 transition-colors">
                                                    <Share2 size={18} />
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-slate-900">{source.source}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-slate-500">{source.leads} Leads</span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                    <span className="text-xs font-medium text-emerald-600">{source.won} Won</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-base font-bold text-slate-900">{(source.conversionRate * 100).toFixed(1)}%</span>
                                                <div className={`h-1.5 w-1.5 rounded-full ${source.conversionRate > 0.2 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <p className="text-xs font-medium text-slate-500">Conv. Rate</p>
                                        </div>
                                    </div>
                                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div 
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#7c3aed_100%)] transition-all duration-700 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default DashboardSourcePerf;
