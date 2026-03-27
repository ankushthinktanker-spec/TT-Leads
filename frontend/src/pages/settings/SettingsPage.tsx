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
        { id: 'system', label: 'System Preferences', icon: SettingsIcon, adminOnly: true }
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
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--mod-warning-light)',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--mod-radius-lg)',
                    color: 'var(--mod-warning-text)',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 16
                }}>
                    You have limited access. Only profile settings are available for your role.
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 mt-4">
                {/* Left Sidebar Menu */}
                <div className="w-full md:w-64 max-w-full shrink-0 flex flex-col gap-1">
                    {visibleTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all duration-200 ${
                                    isActive
                                        ? 'bg-[#335CFF] text-white shadow-md'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Right Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="mod-card p-6 min-h-[500px]">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{activeTabLabel}</h3>
                                <p className="text-[13px] text-slate-500 mt-1">Update your preferences and configurations here.</p>
                            </div>
                        </div>

                        {activeTab === 'profile' && <ProfileSettings />}
                        {activeTab === 'company' && <CompanySettings />}
                        {activeTab === 'roles' && <RolesSettings />}
                        {activeTab === 'permissions' && <PermissionsSettings />}
                        {activeTab === 'system' && (
                            <div className="text-center py-16 flex flex-col items-center justify-center">
                                <SettingsIcon size={48} className="text-slate-300 mb-4" />
                                <h4 className="text-lg font-semibold text-slate-800">System Preferences</h4>
                                <p className="text-slate-500 mt-2 text-sm max-w-sm">Global configuration controls will appear here once the system module is fully integrated.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ModulePageShell>
    );
};

export default SettingsPage;
