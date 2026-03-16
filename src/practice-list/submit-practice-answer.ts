import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';
import type { PracticeAnswerResponse, SubmitPracticeAnswerRequest } from '../types/practice-list.interface';

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

function isSubmitPracticeAnswerRequest(value: unknown): value is SubmitPracticeAnswerRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const indexValue: unknown = Reflect.get(value, 'index');
  const answerValue: unknown = Reflect.get(value, 'answer');
  const hasValidIndex = Number.isInteger(indexValue) && Number(indexValue) >= 0;
  const hasValidAnswer = typeof answerValue === 'string' && answerValue.trim().length > 0;

  return hasValidIndex && hasValidAnswer;
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

export async function submitPracticeAnswer(
  req: AuthenticatedRequest & {
    body: unknown
    params: { listId?: string | string[] }
  },
  res: Response,
): Promise<void> {
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

  if (!isSubmitPracticeAnswerRequest(req.body)) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid request body' });

    return;
  }

  const { index: answeredIndex, answer } = req.body;

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
        _count: {
          select: { words: true },
        },
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

    const totalWords = practiceList._count.words;

    if (answeredIndex >= totalWords) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Answered index is out of range' });

      return;
    }

    const answeredWord = practiceList.words[answeredIndex];
    const answerIsCorrect = normalizeAnswer(answer) === normalizeAnswer(answeredWord.englishWord);

    const nextIndex = answeredIndex + 1;
    const hasNextWord = nextIndex < totalWords;
    const nextWord = hasNextWord ? practiceList.words[nextIndex] : null;

    const response: PracticeAnswerResponse = {
      listId: practiceList.id,
      title: practiceList.title,
      totalWords,
      answerIsCorrect,
      currentWordIndex: hasNextWord ? nextIndex + 1 : null,
      currentWord: nextWord
        ? {
            id: nextWord.id,
            dutchWord: nextWord.dutchWord,
          }
        : null,
      hasNextWord,
      nextIndex: hasNextWord ? nextIndex : null,
    };

    res.status(StatusCodes.OK).json(response);
  }
  catch (error) {
    console.error('Submit practice answer error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to submit practice answer' });
  }
}
