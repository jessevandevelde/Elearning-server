import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import { uploadList } from './upload-list';
import { getPracticeLists } from './get-lists';
import { getPracticeWord } from './get-practice-word';
import { getPracticeResults } from './get-practice-results';
import { submitPracticeAnswer } from './submit-practice-answer';
import { stopPractice } from './stop-practice';
import { updateList } from './update-list';
import { isauthenticated, type AuthenticatedRequest } from '../authentication/isauthenticated';

function parsePositiveInteger(value: unknown): number | null {
  if (Array.isArray(value) || typeof value !== 'string') {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

const router = Router();

router.use(isauthenticated);
router.post('/upload', uploadList);
router.get('/get-lists', getPracticeLists);
router.get('/:listId', async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });

    return;
  }

  const listId = parsePositiveInteger(req.params.listId);

  if (!listId) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid list id' });

    return;
  }

  try {
    const practiceList = await prisma.practiceList.findFirst({
      where: {
        id: listId,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        OR: [
          { isPrivate: false },
          { userId: userId },
        ],
      },
      select: {
        id: true,
        title: true,
        isPrivate: true,
        userId: true,
        words: {
          select: {
            id: true,
            dutchWord: true,
            englishWord: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!practiceList) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Practice list not found' });

      return;
    }

    res.status(StatusCodes.OK).json(practiceList);
  }
  catch (error) {
    console.error('Get practice list by id error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch practice list' });
  }
});
router.patch('/:listId', updateList);
router.delete('/:listId', async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });

    return;
  }

  const listId = parsePositiveInteger(req.params.listId);

  if (!listId) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid list id' });

    return;
  }

  try {
    const existingList = await prisma.practiceList.findUnique({
      where: { id: listId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existingList) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Practice list not found' });

      return;
    }

    if (existingList.userId !== userId) {
      res.status(StatusCodes.FORBIDDEN).json({ message: 'You can only delete your own practice lists' });

      return;
    }

    await prisma.practiceList.delete({
      where: {
        id: listId,
      },
    });

    res.status(StatusCodes.OK).json({ message: 'Practice list deleted successfully' });
  }
  catch (error) {
    console.error('Delete practice list error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete practice list' });
  }
});
router.get('/:listId/practice', getPracticeWord);
router.get('/:listId/practice/results', getPracticeResults);
router.post('/:listId/practice/answer', submitPracticeAnswer);
router.post('/:listId/practice/stop', stopPractice);

export default router;
