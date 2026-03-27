import { useState } from 'react';
import { Download, FileText, Sheet } from 'lucide-react';
import { cn } from '../../lib/utils';
import { border, shadowCard, surfaceCard } from '../../theme/tokens';

export type ExportType = 'pdf' | 'excel';

interface ExportDropdownProps {
    onExport: (type: ExportType) => void;
    className?: string;
}

const ExportDropdown = ({ onExport, className }: ExportDropdownProps) => {
    const [open, setOpen] = useState(false);

    const handleExport = (type: ExportType) => {
        onExport(type);
        setOpen(false);
    };

    return (
        <div className={cn('relative', className)}>
            <button
                type="button"
                className="btn btn-outline flex items-center gap-2"
                onClick={() => setOpen((prev) => !prev)}
            >
                <Download className="w-4 h-4" />
                Export
            </button>
            {open && (
                <div className={cn('absolute right-0 mt-2 w-44 rounded-lg z-20', surfaceCard, border, shadowCard)}>
                    <button
                        type="button"
                        onClick={() => handleExport('pdf')}
                        className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExport('excel')}
                        className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
                    >
                        <Sheet className="w-4 h-4" />
                        Export Excel
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportDropdown;

