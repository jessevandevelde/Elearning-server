import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';
import type { PracticeListDetailResponse } from '../types/practice-list.interface';

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

export async function getPracticeListById(req: AuthenticatedRequest, res: Response): Promise<void> {
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

    const response: PracticeListDetailResponse = {
      id: practiceList.id,
      title: practiceList.title,
      isPrivate: practiceList.isPrivate,
      userId: practiceList.userId,
      words: practiceList.words,
    };

    res.status(StatusCodes.OK).json(response);
  }
  catch (error) {
    console.error('Get practice list by id error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch practice list' });
  }
}
