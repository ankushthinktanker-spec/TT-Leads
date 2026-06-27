import { useEffect, useRef, type ChangeEvent, type RefObject } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import BulletList from '@tiptap/extension-bullet-list';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import { ErrorText, FormLabel, SelectInput, TextInput } from '../../components/ui/Form';
import WorkspaceSection from '../../components/ui/WorkspaceSection';

export interface ProposalSection {
    localId?: string;
    title: string;
    content: string;
    contentType: 'richText' | 'table' | 'mixed';
    sectionType?: 'RichText' | 'Table' | 'Mixed' | 'richText' | 'table' | 'mixed';
    order: number;
    isVisible: boolean;
    includeInTOC: boolean;
}

export interface ProposalFormData {
    title: string;
    leadId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientCompany: string;
    validTill: string;
    totalAmount: string;
    status: 'Draft' | 'Sent' | 'Under Review' | 'Accepted' | 'Rejected';
    logoUrl: string;
    footerLine1: string;
    footerLine2: string;
    tocDepth: number;
}

export interface TocEntry {
    title: string;
    level: number;
    id: string;
}

interface LeadOption {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    company?: string;
}

const stripTags = (value: string) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

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

interface SectionEditorProps {
    index: number;
    content: string;
    onContentChange: (index: number, value: string) => void;
    onContentTypeChange: (index: number, value: ProposalSection['contentType']) => void;
}

export const SectionEditor = ({ index, content, onContentChange, onContentTypeChange }: SectionEditorProps) => {
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

export const ProposalFormHero = ({
    isEditing,
    sectionCount,
    status
}: {
    isEditing: boolean;
    sectionCount: number;
    status: ProposalFormData['status'];
}) => (
    <div className="workspace-hero relative overflow-hidden border border-[var(--mod-border)] bg-[linear-gradient(135deg,#fffdf8_0%,#fff7e7_54%,#f8edd3_100%)] p-7 shadow-[0_18px_40px_rgba(161,121,0,0.08)]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,188,0,0.16),transparent_70%)]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <span className="rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">
                        Proposal builder
                    </span>
                    <span className="h-px w-8 bg-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Client-ready document flow
                    </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-[2.2rem]">
                    {isEditing ? 'Edit' : 'Create'} <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">Proposal</span>
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                    Build a clean, branded proposal with structured sections, client details, and a share-ready preview.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--mod-border)] bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                        Client details
                    </span>
                    <span className="rounded-full border border-[var(--mod-border)] bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                        Section outline
                    </span>
                    <span className="rounded-full border border-[var(--mod-border)] bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-slate-600">
                        Preview-ready
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
                <div className="rounded-2xl border border-[var(--mod-border)] bg-[#fffdf9] px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Sections</div>
                    <div className="mt-1 text-xl font-black text-slate-950">{sectionCount}</div>
                </div>
                <div className="rounded-2xl border border-[var(--mod-border)] bg-[#fffdf9] px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Status</div>
                    <div className="mt-1 text-xl font-black text-slate-950">{status}</div>
                </div>
            </div>
        </div>
    </div>
);

