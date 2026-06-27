import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
    getContracts,
    getContract,
    createContractHandler,
    updateContractHandler,
    deleteContractHandler,
    uploadContractAttachment,
    getContractAttachment
} from '../controllers/contract.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';
import { isAllowedFile, sanitizeUploadFileName } from '../utils/fileSecurity.utils';
import { Roles } from '../constants/roles';

const router = express.Router();

const attachmentsDir = path.join(__dirname, '../../uploads/contracts');
if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, attachmentsDir),
    filename: (_req, file, cb) => {
        const safeName = sanitizeUploadFileName(file.originalname);
        const ext = path.extname(safeName);
        const base = path.basename(safeName, ext);
        cb(null, `${base}-${Date.now()}${ext.toLowerCase()}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ];
        const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx'];
        if (!isAllowedFile(file.originalname, file.mimetype, allowedTypes, allowedExts)) {
            cb(new Error('Invalid attachment type'));
            return;
        }
        cb(null, true);
    }
});

router.use(protect);

router.route('/')
    .get(checkPermission('contracts', 'view'), getContracts)
    .post(checkPermission('contracts', 'create'), createContractHandler);

router.get('/attachments/:fileName', checkPermission('contracts', 'view'), getContractAttachment);

router.post(
    '/:id/attachments',
    checkPermission('contracts', 'edit'),
    upload.single('attachment'),
    uploadContractAttachment
);

router.route('/:id')
    .get(checkPermission('contracts', 'view'), getContract)
    .put(checkPermission('contracts', 'edit'), updateContractHandler)
    .delete(authorize(Roles.ADMIN, Roles.MANAGER), checkPermission('contracts', 'delete'), deleteContractHandler);

export default router;
