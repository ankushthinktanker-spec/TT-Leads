const escapeCsvValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const toCsv = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const headerLine = headers.map(escapeCsvValue).join(',');
    const lines = rows.map((row) => headers.map((key) => escapeCsvValue(row[key])).join(','));
    return [headerLine, ...lines].join('\n');
};

export const toExcelXml = (rows: Record<string, unknown>[], sheetName = 'Report') => {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const rowXml = (cells: unknown[]) =>
        `<Row>${cells
            .map(
                (cell) =>
                    `<Cell><Data ss:Type="String">${String(cell ?? '').replace(/&/g, '&amp;')}</Data></Cell>`
            )
            .join('')}</Row>`;

    const bodyRows = [
        rowXml(headers),
        ...rows.map((row) => rowXml(headers.map((h) => row[h])))
    ].join('');

    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${sheetName}">
  <Table>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
};

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const toPdfBuffer = async (rows: Record<string, unknown>[], title = 'Report'): Promise<Buffer> => {
    const puppeteer = (await import('puppeteer')).default;
    const headers = rows.length ? Object.keys(rows[0]) : [];

    const headerCells = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
    const bodyRows = rows.map((row) => (
        `<tr>${headers.map((key) => `<td>${escapeHtml(row[key])}</td>`).join('')}</tr>`
    )).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <style>
                html, body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
                h1 { font-size: 18px; margin: 0 0 16px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
                th { background: #f3f4f6; font-weight: 600; }
                tr:nth-child(even) td { background: #fafafa; }
                .empty { color: #6b7280; font-size: 12px; }
                @page { size: A4; margin: 24px; }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(title)}</h1>
            ${rows.length === 0
                ? `<div class="empty">No data available</div>`
                : `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`}
        </body>
        </html>
    `;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
    await page.close();
    await browser.close();
    return Buffer.from(buffer);
};
