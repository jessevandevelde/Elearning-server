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

function parseIndexQuery(value: unknown): number | null {
  if (value === undefined) {
    return 0;
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

function parseReverseModeQuery(value: unknown): boolean {
  if (value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return false;
  }

  if (typeof value === 'string') {
    return value === 'true';
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return false;
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

  const reverseMode = parseReverseModeQuery(req.query.reverseMode);

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

    if (requestedIndex >= totalWords) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Requested index is out of range' });

      return;
    }

    const currentWord = practiceList.words[requestedIndex];

    const response: PracticeWordResponse = {
      listId: practiceList.id,
      title: practiceList.title,
      totalWords,
      reverseMode,
      currentWordIndex: requestedIndex + 1,
      currentWord: {
        id: currentWord.id,
        dutchWord: currentWord.dutchWord,
        englishWord: reverseMode ? currentWord.englishWord : undefined,
      },
      hasNextWord: requestedIndex + 1 < totalWords,
      nextIndex: requestedIndex + 1 < totalWords ? requestedIndex + 1 : null,
    };

    res.status(StatusCodes.OK).json(response);
  }
  catch (error) {
    console.error('Get practice word error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch practice word' });
  }
}