export const ProposalBasicsSection = ({
    formData,
    fieldErrors,
    leads,
    onChange,
    onLeadChange
}: {
    formData: ProposalFormData;
    fieldErrors: Record<string, string>;
    leads: LeadOption[];
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onLeadChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) => (
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
                    onChange={onChange}
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
                    onChange={onLeadChange}
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
);

export const ProposalClientSection = ({
    formData,
    fieldErrors,
    onChange
}: {
    formData: ProposalFormData;
    fieldErrors: Record<string, string>;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) => (
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
                    onChange={onChange}
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
                    onChange={onChange}
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
                    onChange={onChange}
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
                    onChange={onChange}
                    required
                    placeholder="Acme Corp"
                />
                {fieldErrors.clientCompany && <ErrorText>{fieldErrors.clientCompany}</ErrorText>}
            </div>
        </div>
    </WorkspaceSection>
);

export const ProposalCommercialSection = ({
    formData,
    fieldErrors,
    onChange
}: {
    formData: ProposalFormData;
    fieldErrors: Record<string, string>;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) => (
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
                    onChange={onChange}
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
                    onChange={onChange}
                    placeholder="50000"
                />
            </div>

            <div>
                <FormLabel>Status</FormLabel>
                <SelectInput
                    name="status"
                    value={formData.status}
                    onChange={onChange}
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
);

export const ProposalBrandingSection = ({
    formData,
    tocEntries,
    logoPreviewUrl,
    logoUploading,
    logoError,
    onChange,
    onLogoUpload
}: {
    formData: ProposalFormData;
    tocEntries: TocEntry[];
    logoPreviewUrl: string;
    logoUploading: boolean;
    logoError: string | null;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onLogoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) => (
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
                    onChange={onLogoUpload}
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
                    onChange={onChange}
                    placeholder="Company address for footer"
                />
            </div>
            <div>
                <FormLabel>Footer Website</FormLabel>
                <TextInput
                    type="text"
                    name="footerLine2"
                    value={formData.footerLine2}
                    onChange={onChange}
                    placeholder="https://yourcompany.com"
                />
            </div>

            <div className="md:col-span-2">
                <FormLabel>Index (Table of Contents)</FormLabel>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-slate-500">Include headings:</span>
                    <SelectInput
                        name="tocDepth"
                        value={formData.tocDepth}
                        onChange={onChange}
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
);

export const ProposalContentSection = ({
    sections,
    sectionRefs,
    fieldErrors,
    onAddSection,
    onRemoveSection,
    onSectionChange
}: {
    sections: ProposalSection[];
    sectionRefs: RefObject<(HTMLDivElement | null)[]>;
    fieldErrors: Record<string, string>;
    onAddSection: () => void;
    onRemoveSection: (index: number) => void;
    onSectionChange: (index: number, field: keyof ProposalSection, value: unknown) => void;
}) => (
    <WorkspaceSection
        title="Proposal content"
        description="Compose section-by-section content with a clearer outline and editing path for long proposals."
        eyebrow="Content editor"
        aside={(
            <Button
                type="button"
                onClick={onAddSection}
                variant="secondary"
            >
                <Plus size={18} />
                Add Section
            </Button>
        )}
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
                                className="rounded-full border border-[var(--mod-border)] bg-[#fffdf9] px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
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

        {fieldErrors.sections && <ErrorText>{fieldErrors.sections}</ErrorText>}

        <div className="space-y-4">
            {sections.map((section, index) => (
                <div
                    key={section.localId || index}
                    ref={(el) => {
                        sectionRefs.current[index] = el;
                    }}
                    className="rounded-[24px] border border-[var(--mod-border)] bg-[#fffdf9] p-5 shadow-[0_10px_30px_rgba(120,74,24,0.08)]"
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
                                    onChange={(event) => onSectionChange(index, 'title', event.target.value)}
                                    className="flex-1 font-medium"
                                    placeholder="Section Title"
                                />
                                <Button
                                    type="button"
                                    onClick={() => onRemoveSection(index)}
                                    variant="danger"
                                    className="px-3"
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                            <SectionEditor
                                index={index}
                                content={section.content}
                                onContentChange={(idx, value) => onSectionChange(idx, 'content', value)}
                                onContentTypeChange={(idx, value) => onSectionChange(idx, 'contentType', value)}
                            />
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={section.isVisible}
                                        onChange={(event) => onSectionChange(index, 'isVisible', event.target.checked)}
                                        className="checkbox"
                                    />
                                    <span>Visible in proposal</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={section.includeInTOC}
                                        onChange={(event) => onSectionChange(index, 'includeInTOC', event.target.checked)}
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
);

export const ProposalSummarySidebar = ({ formData }: { formData: ProposalFormData }) => (
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
);

export const ProposalSaveSection = ({
    isEditing,
    loading,
    onCancel
}: {
    isEditing: boolean;
    loading: boolean;
    onCancel: () => void;
}) => (
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
                onClick={onCancel}
                variant="outline"
            >
                Cancel
            </Button>
            <Button
                type="submit"
                disabled={loading}
                variant="primary"
            >
                {loading ? 'Saving...' : isEditing ? 'Update Proposal' : 'Create Proposal'}
            </Button>
        </div>
    </WorkspaceSection>
);


