import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Copy, Download, Eye, Mail, Plus, Receipt, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompanies } from '../../store/slices/companySlice';
import {
    ModuleBadge,
    ModuleDataTable,
    ModulePageHeader,
    ModulePageShell,
    ModuleRowActions,
    ModuleSummaryCards,
    ModuleToolbar,
    type ModuleColumnDef,
    type SummaryCardItem,
} from '../../components/module-system';
import Modal from '../../components/ui/Modal';
import { FormLabel, SelectInput, TextInput } from '../../components/ui/Form';
import { showToast } from '../../utils/toast';
import {
    buildInvoiceHtml,
    buildInvoicePreviewHtml,
    defaultClientProfile,
    defaultInvoiceTemplateConfig,
    type InvoiceRecord,
    type InvoiceStatus,
} from './invoiceTemplate';

const initialInvoices: InvoiceRecord[] = [
    { _id: '1', invoiceNumber: 'INV-2026-001', clientName: 'Northstar Labs', description: 'Dedicated Resources NodeJS', issueDate: '2026-03-01', dueDate: '2026-03-31', amount: 45000, status: 'Paid', ...defaultClientProfile },
    { _id: '2', invoiceNumber: 'INV-2026-002', clientName: 'Apex Holdings', description: 'Software Consultant', issueDate: '2026-03-15', dueDate: '2026-04-15', amount: 120000, status: 'Unpaid', ...defaultClientProfile },
    { _id: '3', invoiceNumber: 'INV-2026-003', clientName: 'ThinkRetail', description: 'Web Development Services', issueDate: '2026-02-10', dueDate: '2026-03-10', amount: 84000, status: 'Overdue', ...defaultClientProfile },
];

interface InvoiceFormState {
    clientName: string;
    clientGst: string;
    clientStateCode: string;
    clientAddress: string;
    description: string;
    amount: number;
    issueDate: string;
    dueDate: string;
    status: InvoiceStatus;
}

const createInitialFormData = (): InvoiceFormState => ({
    clientName: '',
    clientGst: '',
    clientStateCode: '',
    clientAddress: '',
    description: '',
    amount: 0,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Draft',
});

const formatCurrency = (value: number) => `?${value.toLocaleString('en-IN')}`;

