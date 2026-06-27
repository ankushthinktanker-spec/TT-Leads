import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { Activity, BarChart3, Sparkles, TimerReset, TrendingUp } from 'lucide-react';
import WorkspaceSection from '../../components/ui/WorkspaceSection';
import InlineAlert from '../../components/ui/InlineAlert';
import {
    ModulePageHeader,
    ModulePageShell,
    ModuleSummaryCards,
    type SummaryCardItem,
} from '../../components/module-system';

interface FunnelStage {
    _id: string;
    count: number;
}

interface VelocitySnapshot {
    avgFirstResponseMins?: number;
    avgSalesCycleDays?: number;
}

interface ForecastSnapshot {
    weightedValue?: number;
    pipelineValue?: number;
}

interface LossReason {
    _id?: string;
    count: number;
}

interface LossSnapshot {
    lostReasons?: LossReason[];
}

interface QualitySnapshot {
    avgQualityScore?: number;
}

const formatCompactCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);

const formatDecimal = (value?: number, digits = 1) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '0.0';

const AnalyticsPage = () => {
    const [funnel, setFunnel] = useState<FunnelStage[]>([]);
    const [velocity, setVelocity] = useState<VelocitySnapshot | null>(null);
    const [forecast, setForecast] = useState<ForecastSnapshot | null>(null);
    const [loss, setLoss] = useState<LossSnapshot | null>(null);
    const [quality, setQuality] = useState<QualitySnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadAnalytics = async () => {
        setLoading(true);
        setError('');
        try {
            const [funnelRes, velocityRes, forecastRes, lossRes, qualityRes] = await Promise.all([
                api.get('/analytics/funnel'),
                api.get('/analytics/velocity'),
                api.get('/analytics/forecast'),
                api.get('/analytics/loss'),
                api.get('/analytics/quality'),
            ]);
            setFunnel(funnelRes.data.data?.stages || []);
            setVelocity(velocityRes.data.data);
            setForecast(forecastRes.data.data);
            setLoss(lossRes.data.data);
            setQuality(qualityRes.data.data);
        } catch {
            setError('Unable to load analytics right now. Please retry in a moment.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAnalytics();
    }, []);

    const totalFunnel = useMemo(
        () => funnel.reduce((sum, stage) => sum + stage.count, 0),
        [funnel]
    );

    const topLossReasons = useMemo(
        () => (loss?.lostReasons || []).slice().sort((a, b) => b.count - a.count).slice(0, 4),
        [loss]
    );

    const summaryCards: SummaryCardItem[] = [
        { label: 'Avg First Response', value: loading ? '...' : `${formatDecimal(velocity?.avgFirstResponseMins)} mins`, icon: <TimerReset size={18} />, variant: 'primary' },
        { label: 'Avg Sales Cycle', value: loading ? '...' : `${formatDecimal(velocity?.avgSalesCycleDays)} days`, icon: <Activity size={18} />, variant: 'success' },
        { label: 'Lead Quality Score', value: loading ? '...' : formatDecimal(quality?.avgQualityScore), icon: <BarChart3 size={18} />, variant: 'info' },
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Intelligence · Performance"
                title="Analytics"
                description="Turn CRM activity into conversion insight with clearer funnel, velocity, and revenue signals."
                actions={
                    <div className="rounded-[1.5rem] border border-slate-200 bg-[#fffaf4] px-4 py-3 shadow-[0_10px_30px_rgba(120,74,24,0.08)]">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                            <Sparkles size={12} />
                            Revenue intelligence
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900">Live CRM analytics workspace</p>
                    </div>
                }
            />

            {error && (
                <InlineAlert
                    tone="danger"
                    title="Analytics unavailable"
                    className="mb-4"
                    action={(
                        <button
                            type="button"
                            className="mod-btn mod-btn--ghost mod-btn--sm"
                            onClick={() => void loadAnalytics()}
                        >
                            Retry
                        </button>
                    )}
                >
                    {error}
                </InlineAlert>
            )}

            <ModuleSummaryCards cards={summaryCards} />

            {loading && <div className="workspace-sheet px-5 py-8 text-sm font-medium text-slate-500">Loading analytics...</div>}

            {!loading && (
                <>
                    <WorkspaceSection
                        title="Funnel conversion"
                        description="Monitor stage distribution and conversion pressure across the active CRM funnel."
                        eyebrow="Pipeline analytics"
                        aside={<><TrendingUp className="text-brand-500" size={16} /> Live funnel</>}
                    >
                        {funnel.length === 0 ? (
                            <p className="text-slate-500">No funnel data yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {funnel.map((stage) => {
                                    const share = totalFunnel > 0 ? Math.max(8, Math.round((stage.count / totalFunnel) * 100)) : 0;
                                    return (
                                        <div key={stage._id} className="rounded-2xl border border-[var(--mod-border)] bg-[#fffaf4] px-4 py-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800">{stage._id || 'Unknown stage'}</div>
                                                    <div className="text-xs text-slate-500">{stage.count} records · {totalFunnel > 0 ? `${Math.round((stage.count / totalFunnel) * 100)}% of funnel` : 'No volume'}</div>
                                                </div>
                                                <div className="text-lg font-bold text-brand-600">{stage.count}</div>
                                            </div>
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f3e7d8]">
                                                <div className="h-full rounded-full bg-brand-500" style={{ width: `${share}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </WorkspaceSection>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <WorkspaceSection
                            title="Forecast"
                            description="Weighted forecast and open pipeline value in one compact commercial view."
                            eyebrow="Revenue outlook"
                        >
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-[var(--mod-border)] bg-[#fffaf4] px-4 py-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Weighted forecast</div>
                                    <div className="mt-2 text-2xl font-bold text-slate-900">{formatCompactCurrency(forecast?.weightedValue || 0)}</div>
                                    <div className="mt-1 text-xs text-slate-500">Probability-adjusted pipeline expected to convert.</div>
                                </div>
                                <div className="rounded-2xl border border-[var(--mod-border)] bg-[#fffaf4] px-4 py-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Open pipeline</div>
                                    <div className="mt-2 text-2xl font-bold text-slate-900">{formatCompactCurrency(forecast?.pipelineValue || 0)}</div>
                                    <div className="mt-1 text-xs text-slate-500">Total active commercial value still in play.</div>
                                </div>
                            </div>
                        </WorkspaceSection>

                        <WorkspaceSection
                            title="Loss analytics"
                            description="Inspect reported loss reasons to identify repeat objections and weak qualification patterns."
                            eyebrow="Closed-loss analysis"
                        >
                            {topLossReasons.length === 0 ? (
                                <p className="text-slate-500">No loss data yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {topLossReasons.map((item) => (
                                        <div key={item._id || 'unknown'} className="flex items-center justify-between rounded-2xl border border-[var(--mod-border)] bg-[#fffaf4] px-4 py-3 text-slate-700">
                                            <span className="pr-4 text-sm font-medium">{item._id || 'Unknown reason'}</span>
                                            <span className="rounded-full bg-[#fffdf9] px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </WorkspaceSection>
                    </div>
                </>
            )}
        </ModulePageShell>
    );
};

export default AnalyticsPage;

