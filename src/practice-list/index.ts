import { Router } from 'express';
import { uploadList } from './upload-list';
import { getPracticeLists } from './get-lists';
import { getPracticeWord } from './get-practice-word';
import { submitPracticeAnswer } from './submit-practice-answer';
import { isauthenticated } from '../authentication/isauthenticated';

const router = Router();

router.use(isauthenticated);
router.post('/upload', uploadList);
router.get('/get-lists', getPracticeLists);
router.get('/:listId/practice', getPracticeWord);
router.post('/:listId/practice/answer', submitPracticeAnswer);

export default router;
