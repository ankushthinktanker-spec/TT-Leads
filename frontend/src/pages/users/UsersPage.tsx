import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUsers, deleteUser, User } from '../../store/slices/userSlice';
import UserFormModal from './UserFormModal';
import { Edit, Trash2, Shield, Users, Plus, Inbox } from 'lucide-react';
import api from '../../api/axios';
import { useGlobalSearch } from '../../context/GlobalSearchContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { showToast } from '../../utils/toast';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleToolbar,
    ModuleFilterDropdown,
    ModuleSummaryCards,
    ModuleDataTable,
    ModuleBadge,
    ModuleRowActions,
    type ModuleColumnDef,
    type SummaryCardItem,
    type ActiveFilter,
} from '../../components/module-system';

export const UsersPage = () => {
    const dispatch = useAppDispatch();
    const { users, loading, error, pagination } = useAppSelector((state) => state.users);
    const { user: currentUser } = useAppSelector((state) => state.auth);
    const safePagination = pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { value: searchQuery, setValue: setSearchQuery } = useGlobalSearch();
    const [roleFilter, setRoleFilter] = useState('');
    const [roles, setRoles] = useState<Array<{ _id: string; name: string }>>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const roleOptions = [
        { value: '', label: 'All roles' },
        ...roles.map((role) => ({ value: role.name, label: role.name })),
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(fetchUsers({
                page: currentPage,
                limit: 10,
                search: searchQuery,
                role: roleFilter
            }));
        }, 300);

        return () => clearTimeout(timer);
    }, [dispatch, currentPage, searchQuery, roleFilter]);

    useEffect(() => {
        const loadRoles = async () => {
            try {
                const response = await api.get('/roles');
                setRoles(response.data.data.roles || []);
            } catch {
                setRoles([
                    { _id: 'admin', name: 'Admin' },
                    { _id: 'manager', name: 'Manager' },
                    { _id: 'bdm', name: 'BDM' },
                    { _id: 'marketing', name: 'Marketing' }
                ]);
            }
        };
        loadRoles();
    }, []);

    const runFetch = (nextPage = 1) => {
        setCurrentPage(nextPage);
        dispatch(fetchUsers({
            page: nextPage,
            limit: 10,
            search: searchQuery,
            role: roleFilter
        }));
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await dispatch(deleteUser(deleteId)).unwrap();
            setDeleteId(null);
            showToast('User deleted successfully.', 'success');
            runFetch(safePagination.page);
        } catch {
            showToast('Failed to delete user.', 'error');
        }
    };

    const handleDelete = (userId: string) => {
        if (currentUser?.id !== userId) {
            setDeleteId(userId);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleSuccess = () => {
        runFetch(safePagination.page);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setRoleFilter('');
        setCurrentPage(1);
    };

    const activeFilters: ActiveFilter[] = [
        ...(searchQuery.trim() ? [{ key: 'search', label: `Search: "${searchQuery.trim()}"`, onRemove: () => setSearchQuery('') }] : []),
        ...(roleFilter ? [{ key: 'role', label: `Role: ${roleFilter}`, onRemove: () => setRoleFilter('') }] : []),
    ];

    const activeUsers = users.filter((user) => user.status === 'Active').length;
    const adminUsers = users.filter((user) => user.role === 'Admin').length;

    const summaryCards: SummaryCardItem[] = [
        { label: 'Total Users', value: safePagination.total || users.length, icon: <Users size={18} />, variant: 'primary' },
        { label: 'Active', value: activeUsers, icon: <Users size={18} />, variant: 'success' },
        { label: 'Admin Accounts', value: adminUsers, icon: <Shield size={18} />, variant: 'warning' },
        { label: 'Visible Results', value: users.length, icon: <Users size={18} />, variant: 'info' },
    ];

    const getRoleBadgeVariant = (role: string): 'neutral' | 'success' | 'warning' | 'danger' => {
        switch (role) {
            case 'Admin': return 'danger';
            case 'Manager': return 'warning';
            case 'BDM': return 'success';
            default: return 'neutral';
        }
    };

    const columns: ModuleColumnDef<User>[] = [
        {
            id: 'user',
            header: 'User',
            width: '34%',
            cell: (user) => (
                <div className="flex items-center gap-3">
                    <div className="mod-table__avatar mod-table__avatar--blue">
                        {user.firstName ? user.firstName[0] : 'U'}{user.lastName ? user.lastName[0] : ''}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="mod-table__primary-text">
                            {user.firstName || 'Unknown'} {user.lastName || ''}
                        </div>
                        <div className="mod-table__secondary-text">
                            {user.email}
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'role',
            header: 'Role',
            width: '14%',
            cell: (user) => (
                <ModuleBadge variant={getRoleBadgeVariant(user.role)}>
                    {user.role}
                </ModuleBadge>
            )
        },
        {
            id: 'status',
            header: 'Status',
            width: '12%',
            cell: (user) => (
                <ModuleBadge variant={user.status === 'Active' ? 'success' : 'neutral'}>
                    {user.status}
                </ModuleBadge>
            )
        },
        {
            id: 'contact',
            header: 'Contact',
            width: '18%',
            cell: (user) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                    {user.phone || '-'}
                </div>
            )
        },
        {
            id: 'created',
            header: 'Created',
            width: '14%',
            cell: (user) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13, color: 'var(--mod-text-muted)' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-'}
                </div>
            )
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '80px',
            cell: (user) => (
                <ModuleRowActions
                    actions={[
                        {
                            label: 'Edit user',
                            icon: <Edit size={14} />,
                            onClick: () => handleEdit(user)
                        },
                        ...(currentUser?.id !== user._id ? [{
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            onClick: () => handleDelete(user._id),
                            danger: true,
                            divider: true
                        }] : [])
                    ]}
                />
            )
        }
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Admin / Users"
                title="Users"
                description="Manage team access, role assignment, and account activity from one tighter permission workspace."
                actions={(
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus size={14} /> Add User
                    </button>
                )}
            />

            <ModuleSummaryCards cards={summaryCards} />

            <ModuleToolbar
                searchValue={searchQuery}
                searchPlaceholder="Search users..."
                onSearchChange={setSearchQuery}
                activeFilters={activeFilters}
                onClearAllFilters={handleClearFilters}
                totalCount={safePagination.total || users.length}
                countLabel="users"
            >
                <ModuleFilterDropdown
                    ariaLabel="Filter users by role"
                    value={roleFilter}
                    options={roleOptions}
                    onChange={setRoleFilter}
                />
            </ModuleToolbar>

            <ModuleDataTable
                rows={users}
                columns={columns}
                rowKey={(user) => user._id}
                loading={loading}
                error={isModalOpen ? null : error}
                tableTitle="Team Directory"
                tableBadge={`${users.length} visible`}
                emptyTitle="No users found"
                emptyDescription="Add the first team member to start managing CRM access and role assignments."
                emptyIcon={<Inbox size={28} />}
                emptyAction={(
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus size={14} /> Add User
                    </button>
                )}
                page={safePagination.page}
                totalPages={safePagination.totalPages}
                totalItems={safePagination.total || users.length}
                onPageChange={setCurrentPage}
                onRetry={() => runFetch(safePagination.page)}
            />

            <ConfirmDialog
                open={!!deleteId}
                title="Delete user"
                message="Are you sure you want to delete this user? This action cannot be undone."
                confirmLabel="Delete user"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />

            <UserFormModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                user={selectedUser}
                onSuccess={handleSuccess}
            />
        </ModulePageShell>
    );
};

export default UsersPage;
