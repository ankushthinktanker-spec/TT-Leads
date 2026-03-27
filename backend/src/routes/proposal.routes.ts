import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    getProposals,
    getProposal,
    createProposal,
    createProposalFromTemplate,
    updateProposal,
    deleteProposal,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    duplicateProposal,
    generatePDF,
    downloadPDF,
    streamPDF,
    sendProposal,
    getProposalLogo,
    uploadProposalLogo
} from '../controllers/proposal.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';
import { isAllowedFile, sanitizeUploadFileName } from '../utils/fileSecurity.utils';
import { sensitiveLimiter } from '../middleware/rateLimiter';

const router = express.Router();

const logosDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, logosDir),
    filename: (_req, file, cb) => {
        const safeName = sanitizeUploadFileName(file.originalname);
        const ext = path.extname(safeName);
        const baseName = path.basename(safeName, ext);
        cb(null, `${baseName}-${Date.now()}${ext.toLowerCase()}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
        if (!isAllowedFile(file.originalname, file.mimetype, allowedTypes, allowedExts)) {
            cb(new Error('Only PNG, JPG, or WEBP images are allowed'));
            return;
        }
        cb(null, true);
    }
});

router.use(protect);

router.post('/logo', checkPermission('proposals', 'edit'), upload.single('logo'), uploadProposalLogo);
router.get('/logo/:fileName', checkPermission('proposals', 'view'), getProposalLogo);

router.route('/')
    .get(checkPermission('proposals', 'view'), getProposals)
    .post(checkPermission('proposals', 'create'), createProposal);

router.post('/from-template/:templateId', checkPermission('proposals', 'create'), createProposalFromTemplate);

router.route('/:id')
    .get(checkPermission('proposals', 'view'), getProposal)
    .put(checkPermission('proposals', 'edit'), updateProposal)
    .delete(authorize('Admin', 'Manager'), checkPermission('proposals', 'delete'), deleteProposal);

// Section management
router.post('/:id/sections', checkPermission('proposals', 'edit'), addSection);
router.put('/:id/sections/:sectionId', checkPermission('proposals', 'edit'), updateSection);
router.delete('/:id/sections/:sectionId', checkPermission('proposals', 'edit'), deleteSection);
router.post('/:id/sections/reorder', checkPermission('proposals', 'edit'), reorderSections);

// Versioning & PDF - Apply centralized sensitive operations rate limiter
router.post('/:id/duplicate', checkPermission('proposals', 'create'), duplicateProposal);
router.post('/:id/generate-pdf', checkPermission('proposals', 'export'), sensitiveLimiter, generatePDF);
router.post('/:id/send', checkPermission('proposals', 'edit'), sensitiveLimiter, sendProposal);
router.get('/:id/download', checkPermission('proposals', 'export'), sensitiveLimiter, downloadPDF);
router.get('/:id/pdf', checkPermission('proposals', 'export'), sensitiveLimiter, streamPDF);

export default router;
