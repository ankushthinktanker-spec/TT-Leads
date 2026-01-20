import type { TableHTMLAttributes, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Table = ({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) => {
    return <table className={cn('data-table', className)} {...props} />;
};

export const TableHead = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => {
    return <thead className={cn('data-table-head', className)} {...props} />;
};

export const TableBody = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => {
    return <tbody className={cn('data-table-body', className)} {...props} />;
};

export const TableRow = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => {
    return <tr className={cn('data-table-row', className)} {...props} />;
};

export const TableHeadCell = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => {
    return <th className={cn('data-table-head-cell', className)} {...props} />;
};

export const TableCell = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => {
    return <td className={cn('data-table-cell', className)} {...props} />;
};
