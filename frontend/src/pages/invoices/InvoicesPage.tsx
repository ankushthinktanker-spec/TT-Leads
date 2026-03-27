import { useState, useEffect } from 'react';
import { Plus, Receipt, Download, Mail, Copy, Trash2, Eye, CircleDollarSign } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompanies } from '../../store/slices/companySlice';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleToolbar,
    ModuleSummaryCards,
    ModuleDataTable,
    ModuleBadge,
    ModuleRowActions,
    type ModuleColumnDef,
    type SummaryCardItem,
} from '../../components/module-system';
import Modal from '../../components/ui/Modal';
import { FormLabel, TextInput, SelectInput } from '../../components/ui/Form';
import { showToast } from '../../utils/toast';

interface InvoiceRecord {
    _id: string;
    invoiceNumber: string;
    clientName: string;
    clientGst: string;
    clientStateCode: string;
    clientAddress: string;
    description: string;
    issueDate: string;
    dueDate: string;
    amount: number;
    status: 'Paid' | 'Unpaid' | 'Overdue' | 'Draft';
}

const defaultClient = {
    clientGst: '24AAJCD9626P1ZZ',
    clientStateCode: 'GJ, Code - 24',
    clientAddress: '7TH FLOOR, 706, 31 Five, Corporate Road, NR MATRIX, CORPORATE ROAD, Ahmedabad, Ahmedabad, Gujarat, 380015'
};

const initialInvoices: InvoiceRecord[] = [
    { _id: '1', invoiceNumber: 'INV-2026-001', clientName: 'Northstar Labs', description: 'Dedicated Resources NodeJS', issueDate: '2026-03-01', dueDate: '2026-03-31', amount: 45000, status: 'Paid', ...defaultClient },
    { _id: '2', invoiceNumber: 'INV-2026-002', clientName: 'Apex Holdings', description: 'Software Consultant', issueDate: '2026-03-15', dueDate: '2026-04-15', amount: 120000, status: 'Unpaid', ...defaultClient },
    { _id: '3', invoiceNumber: 'INV-2026-003', clientName: 'ThinkRetail', description: 'Web Development Services', issueDate: '2026-02-10', dueDate: '2026-03-10', amount: 84000, status: 'Overdue', ...defaultClient }
];

