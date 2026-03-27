import path from 'path';

const SAFE_FILE_BASENAME = /[^a-zA-Z0-9._-]/g;

export const sanitizeUploadFileName = (originalName: string): string => {
    const extension = path.extname(originalName).toLowerCase();
    const base = path.basename(originalName, extension).replace(SAFE_FILE_BASENAME, '-');
    const normalized = base.replace(/-+/g, '-').replace(/^-|-$/g, '');
    return `${normalized || 'file'}${extension}`;
};

export const isAllowedFile = (
    originalName: string,
    mimeType: string,
    allowedMimes: string[],
    allowedExts: string[]
): boolean => {
    const extension = path.extname(originalName).toLowerCase();
    return allowedMimes.includes(mimeType) && allowedExts.includes(extension);
};

export const scanFilePlaceholder = async (_fullPath: string): Promise<void> => {
    // Hook for AV/malware scanner integration.
    void _fullPath;
    return Promise.resolve();
};