const InvoicesPage = () => {
    const dispatch = useAppDispatch();
    const { items: companies } = useAppSelector((state) => state.companies);

    useEffect(() => {
        dispatch(fetchCompanies({ limit: 1000 }));
    }, [dispatch]);

    const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState<InvoiceFormState>(createInitialFormData());

    const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
        if (statusFilter && invoice.status !== statusFilter) return false;
        if (search) {
            const query = search.toLowerCase();
            return invoice.clientName.toLowerCase().includes(query) || invoice.invoiceNumber.toLowerCase().includes(query);
        }
        return true;
    }), [invoices, search, statusFilter]);

    const summaryCards: SummaryCardItem[] = useMemo(() => {
        const totalValue = filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        const overdueValue = filteredInvoices.filter((invoice) => invoice.status === 'Overdue').reduce((sum, invoice) => sum + invoice.amount, 0);

        return [
            { label: 'Total Value', value: formatCurrency(totalValue), icon: <CircleDollarSign size={18} />, variant: 'primary' },
            { label: 'Invoices', value: filteredInvoices.length, icon: <Receipt size={18} />, variant: 'info' },
            { label: 'Overdue Risk', value: formatCurrency(overdueValue), icon: <AlertTriangle size={18} />, variant: 'danger' },
            { label: 'Paid', value: filteredInvoices.filter((invoice) => invoice.status === 'Paid').length, icon: <Receipt size={18} />, variant: 'success' },
        ];
    }, [filteredInvoices]);

    const resetForm = () => setFormData(createInitialFormData());

    const handleDownloadPDF = (invoice: InvoiceRecord) => {
        showToast('Preparing PDF...', 'info');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        iframe.contentWindow?.document.open();
        iframe.contentWindow?.document.write(buildInvoiceHtml(invoice, defaultInvoiceTemplateConfig));
        iframe.contentWindow?.document.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
            showToast('PDF document ready', 'success');
        }, 300);
    };

    const handleCreateInvoice = () => {
        if (!formData.clientName || !formData.amount) {
            showToast('Please provide client name and amount', 'error');
            return;
        }

        const invoiceNumber = `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`;
        const newInvoice: InvoiceRecord = {
            _id: Math.random().toString(36).slice(2, 11),
            invoiceNumber,
            clientName: formData.clientName,
            clientGst: formData.clientGst,
            clientStateCode: formData.clientStateCode,
            clientAddress: formData.clientAddress,
            description: formData.description || 'Professional Services',
            amount: Number(formData.amount),
            issueDate: formData.issueDate,
            dueDate: formData.dueDate,
            status: formData.status,
        };

        setInvoices((current) => [newInvoice, ...current]);
        setIsCreateModalOpen(false);
        resetForm();
        showToast('Invoice created successfully', 'success');
    };

    const handleDelete = (id: string, status: InvoiceStatus) => {
        if (status === 'Paid') {
            showToast('Cannot delete tracked paid invoices', 'error');
            return;
        }
        setInvoices((current) => current.filter((invoice) => invoice._id !== id));
        showToast('Invoice deleted', 'success');
    };

    const syncCompanyDetails = (companyName: string) => {
        const selectedCompany = companies.find((company: any) => company.name === companyName);
        setFormData((current) => ({
            ...current,
            clientName: companyName,
            clientGst: selectedCompany?.gst || current.clientGst,
            clientStateCode: selectedCompany?.address?.state || current.clientStateCode,
            clientAddress: selectedCompany
                ? `${selectedCompany.address?.street || ''}, ${selectedCompany.address?.city || ''}, ${selectedCompany.address?.state || ''}, ${selectedCompany.address?.country || ''}`
                    .replace(/(^[,\s]+)|([,\s]+$)/g, '')
                    .replace(/,\s*,/g, ',')
                : current.clientAddress,
        }));
    };

    const columns: ModuleColumnDef<InvoiceRecord>[] = [
        {
            id: 'invoice',
            header: 'Invoice',
            width: '25%',
            cell: (invoice) => (
                <div style={{ minWidth: 0 }}>
                    <div className="mod-table__primary-text">{invoice.invoiceNumber}</div>
                    <div className="mod-table__secondary-text truncate">{invoice.clientName}</div>
                </div>
            ),
        },
        {
            id: 'dates',
            header: 'Issue / Due Dates',
            width: '25%',
            cell: (invoice) => (
                <div>
                    <div className="mod-table__primary-text text-[13px]">{new Date(invoice.issueDate).toLocaleDateString('en-IN')}</div>
                    <div className="mod-table__secondary-text">Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>
                </div>
            ),
        },
        {
            id: 'amount',
            header: 'Amount',
            width: '20%',
            cell: (invoice) => <div className="mod-table__primary-text text-[14px]">{formatCurrency(invoice.amount)}</div>,
        },
        {
            id: 'status',
            header: 'Status',
            width: '15%',
            cell: (invoice) => {
                const variant = invoice.status === 'Paid' ? 'success' : invoice.status === 'Unpaid' ? 'warning' : invoice.status === 'Overdue' ? 'danger' : 'neutral';
                return <ModuleBadge variant={variant}>{invoice.status}</ModuleBadge>;
            },
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '80px',
            cell: (invoice) => (
                <ModuleRowActions
                    primaryAction={{
                        label: 'PDF',
                        icon: <Download size={14} />,
                        onClick: () => handleDownloadPDF(invoice),
                    }}
                    actions={[
                        { label: 'View Details', icon: <Eye size={14} />, onClick: () => setViewingInvoice(invoice) },
                        { label: 'Send Email', icon: <Mail size={14} />, onClick: () => showToast(`Sent email to ${invoice.clientName}`, 'success') },
                        { label: 'Download PDF', icon: <Download size={14} />, onClick: () => handleDownloadPDF(invoice) },
                        { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => showToast('Duplicated invoice', 'success') },
                        { label: 'Delete', icon: <Trash2 size={14} />, danger: true, divider: true, onClick: () => handleDelete(invoice._id, invoice.status) },
                    ]}
                />
            ),
        },
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Commercial � Finance"
                title="Invoices & Payments"
                description="Manage billing cycles, track overdue payments, and export invoices from a template that is easy to customize later."
                actions={
                    <button className="mod-btn mod-btn--primary" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={14} /> Create Invoice
                    </button>
                }
            />

            <ModuleSummaryCards cards={summaryCards} />

            <ModuleToolbar
                searchValue={search}
                searchPlaceholder="Search invoices, clients..."
                onSearchChange={setSearch}
                onClearAllFilters={() => {
                    setSearch('');
                    setStatusFilter('');
                    setCurrentPage(1);
                }}
                totalCount={filteredInvoices.length}
                countLabel="invoices"
                filterContent={
                    <div>
                        <label className="mod-filter-panel__field-label">Status</label>
                        <select className="mod-toolbar__select" style={{ width: '100%' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Draft">Draft</option>
                        </select>
                    </div>
                }
            >
                <select className="mod-toolbar__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Draft">Draft</option>
                </select>
            </ModuleToolbar>

            <ModuleDataTable
                rows={filteredInvoices}
                columns={columns}
                rowKey={(invoice) => invoice._id}
                loading={false}
                error={null}
                tableTitle="Billing Ledger"
                emptyTitle="No invoices found"
                emptyDescription="Generate your first invoice to collect payments from clients."
                emptyIcon={<Receipt size={28} />}
                page={currentPage}
                totalPages={1}
                totalItems={filteredInvoices.length}
                onPageChange={setCurrentPage}
            />

            {isCreateModalOpen && (
                <Modal title="Create New Invoice" onClose={() => setIsCreateModalOpen(false)}>
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 text-sm text-slate-700">
                            <p className="font-semibold text-slate-900">Flexible invoice template</p>
                            <p className="mt-1">{defaultInvoiceTemplateConfig.labels.copyHint}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FormLabel>Client Name</FormLabel>
                                <SelectInput value={formData.clientName} onChange={(e) => syncCompanyDetails(e.target.value)}>
                                    <option value="">Select Company</option>
                                    {companies.map((company: any) => (
                                        <option key={company._id} value={company.name}>{company.name}</option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div>
                                <FormLabel>Client GST Number</FormLabel>
                                <TextInput value={formData.clientGst} onChange={(e) => setFormData((current) => ({ ...current, clientGst: e.target.value }))} placeholder="24AAJCD..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FormLabel>Client State / Code</FormLabel>
                                <TextInput value={formData.clientStateCode} onChange={(e) => setFormData((current) => ({ ...current, clientStateCode: e.target.value }))} placeholder="GJ, Code - 24" />
                            </div>
                            <div>
                                <FormLabel>Service Description</FormLabel>
                                <TextInput value={formData.description} onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))} placeholder="Dedicated Resources NodeJS" />
                            </div>
                        </div>

                        <div>
                            <FormLabel>Client Full Address</FormLabel>
                            <textarea
                                className="w-full min-h-[72px] rounded-xl border border-slate-200 bg-[#fffdf9] px-3 py-2 text-sm text-slate-900 shadow-[0_4px_12px_rgba(120,74,24,0.04)] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 placeholder:text-slate-400"
                                placeholder="Full street address, city, state, pin"
                                value={formData.clientAddress}
                                onChange={(e) => setFormData((current) => ({ ...current, clientAddress: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FormLabel>Taxable Amount (?)</FormLabel>
                                <TextInput type="number" value={formData.amount} onChange={(e) => setFormData((current) => ({ ...current, amount: Number(e.target.value) }))} placeholder="0.00" />
                                <div className="mt-1 text-[10px] text-slate-400">Tax rows come from `invoiceTemplate.ts` and can be changed later.</div>
                            </div>
                            <div>
                                <FormLabel>Status</FormLabel>
                                <SelectInput value={formData.status} onChange={(e) => setFormData((current) => ({ ...current, status: e.target.value as InvoiceStatus }))}>
                                    <option value="Draft">Draft</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Overdue">Overdue</option>
                                </SelectInput>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FormLabel>Issue Date</FormLabel>
                                <TextInput type="date" value={formData.issueDate} onChange={(e) => setFormData((current) => ({ ...current, issueDate: e.target.value }))} />
                            </div>
                            <div>
                                <FormLabel>Due Date</FormLabel>
                                <TextInput type="date" value={formData.dueDate} onChange={(e) => setFormData((current) => ({ ...current, dueDate: e.target.value }))} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-[var(--mod-border)] pt-4">
                            <button className="mod-btn mod-btn--secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                            <button className="mod-btn mod-btn--primary" onClick={handleCreateInvoice}>Create Invoice</button>
                        </div>
                    </div>
                </Modal>
            )}

            {viewingInvoice && (
                <Modal title={`Invoice Preview: ${viewingInvoice.invoiceNumber}`} onClose={() => setViewingInvoice(null)} className="max-w-[960px]">
                    <div className="rounded-xl border border-[var(--mod-border)] overflow-hidden bg-[#fffaf4] shadow-[0_10px_30px_rgba(120,74,24,0.08)] h-[65vh] relative">
                        <div className="absolute right-4 top-2 text-xs font-semibold text-slate-400 opacity-70 pointer-events-none">HTML PREVIEW</div>
                        <iframe
                            srcDoc={buildInvoicePreviewHtml(viewingInvoice, defaultInvoiceTemplateConfig)}
                            className="h-full w-full border-none bg-[#fffdf9]"
                            title="Invoice Preview"
                        />
                    </div>
                    <div className="mt-5 flex justify-end gap-3 border-t border-[var(--mod-border)] pt-4">
                        <button className="mod-btn mod-btn--secondary" onClick={() => setViewingInvoice(null)}>Close Preview</button>
                        <button className="mod-btn mod-btn--primary" onClick={() => handleDownloadPDF(viewingInvoice)}>
                            <Download size={14} /> Export to PDF
                        </button>
                    </div>
                </Modal>
            )}
        </ModulePageShell>
    );
};

const AlertTriangle = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </svg>
);

export default InvoicesPage;
