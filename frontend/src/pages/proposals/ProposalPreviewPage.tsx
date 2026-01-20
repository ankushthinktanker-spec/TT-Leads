import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProposalById, generateProposalPDF } from '../../store/slices/proposalSlice';
import MainLayout from '../../components/layout/MainLayout';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import api from '../../api/axios';

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
        <MainLayout>
            <PageLayout className="flex flex-col min-h-full">
                <div className="mb-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/proposals')}
                    >
                        Back to Proposals
                    </Button>
                </div>

                <div>
                    <PageHeader
                        title="Proposal Preview"
                        subtitle={currentProposal?.title
                            ? `Review ${currentProposal.title} before sharing`
                            : 'Review proposal layout and pagination before sharing'}
                        actions={(
                            <div className="surface-card-muted p-2 flex flex-wrap gap-2">
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
                        )}
                    />
                </div>

                <div className="mt-6 preview-viewer">
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
                            <div className="surface-card-muted p-6 text-secondary-400">
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
                                                        className="flex gap-2 text-secondary-200 break-words"
                                                        style={{ marginLeft: `${(entry.level - 1) * 16}px` }}
                                                    >
                                                        <span className="text-secondary-500">{index + 1}.</span>
                                                        <span className="flex-1">{entry.title}</span>
                                                        <span className="text-secondary-500">
                                                            {headingPageMap.get(entry.id) ?? '-'}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ol>
                                        ) : (
                                            <div className="text-secondary-500 text-sm">No headings available.</div>
                                        )}
                                    </div>
                                    <div className="preview-footer">Page 2</div>
                                </div>

                                {pages.map((pageBlocks, pageIndex) => (
                                    <div key={`page-${pageIndex}`} className="preview-page">
                                        <div className="preview-content">
                                            {pageBlocks.map((blockIndex) => {
                                                const block = blocks[blockIndex];
                                                if (!block) return null;
                                                if (block.type === 'title') {
                                                    return (
                                                        <div key={block.key} className="section-title">
                                                            {block.text}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div
                                                        key={block.key}
                                                        className="section-content"
                                                        dangerouslySetInnerHTML={{ __html: block.html || '' }}
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
                                dangerouslySetInnerHTML={block.type === 'content' ? { __html: block.html || '' } : undefined}
                            >
                                {block.type === 'title' ? block.text : null}
                            </div>
                        ))}
                    </div>
                </div>
            </PageLayout>
        </MainLayout>
    );
};

export default ProposalPreviewPage;
