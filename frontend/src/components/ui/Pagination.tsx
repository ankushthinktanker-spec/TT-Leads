import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}

const Pagination = ({ page, totalPages, onChange }: PaginationProps) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onChange(Math.max(1, page - 1))}
                disabled={page <= 1}
            >
                <ChevronLeft size={16} />
                Previous
            </button>
            <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
            </span>
            <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
            >
                Next
                <ChevronRight size={16} />
            </button>
        </div>
    );
};

export default Pagination;

