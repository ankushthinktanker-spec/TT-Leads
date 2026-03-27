import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import BulletList from '@tiptap/extension-bullet-list';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createProposal, updateProposal, fetchProposalById } from '../../store/slices/proposalSlice';
import { fetchLeads } from '../../store/slices/leadSlice';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import Button from '../../components/ui/Button';
import { FormLabel, TextInput, SelectInput, ErrorText } from '../../components/ui/Form';
import WorkspaceSection from '../../components/ui/WorkspaceSection';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

interface ProposalSection {
    localId?: string;
    title: string;
    content: string;
    contentType: 'richText' | 'table' | 'mixed';
    sectionType?: 'RichText' | 'Table' | 'Mixed' | 'richText' | 'table' | 'mixed';
    order: number;
    isVisible: boolean;
    includeInTOC: boolean;
}

const resolveProposalLeadId = (
    leadId: string | { _id: string; firstName?: string; lastName?: string; email?: string } | undefined
) => (typeof leadId === 'string' ? leadId : leadId?._id || '');

const normalizeContentType = (value: string | undefined): ProposalSection['contentType'] => {
    if (value === 'table' || value === 'Table') return 'table';
    if (value === 'mixed' || value === 'Mixed') return 'mixed';
    return 'richText';
};

interface TocEntry {
    title: string;
    level: number;
    id: string;
}

const DashBulletList = BulletList.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            listStyle: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-list-style'),
                renderHTML: (attributes) => {
                    if (!attributes.listStyle) {
                        return {};
                    }
                    return {
                        'data-list-style': attributes.listStyle,
                        class: attributes.listStyle === 'dash' ? 'dash-list' : null
                    };
                }
            }
        };
    }
});

const createLocalId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `section-${crypto.randomUUID()}`;
    }
    return `section-${Math.random().toString(36).slice(2, 10)}`;
};
const stripTags = (value: string) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const normalizeTocTitle = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const sanitizeContent = (value: string) => DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
        'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'div', 'span', 'a', 'img', 'hr'
    ],
    ALLOWED_ATTR: [
        'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
        'colspan', 'rowspan', 'width', 'height'
    ],
    ALLOW_DATA_ATTR: false
});
const extractUploadsPath = (value: string): string => {
    if (!value) return '';
    if (value.startsWith('/uploads/')) return value;
    if (value.includes('/uploads/')) {
        try {
            const parsed = new URL(value);
            return parsed.pathname;
        } catch {
            const idx = value.indexOf('/uploads/');
            return idx >= 0 ? value.slice(idx) : value;
        }
    }
    return value;
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

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (mdMatch) {
            const level = mdMatch[1].length;
            const text = mdMatch[2].trim();
            if (text) {
                entries.push({ title: text, level, id: `${sectionId}-md-${level}-${headingIndex++}` });
            }
        }
    }

    return entries;
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

const buildTocEntries = (sections: ProposalSection[], tocDepth: number): TocEntry[] => {
    const entries: TocEntry[] = [];
    sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((section) => section.isVisible && section.includeInTOC)
        .forEach((section) => {
            const title = section.title?.trim();
            const sectionId = section.localId || `section-${section.order}`;
            if (title && sectionId) {
                entries.push({ title, level: 1, id: sectionId });
            }
            const contentHeadings = extractHeadingsFromContent(section.content || '', sectionId || createLocalId());
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

interface SectionEditorProps {
    index: number;
    content: string;
    onContentChange: (index: number, value: string) => void;
    onContentTypeChange: (index: number, value: ProposalSection['contentType']) => void;
}

const SectionEditor = ({ index, content, onContentChange, onContentTypeChange }: SectionEditorProps) => {
    const lastHtmlRef = useRef<string>('');
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: false,
                link: false
            }),
            DashBulletList,
            Table.configure({
                resizable: true
            }),
            TableRow,
            TableHeader,
            TableCell,
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true
            }),
            Image
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            lastHtmlRef.current = html;
            onContentChange(index, html);
            const hasTable = html.includes('<table');
            const textContent = stripTags(html);
            const nextType: ProposalSection['contentType'] = hasTable
                ? (textContent ? 'mixed' : 'table')
                : 'richText';
            onContentTypeChange(index, nextType);
        }
    });

    useEffect(() => {
        if (!editor) return;
        const nextContent = content || '';
        if (nextContent === lastHtmlRef.current) {
            return;
        }
        const currentHTML = editor.getHTML();
        if (currentHTML !== nextContent) {
            editor.commands.setContent(nextContent, { emitUpdate: false });
        }
        lastHtmlRef.current = nextContent;
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Text</span>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold"
                >
                    Bold
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => {
                        editor.chain().focus().toggleBulletList().run();
                        editor.commands.updateAttributes('bulletList', { listStyle: null });
                    }}
                    title="Bulleted list"
                >
                    Bullets
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => {
                        editor.chain().focus().toggleBulletList().run();
                        editor.commands.updateAttributes('bulletList', { listStyle: 'dash' });
                    }}
                    title="Dash list"
                >
                    Dash List
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="Numbered list"
                >
                    Numbered
                </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="mr-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Tables</span>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}
                    title="Insert table"
                >
                    Table
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    title="Add table row"
                >
                    Add Row
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                    title="Add table column"
                >
                    Add Column
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => editor.chain().focus().deleteRow().run()}
                    title="Remove table row"
                >
                    Remove Row
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                    title="Remove table column"
                >
                    Remove Column
                </Button>
                <Button
                    type="button"
                    variant="danger"
                    className="px-3 py-1 text-xs"
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    title="Delete table"
                >
                    Delete Table
                </Button>
                </div>
            </div>
            <EditorContent editor={editor} className="rich-editor" />
        </div>
    );
};

