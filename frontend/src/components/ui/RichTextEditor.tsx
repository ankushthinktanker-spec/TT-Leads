import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading2,
    Table as TableIcon,
    Undo,
    Redo,
    Trash2,
    Plus,
} from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    return (
        <div className="flex flex-wrap items-center gap-1 rounded-t-xl border-b border-slate-200 bg-[#faf2e7] p-2 transition-colors">
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`rounded-lg p-2 transition-all hover:bg-brand-50 ${editor.isActive('heading', { level: 2 }) ? 'bg-brand-100 text-brand-700' : 'text-slate-600'}`}
                title="Heading 2"
                type="button"
            >
                <Heading2 size={18} />
            </button>
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`rounded-lg p-2 transition-all hover:bg-brand-50 ${editor.isActive('bold') ? 'bg-brand-100 text-brand-700' : 'text-slate-600'}`}
                title="Bold"
                type="button"
            >
                <Bold size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`rounded-lg p-2 transition-all hover:bg-brand-50 ${editor.isActive('italic') ? 'bg-brand-100 text-brand-700' : 'text-slate-600'}`}
                title="Italic"
                type="button"
            >
                <Italic size={18} />
            </button>
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`rounded-lg p-2 transition-all hover:bg-brand-50 ${editor.isActive('bulletList') ? 'bg-brand-100 text-brand-700' : 'text-slate-600'}`}
                title="Bullet List"
                type="button"
            >
                <List size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`rounded-lg p-2 transition-all hover:bg-brand-50 ${editor.isActive('orderedList') ? 'bg-brand-100 text-brand-700' : 'text-slate-600'}`}
                title="Numbered List"
                type="button"
            >
                <ListOrdered size={18} />
            </button>
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <button
                onClick={addTable}
                className={`rounded-lg p-2 transition-all hover:bg-brand-50 ${editor.isActive('table') ? 'bg-brand-100 text-brand-700' : 'text-slate-600'}`}
                title="Insert Table"
                type="button"
            >
                <TableIcon size={18} />
            </button>
            {editor.isActive('table') && (
                <>
                    <button
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        className="rounded-lg p-2 text-red-600 transition-all hover:bg-red-50"
                        title="Delete Table"
                        type="button"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        className="rounded-lg p-2 text-brand-700 transition-all hover:bg-brand-50"
                        title="Add Column"
                        type="button"
                    >
                        <Plus size={18} className="rotate-90" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        className="rounded-lg p-2 text-brand-700 transition-all hover:bg-brand-50"
                        title="Add Row"
                        type="button"
                    >
                        <Plus size={18} />
                    </button>
                </>
            )}
            <div className="flex-grow" />
            <button
                onClick={() => editor.chain().focus().undo().run()}
                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[#f3e7d8] hover:text-slate-900"
                title="Undo"
                type="button"
            >
                <Undo size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().redo().run()}
                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[#f3e7d8] hover:text-slate-900"
                title="Redo"
                type="button"
            >
                <Redo size={18} />
            </button>
        </div>
    );
};

const RichTextEditor = ({ content, onChange, placeholder }: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                },
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Link.configure({
                openOnClick: false,
            }),
        ],
        content,
        onUpdate: ({ editor: nextEditor }) => {
            onChange(nextEditor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none min-h-[300px] p-8 font-sans leading-relaxed text-slate-700 outline-none transition-all selection:bg-brand-100 selection:text-brand-950',
            },
            handlePaste: () => false,
            ...(placeholder
                ? {
                    transformPastedHTML(html: string) {
                        return html;
                    },
                }
                : {}),
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content, editor]);

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#fffaf4] shadow-[0_8px_24px_rgba(120,74,24,0.05)] transition-all hover:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10">
            <MenuBar editor={editor} />
            <div className="bg-[#fffdf9]">
                <EditorContent editor={editor} placeholder={placeholder} />
            </div>
            <style>
                {`
                .ProseMirror table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 2rem 0;
                    overflow: hidden;
                    border: 2px solid #eadfce;
                    border-radius: 8px;
                }
                .ProseMirror td, .ProseMirror th {
                    border: 1px solid #eadfce;
                    box-sizing: border-box;
                    min-width: 1em;
                    padding: 0.75rem 1rem;
                    position: relative;
                    vertical-align: top;
                }
                .ProseMirror th {
                    background-color: #faf2e7;
                    font-weight: 800;
                    text-align: left;
                    color: #475569;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.05em;
                }
                .ProseMirror .selectedCell:after {
                    background: rgba(255, 188, 0, 0.15);
                    content: "";
                    left: 0; right: 0; top: 0; bottom: 0;
                    pointer-events: none;
                    position: absolute;
                    z-index: 2;
                }
                .ProseMirror .column-resize-handle {
                    background-color: #ffbc00;
                    bottom: -2px;
                    position: absolute;
                    right: -2px;
                    top: 0;
                    width: 4px;
                    z-index: 20;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #94a3b8;
                    pointer-events: none;
                    height: 0;
                    font-style: italic;
                }
                .ProseMirror h2 {
                    font-size: 1.75rem;
                    font-weight: 800;
                    margin-top: 2.5rem;
                    margin-bottom: 1rem;
                    color: #0f172a;
                    letter-spacing: -0.025em;
                    line-height: 1.2;
                }
                .ProseMirror h3 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-top: 2rem;
                    margin-bottom: 0.75rem;
                    color: #334155;
                }
                .ProseMirror ul {
                    list-style-type: none;
                    padding-left: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                .ProseMirror ul li {
                    position: relative;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror ul li::before {
                    content: "";
                    position: absolute;
                    left: -1.25rem;
                    top: 0.6rem;
                    width: 0.375rem;
                    height: 0.375rem;
                    background-color: #ffbc00;
                    border-radius: 9999px;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin-bottom: 1.5rem;
                    color: #475569;
                    font-weight: 500;
                }
                .ProseMirror p {
                    margin-bottom: 1.25rem;
                    color: #475569;
                }
                `}
            </style>
        </div>
    );
};

export default RichTextEditor;
