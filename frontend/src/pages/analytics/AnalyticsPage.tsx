import { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../api/axios';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import SurfaceCard from '../../components/ui/SurfaceCard';

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
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="Analytics"
                    subtitle="Funnel, velocity, forecast, and loss insights."
                />

                {loading && <div className="text-secondary-400">Loading analytics...</div>}

                {!loading && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SurfaceCard className="p-6">
                                <p className="text-xs uppercase text-secondary-400">Avg First Response</p>
                                <p className="text-2xl font-bold text-white">
                                    {velocity?.avgFirstResponseMins?.toFixed?.(1) || 0} mins
                                </p>
                            </SurfaceCard>
                            <SurfaceCard className="p-6">
                                <p className="text-xs uppercase text-secondary-400">Avg Sales Cycle</p>
                                <p className="text-2xl font-bold text-white">
                                    {velocity?.avgSalesCycleDays?.toFixed?.(1) || 0} days
                                </p>
                            </SurfaceCard>
                            <SurfaceCard className="p-6">
                                <p className="text-xs uppercase text-secondary-400">Lead Quality Score</p>
                                <p className="text-2xl font-bold text-white">
                                    {quality?.avgQualityScore?.toFixed?.(1) || 0}
                                </p>
                            </SurfaceCard>
                        </div>

                        <SurfaceCard className="p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Funnel Conversion</h2>
                            {funnel.length === 0 ? (
                                <p className="text-secondary-400">No funnel data yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {funnel.map((stage) => (
                                        <div key={stage._id} className="flex items-center justify-between">
                                            <span className="text-secondary-300">{stage._id}</span>
                                            <span className="text-primary-400 font-semibold">{stage.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SurfaceCard>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <SurfaceCard className="p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">Forecast</h2>
                                <div className="space-y-2 text-secondary-200">
                                    <p>Weighted Forecast: <span className="text-primary-400 font-semibold">{forecast?.weightedValue || 0}</span></p>
                                    <p>Pipeline Value: <span className="text-primary-400 font-semibold">{forecast?.pipelineValue || 0}</span></p>
                                </div>
                            </SurfaceCard>
                            <SurfaceCard className="p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">Loss Analytics</h2>
                                {(loss?.lostReasons || []).length === 0 ? (
                                    <p className="text-secondary-400">No loss data yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {loss.lostReasons.map((item: LossReason) => (
                                            <div key={item._id} className="flex justify-between text-secondary-200">
                                                <span>{item._id || 'Unknown'}</span>
                                                <span>{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SurfaceCard>
                        </div>
                    </>
                )}
            </PageLayout>
        </MainLayout>
    );
};

export default AnalyticsPage;
