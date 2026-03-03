import { Router } from 'express';
import { uploadList } from './upload-list';
import { getPracticeLists } from './get-lists';
import { isauthenticated } from '../authentication/isauthenticated';

const router = Router();

router.use(isauthenticated);
router.post('/upload', uploadList);
router.get('/get-lists', getPracticeLists);

export default router;
