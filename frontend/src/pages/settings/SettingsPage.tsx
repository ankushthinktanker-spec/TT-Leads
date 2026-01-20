import { useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import MainLayout from '../../components/layout/MainLayout';
import ProfileSettings from './ProfileSettings';
import CompanySettings from './CompanySettings';
import { User, Building2, Settings as SettingsIcon, Shield, Users } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import SurfaceCard from '../../components/ui/SurfaceCard';
import PermissionsSettings from './PermissionsSettings';
import RolesSettings from './RolesSettings';

const SettingsPage = () => {
    const { user } = useAppSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: User },
        { id: 'company', label: 'Company Settings', icon: Building2, adminOnly: true },
        { id: 'roles', label: 'Roles', icon: Users, adminOnly: true },
        { id: 'permissions', label: 'Permissions', icon: Shield, adminOnly: true },
        { id: 'system', label: 'System Preferences', icon: SettingsIcon, adminOnly: true }
    ];

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader title="Settings" subtitle="Manage your profile and organization preferences." />
                {user?.role !== 'Admin' && (
                    <SurfaceCard className="mt-4 p-4 text-sm text-secondary-300">
                        You have limited access. Only profile settings are available for your role.
                    </SurfaceCard>
                )}

                <div className="flex flex-col md:flex-row gap-6 mt-6">
                    <SurfaceCard className="w-full md:w-64 p-3 space-y-1">
                        {tabs.map((tab) => {
                            if (tab.adminOnly && user?.role !== 'Admin') return null;
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                        isActive
                                            ? 'bg-brand-500/10 text-brand-300 font-semibold'
                                            : 'text-secondary-300 hover:bg-secondary-900/60 hover:text-secondary-100'
                                    }`}
                                >
                                    <Icon size={20} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </SurfaceCard>

                    <div className="flex-1">
                        <SurfaceCard className="p-4 mb-4 text-xs text-secondary-400">
                            Select a settings category on the left to update your preferences.
                        </SurfaceCard>
                        {activeTab === 'profile' && <ProfileSettings />}
                        {activeTab === 'company' && <CompanySettings />}
                        {activeTab === 'roles' && <RolesSettings />}
                        {activeTab === 'permissions' && <PermissionsSettings />}
                        {activeTab === 'system' && (
                            <SurfaceCard className="p-6 text-center py-12">
                                <SettingsIcon size={48} className="mx-auto text-secondary-600 mb-4" />
                                <h3 className="text-lg font-semibold text-secondary-100">System Preferences</h3>
                                <p className="text-secondary-500 mt-2">System configuration features coming soon.</p>
                            </SurfaceCard>
                        )}
                    </div>
                </div>
            </PageLayout>
        </MainLayout>
    );
};

export default SettingsPage;
