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
