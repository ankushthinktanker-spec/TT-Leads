import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import InlineAlert from '../ui/InlineAlert';
import { DashboardData, PipelineRow } from '../../types/dashboard';
import { useMemo } from 'react';
import { BarChart3, ChevronRight } from 'lucide-react';
import PanelHeader from '../ui/PanelHeader';

interface DashboardPipelineProps {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

const DashboardPipeline = ({ data, loading, error, onRetry }: DashboardPipelineProps) => {
    const pipelineRows: PipelineRow[] = data?.pipeline?.byStageCount || [];
    const maxStageCount = pipelineRows.length ? Math.max(...pipelineRows.map((row) => row.count)) : 0;
    const stuckLeadsCount = data?.pipeline?.stuckLeads?.length || 0;

    const pipelineTopRows = useMemo(
        () => [...pipelineRows].sort((a, b) => b.count - a.count).slice(0, 5),
        [pipelineRows]
    );

    return (
        <Card variant="panel" className="relative h-full overflow-hidden p-0">
            <div className="border-b border-slate-200/70 px-6 py-6">
                <PanelHeader
                    icon={BarChart3}
                    eyebrow="Pipeline intelligence"
                    title="Revenue Flow"
                    description={`Active stages: ${pipelineRows.length}. Surface stage congestion before momentum slows.`}
                    actions={
                        <Link
                            to={stuckLeadsCount > 0 ? '/leads?stalled=true' : '/reports'}
                            className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                            {stuckLeadsCount > 0 ? 'View Stalled Leads' : 'View Reports'}
                            <ChevronRight size={14} />
                        </Link>
                    }
                />
            </div>
            
            <div className="p-6">
                {loading ? (
                    <div className="space-y-6">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={`pipeline-skeleton-${idx}`} className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-8" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-8">
                        <InlineAlert
                            message="Failed to load pipeline data."
                            onRetry={onRetry}
                        />
                    </div>
                ) : pipelineTopRows.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                        <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-sm">
                            <BarChart3 size={24} />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">No active pipeline data</p>
                        <p className="text-xs text-slate-500 mt-1">Start moving leads through stages to see flow.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {pipelineTopRows.map((row, idx) => {
                            const progress = maxStageCount ? Math.round((row.count / maxStageCount) * 100) : 0;
                            return (
                                <Link
                                    key={row.stage}
                                    to={`/leads?status=${encodeURIComponent(row.stage)}`}
                                    className="group/row block"
                                >
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage {idx + 1}</p>
                                            <h3 className="text-sm font-bold text-slate-900 group-hover/row:text-brand-600 transition-colors">
                                                {row.stage}
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-slate-900 group-hover/row:text-brand-600 transition-colors">
                                                {row.count}
                                            </span>
                                            <p className="text-xs font-medium text-slate-500">Leads</p>
                                        </div>
                                    </div>
                                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#7c3aed_100%)] transition-all duration-700 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {stuckLeadsCount > 0 && (
                <div className="mx-6 mb-6 mt-0 rounded-[22px] border border-amber-200/60 bg-amber-50 p-4 transition-colors hover:bg-amber-100/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <p className="text-sm font-semibold text-amber-900">
                                {stuckLeadsCount} Leads Stalled
                            </p>
                        </div>
                        <Link to="/leads?stalled=true" className="text-xs font-bold text-amber-700 hover:text-amber-800">
                            View & Act →
                        </Link>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default DashboardPipeline;
