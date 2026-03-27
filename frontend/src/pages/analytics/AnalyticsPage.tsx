import { useEffect, useState } from 'react';
import api from '../../api/axios';
import PageLayout from '../../components/ui/PageLayout';
import { Activity, BarChart3, Sparkles, TimerReset, TrendingUp } from 'lucide-react';
import PageHeaderToolbar from '../../components/crm/PageHeaderToolbar';
import WorkspaceSection from '../../components/ui/WorkspaceSection';

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

const AnalyticsPage = () => {
    const [funnel, setFunnel] = useState<FunnelStage[]>([]);
    const [velocity, setVelocity] = useState<VelocitySnapshot | null>(null);
    const [forecast, setForecast] = useState<ForecastSnapshot | null>(null);
    const [loss, setLoss] = useState<LossSnapshot | null>(null);
    const [quality, setQuality] = useState<QualitySnapshot | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [funnelRes, velocityRes, forecastRes, lossRes, qualityRes] = await Promise.all([
                api.get('/analytics/funnel'),
                api.get('/analytics/velocity'),
                api.get('/analytics/forecast'),
                api.get('/analytics/loss'),
                api.get('/analytics/quality')
            ]);
            setFunnel(funnelRes.data.data?.stages || []);
            setVelocity(velocityRes.data.data);
            setForecast(forecastRes.data.data);
            setLoss(lossRes.data.data);
            setQuality(qualityRes.data.data);
            setLoading(false);
        };
        load();
    }, []);

    return (
            <PageLayout className="workspace-stack">
                <PageHeaderToolbar
                    title="Analytics"
                    subtitle="Turn CRM activity into conversion insight with focused funnel, velocity, and forecast views."
                    actions={
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                <Sparkles size={12} />
                                Revenue intelligence
                            </div>
                            <p className="mt-1 text-sm font-semibold text-slate-900">Live CRM analytics workspace</p>
                        </div>
                    }
                />

                {loading && <div className="workspace-sheet px-5 py-8 text-sm font-medium text-slate-500">Loading analytics...</div>}

                {!loading && (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="workspace-section px-5 py-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Avg First Response</p>
                                    <TimerReset className="text-brand-500" size={18} />
                                </div>
                                <p className="text-2xl font-bold text-slate-950">
                                    {velocity?.avgFirstResponseMins?.toFixed?.(1) || 0} mins
                                </p>
                            </div>
                            <div className="workspace-section px-5 py-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Avg Sales Cycle</p>
                                    <Activity className="text-emerald-500" size={18} />
                                </div>
                                <p className="text-2xl font-bold text-slate-950">
                                    {velocity?.avgSalesCycleDays?.toFixed?.(1) || 0} days
                                </p>
                            </div>
                            <div className="workspace-section px-5 py-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lead Quality Score</p>
                                    <BarChart3 className="text-brand-500" size={18} />
                                </div>
                                <p className="text-2xl font-bold text-slate-950">
                                    {quality?.avgQualityScore?.toFixed?.(1) || 0}
                                </p>
                            </div>
                        </div>

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
                                    {funnel.map((stage) => (
                                        <div key={stage._id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                            <span className="text-slate-700">{stage._id}</span>
                                            <span className="font-semibold text-[#335CFF]">{stage.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </WorkspaceSection>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <WorkspaceSection
                                title="Forecast"
                                description="Weighted forecast and open pipeline value in one compact commercial view."
                                eyebrow="Revenue outlook"
                            >
                                <div className="space-y-3 text-slate-600">
                                    <p>Weighted Forecast: <span className="font-semibold text-[#335CFF]">{forecast?.weightedValue || 0}</span></p>
                                    <p>Pipeline Value: <span className="font-semibold text-[#335CFF]">{forecast?.pipelineValue || 0}</span></p>
                                </div>
                            </WorkspaceSection>
                            <WorkspaceSection
                                title="Loss analytics"
                                description="Inspect reported loss reasons to identify repeat objections and weak qualification patterns."
                                eyebrow="Closed-loss analysis"
                            >
                                {(loss?.lostReasons || []).length === 0 ? (
                                    <p className="text-slate-500">No loss data yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {(loss?.lostReasons || []).map((item: LossReason) => (
                                            <div key={item._id} className="flex justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-slate-700">
                                                <span>{item._id || 'Unknown'}</span>
                                                <span>{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </WorkspaceSection>
                        </div>
                    </>
                )}
            </PageLayout>
    );
};

export default AnalyticsPage;
