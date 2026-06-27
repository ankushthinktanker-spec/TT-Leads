export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue' | 'Draft';

export interface InvoiceRecord {
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
    status: InvoiceStatus;
}

export interface InvoicePartyProfile {
    legalName: string;
    gst: string;
    stateCode: string;
    addressLines: string[];
}

export interface InvoiceTaxRule {
    code: string;
    label: string;
    rate: number;
}

export interface InvoiceTemplateConfig {
    brand: {
        logoMark: string;
        logoName: string;
        legalSuffix: string;
        sublabel: string;
        accentColor: string;
        accentTextColor: string;
        heading: string;
    };
    issuer: InvoicePartyProfile;
    bank: {
        title: string;
        bankName: string;
        accountNumber: string;
        ifsc: string;
    };
    labels: {
        billTo: string;
        billFrom: string;
        description: string;
        amount: string;
        subtotal: string;
        total: string;
        taxableAmount: string;
        totalTaxAmount: string;
        declarationTitle: string;
        declarationText: string;
        generatedNote: string;
        copyHint: string;
    };
    taxes: InvoiceTaxRule[];
    preview: {
        pageMarginMm: number;
        baseFont: string;
    };
}

export const defaultClientProfile = {
    clientGst: '24AAJCD9626P1ZZ',
    clientStateCode: 'GJ, Code - 24',
    clientAddress: '7TH FLOOR, 706, 31 Five, Corporate Road, NR MATRIX, CORPORATE ROAD, Ahmedabad, Gujarat, 380015',
};

export const defaultInvoiceTemplateConfig: InvoiceTemplateConfig = {
    brand: {
        logoMark: 'T',
        logoName: 'THINKTANKER',
        legalSuffix: 'R',
        sublabel: 'TECHNOSOFT PVT. LTD.',
        accentColor: '#ffbc00',
        accentTextColor: '#1f2937',
        heading: 'INVOICE',
    },
    issuer: {
        legalName: 'THINK TANKER TECHNOSOFT PRIVATE LIMITED',
        gst: '24AAJCT7282R1ZF',
        stateCode: 'GJ, Code - 24',
        addressLines: [
            '508, Avadh Pride, Metro Pillar No 140, Near Nirant Cross Road',
            'Vastral Road, Vastral, Ahmedabad, Gujarat - 382418, India',
        ],
    },
    bank: {
        title: 'THINK TANKER TECHNOSOFT PVT LTD BANK DETAIL:',
        bankName: 'ICICI Bank',
        accountNumber: '720505000447',
        ifsc: 'ICIC0007205',
    },
    labels: {
        billTo: 'BILL TO',
        billFrom: 'BILL FROM',
        description: 'DESCRIPTION',
        amount: 'AMOUNT',
        subtotal: 'Sub Total',
        total: 'Total (INR)',
        taxableAmount: 'TAXABLE AMOUNT',
        totalTaxAmount: 'Total Tax Amount',
        declarationTitle: 'Declaration:',
        declarationText: 'We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.',
        generatedNote: 'This is a computer generated invoice.',
        copyHint: 'All labels, issuer details, tax blocks, and footer copy can be edited in invoiceTemplate.ts.',
    },
    taxes: [
        { code: '9983', label: 'CGST', rate: 0.09 },
        { code: '9983', label: 'SGST', rate: 0.09 },
    ],
    preview: {
        pageMarginMm: 10,
        baseFont: 'Arial, sans-serif',
    },
};

