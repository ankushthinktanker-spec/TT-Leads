import { Link } from 'react-router-dom';

export interface Crumb {
    label: string;
    to?: string;
}

const Breadcrumb = ({ items }: { items: Crumb[] }) => {
    return (
        <nav aria-label="Breadcrumb" className="mb-3 text-sm text-slate-500">
            <ol className="flex flex-wrap items-center gap-2">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                            {item.to && !isLast ? (
                                <Link to={item.to} className="tt-link">
                                    {item.label}
                                </Link>
                            ) : (
                                <span className={isLast ? 'font-medium text-slate-700' : ''}>{item.label}</span>
                            )}
                            {!isLast && <span>/</span>}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumb;

