import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProposalById, generateProposalPDF, clearCurrentProposal } from '../../store/slices/proposalSlice';
import PageLayout from '../../components/ui/PageLayout';
import Button from '../../components/ui/Button';
import api from '../../api/axios';
import WorkspaceSection from '../../components/ui/WorkspaceSection';
import Badge from '../../components/ui/Badge';

type PreviewMode = 'html' | 'pdf';

interface PreviewSection {
    id: string;
    title: string;
    content: string;
    order: number;
    isVisible: boolean;
    includeInTOC: boolean;
}

interface PreviewBlock {
    key: string;
    type: 'title' | 'content';
    html?: string;
    text?: string;
    id?: string;
}

interface TocEntry {
    title: string;
    level: number;
    id: string;
}

const PAGE_HEIGHT = 1123;
const MARGIN_TOP = 100;
const MARGIN_BOTTOM = 100;

const stripTags = (value: string) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const normalizeTocTitle = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const extractHeadingsFromContent = (content: string, sectionId: string): TocEntry[] => {
    if (!content) return [];
    const entries: TocEntry[] = [];
    const htmlHeadingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;
    let headingIndex = 0;

    while ((match = htmlHeadingRegex.exec(content)) !== null) {
        const level = Number(match[1]);
        const attrsMatch = match[0].match(/<h[1-6]([^>]*)>/i);
        const attrs = attrsMatch?.[1] || '';
        const idMatch = attrs.match(/\sid=["']([^"']+)["']/i);
        const id = idMatch?.[1] || `${sectionId}-h${level}-${headingIndex++}`;
        const text = stripTags(match[2]);
        if (text) {
            entries.push({ title: text, level, id });
        }
    }

    return entries;
};

const ensureHeadingIds = (content: string, sectionId: string) => {
    if (!content) return content;
    const htmlHeadingRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
    let headingIndex = 0;

    return content.replace(htmlHeadingRegex, (fullMatch, level, attrs, inner) => {
        const idMatch = attrs.match(/\sid=["']([^"']+)["']/i);
        if (idMatch?.[1]) {
            return fullMatch;
        }
        const id = `${sectionId}-h${level}-${headingIndex++}`;
        return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
    });
};

const dedupeTocEntries = (entries: TocEntry[]): TocEntry[] => {
    const lastIndexById = new Map<string, number>();
    const lastIndexByTitle = new Map<string, number>();

    entries.forEach((entry, index) => {
        const idKey = entry.id?.trim();
        const titleKey = normalizeTocTitle(entry.title);
        if (idKey) lastIndexById.set(idKey, index);
        if (titleKey) lastIndexByTitle.set(titleKey, index);
    });

    return entries.filter((entry, index) => {
        const idKey = entry.id?.trim();
        const titleKey = normalizeTocTitle(entry.title);
        if (idKey && lastIndexById.get(idKey) !== index) return false;
        if (titleKey && lastIndexByTitle.get(titleKey) !== index) return false;
        return true;
    });
};

const buildTocEntries = (sections: PreviewSection[], tocDepth: number): TocEntry[] => {
    const entries: TocEntry[] = [];
    sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((section) => section.isVisible && section.includeInTOC)
        .forEach((section) => {
            const title = section.title?.trim();
            if (title) {
                entries.push({ title, level: 1, id: section.id });
            }
            const contentHeadings = extractHeadingsFromContent(section.content || '', section.id);
            contentHeadings
                .filter((heading) => heading.level <= tocDepth)
                .forEach((heading) => {
                    entries.push({
                        title: heading.title,
                        level: Math.min(heading.level + 1, 6),
                        id: heading.id
                    });
                });
        });
    return dedupeTocEntries(entries);
};

const splitContentBlocks = (content: string): string[] => {
    if (!content || typeof document === 'undefined') return [];
    const wrapper = document.createElement('div');
    wrapper.innerHTML = content;
    const nodes = Array.from(wrapper.childNodes);

    return nodes
        .map((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                return text ? `<p>${text}</p>` : '';
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
                return (node as HTMLElement).outerHTML;
            }
            return '';
        })
        .filter(Boolean);
};

const ProposalPreviewPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentProposal } = useAppSelector((state) => state.proposals);
    const [mode, setMode] = useState<PreviewMode>('html');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const pdfObjectUrlRef = useRef<string | null>(null);
    const logoObjectUrlRef = useRef<string | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>('');
    const [pages, setPages] = useState<number[][]>([]);
    const [paginationTick, setPaginationTick] = useState(0);
    const measureRef = useRef<HTMLDivElement | null>(null);

    const generatePreview = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            await dispatch(generateProposalPDF(id)).unwrap();
            const response = await api.get(`/proposals/${id}/pdf`, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(response.data);
            if (pdfObjectUrlRef.current) {
                URL.revokeObjectURL(pdfObjectUrlRef.current);
            }
            pdfObjectUrlRef.current = blobUrl;
            setPdfUrl(blobUrl);
        } finally {
            setLoading(false);
        }
    }, [dispatch, id]);

    useEffect(() => {
        if (id) {
            dispatch(fetchProposalById(id));
        }
        return () => {
            dispatch(clearCurrentProposal());
        };
    }, [dispatch, id]);

    useEffect(() => {
        if (mode === 'pdf') {
            generatePreview();
        }
        return () => {
            if (pdfObjectUrlRef.current) {
                URL.revokeObjectURL(pdfObjectUrlRef.current);
                pdfObjectUrlRef.current = null;
            }
        };
    }, [mode, generatePreview]);

    useEffect(() => {
        const fetchLogo = async () => {
            const logoUrl = currentProposal?.logoUrl;
            if (!logoUrl) {
                setLogoPreviewUrl('');
                return;
            }
            if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
                setLogoPreviewUrl(logoUrl);
                return;
            }
            if (logoUrl.startsWith('/uploads/logos/')) {
                const fileName = logoUrl.split('/').pop();
                if (!fileName) {
                    setLogoPreviewUrl('');
                    return;
                }
                try {
                    const response = await api.get(`/proposals/logo/${fileName}`, { responseType: 'blob' });
                    const objectUrl = URL.createObjectURL(response.data);
                    if (logoObjectUrlRef.current) {
                        URL.revokeObjectURL(logoObjectUrlRef.current);
                    }
                    logoObjectUrlRef.current = objectUrl;
                    setLogoPreviewUrl(objectUrl);
                } catch {
                    setLogoPreviewUrl('');
                }
                return;
            }
            setLogoPreviewUrl(logoUrl);
        };
        fetchLogo();
        return () => {
            if (logoObjectUrlRef.current) {
                URL.revokeObjectURL(logoObjectUrlRef.current);
                logoObjectUrlRef.current = null;
            }
        };
    }, [currentProposal?.logoUrl]);

    const sections = useMemo<PreviewSection[]>(() => {
        if (!currentProposal?.sections) return [];
        return currentProposal.sections.map((section, index) => ({
            id: section.localId
                || (section._id ? `section-${section._id}` : `section-${section.order ?? section.sectionOrder ?? index}`),
            title: section.title || section.sectionTitle || `Section ${index + 1}`,
            content: section.content || '',
            order: section.order ?? section.sectionOrder ?? index,
            isVisible: section.isVisible !== false,
            includeInTOC: section.includeInTOC !== false
        }));
    }, [currentProposal]);

    const tocEntries = useMemo(() => {
        const tocDepth = currentProposal?.tocDepth || 1;
        return buildTocEntries(sections, tocDepth);
    }, [sections, currentProposal?.tocDepth]);

    const blocks = useMemo<PreviewBlock[]>(() => {
        const items: PreviewBlock[] = [];
        sections
            .slice()
            .sort((a, b) => a.order - b.order)
            .filter((section) => section.isVisible)
            .forEach((section) => {
                items.push({
                    key: `${section.id}-title`,
                    type: 'title',
                    text: section.title,
                    id: section.id
                });
                const normalizedContent = ensureHeadingIds(section.content, section.id);
                const contentBlocks = splitContentBlocks(normalizedContent);
                contentBlocks.forEach((html, idx) => {
                    items.push({
                        key: `${section.id}-content-${idx}`,
                        type: 'content',
                        html
                    });
                });
            });
        return items;
    }, [sections]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setPaginationTick((tick) => tick + 1);
        }, 500);
        return () => window.clearTimeout(handle);
    }, [blocks]);

    useLayoutEffect(() => {
        if (!measureRef.current || blocks.length === 0) {
            setPages([]);
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            const contentHeight = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
            const nodes = Array.from(measureRef.current?.querySelectorAll('[data-block-key]') || []);
            const heights = nodes.map((node) => node.getBoundingClientRect().height);
            const nextPages: number[][] = [];
            let currentPage: number[] = [];
            let currentHeight = 0;

            heights.forEach((height, index) => {
                if (currentHeight + height > contentHeight && currentPage.length > 0) {
                    nextPages.push(currentPage);
                    currentPage = [];
                    currentHeight = 0;
                }
                currentPage.push(index);
                currentHeight += height;
                if (height > contentHeight) {
                    nextPages.push(currentPage);
                    currentPage = [];
                    currentHeight = 0;
                }
            });

            if (currentPage.length > 0) {
                nextPages.push(currentPage);
            }

            setPages(nextPages);
        });

        return () => window.cancelAnimationFrame(frame);
    }, [blocks, paginationTick]);

    const headingPageMap = useMemo(() => {
        const map = new Map<string, number>();
        pages.forEach((pageBlocks, pageIndex) => {
            const pageNumber = pageIndex + 3;
            pageBlocks.forEach((blockIndex) => {
                const block = blocks[blockIndex];
                if (!block) return;
                if (block.type === 'title' && block.id) {
                    map.set(block.id, pageNumber);
                }
                if (block.type === 'content' && block.html) {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = block.html;
                    const headings = Array.from(wrapper.querySelectorAll('h1,h2,h3,h4,h5,h6'));
                    headings.forEach((heading) => {
                        const id = heading.getAttribute('id');
                        if (id && !map.has(id)) {
                            map.set(id, pageNumber);
                        }
                    });
                }
            });
        });
        return map;
    }, [blocks, pages]);

    return (
        <>
            <PageLayout className="flex min-h-full flex-col space-y-5 pb-20">
                <div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/proposals')}
                    >
                        Back to Proposals
                    </Button>
                </div>

                <div className="workspace-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                Preview workspace
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                Review before export
                            </span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-950">Proposal Preview</h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
                            {currentProposal?.title
                                ? `Review ${currentProposal.title} before sharing or exporting.`
                                : 'Review proposal layout and pagination before sharing.'}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Badge variant="neutral" className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                                {(sections || []).length} sections
                            </Badge>
                            <Badge variant="neutral" className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                                {tocEntries.length} toc entries
                            </Badge>
                            {currentProposal?.clientDetails?.companyName && (
                                <Badge variant="success" className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                                    {currentProposal.clientDetails.companyName}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant={mode === 'html' ? 'primary' : 'outline'}
                            onClick={() => setMode('html')}
                        >
                            HTML Preview
                        </Button>
                        {mode === 'html' && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPaginationTick((tick) => tick + 1)}
                            >
                                Recalculate Pagination
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant={mode === 'pdf' ? 'primary' : 'outline'}
                            onClick={() => setMode('pdf')}
                            disabled={loading}
                        >
                            {loading ? 'Generating...' : 'PDF Preview'}
                        </Button>
                    </div>
                </div>

                <WorkspaceSection
                    title="Preview output"
                    description="Review the proposal as a client-facing document, validate pagination, and switch between HTML and generated PDF."
                    eyebrow="Document review"
                    aside={
                        <div className="flex items-center gap-2 rounded-full border border-[var(--mod-border)] bg-[#fffdf9]/95 p-1">
                            <button
                                type="button"
                                onClick={() => setMode('html')}
                                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${mode === 'html' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                Html
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('pdf')}
                                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${mode === 'pdf' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                Pdf
                            </button>
                        </div>
                    }
                    contentClassName="px-0 py-0"
                >
                <div className="preview-viewer border-0 bg-[#fffaf4] shadow-none">
                    {mode === 'pdf' ? (
                        pdfUrl ? (
                            <div className="preview-scroll">
                                <iframe
                                    title="Proposal Preview"
                                    src={pdfUrl}
                                    className="preview-iframe"
                                />
                            </div>
                        ) : (
                            <div className="surface-card-muted p-6 text-slate-500">
                                {loading ? 'Generating PDF preview...' : 'No PDF preview available yet.'}
                            </div>
                        )
                    ) : (
                        <div className="preview-scroll">
                            <div className="preview-stack">
                                <div className="preview-page">
                                    <div className="preview-content cover">
                                        {logoPreviewUrl && (
                                            <img src={logoPreviewUrl} alt="Company Logo" className="cover-logo" />
                                        )}
                                        <div className="cover-title">{currentProposal?.title || 'Proposal'}</div>
                                        <div className="cover-subtitle">{currentProposal?.clientDetails?.companyName || ''}</div>
                                    </div>
                                    <div className="preview-footer">Page 1</div>
                                </div>

                                <div className="preview-page">
                                    <div className="preview-content">
                                        <div className="toc-title">Table of Contents</div>
                                        {tocEntries.length > 0 ? (
                                            <ol className="space-y-2 text-sm">
                                                {tocEntries.map((entry, index) => (
                                                    <li
                                                        key={`${entry.id}-${index}`}
                                                        className="flex gap-2 text-slate-700 break-words"
                                                        style={{ marginLeft: `${(entry.level - 1) * 16}px` }}
                                                    >
                                                        <span className="text-slate-900">{index + 1}.</span>
                                                        <span className="flex-1">{entry.title}</span>
                                                        <span className="text-slate-900">
                                                            {headingPageMap.get(entry.id) ?? '-'}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ol>
                                        ) : (
                                            <div className="text-slate-900 text-sm">No headings available.</div>
                                        )}
                                    </div>
                                    <div className="preview-footer">Page 2</div>
                                </div>

                                {pages.map((pageBlocks, pageIndex) => (
                                    <div key={`page-${pageIndex}`} className="preview-page">
                                        <div className="preview-content editor-content-view">
                                            {pageBlocks.map((blockIndex) => {
                                                const block = blocks[blockIndex];
                                                if (!block) return null;
                                                if (block.type === 'title') {
                                                    return (
                                                        <h2 key={block.key} className="section-title">
                                                            {block.text}
                                                        </h2>
                                                    );
                                                }
                                                return (
                                                    <div
                                                        key={block.key}
                                                        className="section-content"
                                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.html || '') }}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="preview-footer">Page {pageIndex + 3}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={measureRef} className="preview-measure">
                        {blocks.map((block) => (
                            <div
                                key={block.key}
                                data-block-key={block.key}
                                className={block.type === 'title' ? 'section-title' : 'section-content'}
                                dangerouslySetInnerHTML={block.type === 'content' ? { __html: DOMPurify.sanitize(block.html || '') } : undefined}
                            >
                                {block.type === 'title' ? block.text : null}
                            </div>
                        ))}
                    </div>
                </div>
                </WorkspaceSection>
            </PageLayout>
        </>
    );
};

export default ProposalPreviewPage;

const styles = `
    .editor-content-view .section-title, .preview-measure .section-title {
        font-size: 24pt;
        font-weight: bold;
        color: #1a202c;
        margin-bottom: 20pt;
        margin-top: 10pt;
        line-height: 1.2;
        border-bottom: 2px solid #edf2f7;
        padding-bottom: 8pt;
    }

    .editor-content-view .section-content, .preview-measure .section-content {
        font-size: 11pt;
        line-height: 1.6;
        color: #2d3748;
    }

    .editor-content-view table, .preview-measure table {
        border-collapse: collapse;
        width: 100%;
        margin: 15pt 0;
    }

    .editor-content-view th, .preview-measure th,
    .editor-content-view td, .preview-measure td {
        border: 1px solid #e2e8f0;
        padding: 8pt 12pt;
        text-align: left;
    }

    .editor-content-view th, .preview-measure th {
        background-color: #fffaf4;
        font-weight: bold;
    }

    .editor-content-view ul, .preview-measure ul {
        list-style-type: disc;
        margin-left: 20pt;
        margin-bottom: 12pt;
    }

    .editor-content-view ol, .preview-measure ol {
        list-style-type: decimal;
        margin-left: 20pt;
        margin-bottom: 12pt;
    }

    .editor-content-view p, .preview-measure p {
        margin-bottom: 10pt;
    }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}



