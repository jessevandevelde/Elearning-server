import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';
import type { PracticeWordResponse } from '../types/practice-list.interface';

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

function parseIndexQuery(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function parseReverseModeQuery(value: unknown): boolean | null {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return null;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return null;
}

export async function getPracticeWord(req: AuthenticatedRequest, res: Response): Promise<void> {
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

  const requestedIndex = parseIndexQuery(req.query.index);

  if (requestedIndex === null) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid index query parameter' });

    return;
  }

  const requestedReverseMode = parseReverseModeQuery(req.query.reverseMode);

  if (req.query.reverseMode !== undefined && requestedReverseMode === null) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid reverseMode query parameter' });

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

    const practiceProgress = await prisma.practiceProgress.findUnique({
      where: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        userId_practiceListId: {
          userId,
          practiceListId: listId,
        },
      },
      select: {
        correctAnswers: true,
        wrongAnswers: true,
        currentPosition: true,
        reverseMode: true,
      },
    });

    const hasSavedProgress = practiceProgress !== null && practiceProgress.currentPosition < totalWords;
    const resolvedIndex = requestedIndex ?? (hasSavedProgress ? practiceProgress.currentPosition : 0);

    if (resolvedIndex >= totalWords) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Requested index is out of range' });

      return;
    }

    const resumedFromSavedProgress = requestedIndex === undefined && hasSavedProgress;
    const reverseMode = requestedReverseMode ?? (resumedFromSavedProgress ? practiceProgress.reverseMode : false);
    const correctAnswers = resumedFromSavedProgress ? practiceProgress.correctAnswers : 0;
    const wrongAnswers = resumedFromSavedProgress ? practiceProgress.wrongAnswers : 0;

    const currentWord = practiceList.words[resolvedIndex];

    const response: PracticeWordResponse = {
      listId: practiceList.id,
      title: practiceList.title,
      totalWords,
      reverseMode,
      correctAnswers,
      wrongAnswers,
      resumedFromSavedProgress,
      currentWordIndex: resolvedIndex + 1,
      currentWord: {
        id: currentWord.id,
        dutchWord: currentWord.dutchWord,
        englishWord: reverseMode ? currentWord.englishWord : undefined,
      },
      hasNextWord: resolvedIndex + 1 < totalWords,
      nextIndex: resolvedIndex + 1 < totalWords ? resolvedIndex + 1 : null,
    };

    res.status(StatusCodes.OK).json(response);
  }
  catch (error) {
    console.error('Get practice word error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch practice word' });
  }
}
