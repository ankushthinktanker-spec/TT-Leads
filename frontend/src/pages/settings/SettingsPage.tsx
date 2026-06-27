import { useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import ProfileSettings from './ProfileSettings';
import CompanySettings from './CompanySettings';
import PermissionsSettings from './PermissionsSettings';
import RolesSettings from './RolesSettings';
import { User, Building2, Settings as SettingsIcon, Shield, Users, Sparkles } from 'lucide-react';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleSummaryCards,
    type SummaryCardItem,
} from '../../components/module-system';

const SettingsPage = () => {
    const { user } = useAppSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: User, adminOnly: false },
        { id: 'company', label: 'Company Settings', icon: Building2, adminOnly: true },
        { id: 'roles', label: 'Roles', icon: Users, adminOnly: true },
        { id: 'permissions', label: 'Permissions', icon: Shield, adminOnly: true },
        { id: 'system', label: 'System Preferences', icon: SettingsIcon, adminOnly: true },
    ];

    const visibleTabs = tabs.filter((tab) => !(tab.adminOnly && user?.role !== 'Admin'));
    const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Profile Settings';

    const summaryCards: SummaryCardItem[] = [
        { label: 'Visible Sections', value: visibleTabs.length, icon: <Sparkles size={18} />, variant: 'primary' },
        { label: 'Current Area', value: activeTabLabel, icon: <SettingsIcon size={18} />, variant: 'info' },
        { label: 'Access Level', value: user?.role || 'User', icon: <Shield size={18} />, variant: 'warning' },
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Workspace · Settings"
                title="Settings"
                description="Manage personal, organization, and permission preferences in one consistent CRM settings workspace."
            />

            <ModuleSummaryCards cards={summaryCards} />

            {user?.role !== 'Admin' && (
                <div
                    style={{
                        padding: '12px 16px',
                        background: 'var(--mod-warning-light)',
                        border: '1px solid #fde68a',
                        borderRadius: 'var(--mod-radius-lg)',
                        color: 'var(--mod-warning-text)',
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 16,
                    }}
                >
                    You have limited access. Only profile settings are available for your role.
                </div>
            )}

            <div className="mt-4 flex flex-col gap-6 md:flex-row">
                <div className="flex w-full max-w-full shrink-0 flex-col gap-1 md:w-64">
                    {visibleTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                                    isActive
                                        ? 'bg-brand-500 text-slate-950 shadow-md'
                                        : 'text-slate-600 hover:bg-[#f8efe1] hover:text-slate-900'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="mod-card min-h-[500px] p-6">
                        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{activeTabLabel}</h3>
                                <p className="mt-1 text-[13px] text-slate-500">Update your preferences and configurations here.</p>
                            </div>
                        </div>

                        {activeTab === 'profile' && <ProfileSettings />}
                        {activeTab === 'company' && <CompanySettings />}
                        {activeTab === 'roles' && <RolesSettings />}
                        {activeTab === 'permissions' && <PermissionsSettings />}
                        {activeTab === 'system' && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <SettingsIcon size={48} className="mb-4 text-slate-300" />
                                <h4 className="text-lg font-semibold text-slate-800">System Preferences</h4>
                                <p className="mt-2 max-w-sm text-sm text-slate-500">Global configuration controls will appear here once the system module is fully integrated.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ModulePageShell>
    );
};

export default SettingsPage;
