import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';
import type { PracticeListResponse } from '../types/practice-list.interface';

export async function getPracticeLists(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });

    return;
  }

  try {
    const practiceLists = await prisma.practiceList.findMany({
      where: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        OR: [
          { isPrivate: false },
          { isPrivate: true, userId: userId },
        ],
      },
      select: {
        id: true,
        title: true,
        isPrivate: true,
        userId: true,
        _count: {
          select: { words: true },
        },
      },
    });

    const publicLists = practiceLists
      .filter(list => !list.isPrivate)
      .map(list => ({
        id: list.id,
        title: list.title,
        isPrivate: list.isPrivate,
        userId: list.userId,
        wordCount: list._count.words,
      }));

    const privateLists = practiceLists
      .filter(list => list.isPrivate)
      .map(list => ({
        id: list.id,
        title: list.title,
        isPrivate: list.isPrivate,
        userId: list.userId,
        wordCount: list._count.words,
      }));

    const response: PracticeListResponse = {
      publicLists,
      privateLists,
    };

    res.status(StatusCodes.OK).json(response);
  }
  catch (error) {
    console.error('Get practice lists error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch practice lists' });
  }
}
