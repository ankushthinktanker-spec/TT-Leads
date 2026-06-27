import { escapeRegex } from './regex.utils';

type QueryValue = string | string[] | undefined;

const normalizeQueryValue = (value: QueryValue): string | undefined => {
    if (Array.isArray(value)) {
        return value.find((item) => typeof item === 'string' && item.trim())?.trim();
    }
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    return undefined;
};

export const getSearchTerm = (query: Record<string, unknown>): string | undefined => {
    const q = normalizeQueryValue(query.q as QueryValue);
    const legacy = normalizeQueryValue(query.search as QueryValue);
    return q || legacy || undefined;
};

export const getStringParam = (query: Record<string, unknown>, key: string): string | undefined => {
    return normalizeQueryValue(query[key] as QueryValue);
};

export const getTagsParam = (query: Record<string, unknown>): string[] | undefined => {
    const raw = normalizeQueryValue(query.tags as QueryValue);
    if (!raw) return undefined;
    const tags = raw.split(',').map((tag) => tag.trim()).filter(Boolean);
    return tags.length > 0 ? tags : undefined;
};

export const getDateRangeParam = (query: Record<string, unknown>): { $gte?: Date; $lte?: Date } | undefined => {
    const dateFrom = normalizeQueryValue(query.dateFrom as QueryValue);
    const dateTo = normalizeQueryValue(query.dateTo as QueryValue);
    if (!dateFrom && !dateTo) return undefined;
    const range: { $gte?: Date; $lte?: Date } = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) range.$lte = new Date(dateTo);
    return range;
};

export const applySearchFilter = <T extends Record<string, unknown>>(
    filter: T,
    term: string | undefined,
    fields: string[]
): T => {
    if (!term) return filter;
    const orClause = fields.map((field) => ({
        [field]: { $regex: escapeRegex(term), $options: 'i' }
    }));
    if (Array.isArray((filter as { $or?: unknown }).$or)) {
        const existingAnd: unknown[] = Array.isArray((filter as { $and?: unknown[] }).$and)
            ? ((filter as { $and?: unknown[] }).$and as unknown[])
            : [];
        const existingOr = (filter as { $or?: unknown[] }).$or as unknown[];
        (filter as { $and?: unknown[] }).$and = [...existingAnd, { $or: existingOr }, { $or: orClause }];
        delete (filter as { $or?: unknown }).$or;
        return filter;
    }
    (filter as { $or?: unknown }).$or = orClause;
    return filter;
};
