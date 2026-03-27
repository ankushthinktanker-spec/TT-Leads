import puppeteer, { Browser, HTTPRequest, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { IProposal } from '../models/proposal.model';
import { IProposalSection } from '../models/proposal-section.model';

interface PDFGenerationOptions {
    proposal: IProposal;
    sections: IProposalSection[];
}

interface TOCEntry {
    title: string;
    level: number;
    id: string;
}

export class PDFService {
    private static uploadsDir = path.join(__dirname, '../../uploads/proposals');
    // Dev note: Proposal content is stored as HTML in ProposalSection.content (textarea in ProposalForm),
    // and PDFs are generated server-side via Puppeteer in this service.
    private static readonly A4_HEIGHT_PX = 1122.52;
    private static readonly MARGIN_TOP_PX = 100;
    private static readonly MARGIN_BOTTOM_PX = 100;
    private static readonly MARGIN_LEFT_PX = 60;
    private static readonly MARGIN_RIGHT_PX = 60;
    private static browserPromise: Promise<Browser> | null = null;
    private static activePages = 0;
    private static readonly MAX_CONCURRENT_PAGES = Number(process.env.PDF_MAX_CONCURRENCY || 2);
    private static pageQueue: Array<() => void> = [];
    private static stripTags(value: string): string {
        return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    private static normalizeTocTitle(value: string): string {
        return value.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    private static dedupeTocEntries(entries: TOCEntry[]): TOCEntry[] {
        const lastIndexById = new Map<string, number>();
        const lastIndexByTitle = new Map<string, number>();

        entries.forEach((entry, index) => {
            const idKey = entry.id?.trim();
            const titleKey = this.normalizeTocTitle(entry.title);
            if (idKey) lastIndexById.set(idKey, index);
            if (titleKey) lastIndexByTitle.set(titleKey, index);
        });

        return entries.filter((entry, index) => {
            const idKey = entry.id?.trim();
            const titleKey = this.normalizeTocTitle(entry.title);
            if (idKey && lastIndexById.get(idKey) !== index) return false;
            if (titleKey && lastIndexByTitle.get(titleKey) !== index) return false;
            return true;
        });
    }

    private static getSectionId(section: IProposalSection, index: number): string {
        const localId = section.localId?.trim();
        if (localId) return localId;
        if (section._id) return `section-${section._id}`;
        return `section-${section.sectionOrder ?? index}`;
    }

    private static extractHeadingsFromContent(
        content: string,
        sectionId: string
    ): { content: string; entries: TOCEntry[] } {
        if (!content) return { content: '', entries: [] };
        const entries: TOCEntry[] = [];
        const htmlHeadingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
        let headingIndex = 0;

        const updatedContent = content.replace(htmlHeadingRegex, (fullMatch, levelRaw, inner) => {
            const level = Number(levelRaw);
            const attrsMatch = fullMatch.match(/<h[1-6]([^>]*)>/i);
            const attrs = attrsMatch?.[1] || '';
            const idMatch = attrs.match(/\sid=["']([^"']+)["']/i);
            const existingId = idMatch?.[1];
            const id = existingId || `${sectionId}-h${level}-${headingIndex++}`;
            const nextAttrs = existingId ? attrs : `${attrs} id="${id}"`;
            const text = this.stripTags(inner);
            if (text) {
                entries.push({ title: text, level, id });
            }
            return `<h${level}${nextAttrs}>${inner}</h${level}>`;
        });

        return { content: updatedContent, entries };
    }

    private static buildTOCEntries(proposal: IProposal, sections: IProposalSection[]): TOCEntry[] {
        const tocDepth = Math.max(1, Math.min(3, proposal.tocDepth ?? 1));
        const entries: TOCEntry[] = [];
        const tocSections = sections
            .filter((section) => section.includeInIndex && section.isVisible)
            .sort((a, b) => a.sectionOrder - b.sectionOrder);

        tocSections.forEach((section, index) => {
            const title = section.sectionTitle?.trim();
            const sectionId = this.getSectionId(section, index);
            if (title) {
                entries.push({ title, level: 1, id: sectionId });
            }
            const { entries: contentEntries } = this.extractHeadingsFromContent(section.content || '', sectionId);
            contentEntries
                .filter((entry) => entry.level <= tocDepth)
                .forEach((entry) => {
                    entries.push({
                        title: entry.title,
                        level: Math.min(entry.level + 1, 6),
                        id: entry.id
                    });
                });
        });

        return this.dedupeTocEntries(entries);
    }

    private static buildContentHTML(sections: IProposalSection[]): string {
        const visibleSections = sections
            .filter((section) => section.isVisible)
            .sort((a, b) => a.sectionOrder - b.sectionOrder);
        const contentChunks: string[] = [];

        visibleSections.forEach((section, index) => {
            const title = section.sectionTitle?.trim() || '';
            const rawContent = section.content || '';
            const contentText = this.stripTags(rawContent);
            if (!title && !contentText) {
                return;
            }
            const sectionId = this.getSectionId(section, index);
            const { content } = this.extractHeadingsFromContent(rawContent, sectionId);
            contentChunks.push(`
                <div class="section" id="${sectionId}">
                    ${title ? `<div class="section-title">${title}</div>` : ''}
                    <div class="section-content">
                        ${content}
                    </div>
                </div>
            `);
        });

        return contentChunks.join('');
    }
    private static getImageMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
        if (ext === '.webp') return 'image/webp';
        if (ext === '.png') return 'image/png';
        return 'image/png';
    }

    private static async resolveLogoDataUrl(logoUrl?: string): Promise<string | null> {
        if (!logoUrl) return null;
        let logoPath: string | null = null;

        if (logoUrl.startsWith('/uploads/')) {
            logoPath = path.resolve(__dirname, '../../', logoUrl.replace(/^\//, ''));
        } else if (logoUrl.startsWith('/api/proposals/logo/')) {
            const fileName = path.basename(logoUrl);
            logoPath = path.resolve(__dirname, '../../uploads/logos', fileName);
        } else if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
            try {
                const parsed = new URL(logoUrl);
                if (parsed.pathname.startsWith('/uploads/')) {
                    logoPath = path.resolve(__dirname, '../../', parsed.pathname.replace(/^\//, ''));
                } else if (parsed.pathname.startsWith('/api/proposals/logo/')) {
                    const fileName = path.basename(parsed.pathname);
                    logoPath = path.resolve(__dirname, '../../uploads/logos', fileName);
                }
            } catch {
                return null;
            }
        }

        if (!logoPath) {
            return null;
        }

        try {
            const fileBuffer = await fs.readFile(logoPath);
            const mimeType = this.getImageMimeType(logoPath);
            return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        } catch {
            return null;
        }
    }

    /**
     * Ensure uploads directory exists
     */
    private static async ensureUploadsDir(): Promise<void> {
        try {
            await fs.access(this.uploadsDir);
        } catch {
            await fs.mkdir(this.uploadsDir, { recursive: true });
        }
    }

    /**
     * Generate HTML for cover page
     */
    private static generateCoverPageHTML(proposal: IProposal, logoSrc: string | null): string {
        return `
            <section class="cover-page">
                ${logoSrc ? `<img src="${logoSrc}" class="cover-logo" alt="Company Logo">` : ''}
                <div class="cover-title">${proposal.title}</div>

                <div class="cover-details">
                    <div class="cover-section-title">Proposal For</div>
                    <div class="cover-row"><span class="cover-label">Company:</span> ${proposal.clientDetails.companyName}</div>
                    ${proposal.clientDetails.contactPerson ? `<div class="cover-row"><span class="cover-label">Contact Person:</span> ${proposal.clientDetails.contactPerson}</div>` : ''}
                    ${proposal.clientDetails.designation ? `<div class="cover-row"><span class="cover-label">Designation:</span> ${proposal.clientDetails.designation}</div>` : ''}
                    ${proposal.clientDetails.email ? `<div class="cover-row"><span class="cover-label">Email:</span> ${proposal.clientDetails.email}</div>` : ''}
                    ${proposal.clientDetails.phone ? `<div class="cover-row"><span class="cover-label">Phone:</span> ${proposal.clientDetails.phone}</div>` : ''}
                </div>

                <div class="cover-details">
                    <div class="cover-section-title">Prepared By</div>
                    <div class="cover-row"><span class="cover-label">Company:</span> ${proposal.preparedBy.company}</div>
                    <div class="cover-row"><span class="cover-label">Name:</span> ${proposal.preparedBy.name}</div>
                    ${proposal.preparedBy.designation ? `<div class="cover-row"><span class="cover-label">Designation:</span> ${proposal.preparedBy.designation}</div>` : ''}
                    ${proposal.preparedBy.email ? `<div class="cover-row"><span class="cover-label">Email:</span> ${proposal.preparedBy.email}</div>` : ''}
                    ${proposal.preparedBy.phone ? `<div class="cover-row"><span class="cover-label">Phone:</span> ${proposal.preparedBy.phone}</div>` : ''}
                </div>

                <div class="cover-footer">
                    <div>Proposal Number: ${proposal.proposalNumber}</div>
                    <div>Date: ${new Date(proposal.proposalDate).toLocaleDateString()}</div>
                    <div>Valid Till: ${new Date(proposal.validTill).toLocaleDateString()}</div>
                </div>
            </section>
        `;
    }

    private static async getBrowser(): Promise<Browser> {
        if (!this.browserPromise) {
            this.browserPromise = puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browserPromise;
    }

    private static async acquirePageSlot(): Promise<void> {
        if (this.activePages < this.MAX_CONCURRENT_PAGES) {
            this.activePages += 1;
            return;
        }
        await new Promise<void>((resolve) => {
            this.pageQueue.push(() => {
                this.activePages += 1;
                resolve();
            });
        });
    }

    private static releasePageSlot(): void {
        this.activePages = Math.max(0, this.activePages - 1);
        const next = this.pageQueue.shift();
        if (next) next();
    }

    /**
     * Generate HTML for table of contents
     */
    private static generateTOCHTML(proposal: IProposal, sections: IProposalSection[]): string {
        const tocEntries = this.buildTOCEntries(proposal, sections);

        if (tocEntries.length === 0) {
            return '';
        }

        // Detect if section titles already have leading numbers (e.g. "1. About the Project")
        const hasLeadingNumbers = tocEntries.length > 0 &&
            tocEntries.filter((e) => e.level === 1).every((e) => /^\d+[\.\)\-]\s/.test(e.title));

        return `
            <section class="toc-page">
                <div class="toc-title">Table of Contents</div>
                ${tocEntries.map((entry, index) => {
                    // Strip leading number from title if titles already contain numbers
                    const displayTitle = hasLeadingNumbers
                        ? entry.title.replace(/^\d+[\.\)\-]\s*/, '')
                        : entry.title;
                    return `
                    <div class="toc-item" style="padding-left: ${(entry.level - 1) * 20}px;">
                        <span class="toc-number">${index + 1}.</span>
                        <a class="toc-link" href="#${entry.id}">
                            <span class="toc-title-text">${displayTitle}</span>
                        </a>
                        <span class="toc-dots"></span>
                        <span class="toc-page-number" data-toc-target="${entry.id}">-</span>
                    </div>
                `;
                }).join('')}
            </section>
        `;
    }

    /**
     * Generate HTML for content sections
     */
    private static generateContentHTML(_proposal: IProposal, sections: IProposalSection[]): string {
        const contentMarkup = this.buildContentHTML(sections);
        if (!contentMarkup) return '';

        return `
            <section class="content-page">
                ${contentMarkup}
            </section>
        `;
    }

    private static buildProposalHTML(proposal: IProposal, sections: IProposalSection[], logoSrc: string | null): string {
        const coverHTML = this.generateCoverPageHTML(proposal, logoSrc);
        const tocHTML = this.generateTOCHTML(proposal, sections);
        const contentHTML = this.generateContentHTML(proposal, sections);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    html, body {
                        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
                        margin: 0;
                        color: #1f2937;
                        line-height: 1.6;
                        background: #ffffff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @page {
                        size: A4;
                        margin: ${this.MARGIN_TOP_PX}px ${this.MARGIN_RIGHT_PX}px ${this.MARGIN_BOTTOM_PX}px ${this.MARGIN_LEFT_PX}px;
                    }
                    .cover-page {
                        break-after: page;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        text-align: center;
                        padding: 60px 40px 80px;
                        background: #ffffff;
                        color: #111827;
                        min-height: calc(${this.A4_HEIGHT_PX}px - ${this.MARGIN_TOP_PX}px - ${this.MARGIN_BOTTOM_PX}px);
                    }
                    .cover-logo {
                        max-width: 200px;
                        max-height: 80px;
                        margin-bottom: 32px;
                    }
                    .cover-title {
                        font-size: 38px;
                        font-weight: 700;
                        margin-bottom: 36px;
                    }
                    .cover-details {
                        padding: 20px;
                        border-radius: 10px;
                        margin: 14px 0;
                        border: 1px solid #e5e7eb;
                        width: 100%;
                        max-width: 520px;
                    }
                    .cover-section-title {
                        font-size: 16px;
                        font-weight: 700;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #e5e7eb;
                        padding-bottom: 8px;
                    }
                    .cover-row {
                        margin: 8px 0;
                        font-size: 13px;
                    }
                    .cover-label {
                        font-weight: 600;
                        opacity: 0.9;
                    }
                    .cover-footer {
                        margin-top: 24px;
                        font-size: 12px;
                        opacity: 0.85;
                    }
                    .toc-page {
                        padding: 0;
                        break-after: page;
                    }
                    .toc-title {
                        font-size: 26px;
                        font-weight: 700;
                        margin-bottom: 24px;
                        color: #111827;
                        border-bottom: 2px solid #e5e7eb;
                        padding-bottom: 10px;
                    }
                    .toc-item {
                        display: flex;
                        flex-wrap: nowrap;
                        align-items: baseline;
                        gap: 6px;
                        padding: 7px 0;
                        border-bottom: none;
                        font-size: 14px;
                        line-height: 1.4;
                        overflow: hidden;
                    }
                    .toc-number {
                        flex: 0 0 auto;
                        font-weight: 600;
                        color: #111827;
                        min-width: 28px;
                    }
                    .toc-title-text {
                        flex: 0 0 auto;
                        max-width: 70%;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .toc-dots {
                        flex: 1 1 auto;
                        min-width: 20px;
                        border-bottom: 1px dotted #9ca3af;
                        margin: 0 4px;
                        transform: translateY(-3px);
                        height: 0;
                    }
                    .toc-page-number {
                        flex: 0 0 auto;
                        font-weight: 600;
                        color: #666;
                        min-width: 20px;
                        text-align: right;
                        white-space: nowrap;
                    }
                    .toc-link {
                        text-decoration: none;
                        color: inherit;
                        flex: 0 1 auto;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                    }
                    .section {
                        margin-bottom: 16px;
                        page-break-after: auto;
                        break-inside: auto;
                        page-break-inside: auto;
                    }
                    .section-title {
                        font-size: 22px;
                        font-weight: 700;
                        color: #111827;
                        margin: 0 0 10px 0;
                        border-bottom: 1px solid #e5e7eb;
                        padding-bottom: 8px;
                        break-after: avoid;
                    }
                    .section-content {
                        font-size: 14px;
                        color: #1f2937;
                    }
                    .section-content h1 { font-size: 20px; margin: 18px 0 8px; break-after: avoid; }
                    .section-content h2 { font-size: 18px; margin: 16px 0 8px; break-after: avoid; }
                    .section-content h3 { font-size: 16px; margin: 14px 0 6px; break-after: avoid; }
                    .section-content p { margin: 10px 0; }
                    .section-content ul, .section-content ol { margin: 10px 0; padding-left: 30px; }
                    .section-content li { margin: 5px 0; }
                    .section-content ul.dash-list {
                        list-style: none;
                        padding-left: 20px;
                    }
                    .section-content ul.dash-list li::before {
                        content: "- ";
                        margin-left: -14px;
                        color: #111827;
                    }
                    .section-content table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 16px 0;
                        break-inside: auto;
                        font-size: 13px;
                    }
                    .section-content table th,
                    .section-content table td {
                        border: 1px solid #e5e7eb;
                        padding: 8px 10px;
                        text-align: left;
                    }
                    .section-content table th {
                        background-color: #f3f4f6;
                        color: #111827;
                        font-weight: 600;
                    }
                    .section-content table tr:nth-child(even) {
                        background-color: #f9fafb;
                    }
                    .section-content thead {
                        display: table-header-group;
                    }
                    .section-content tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .section-content img {
                        max-width: 100%;
                        height: auto;
                    }
                    .section-content blockquote {
                        border-left: 3px solid #d1d5db;
                        padding-left: 16px;
                        margin: 12px 0;
                        color: #4b5563;
                        font-style: italic;
                    }
                    .section-content pre {
                        background: #f3f4f6;
                        padding: 12px;
                        border-radius: 6px;
                        overflow-x: auto;
                        font-size: 12px;
                        margin: 12px 0;
                    }
                    .section-content code {
                        background: #f3f4f6;
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-size: 12px;
                    }
                    .section-content pre code {
                        background: none;
                        padding: 0;
                    }
                </style>
            </head>
            <body>
                ${coverHTML}
                ${tocHTML}
                ${contentHTML}
            </body>
            </html>
        `;
    }

    /**
     * Generate header/footer HTML
     */
    private static normalizeWebsite(value?: string): { href: string; label: string } | null {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        const urlPattern = /^(https?:\/\/)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
        if (!urlPattern.test(trimmed)) return null;
        const href = trimmed.startsWith('http://') || trimmed.startsWith('https://')
            ? trimmed
            : `https://${trimmed}`;
        return { href, label: trimmed };
    }

    private static generateHeaderFooterHTML(proposal: IProposal, logoSrc: string | null): { headerHTML: string; footerHTML: string } {
        const showPageNumbers = true;
        const footerWebsite = this.normalizeWebsite(proposal.footerLine2);
        // Puppeteer header/footer templates require explicit font-size on the root element,
        // otherwise all text renders at ~0px and is invisible.
        // Using "pageNumber == 1" CSS trick to hide header/footer on cover page.
        const headerHTML = `
            <div style="width: 100%; padding: 10px 60px; font-size: 12px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                <style>
                    .header-inner { display: flex; justify-content: space-between; align-items: center; width: 100%; }
                </style>
                <div class="header-inner">
                    ${logoSrc ? `<img src="${logoSrc}" style="max-height: 30px;">` : `<span style="font-weight: 600; color: #667eea;">${proposal.preparedBy.company}</span>`}
                    ${proposal.headerText ? `<span style="font-size: 12px; color: #666;">${proposal.headerText}</span>` : ''}
                </div>
            </div>
        `;

        const footerHTML = `
            <div style="width: 100%; padding: 10px 60px; border-top: 1px solid #ddd; font-size: 10px; color: #666;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        ${proposal.footerLine1 ? `<div>${proposal.footerLine1}</div>` : ''}
                        ${footerWebsite
                            ? `<div><a href="${footerWebsite.href}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${footerWebsite.label}</a></div>`
                            : proposal.footerLine2
                                ? `<div>${proposal.footerLine2}</div>`
                                : ''}
                    </div>
                    ${showPageNumbers ? `<div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>` : ''}
                </div>
            </div>
        `;

        return { headerHTML, footerHTML };
    }

    /**
     * Generate PDF from proposal
     */
    static async generateProposalPDF(options: PDFGenerationOptions): Promise<string> {
        const { proposal, sections } = options;

        await this.ensureUploadsDir();

        await this.acquirePageSlot();
        let page: Page | null = null;

        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();
            page.setDefaultNavigationTimeout(60000);
            await page.setRequestInterception(true);
            page.on('request', (request: HTTPRequest) => {
                const url = request.url();
                if (url.startsWith('data:') || url.startsWith('file:') || url === 'about:blank') {
                    request.continue();
                    return;
                }
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    request.abort();
                    return;
                }
                request.continue();
            });
            const logoSrc = await this.resolveLogoDataUrl(proposal.logoUrl);
            const { headerHTML, footerHTML } = this.generateHeaderFooterHTML(proposal, logoSrc);

            const documentHTML = this.buildProposalHTML(proposal, sections, logoSrc);
            await page.setContent(documentHTML, { waitUntil: 'networkidle0', timeout: 60000 });
            await page.evaluate(async () => {
                const doc = (globalThis as {
                    document?: {
                        images?: Array<{
                            complete?: boolean;
                            addEventListener?: (event: string, cb: () => void) => void;
                        }>;
                    };
                }).document;
                if (!doc) return;
                const images = Array.from(doc.images || []);
                await Promise.all(images.map((img) => {
                    if (img.complete) return Promise.resolve();
                    return new Promise<void>((resolve) => {
                        img.addEventListener?.('load', resolve);
                        img.addEventListener?.('error', resolve);
                    });
                }));
            });
            await page.evaluate(
                ({ pageHeight, marginTop, marginBottom }: { pageHeight: number; marginTop: number; marginBottom: number }) => {
                    const doc = (globalThis as {
                        document?: {
                            querySelectorAll?: (selector: string) => Array<{ dataset?: { tocTarget?: string }; textContent?: string }>;
                            getElementById?: (id: string) => { getBoundingClientRect?: () => { top: number } } | null;
                        };
                        window?: { scrollY?: number };
                    }).document;
                    const win = (globalThis as { window?: { scrollY?: number } }).window;
                    if (!doc || !win) return;
                    const contentHeight = pageHeight - marginTop - marginBottom;
                    const tocTargets = Array.from(doc.querySelectorAll?.('[data-toc-target]') || []);
                    tocTargets.forEach((node) => {
                        const targetId = node?.dataset?.tocTarget;
                        if (!targetId) return;
                        const target = doc.getElementById?.(targetId);
                        if (!target) return;
                        const rect = target.getBoundingClientRect?.();
                        if (!rect) return;
                        const offsetTop = rect.top + (win.scrollY || 0);
                        const pageNumber = Math.floor((offsetTop - marginTop) / contentHeight) + 1;
                        node.textContent = String(pageNumber);
                    });
                },
                {
                    pageHeight: this.A4_HEIGHT_PX,
                    marginTop: this.MARGIN_TOP_PX,
                    marginBottom: this.MARGIN_BOTTOM_PX
                }
            );

            const contentPDF = await page.pdf({
                format: 'A4',
                displayHeaderFooter: true,
                headerTemplate: headerHTML,
                footerTemplate: footerHTML,
                margin: {
                    top: `${this.MARGIN_TOP_PX}px`,
                    bottom: `${this.MARGIN_BOTTOM_PX}px`,
                    left: `${this.MARGIN_LEFT_PX}px`,
                    right: `${this.MARGIN_RIGHT_PX}px`
                },
                printBackground: true
            });

            const fileName = `proposal-${proposal.proposalNumber}-${Date.now()}.pdf`;
            const filePath = path.join(this.uploadsDir, fileName);

            await fs.writeFile(filePath, contentPDF);

            return `/uploads/proposals/${fileName}`;
        } catch (error) {
            if (page) {
                try {
                    await page.close();
                } catch {
                    // ignore
                }
            }
            throw error;
        } finally {
            if (page && !page.isClosed()) {
                await page.close();
            }
            this.releasePageSlot();
        }
    }
}
