import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createProposal, updateProposal, fetchProposalById, clearCurrentProposal } from '../../store/slices/proposalSlice';
import { fetchLeads } from '../../store/slices/leadSlice';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';
import {
    ProposalBasicsSection,
    ProposalBrandingSection,
    ProposalClientSection,
    ProposalCommercialSection,
    ProposalContentSection,
    ProposalFormHero,
    ProposalSaveSection,
    ProposalSummarySidebar,
    type ProposalFormData,
    type ProposalSection,
    type TocEntry
} from './ProposalFormSections';

const resolveProposalLeadId = (
    leadId: string | { _id: string; firstName?: string; lastName?: string; email?: string } | undefined
) => (typeof leadId === 'string' ? leadId : leadId?._id || '');

const normalizeContentType = (value: string | undefined): ProposalSection['contentType'] => {
    if (value === 'table' || value === 'Table') return 'table';
    if (value === 'mixed' || value === 'Mixed') return 'mixed';
    return 'richText';
};

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

const ProposalForm = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentProposal, loading } = useAppSelector((state) => state.proposals);
    const { user } = useAppSelector((state) => state.auth);
    const { leads } = useAppSelector((state) => state.leads);

    const [formData, setFormData] = useState<ProposalFormData>({
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
        } else {
            dispatch(clearCurrentProposal());
        }
        return () => {
            dispatch(clearCurrentProposal());
        };
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
            } else {
                setSections([]);
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
                clientName: `${selectedLead.firstName} ${selectedLead.lastName}`.trim(),
                clientEmail: selectedLead.email || '',
                clientPhone: selectedLead.phone || '',
                clientCompany: selectedLead.company || '',
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                leadId,
                clientName: '',
                clientEmail: '',
                clientPhone: '',
                clientCompany: '',
            }));
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
        setSections((prev) =>
            prev
                .filter((_, idx) => idx !== index)
                .map((section, nextIndex) => ({ ...section, order: nextIndex }))
        );
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

            <ProposalFormHero
                isEditing={Boolean(id)}
                sectionCount={sections.length}
                status={formData.status}
            />

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                {formError && (
                    <div className="alert-error">
                        {formError}
                    </div>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-6">
                        <ProposalBasicsSection
                            formData={formData}
                            fieldErrors={fieldErrors}
                            leads={leads}
                            onChange={handleChange}
                            onLeadChange={handleLeadChange}
                        />
                        <ProposalClientSection
                            formData={formData}
                            fieldErrors={fieldErrors}
                            onChange={handleChange}
                        />
                        <ProposalCommercialSection
                            formData={formData}
                            fieldErrors={fieldErrors}
                            onChange={handleChange}
                        />
                        <ProposalBrandingSection
                            formData={formData}
                            tocEntries={tocEntries}
                            logoPreviewUrl={logoPreviewUrl}
                            logoUploading={logoUploading}
                            logoError={logoError}
                            onChange={handleChange}
                            onLogoUpload={handleLogoUpload}
                        />
                        <ProposalContentSection
                            sections={sections}
                            sectionRefs={sectionRefs}
                            fieldErrors={fieldErrors}
                            onAddSection={addSection}
                            onRemoveSection={removeSection}
                            onSectionChange={handleSectionChange}
                        />
                    </div>

                    <div className="space-y-6">
                        <ProposalSummarySidebar formData={formData} />
                        <ProposalSaveSection
                            isEditing={Boolean(id)}
                            loading={loading}
                            onCancel={() => navigate('/proposals')}
                        />
                    </div>
                </div>
            </form>
        </PageLayout>
    );
};

export default ProposalForm;