const ProposalForm = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentProposal, loading } = useAppSelector((state) => state.proposals);
    const { user } = useAppSelector((state) => state.auth);
    const { leads } = useAppSelector((state) => state.leads);

    const [formData, setFormData] = useState({
        title: '',
        leadId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientCompany: '',
        validTill: '',
        totalAmount: '',
        status: 'Draft' as 'Draft' | 'Sent' | 'Under Review' | 'Accepted' | 'Rejected',
        logoUrl: '',
        footerLine1: '',
        footerLine2: '',
        tocDepth: 1
    });
    const [logoPreviewUrl, setLogoPreviewUrl] = useState('');

    const [sections, setSections] = useState<ProposalSection[]>([]);
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);
    const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setTocEntries(buildTocEntries(sections, formData.tocDepth));
        }, 150);
        return () => window.clearTimeout(handle);
    }, [sections, formData.tocDepth]);

    useEffect(() => {
        dispatch(fetchLeads({ limit: 100 }));
        if (id) {
            dispatch(fetchProposalById(id));
        }
    }, [dispatch, id]);

    useEffect(() => {
        if (currentProposal && id) {
            const rawLogoUrl = currentProposal.logoUrl || '';
            const logoUrl = extractUploadsPath(rawLogoUrl);
            setFormData({
                title: currentProposal.title || '',
                leadId: resolveProposalLeadId(currentProposal.leadId),
                clientName: currentProposal.clientDetails?.contactPerson || currentProposal.clientName || '',
                clientEmail: currentProposal.clientDetails?.email || currentProposal.clientEmail || '',
                clientPhone: currentProposal.clientDetails?.phone || currentProposal.clientPhone || '',
                clientCompany: currentProposal.clientDetails?.companyName || currentProposal.clientCompany || '',
                validTill: currentProposal.validTill ? currentProposal.validTill.split('T')[0] : '',
                totalAmount: currentProposal.totalAmount?.toString() || '',
                status: currentProposal.status || 'Draft',
                logoUrl,
                footerLine1: currentProposal.footerLine1 || '',
                footerLine2: currentProposal.footerLine2 || '',
                tocDepth: currentProposal.tocDepth || 1
            });
            if (currentProposal.sections && currentProposal.sections.length > 0) {
                setSections(currentProposal.sections.map((s, idx) => ({
                    localId: typeof s.localId === 'string' && s.localId.trim()
                        ? s.localId
                        : createLocalId(),
                    title: typeof s.title === 'string' ? s.title : (typeof s.sectionTitle === 'string' ? s.sectionTitle : ''),
                    content: typeof s.content === 'string' ? s.content : '',
                    contentType: normalizeContentType(typeof s.contentType === 'string' ? s.contentType : undefined),
                    order: idx,
                    isVisible: s.isVisible !== false,
                    includeInTOC: s.includeInTOC !== false,
                })));
            }
        }
    }, [currentProposal, id]);

    useEffect(() => {
        let objectUrl: string | null = null;
        const fetchLogo = async () => {
            if (!formData.logoUrl) {
                setLogoPreviewUrl('');
                return;
            }
            if (formData.logoUrl.startsWith('http://') || formData.logoUrl.startsWith('https://')) {
                setLogoPreviewUrl(formData.logoUrl);
                return;
            }
            if (formData.logoUrl.startsWith('/uploads/logos/')) {
                const fileName = formData.logoUrl.split('/').pop();
                if (!fileName) return;
                try {
                    const response = await api.get(`/proposals/logo/${fileName}`, { responseType: 'blob' });
                    objectUrl = URL.createObjectURL(response.data);
                    setLogoPreviewUrl(objectUrl);
                } catch {
                    setLogoPreviewUrl('');
                }
                return;
            }
            setLogoPreviewUrl(formData.logoUrl);
        };
        fetchLogo();
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [formData.logoUrl]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const nextValue = name === 'tocDepth' ? Number(value) : value;
        setFormData(prev => ({ ...prev, [name]: nextValue }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        setLogoError(null);

        try {
            const data = new FormData();
            data.append('logo', file);
            const response = await api.post('/proposals/logo', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const rawLogoUrl = response.data.data.logoUrl;
            const logoUrl = extractUploadsPath(rawLogoUrl);
            setFormData((prev) => ({ ...prev, logoUrl }));
        } catch (error: unknown) {
            setLogoError(getErrorMessage(error, 'Logo upload failed'));
        } finally {
            setLogoUploading(false);
        }
    };

    const handleLeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leadId = e.target.value;
        const selectedLead = leads.find(l => l._id === leadId);

        if (selectedLead) {
            setFormData(prev => ({
                ...prev,
                leadId,
                clientName: `${selectedLead.firstName} ${selectedLead.lastName}`,
                clientEmail: selectedLead.email || '',
                clientPhone: selectedLead.phone || '',
                clientCompany: selectedLead.company || '',
            }));
        } else {
            setFormData(prev => ({ ...prev, leadId }));
        }
    };

    const handleSectionChange = (index: number, field: keyof ProposalSection, value: unknown) => {
        setSections(prev => prev.map((section, idx) =>
            idx === index ? { ...section, [field]: value as ProposalSection[keyof ProposalSection] } : section
        ));
    };

    const addSection = () => {
        setSections(prev => [
            ...prev,
            {
                localId: createLocalId(),
                title: 'New Section',
                content: '',
                contentType: 'richText',
                order: prev.length,
                isVisible: true,
                includeInTOC: true,
            },
        ]);
    };

    const removeSection = (index: number) => {
        setSections(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nextErrors: Record<string, string> = {};
        if (!formData.title.trim()) nextErrors.title = 'Proposal title is required';
        if (!formData.clientName.trim()) nextErrors.clientName = 'Client name is required';
        if (!formData.clientCompany.trim()) nextErrors.clientCompany = 'Client company is required';
        if (!formData.clientEmail.trim()) {
            nextErrors.clientEmail = 'Client email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(formData.clientEmail)) {
            nextErrors.clientEmail = 'Please provide a valid email';
        }
        if (!formData.validTill) nextErrors.validTill = 'Valid until date is required';
        const emptySection = sections.find((section) => {
            if (!section.content) return true;
            if (typeof section.content !== 'string') return true;
            return section.content.trim().length === 0;
        });
        if (emptySection) {
            nextErrors.sections = `Section "${emptySection.title || 'Untitled'}" content is required`;
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            setFormError(nextErrors.sections || 'Please fix the highlighted fields.');
            return;
        }

        setFormError(null);
        setFieldErrors({});

        const normalizedSections = sections.map((section) => {
            const localId = section.localId?.trim() ? section.localId : createLocalId();
            return { ...section, localId };
        });
        if (normalizedSections.some((section, index) => section.localId !== sections[index]?.localId)) {
            setSections(normalizedSections);
        }

        const payload = {
            title: formData.title,
            leadId: formData.leadId || undefined,
            status: formData.status,
            validTill: formData.validTill ? new Date(formData.validTill).toISOString() : undefined,
            totalAmount: formData.totalAmount ? parseFloat(formData.totalAmount) : undefined,
            logoUrl: formData.logoUrl || undefined,
            footerLine1: formData.footerLine1 || undefined,
            footerLine2: formData.footerLine2 || undefined,
            tocDepth: formData.tocDepth,
            preparedBy: {
                name: user ? `${user.firstName} ${user.lastName}` : 'User',
                company: 'ThinkTanker',
                email: user?.email || undefined,
                phone: user?.phone || undefined,
            },
            clientDetails: {
                companyName: formData.clientCompany,
                contactPerson: formData.clientName,
                email: formData.clientEmail,
                phone: formData.clientPhone,
            },
            sections: normalizedSections.map((section, index) => {
                const sectionType: ProposalSection['sectionType'] =
                    section.contentType === 'table'
                        ? 'Table'
                        : section.contentType === 'mixed'
                            ? 'Mixed'
                            : 'RichText';
                const localId = section.localId as string;
                return {
                    title: section.title,
                    sectionTitle: section.title,
                    contentType: section.contentType,
                    sectionType,
                    order: typeof section.order === 'number' ? section.order : index,
                    sectionOrder: typeof section.order === 'number' ? section.order : index,
                    content: sanitizeContent(ensureHeadingIds(section.content, localId)),
                    localId,
                    includeInTOC: section.includeInTOC,
                    includeInIndex: section.includeInTOC,
                    isVisible: section.isVisible
                };
            })
        };

        try {
            if (id) {
                await dispatch(updateProposal({ id, data: payload })).unwrap();
            } else {
                await dispatch(createProposal(payload)).unwrap();
            }
            navigate('/proposals');
        } catch (error: unknown) {
            console.error('Failed to save proposal:', error);
            setFormError(getErrorMessage(error, 'Failed to save proposal.'));
        }
    };

    return (
            <PageLayout className="space-y-8 pb-20">
                <div className="mb-4">
                    <button
                        onClick={() => navigate('/proposals')}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft size={20} />
                        Back to Proposals
                    </button>
                </div>

                <div className="workspace-hero relative overflow-hidden p-7">
                    <div className="absolute top-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_72%)]" />
                    <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-3">
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                    Proposal builder
                                </span>
                                <span className="h-px w-8 bg-slate-300" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Client-ready document flow
                                </span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-[2.2rem]">
                                {id ? 'Edit' : 'Create'} <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Proposal</span>
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                                Build a clean, branded proposal with structured sections, client details, and a share-ready preview.
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    Client details
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    Section outline
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    Preview-ready
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:flex">
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Sections</div>
                                <div className="mt-1 text-xl font-black text-slate-950">{sections.length}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Status</div>
                                <div className="mt-1 text-xl font-black text-slate-950">{formData.status}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                    {formError && (
                        <div className="alert-error">
                            {formError}
                        </div>
                    )}

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <div className="space-y-6">
                            <WorkspaceSection
                                title="Basic information"
                                description="Link the proposal to an existing lead when available and set the core document identity before composition."
                                eyebrow="Proposal setup"
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <FormLabel>
                                            Proposal Title <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <TextInput
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            required
                                            placeholder="e.g., Website Development Proposal"
                                        />
                                        {fieldErrors.title && <ErrorText>{fieldErrors.title}</ErrorText>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <FormLabel>Link to Lead (Optional)</FormLabel>
                                        <SelectInput
                                            name="leadId"
                                            value={formData.leadId}
                                            onChange={handleLeadChange}
                                        >
                                            <option value="">Select Lead (or enter client details manually)</option>
                                            {leads.map((lead) => (
                                                <option key={lead._id} value={lead._id}>
                                                    {lead.firstName} {lead.lastName} - {lead.company || lead.email}
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </div>
                                </div>
                            </WorkspaceSection>

                            <WorkspaceSection
                                title="Client information"
                                description="Keep the recipient details accurate so previews, delivery, and approval flows stay clean."
                                eyebrow="Client details"
                            >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FormLabel>
                                    Client Name <span className="text-red-500">*</span>
                                </FormLabel>
                                <TextInput
                                    type="text"
                                    name="clientName"
                                    value={formData.clientName}
                                    onChange={handleChange}
                                    required
                                    placeholder="John Doe"
                                />
                                {fieldErrors.clientName && <ErrorText>{fieldErrors.clientName}</ErrorText>}
                            </div>

                            <div>
                                <FormLabel>
                                    Client Email <span className="text-red-500">*</span>
                                </FormLabel>
                                <TextInput
                                    type="email"
                                    name="clientEmail"
                                    value={formData.clientEmail}
                                    onChange={handleChange}
                                    required
                                    placeholder="john@example.com"
                                />
                                {fieldErrors.clientEmail && <ErrorText>{fieldErrors.clientEmail}</ErrorText>}
                            </div>

                            <div>
                                <FormLabel>Client Phone</FormLabel>
                                <TextInput
                                    type="tel"
                                    name="clientPhone"
                                    value={formData.clientPhone}
                                    onChange={handleChange}
                                    placeholder="+91 1234567890"
                                />
                            </div>

                            <div>
                                <FormLabel>
                                    Client Company <span className="text-red-500">*</span>
                                </FormLabel>
                                <TextInput
                                    type="text"
                                    name="clientCompany"
                                    value={formData.clientCompany}
                                    onChange={handleChange}
                                    required
                                    placeholder="Acme Corp"
                                />
                                {fieldErrors.clientCompany && <ErrorText>{fieldErrors.clientCompany}</ErrorText>}
                            </div>
                        </div>
                            </WorkspaceSection>

                            <WorkspaceSection
                                title="Proposal details"
                                description="Control validity, amount context, and lifecycle status before publishing or sending."
                                eyebrow="Commercial settings"
                            >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <FormLabel>
                                    Valid Until <span className="text-red-500">*</span>
                                </FormLabel>
                                <TextInput
                                    type="date"
                                    name="validTill"
                                    value={formData.validTill}
                                    onChange={handleChange}
                                    required
                                />
                                {fieldErrors.validTill && <ErrorText>{fieldErrors.validTill}</ErrorText>}
                            </div>

                            <div>
                                <FormLabel>Total Amount</FormLabel>
                                <TextInput
                                    type="number"
                                    name="totalAmount"
                                    value={formData.totalAmount}
                                    onChange={handleChange}
                                    placeholder="50000"
                                />
                            </div>

                            <div>
                                <FormLabel>Status</FormLabel>
                                <SelectInput
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Sent">Sent</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Accepted">Accepted</option>
                                    <option value="Rejected">Rejected</option>
                                </SelectInput>
                            </div>
                        </div>
                            </WorkspaceSection>

                            <WorkspaceSection
                                title="Branding and footer"
                                description="Set the document branding, footer identity, and generated table-of-contents behavior."
                                eyebrow="Brand and output"
                            >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Logo (Header)</FormLabel>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleLogoUpload}
                                    className="input"
                                />
                                {logoUploading && (
                                    <p className="mt-2 text-xs text-slate-500">Uploading logo...</p>
                                )}
                                {logoError && <ErrorText>{logoError}</ErrorText>}
                                {logoPreviewUrl && (
                                    <div className="mt-3 inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                        <img src={logoPreviewUrl} alt="Logo preview" className="h-10 object-contain" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <FormLabel>Footer Address</FormLabel>
                                <TextInput
                                    type="text"
                                    name="footerLine1"
                                    value={formData.footerLine1}
                                    onChange={handleChange}
                                    placeholder="Company address for footer"
                                />
                            </div>
                            <div>
                                <FormLabel>Footer Website</FormLabel>
                                <TextInput
                                    type="text"
                                    name="footerLine2"
                                    value={formData.footerLine2}
                                    onChange={handleChange}
                                    placeholder="https://yourcompany.com"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <FormLabel>Index (Table of Contents)</FormLabel>
                                <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
                                    <span className="text-slate-500">Include headings:</span>
                                    <SelectInput
                                        name="tocDepth"
                                        value={formData.tocDepth}
                                        onChange={handleChange}
                                    >
                                        <option value={1}>H1 only</option>
                                        <option value={2}>H1 + H2</option>
                                        <option value={3}>H1 + H2 + H3</option>
                                    </SelectInput>
                                </div>
                                <div className="surface-card-muted p-3 text-sm">
                                    {tocEntries.length > 0 ? (
                                        <ol className="space-y-1">
                                            {tocEntries.map((entry, index) => (
                                                <li
                                                    key={`${entry.id}-${index}`}
                                                    className="flex items-start gap-2 break-words text-slate-700"
                                                    style={{ marginLeft: `${(entry.level - 1) * 16}px` }}
                                                >
                                                    <span className="text-slate-500">{index + 1}.</span>
                                                    <span>{entry.title}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <p className="text-slate-500">
                                            Add section titles or headings to populate the index.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                            </WorkspaceSection>

                            <WorkspaceSection
                                title="Proposal content"
                                description="Compose section-by-section content with a clearer outline and editing path for long proposals."
                                eyebrow="Content editor"
                                aside={
                                    <Button
                                        type="button"
                                        onClick={addSection}
                                        variant="secondary"
                                    >
                                        <Plus size={18} />
                                        Add Section
                                    </Button>
                                }
                            >

                                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                                    <div className="text-sm font-semibold text-slate-800">Section Outline</div>
                                    <div className="mb-2 mt-1 text-xs text-slate-500">
                                        Jump to a section while editing long proposals.
                                    </div>
                                    {sections.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {sections
                                                .slice()
                                                .sort((a, b) => a.order - b.order)
                                                .map((section, index) => (
                                                    <button
                                                        key={section.localId || index}
                                                        type="button"
                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                                        onClick={() => sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                                    >
                                                        {section.title || `Section ${index + 1}`}
                                                    </button>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500">No sections yet.</div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {sections.map((section, index) => (
                                        <div
                                            key={section.localId || index}
                                            ref={(el) => {
                                                sectionRefs.current[index] = el;
                                            }}
                                            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-2 rounded-xl bg-slate-100 p-2 text-slate-500">
                                                    <GripVertical size={18} />
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex gap-3">
                                                        <TextInput
                                                            type="text"
                                                            value={section.title}
                                                            onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                                                            className="flex-1 font-medium"
                                                            placeholder="Section Title"
                                                        />
                                                        <Button
                                                            type="button"
                                                            onClick={() => removeSection(index)}
                                                            variant="danger"
                                                            className="px-3"
                                                        >
                                                            <Trash2 size={18} />
                                                        </Button>
                                                    </div>
                                                    <SectionEditor
                                                        index={index}
                                                        content={section.content}
                                                        onContentChange={(idx, value) => handleSectionChange(idx, 'content', value)}
                                                        onContentTypeChange={(idx, value) => handleSectionChange(idx, 'contentType', value)}
                                                    />
                                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                                        <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                                                            <input
                                                                type="checkbox"
                                                                checked={section.isVisible}
                                                                onChange={(e) => handleSectionChange(index, 'isVisible', e.target.checked)}
                                                                className="checkbox"
                                                            />
                                                            <span>Visible in proposal</span>
                                                        </label>
                                                        <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                                                            <input
                                                                type="checkbox"
                                                                checked={section.includeInTOC}
                                                                onChange={(e) => handleSectionChange(index, 'includeInTOC', e.target.checked)}
                                                                className="checkbox"
                                                            />
                                                            <span>Include in Table of Contents</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {sections.length === 0 && (
                                    <div className="empty-state">
                                        <p>No sections added yet. Click &quot;Add Section&quot; to start building your proposal.</p>
                                    </div>
                                )}
                            </WorkspaceSection>
                        </div>

                        <div className="space-y-6">
                            <WorkspaceSection
                                title="At a glance"
                                description="Quick summary of the document state while you edit."
                                eyebrow="Document summary"
                            >
                                <div className="space-y-4 text-sm">
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <span className="font-medium text-slate-600">Client</span>
                                        <span className="font-semibold text-slate-950">{formData.clientCompany || 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <span className="font-medium text-slate-600">Valid until</span>
                                        <span className="font-semibold text-slate-950">{formData.validTill || 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <span className="font-medium text-slate-600">Total amount</span>
                                        <span className="font-semibold text-slate-950">{formData.totalAmount || 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <span className="font-medium text-slate-600">TOC depth</span>
                                        <span className="font-semibold text-slate-950">H1 + {Math.max(formData.tocDepth - 1, 0)} levels</span>
                                    </div>
                                </div>
                            </WorkspaceSection>

                            <WorkspaceSection
                                title="Save proposal"
                                description="Review the document state, then save or return to the proposal list."
                                eyebrow="Publishing"
                            >
                                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    Review client data, section order, and branding before saving.
                                </div>
                                <div className="form-actions mt-5 border-t-0 px-0 pt-0">
                                    <Button
                                        type="button"
                                        onClick={() => navigate('/proposals')}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        variant="primary"
                                    >
                                        {loading ? 'Saving...' : id ? 'Update Proposal' : 'Create Proposal'}
                                    </Button>
                                </div>
                            </WorkspaceSection>
                        </div>
                    </div>
                </form>
            </PageLayout>
    );
};

export default ProposalForm;

