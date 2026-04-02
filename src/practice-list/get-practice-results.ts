import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';
import type { PracticeProgressStatsRow, PracticeResultsResponse } from '../types/practice-list.interface';

const PERCENTAGE_MULTIPLIER = 100;

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

export async function getPracticeResults(
  req: AuthenticatedRequest,
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

  try {
    const practiceList = await prisma.practiceList.findFirst({
      where: {
        id: listId,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        OR: [
          { isPrivate: false },
          { userId },
        ],
      },
      select: {
        id: true,
        _count: {
          select: { words: true },
        },
      },
    });

    if (!practiceList) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Practice list not found' });

      return;
    }

    const [practiceProgressStats] = await prisma.$queryRaw<PracticeProgressStatsRow[]>`
      SELECT
        COALESCE(MAX("correctAnswers"), 0)::int AS "correctAnswers",
        COALESCE(MAX("wrongAnswers"), 0)::int AS "wrongAnswers",
        COALESCE(MAX("currentPosition"), 0)::int AS "position"
      FROM "PracticeProgress"
      WHERE "userId" = ${userId}
        AND "practiceListId" = ${listId};
    `;

    const { correctAnswers, wrongAnswers, position } = practiceProgressStats;
    const totalWords = practiceList._count.words;
    const totalAttempts = correctAnswers + wrongAnswers;

    const accuracy = totalAttempts > 0
      ? Math.round((correctAnswers / totalAttempts) * PERCENTAGE_MULTIPLIER)
      : 0;

    const completedPercentage = totalWords > 0
      ? Math.round((position / totalWords) * PERCENTAGE_MULTIPLIER)
      : 0;

    const response: PracticeResultsResponse = {
      message: 'Practice results retrieved successfully',
      results: {
        totalAttempts,
        correctAnswers,
        wrongAnswers,
        accuracy,
        position,
        totalWords,
        completedPercentage,
      },
      missedWords: [],
    };

    res.status(StatusCodes.OK).json(response);
  }
  catch (error) {
    console.error('Get practice results error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch practice results' });
  }
}
