import { ReactNode } from 'react';
import { ArrowRight, Orbit, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThinkTankerLogo from '../branding/ThinkTankerLogo';
import { ROUTES } from '../../routes';

interface AuthShellProps {
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
}

const AuthShell = ({ eyebrow, title, description, children, footer }: AuthShellProps) => {
    return (
        <div className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,#fff1bf_0%,rgba(255,241,191,0.54)_18%,transparent_42%),radial-gradient(circle_at_bottom_right,#ffe48a_0%,rgba(255,228,138,0.28)_20%,transparent_44%),linear-gradient(180deg,#fffdf5_0%,#fff6df_100%)] selection:bg-brand-100 selection:text-brand-900">
            <div className="mx-auto grid min-h-dvh max-w-[1480px] grid-cols-1 gap-5 px-4 py-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(430px,500px)] lg:gap-6 lg:px-6 lg:py-6 xl:gap-8 xl:px-8 xl:py-8">
                <aside className="hero-shell relative hidden overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.97)_0%,rgba(255,251,234,0.96)_52%,rgba(255,241,191,0.94)_100%)] shadow-[0_30px_80px_rgba(255,188,0,0.16)] lg:flex lg:h-[calc(100dvh-3rem)] lg:flex-col lg:p-8 xl:p-10">
                    <div className="pointer-events-none absolute -left-16 top-14 h-52 w-52 rounded-full bg-amber-200/55 blur-3xl animate-float" />
                    <div className="pointer-events-none absolute bottom-8 right-8 h-44 w-44 rounded-full bg-yellow-200/45 blur-3xl animate-float" style={{ animationDelay: '1.2s' }} />

                    <div className="relative flex h-full flex-col gap-8">
                        <div>
                            <ThinkTankerLogo className="tt-animate-fade-up h-14 max-w-[280px]" />

                            <div className="tt-animate-fade-up mt-6 inline-flex items-center gap-3 rounded-full border border-brand-200 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 shadow-[0_10px_30px_rgba(255,188,0,0.12)]" style={{ animationDelay: '40ms' }}>
                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_rgba(255,188,0,0.16)]" />
                                Revenue Workspace
                            </div>

                            <div className="mt-8 max-w-2xl tt-animate-fade-up" style={{ animationDelay: '90ms' }}>
                                <h1 className="max-w-2xl text-[2.75rem] font-black tracking-[-0.06em] text-slate-950 xl:text-[3.7rem] xl:leading-[0.96]">
                                    Operate leads, proposals, renewals, and revenue work from one signal-rich workspace.
                                </h1>
                                <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-600 xl:text-[16px] xl:leading-7">
                                    ThinkTanker keeps pipeline execution visible so account coverage, follow-up discipline, and role-based actions stay aligned.
                                </p>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-3 tt-animate-fade-up" style={{ animationDelay: '180ms' }}>
                                <div className="metric-card bg-white/74 backdrop-blur">
                                    <div className="flex items-center gap-3 text-brand-700">
                                        <Workflow size={18} />
                                        <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Pipeline</span>
                                    </div>
                                    <p className="mt-4 text-sm font-semibold text-slate-900">Lead ownership, follow-ups, and deal motion stay connected.</p>
                                </div>
                                <div className="metric-card bg-white/74 backdrop-blur">
                                    <div className="flex items-center gap-3 text-emerald-700">
                                        <ShieldCheck size={18} />
                                        <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Access</span>
                                    </div>
                                    <p className="mt-4 text-sm font-semibold text-slate-900">Role-based access and operational guardrails remain explicit.</p>
                                </div>
                                <div className="metric-card bg-white/74 backdrop-blur">
                                    <div className="flex items-center gap-3 text-brand-700">
                                        <Sparkles size={18} />
                                        <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Signals</span>
                                    </div>
                                    <p className="mt-4 text-sm font-semibold text-slate-900">Critical renewal, proposal, and follow-up activity surfaces quickly.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto grid gap-4 tt-animate-fade-up xl:grid-cols-[minmax(0,1fr)_210px]" style={{ animationDelay: '260ms' }}>
                            <div className="workspace-section max-w-2xl bg-white/82 backdrop-blur">
                                <div className="workspace-section__content">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Session Access</p>
                                    <div className="mt-4 flex items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-[1.45rem] font-extrabold tracking-tight text-slate-950">Secure operator sign-in</h2>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                Use your assigned workspace credentials to access the CRM dashboard, active modules, and team-scoped workflows.
                                            </p>
                                        </div>
                                        <div className="hidden rounded-2xl border border-brand-200 bg-brand-50/80 p-3 text-brand-700 md:flex">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-[28px] border border-brand-900/20 bg-[linear-gradient(180deg,#8c6500_0%,#3f2c00_100%)] p-5 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
                                <div className="flex items-center gap-3 text-amber-100">
                                    <Orbit size={18} />
                                    <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Ops Signal</span>
                                </div>
                                <p className="mt-4 text-sm font-semibold leading-6 text-white/92">
                                    Login routes now map to the same tenant-aware auth model used across protected modules.
                                </p>
                                <p className="mt-4 text-xs leading-5 text-white/65">
                                    If access still fails after credential reset, the screen now surfaces server reachability separately from invalid credentials.
                                </p>
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="flex min-h-[calc(100dvh-2rem)] items-stretch justify-center lg:h-[calc(100dvh-3rem)] lg:min-h-0">
                    <div className="tt-animate-fade-up flex w-full max-w-[500px] flex-col rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,251,241,0.97)_100%)] p-7 shadow-[0_26px_72px_rgba(161,121,0,0.14)] backdrop-blur lg:h-full lg:max-w-none lg:justify-between xl:p-9" style={{ animationDelay: '120ms' }}>
                        <div>
                            <div className="mb-7 flex items-center gap-4 tt-animate-fade-up" style={{ animationDelay: '220ms' }}>
                                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,#fff7df_0%,#fff1bf_100%)] p-2 shadow-[0_12px_26px_rgba(255,188,0,0.16)]">
                                    <ThinkTankerLogo className="max-h-10 max-w-full" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">{eyebrow}</p>
                                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                                </div>
                            </div>

                            {children}
                        </div>

                        <div>
                            <div className="mt-7 border-t border-slate-200 pt-5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                <Link to={ROUTES.login} className="transition-colors hover:text-brand-600">
                                    Back to login
                                </Link>
                            </div>

                            {footer && <div className="mt-5">{footer}</div>}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AuthShell;
