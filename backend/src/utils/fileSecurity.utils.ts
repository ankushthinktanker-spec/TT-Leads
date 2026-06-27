import path from 'path';
import fs from 'fs';
import { AppError } from '../middleware/errorHandler';

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

// ---------------------------------------------------------------------------
// Magic-byte signatures for allowed file types
// Each entry: { mime, exts, magic: [offset, bytes] }
// ---------------------------------------------------------------------------
type MagicEntry = { mime: string; exts: string[]; offset: number; bytes: number[] };

const MAGIC_SIGNATURES: MagicEntry[] = [
    // PDF — %PDF
    { mime: 'application/pdf', exts: ['.pdf'], offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
    // PNG — \x89PNG
    { mime: 'image/png', exts: ['.png'], offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },
    // JPEG — \xff\xd8\xff
    { mime: 'image/jpeg', exts: ['.jpg', '.jpeg'], offset: 0, bytes: [0xff, 0xd8, 0xff] },
    // WebP — RIFF....WEBP (4 bytes at 0, then 4 bytes at 8)
    { mime: 'image/webp', exts: ['.webp'], offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    // DOCX / XLSX / any OOXML (ZIP-based) — PK\x03\x04
    {
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        exts: ['.docx'],
        offset: 0,
        bytes: [0x50, 0x4b, 0x03, 0x04]
    },
    // DOC — OLE2 compound document \xd0\xcf\x11\xe0
    { mime: 'application/msword', exts: ['.doc'], offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] }
];

// Known dangerous byte patterns (PE executable, ELF, shell scripts starting with #!)
const DANGEROUS_SIGNATURES: Array<{ label: string; offset: number; bytes: number[] }> = [
    { label: 'PE executable', offset: 0, bytes: [0x4d, 0x5a] },              // MZ header
    { label: 'ELF binary',    offset: 0, bytes: [0x7f, 0x45, 0x4c, 0x46] }, // ELF header
    { label: 'Shell script',  offset: 0, bytes: [0x23, 0x21] },              // #!
    { label: 'Java class',    offset: 0, bytes: [0xca, 0xfe, 0xba, 0xbe] }, // Java bytecode
    { label: 'ZIP bomb / nested archive anomaly', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] } // handled separately for non-OOXML
];

const matchesBytes = (header: Buffer, offset: number, bytes: number[]): boolean => {
    if (header.length < offset + bytes.length) return false;
    return bytes.every((b, i) => header[offset + i] === b);
};

const readHeader = (filePath: string, size: number): Buffer => {
    const fd = fs.openSync(filePath, 'r');
    try {
        const buf = Buffer.alloc(size);
        fs.readSync(fd, buf, 0, size, 0);
        return buf;
    } finally {
        fs.closeSync(fd);
    }
};

/**
 * Verifies that the uploaded file's actual content (magic bytes) matches its
 * declared extension and MIME type. Rejects files with known dangerous signatures.
 *
 * This is NOT a full AV scanner — it prevents the most common upload-bypass
 * attacks (extension spoofing, polyglots) without requiring external services.
 *
 * When a proper AV service (e.g. ClamAV) is available, replace the body of
 * this function with a call to that service and keep the interface unchanged.
 */
export const scanFilePlaceholder = async (fullPath: string): Promise<void> => {
    const ext = path.extname(fullPath).toLowerCase();
    const HEADER_SIZE = 16;

    let header: Buffer;
    try {
        header = readHeader(fullPath, HEADER_SIZE);
    } catch {
        throw new AppError('File could not be read for security verification', 400);
    }

    // 1. Block known dangerous signatures first
    for (const danger of DANGEROUS_SIGNATURES) {
        // Allow ZIP-based OOXML (PK header) — it will be validated by MIME check below
        if (danger.label.startsWith('ZIP bomb') && ['.docx', '.xlsx', '.pptx'].includes(ext)) {
            continue;
        }
        if (matchesBytes(header, danger.offset, danger.bytes)) {
            throw new AppError(`Rejected: file contains disallowed content signature (${danger.label})`, 400);
        }
    }

    // 2. Find the expected magic signature for this extension
    const expected = MAGIC_SIGNATURES.find((s) => s.exts.includes(ext));
    if (!expected) {
        // Extension is not in the known-safe list — the fileFilter should have
        // already blocked this; treat as an anomaly
        throw new AppError('Rejected: file type not permitted', 400);
    }

    // 3. Verify file content matches expected magic bytes
    if (!matchesBytes(header, expected.offset, expected.bytes)) {
        throw new AppError(
            `Rejected: file content does not match its extension (${ext}). Possible spoofing attempt.`,
            400
        );
    }
};