const InvoicesPage = () => {
    const dispatch = useAppDispatch();
    const { companies } = useAppSelector((state) => state.companies);

    useEffect(() => {
        dispatch(fetchCompanies({ limit: 1000 }));
    }, [dispatch]);

    const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Modal State
    const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<InvoiceRecord>>({
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

    const filteredInvoices = invoices.filter(inv => {
        if (statusFilter && inv.status !== statusFilter) return false;
        if (search && !inv.clientName.toLowerCase().includes(search.toLowerCase()) && !inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalValue = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const overdueValue = filteredInvoices.filter(i => i.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0);

    const summaryCards: SummaryCardItem[] = [
        { label: 'Total Value', value: `₹${totalValue.toLocaleString()}`, icon: <CircleDollarSign size={18} />, variant: 'primary' },
        { label: 'Invoices', value: filteredInvoices.length, icon: <Receipt size={18} />, variant: 'info' },
        { label: 'Overdue Risk', value: `₹${overdueValue.toLocaleString()}`, icon: <AlertTriangle size={18} />, variant: 'danger' },
        { label: 'Paid', value: filteredInvoices.filter(i => i.status === 'Paid').length, icon: <Receipt size={18} />, variant: 'success' },
    ];

    const numberToWords = (num: number): string => {
        const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        if (num === 0) return 'Zero';
        const nString = ('000000000' + num).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!nString) return '';
        let str = '';
        str += (nString[1] !== '00') ? (a[Number(nString[1])] || b[Number(nString[1][0])] + ' ' + a[Number(nString[1][1])]) + ' Crore ' : '';
        str += (nString[2] !== '00') ? (a[Number(nString[2])] || b[Number(nString[2][0])] + ' ' + a[Number(nString[2][1])]) + ' Lakh ' : '';
        str += (nString[3] !== '00') ? (a[Number(nString[3])] || b[Number(nString[3][0])] + ' ' + a[Number(nString[3][1])]) + ' Thousand ' : '';
        str += (nString[4] !== '0') ? (a[Number(nString[4])] || b[Number(nString[4][0])] + ' ' + a[Number(nString[4][1])]) + ' Hundred ' : '';
        str += (nString[5] !== '00') ? ((str !== '') ? 'And ' : '') + (a[Number(nString[5])] || b[Number(nString[5][0])] + ' ' + a[Number(nString[5][1])]) : '';
        return str.trim() + ' Only';
    };

    const generateInvoiceHTML = (inv: InvoiceRecord) => {
        const baseAmount = inv.amount;
        const cgst = baseAmount * 0.09;
        const sgst = baseAmount * 0.09;
        const total = baseAmount + cgst + sgst;
        const words = `Rupees ${numberToWords(Math.round(total))}`;
        const taxWords = `Rupees ${numberToWords(Math.round(cgst + sgst))}`;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${inv.invoiceNumber}</title>
            <style>
                @page { size: auto; margin: 10mm; }
                body { font-family: 'Arial', sans-serif; padding: 20px; color: #000; font-size: 11px; margin: 0; }
                * { box-sizing: border-box; }
                .text-orange { color: #ffbc00; }
                .bg-orange { background-color: #ffb800 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #000; }
                table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
                th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
                .td-right { text-align: right; }
                .td-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .flex-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; }
                .bill-section { display: flex; justify-content: space-between; gap: 40px; margin-bottom: 30px; }
                .bill-box { width: 48%; }
                .bill-title { border: 1px solid #000; padding: 4px 8px; font-weight: bold; font-size: 11px; margin-bottom: 10px; text-transform: uppercase; }
                .info-line { margin-bottom: 3px; font-size: 10px; line-height: 1.4; }
                .logo-text { font-size: 26px; font-weight: bold; color: #ffbc00; letter-spacing: -0.5px; }
                .logo-sub { font-size: 11px; color: #000; letter-spacing: 0.5px; }
                .invoice-heading { font-size: 34px; font-weight: bold; text-align: right; letter-spacing: 1px; }
                .empty-row td { height: 20px; color: transparent; border-top: 1px solid #000; border-bottom: 1px solid #000; }
            </style>
        </head>
        <body>
            <div class="flex-row">
                <div>
                    <div style="display:flex; align-items:flex-end; gap: 4px;">
                        <span style="background-color:#ffbc00 !important; color:#fff !important; padding:0px 6px; font-size:22px; font-weight:bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;">T</span>
                        <div class="logo-text">THINKTANKER<sup style="font-size:12px;color:#ffbc00;">®</sup></div>
                    </div>
                    <div class="logo-sub" style="margin-left: 31px;">TECHNOSOFT PVT. LTD.</div>
                </div>
                <div class="invoice-heading text-orange">INVOICE</div>
            </div>

            <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 30px; font-weight: bold; width: 55%; font-size: 12px;">
                <div>Invoice No: ${inv.invoiceNumber}</div>
                <div>Invoice Date: ${new Date(inv.issueDate).toLocaleDateString()}</div>
            </div>

            <div class="bill-section">
                <div class="bill-box">
                    <div class="bill-title bg-orange">BILL TO</div>
                    <div class="font-bold info-line" style="font-size: 12px; margin-top: 15px;">${inv.clientName}</div>
                    <div class="info-line">GST No: <span style="font-family: monospace;">${inv.clientGst || 'N/A'}</span></div>
                    <div class="info-line">State Name: ${inv.clientStateCode || 'N/A'}</div>
                    <div class="info-line" style="margin-top: 5px;">
                        ${inv.clientAddress.replace(/,/g, ',<br/>')}
                    </div>
                </div>
                <div class="bill-box">
                    <div class="bill-title bg-orange">BILL FROM</div>
                    <div class="font-bold info-line" style="font-size: 12px; margin-top: 15px;">THINK TANKER TECHNOSOFT PRIVATE LIMITED</div>
                    <div class="info-line">GST No: <span style="font-family: monospace;">24AAJCT7282R1ZF</span></div>
                    <div class="info-line">State Name: GJ, Code &ndash; 24</div>
                    <div class="info-line" style="margin-top: 5px;">
                        Address: 508, Avadh Pride, Metro Pillar No 140, Nr. Nirant<br/>
                        Cross Road, Vastral Road, Vastral, Ahmedabad, Gujarat -<br/>
                        382418, India
                    </div>
                </div>
            </div>

            <!-- Primary Table -->
            <table style="table-layout: fixed;">
                <thead>
                    <tr class="bg-orange font-bold">
                        <td style="width: 85%; padding: 6px 8px;">DESCRIPTION</td>
                        <td style="width: 15%; text-align: right; padding: 6px 8px;">AMOUNT</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="font-bold">${inv.description || 'Software Services'} - ${new Date(inv.issueDate).toLocaleString('default', { month: 'short' })}${new Date(inv.issueDate).getFullYear().toString().slice(2)}</td>
                        <td class="td-right border-bottom-0">₹ <span style="float:right;">${baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td>
                    </tr>
                    <tr><td colspan="2" style="height:10px; border-top:none; border-bottom:none;"></td></tr>
                    <tr><td colspan="2" style="height:10px; border-top:none; border-bottom:none;"></td></tr>
                    <tr>
                        <td style="border-top:none; border-bottom:none;">Start Date : ${new Date(inv.issueDate).toLocaleDateString()}</td>
                        <td class="td-right" style="border-top:none; border-bottom:none;"></td>
                    </tr>
                    <tr>
                        <td style="border-top:none; border-bottom:none;">Cycle Date: ${new Date(inv.issueDate).toLocaleDateString()} to ${new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td class="td-right" style="border-top:none; border-bottom:none;"></td>
                    </tr>
                    <tr class="empty-row"><td colspan="2"></td></tr>
                    <tr class="empty-row"><td colspan="2"></td></tr>
                    <tr class="empty-row"><td colspan="2"></td></tr>
                    <tr>
                        <td>Sub Total</td>
                        <td class="td-right">₹ <span style="float:right;">${baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td>
                    </tr>
                    <tr>
                        <td>CGST 9%</td>
                        <td class="td-right">₹ <span style="float:right;">${cgst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td>
                    </tr>
                    <tr>
                        <td>SGST 9%</td>
                        <td class="td-right">₹ <span style="float:right;">${sgst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td>
                    </tr>
                    <tr>
                        <td class="td-right" style="border-right: none;">Total (INR)</td>
                        <td class="td-right font-bold">₹ <span style="float:right;">${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td>
                    </tr>
                    <tr>
                        <td class="font-bold">Total amount in words: <span style="float:right; font-weight:bold;">${words}</span></td>
                        <td class="td-right"></td>
                    </tr>
                </tbody>
            </table>

            <!-- Tax HSN Table -->
            <table style="margin-top: 15px;">
                <thead>
                    <tr class="bg-orange">
                        <td rowspan="2" class="font-bold" style="width: 25%; vertical-align: middle; text-align:center;">HSN/SAC</td>
                        <td rowspan="2" class="font-bold td-center" style="width: 25%; vertical-align: middle;">TAXABLE AMOUNT</td>
                        <td colspan="2" class="font-bold td-center">INTEGRATED TAX</td>
                        <td rowspan="2" class="font-bold" style="width: 20%; vertical-align: middle; text-align:center;">Total Tax Amount</td>
                    </tr>
                    <tr class="bg-orange font-bold">
                        <td class="td-center" style="width: 15%">RATE</td>
                        <td class="td-center" style="width: 15%">AMOUNT</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>9983</td>
                        <td class="td-right">${baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td>CGST 9%</td>
                        <td class="td-right">${cgst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="td-right">₹ <span style="float:right;">${cgst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td>
                    </tr>
                    <tr>
                        <td>9983</td>
                        <td class="td-right">${baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td>SGST 9%</td>
                        <td class="td-right">${sgst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="td-right">₹ <span style="float:right;">${sgst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td>
                    </tr>
                    <tr>
                        <td></td>
                        <td class="td-right font-bold" style="border-right: none;">Total</td>
                        <td class="td-right" style="border-right: none;"></td>
                        <td class="td-right font-bold" style="border-left:none;">${baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="td-right font-bold">₹ <span style="float:right;">${(cgst + sgst).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td>
                    </tr>
                    <tr>
                        <td colspan="5">
                            <span class="font-bold">Total amount in words: <span style="float: right;">${taxWords}</span></span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div style="display:flex; justify-content: space-between; margin-top: 35px;">
                <div style="font-size: 11px; line-height: 1.6;">
                    <div style="margin-bottom: 5px;">THINK TANKER TECHNOSOFT PVT LTD BANK DETAIL:</div>
                    <div>Bank Name: ICICI Bank,</div>
                    <div>Account No: 720505000447</div>
                    <div>IFS Code: ICIC0007205</div>
                </div>
                <div style="width: 45%; font-size: 11px; line-height: 1.4;">
                    <span class="font-bold">Declaration:</span> We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.
                </div>
            </div>

            <div style="margin-top: 50px; font-style: italic; color: #333; font-size: 11px;">
                This is a computer generated invoice
            </div>
        </body>
        </html>
        `;
    };

    const handleDownloadPDF = (inv: InvoiceRecord) => {
        showToast('Preparing PDF...', 'info');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        iframe.contentWindow?.document.open();
        iframe.contentWindow?.document.write(generateInvoiceHTML(inv));
        iframe.contentWindow?.document.close();
        
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => { document.body.removeChild(iframe); }, 1000);
            showToast('PDF Document Ready', 'success');
        }, 300);
    };

    const handleCreateInvoice = () => {
        if (!formData.clientName || !formData.amount) {
            showToast('Please provide Client Name and Amount', 'error');
            return;
        }

        const newId = Math.random().toString(36).substr(2, 9);
        const nextInvNum = `INV-2026-00${invoices.length + 1}`;
        
        const newInvoice: InvoiceRecord = {
            _id: newId,
            invoiceNumber: nextInvNum,
            clientName: formData.clientName || '',
            clientGst: formData.clientGst || '',
            clientStateCode: formData.clientStateCode || '',
            clientAddress: formData.clientAddress || '',
            description: formData.description || 'Professional Services',
            issueDate: formData.issueDate as string,
            dueDate: formData.dueDate as string,
            amount: Number(formData.amount),
            status: formData.status as any,
        };

        setInvoices([newInvoice, ...invoices]);
        setIsCreateModalOpen(false);
        setFormData({
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
        showToast('Invoice Created Successfully', 'success');
    };

    const handleDelete = (id: string, status: string) => {
        if (status === 'Paid') {
            showToast('Cannot delete tracked paid invoices', 'error');
            return;
        }
        setInvoices(invoices.filter(i => i._id !== id));
        showToast('Invoice deleted', 'success');
    };

    const columns: ModuleColumnDef<InvoiceRecord>[] = [
        {
            id: 'invoice',
            header: 'Invoice',
            width: '25%',
            cell: (inv) => (
                <div style={{ minWidth: 0 }}>
                    <div className="mod-table__primary-text">{inv.invoiceNumber}</div>
                    <div className="mod-table__secondary-text truncate">{inv.clientName}</div>
                </div>
            )
        },
        {
            id: 'dates',
            header: 'Issue / Due Dates',
            width: '25%',
            cell: (inv) => (
                <div>
                    <div className="mod-table__primary-text text-[13px]">{new Date(inv.issueDate).toLocaleDateString()}</div>
                    <div className="mod-table__secondary-text">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                </div>
            )
        },
        {
            id: 'amount',
            header: 'Amount',
            width: '20%',
            cell: (inv) => (
                <div className="mod-table__primary-text text-[14px]">
                    ₹{inv.amount.toLocaleString()}
                </div>
            )
        },
        {
            id: 'status',
            header: 'Status',
            width: '15%',
            cell: (inv) => {
                let variant: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
                if (inv.status === 'Paid') variant = 'success';
                else if (inv.status === 'Unpaid') variant = 'warning';
                else if (inv.status === 'Overdue') variant = 'danger';
                return <ModuleBadge variant={variant}>{inv.status}</ModuleBadge>;
            }
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '80px',
            cell: (inv) => (
                <ModuleRowActions
                    primaryAction={{
                        label: 'Pdf',
                        icon: <Download size={14} />,
                        onClick: () => handleDownloadPDF(inv)
                    }}
                    actions={[
                        { label: 'View Details', icon: <Eye size={14} />, onClick: () => setViewingInvoice(inv) },
                        { label: 'Send Email', icon: <Mail size={14} />, onClick: () => showToast(`Sent email to ${inv.clientName}`, 'success') },
                        { label: 'Download PDF', icon: <Download size={14} />, onClick: () => handleDownloadPDF(inv) },
                        { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => showToast('Duplicated invoice', 'success') },
                        { label: 'Delete', icon: <Trash2 size={14} />, danger: true, divider: true, onClick: () => handleDelete(inv._id, inv.status) }
                    ]}
                />
            )
        }
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Commercial · Finance"
                title="Invoices & Payments"
                description="Manage billing cycles, track overdue payments, and process safe PDF exports directly from the platform."
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
                onClearAllFilters={() => { setSearch(''); setStatusFilter(''); setCurrentPage(1); }}
                totalCount={filteredInvoices.length}
                countLabel="invoices"
            >
                <select className="mod-toolbar__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Draft">Draft</option>
                </select>
            </ModuleToolbar>

            <ModuleDataTable
                rows={filteredInvoices}
                columns={columns}
                rowKey={(r) => r._id}
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
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-600 mb-4">
                            Input complete billing details. All client particulars and service descriptions will dynamically populate the final exported PDF.
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Client Name</FormLabel>
                                <SelectInput 
                                    value={formData.clientName} 
                                    onChange={(e) => {
                                        const selectedComp = companies.find((c: any) => c.name === e.target.value);
                                        setFormData(f => ({ 
                                            ...f, 
                                            clientName: e.target.value,
                                            clientGst: selectedComp?.gst || f.clientGst || '',
                                            clientStateCode: selectedComp?.address?.state || f.clientStateCode || '',
                                            clientAddress: selectedComp ? `${selectedComp.address?.street || ''}, ${selectedComp.address?.city || ''}, ${selectedComp.address?.state || ''}, ${selectedComp.address?.country || ''}`.replace(/(^[,\s]+)|([,\s]+$)/g, '').replace(/,\s*,/g, ',') : f.clientAddress || ''
                                        }));
                                    }} 
                                >
                                    <option value="">Select Company</option>
                                    {companies.map((c: any) => (
                                        <option key={c._id} value={c.name}>{c.name}</option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div>
                                <FormLabel>Client GST Number</FormLabel>
                                <TextInput 
                                    placeholder="24AAJCD..."
                                    value={formData.clientGst} 
                                    onChange={(e) => setFormData(f => ({ ...f, clientGst: e.target.value }))} 
                                />
                            </div>
                        </div>

                        <div>
                            <FormLabel>Client State / Code</FormLabel>
                            <TextInput 
                                placeholder="E.g., GJ, Code - 24"
                                value={formData.clientStateCode} 
                                onChange={(e) => setFormData(f => ({ ...f, clientStateCode: e.target.value }))} 
                            />
                        </div>

                        <div>
                            <FormLabel>Client Full Address</FormLabel>
                            <textarea 
                                className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_2px_4px_rgba(15,23,42,0.02)] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 placeholder:text-slate-400 min-h-[60px]"
                                placeholder="Full street address, city, state, pin"
                                value={formData.clientAddress} 
                                onChange={(e) => setFormData(f => ({ ...f, clientAddress: e.target.value }))} 
                            ></textarea>
                        </div>

                        <div>
                            <FormLabel>Service Description</FormLabel>
                            <TextInput 
                                placeholder="E.g., Dedicated Resources NodeJS"
                                value={formData.description} 
                                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Taxable Amount (₹)</FormLabel>
                                <TextInput 
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.amount} 
                                    onChange={(e) => setFormData(f => ({ ...f, amount: Number(e.target.value) }))} 
                                />
                                <div className="text-[10px] text-slate-400 mt-1">9% CGST & 9% SGST calculated automatically.</div>
                            </div>
                            <div>
                                <FormLabel>Status</FormLabel>
                                <SelectInput 
                                    value={formData.status} 
                                    onChange={(e) => setFormData(f => ({ ...f, status: e.target.value as any }))}
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Overdue">Overdue</option>
                                </SelectInput>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Issue Date</FormLabel>
                                <TextInput 
                                    type="date"
                                    value={formData.issueDate} 
                                    onChange={(e) => setFormData(f => ({ ...f, issueDate: e.target.value }))} 
                                />
                            </div>
                            <div>
                                <FormLabel>Due Date</FormLabel>
                                <TextInput 
                                    type="date"
                                    value={formData.dueDate} 
                                    onChange={(e) => setFormData(f => ({ ...f, dueDate: e.target.value }))} 
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                            <button className="mod-btn mod-btn--secondary" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="mod-btn mod-btn--primary" onClick={handleCreateInvoice}>
                                Complete Creation
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {viewingInvoice && (
                <Modal 
                    title={`Invoice Preview: ${viewingInvoice.invoiceNumber}`} 
                    onClose={() => setViewingInvoice(null)}
                    className="max-w-[900px]"
                >
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm h-[65vh] relative">
                        {/* A small hint covering print scaling behavior inside the preview iframe */}
                        <div className="absolute top-2 right-4 text-xs font-semibold text-slate-400 opacity-60 pointer-events-none">HTML PREVIEW</div>
                        <iframe 
                            srcDoc={generateInvoiceHTML(viewingInvoice).replace(/@page\s*{\s*size:\s*auto;\s*margin:\s*10mm;\s*}/g, 'body { margin: 0; padding: 20px; box-sizing: border-box; }')}
                            className="w-full h-full border-none bg-white" 
                            title="Invoice Preview"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
                        <button className="mod-btn mod-btn--secondary" onClick={() => setViewingInvoice(null)}>
                            Close Preview
                        </button>
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
