import { Router } from 'express';
import { uploadList } from './upload-list';
import { getPracticeLists } from './get-lists';

const router = Router();

router.post('/upload', uploadList);
router.get('/get-lists', getPracticeLists);

export default router;
