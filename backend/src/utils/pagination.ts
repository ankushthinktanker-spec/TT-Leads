type PaginationOptions = {
    defaultLimit?: number;
    maxLimit?: number;
    defaultPage?: number;
};

export type PaginationParams = {
    page: number;
    limit: number;
    skip: number;
};

const parsePositiveInt = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

export const getPaginationParams = (
    query: Record<string, unknown>,
    options: PaginationOptions = {}
): PaginationParams => {
    const defaultLimit = options.defaultLimit ?? 10;
    const maxLimit = options.maxLimit ?? 100;
    const defaultPage = options.defaultPage ?? 1;

    const page = parsePositiveInt(query.page, defaultPage);
    const requestedLimit = parsePositiveInt(query.limit, defaultLimit);
    const limit = Math.min(requestedLimit, maxLimit);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

export const buildPaginationMeta = (page: number, limit: number, totalItems: number) => {
    const safeTotal = Math.max(0, totalItems);
    const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / limit);
    return {
        page,
        limit,
        total: safeTotal,
        totalPages
    };
};
