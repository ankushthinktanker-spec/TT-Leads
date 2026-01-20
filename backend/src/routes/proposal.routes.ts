import express from 'express';
import rateLimit from 'express-rate-limit';
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
    getProposalLogo,
    uploadProposalLogo
} from '../controllers/proposal.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = express.Router();

const logosDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, logosDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '-');
        cb(null, `${baseName}-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error('Only PNG, JPG, or WEBP images are allowed'));
            return;
        }
        cb(null, true);
    }
});

const pdfRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
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

// Versioning & PDF
router.post('/:id/duplicate', checkPermission('proposals', 'create'), duplicateProposal);
router.post('/:id/generate-pdf', checkPermission('proposals', 'export'), pdfRateLimiter, generatePDF);
router.get('/:id/download', checkPermission('proposals', 'export'), pdfRateLimiter, downloadPDF);
router.get('/:id/pdf', checkPermission('proposals', 'export'), pdfRateLimiter, streamPDF);

export default router;
