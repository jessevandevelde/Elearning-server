import { Router } from 'express';
import { uploadList } from './upload-list';

const router = Router();

router.post('/upload', uploadList);

export default router;