const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (value: number) => `\u20B9${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero Only';

    const chunk = (`000000000${num}`).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!chunk) return '';

    const readPair = (pair: string) => ones[Number(pair)] || `${tens[Number(pair[0])]} ${ones[Number(pair[1])]}`.trim();

    let words = '';
    words += chunk[1] !== '00' ? `${readPair(chunk[1])} Crore ` : '';
    words += chunk[2] !== '00' ? `${readPair(chunk[2])} Lakh ` : '';
    words += chunk[3] !== '00' ? `${readPair(chunk[3])} Thousand ` : '';
    words += chunk[4] !== '0' ? `${ones[Number(chunk[4])]} Hundred ` : '';
    words += chunk[5] !== '00' ? `${words ? 'And ' : ''}${readPair(chunk[5])}` : '';

    return `${words.trim()} Only`;
};

export const getInvoiceTotals = (invoice: InvoiceRecord, config: InvoiceTemplateConfig) => {
    const taxable = invoice.amount;
    const taxRows = config.taxes.map((tax) => ({
        ...tax,
        amount: taxable * tax.rate,
    }));
    const totalTax = taxRows.reduce((sum, tax) => sum + tax.amount, 0);
    const grandTotal = taxable + totalTax;

    return {
        taxable,
        taxRows,
        totalTax,
        grandTotal,
        grandTotalWords: `Rupees ${numberToWords(Math.round(grandTotal))}`,
        totalTaxWords: `Rupees ${numberToWords(Math.round(totalTax))}`,
    };
};

export const buildInvoiceHtml = (invoice: InvoiceRecord, config: InvoiceTemplateConfig) => {
    const totals = getInvoiceTotals(invoice, config);
    const issueDate = new Date(invoice.issueDate).toLocaleDateString('en-IN');
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');
    const serviceMonth = new Date(invoice.issueDate).toLocaleString('default', { month: 'short' });
    const serviceYearShort = new Date(invoice.issueDate).getFullYear().toString().slice(2);
    const clientAddressHtml = escapeHtml(invoice.clientAddress).replace(/,/g, ',<br/>');
    const accent = config.brand.accentColor;
    const accentText = config.brand.accentTextColor;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
<style>
@page { size: auto; margin: ${config.preview.pageMarginMm}mm; }
body { font-family: ${config.preview.baseFont}; padding: 20px; color: #111827; font-size: 11px; margin: 0; }
* { box-sizing: border-box; }
table { width: 100%; border-collapse: collapse; border: 1px solid #111827; }
th, td { border: 1px solid #111827; padding: 6px 8px; vertical-align: top; }
.heading-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.brand-row { display: flex; align-items: flex-end; gap: 6px; }
.logo-mark { background: ${accent}; color: ${accentText}; padding: 0 6px; font-size: 22px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.logo-name { font-size: 26px; font-weight: 700; color: ${accent}; letter-spacing: -0.5px; }
.logo-sub { font-size: 11px; margin-left: 32px; }
.invoice-title { font-size: 34px; font-weight: 700; color: ${accent}; letter-spacing: 1px; }
.bill-grid { display: flex; justify-content: space-between; gap: 40px; margin: 30px 0; }
.bill-box { width: 48%; }
.bill-title { border: 1px solid #111827; padding: 4px 8px; font-weight: 700; background: ${accent}; color: ${accentText}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.info-line { margin-bottom: 4px; line-height: 1.45; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.bold { font-weight: 700; }
.note-row { margin-top: 32px; display: flex; justify-content: space-between; gap: 40px; }
.muted { color: #6b7280; }
</style>
</head>
<body>
<div class="heading-row">
  <div>
    <div class="brand-row">
      <span class="logo-mark">${escapeHtml(config.brand.logoMark)}</span>
      <div class="logo-name">${escapeHtml(config.brand.logoName)}<sup style="font-size:12px;">${escapeHtml(config.brand.legalSuffix)}</sup></div>
    </div>
    <div class="logo-sub">${escapeHtml(config.brand.sublabel)}</div>
  </div>
  <div class="invoice-title">${escapeHtml(config.brand.heading)}</div>
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; font-weight:700; width:55%; font-size:12px;">
  <div>Invoice No: ${escapeHtml(invoice.invoiceNumber)}</div>
  <div>Invoice Date: ${issueDate}</div>
</div>
<div class="bill-grid">
  <div class="bill-box">
    <div class="bill-title">${escapeHtml(config.labels.billTo)}</div>
    <div class="info-line bold" style="font-size:12px; margin-top:15px;">${escapeHtml(invoice.clientName)}</div>
    <div class="info-line">GST No: <span style="font-family:monospace;">${escapeHtml(invoice.clientGst || 'N/A')}</span></div>
    <div class="info-line">State Name: ${escapeHtml(invoice.clientStateCode || 'N/A')}</div>
    <div class="info-line" style="margin-top:6px;">${clientAddressHtml}</div>
  </div>
  <div class="bill-box">
    <div class="bill-title">${escapeHtml(config.labels.billFrom)}</div>
    <div class="info-line bold" style="font-size:12px; margin-top:15px;">${escapeHtml(config.issuer.legalName)}</div>
    <div class="info-line">GST No: <span style="font-family:monospace;">${escapeHtml(config.issuer.gst)}</span></div>
    <div class="info-line">State Name: ${escapeHtml(config.issuer.stateCode)}</div>
    <div class="info-line" style="margin-top:6px;">${config.issuer.addressLines.map((line) => escapeHtml(line)).join('<br/>')}</div>
  </div>
</div>
<table style="table-layout:fixed;">
  <thead>
    <tr>
      <th style="width:85%; text-align:left; background:${accent}; color:${accentText};">${escapeHtml(config.labels.description)}</th>
      <th style="width:15%; text-align:right; background:${accent}; color:${accentText};">${escapeHtml(config.labels.amount)}</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="bold">${escapeHtml(invoice.description || 'Professional Services')} - ${escapeHtml(serviceMonth)}${escapeHtml(serviceYearShort)}</td>
      <td class="text-right">${formatCurrency(totals.taxable)}</td>
    </tr>
    <tr>
      <td>Service window: ${issueDate} to ${dueDate}</td>
      <td></td>
    </tr>
    <tr>
      <td>${escapeHtml(config.labels.subtotal)}</td>
      <td class="text-right">${formatCurrency(totals.taxable)}</td>
    </tr>
    ${totals.taxRows.map((tax) => `<tr><td>${escapeHtml(tax.label)} ${Math.round(tax.rate * 100)}%</td><td class="text-right">${formatCurrency(tax.amount)}</td></tr>`).join('')}
    <tr>
      <td class="bold">${escapeHtml(config.labels.total)}</td>
      <td class="text-right bold">${formatCurrency(totals.grandTotal)}</td>
    </tr>
    <tr>
      <td class="bold">Total amount in words: <span style="float:right;">${escapeHtml(totals.grandTotalWords)}</span></td>
      <td></td>
    </tr>
  </tbody>
</table>
<table style="margin-top:16px;">
  <thead>
    <tr>
      <th style="background:${accent}; color:${accentText};">HSN/SAC</th>
      <th style="background:${accent}; color:${accentText};">${escapeHtml(config.labels.taxableAmount)}</th>
      <th style="background:${accent}; color:${accentText};">Tax Label</th>
      <th style="background:${accent}; color:${accentText};">Rate</th>
      <th style="background:${accent}; color:${accentText};">${escapeHtml(config.labels.totalTaxAmount)}</th>
    </tr>
  </thead>
  <tbody>
    ${totals.taxRows.map((tax) => `<tr><td>${escapeHtml(tax.code)}</td><td class="text-right">${formatCurrency(totals.taxable)}</td><td>${escapeHtml(tax.label)}</td><td class="text-center">${Math.round(tax.rate * 100)}%</td><td class="text-right">${formatCurrency(tax.amount)}</td></tr>`).join('')}
    <tr>
      <td></td>
      <td class="text-right bold">${formatCurrency(totals.taxable)}</td>
      <td></td>
      <td></td>
      <td class="text-right bold">${formatCurrency(totals.totalTax)}</td>
    </tr>
    <tr>
      <td colspan="5"><span class="bold">Total tax amount in words: <span style="float:right;">${escapeHtml(totals.totalTaxWords)}</span></span></td>
    </tr>
  </tbody>
</table>
<div class="note-row">
  <div style="font-size:11px; line-height:1.6;">
    <div style="margin-bottom:5px;">${escapeHtml(config.bank.title)}</div>
    <div>Bank Name: ${escapeHtml(config.bank.bankName)}</div>
    <div>Account No: ${escapeHtml(config.bank.accountNumber)}</div>
    <div>IFSC Code: ${escapeHtml(config.bank.ifsc)}</div>
  </div>
  <div style="width:45%; font-size:11px; line-height:1.5;">
    <span class="bold">${escapeHtml(config.labels.declarationTitle)}</span> ${escapeHtml(config.labels.declarationText)}
  </div>
</div>
<div style="margin-top:26px; font-size:10px;" class="muted">${escapeHtml(config.labels.generatedNote)}</div>
</body>
</html>`;
};

export const buildInvoicePreviewHtml = (invoice: InvoiceRecord, config: InvoiceTemplateConfig) =>
    buildInvoiceHtml(invoice, config).replace(/@page\s*\{[^}]+\}/, 'body { margin: 0; padding: 20px; box-sizing: border-box; }');
