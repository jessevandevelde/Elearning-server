import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';
import type { PastExerciseRow, PastExercisesResponse } from '../types/practice-list.interface';

const PERCENTAGE_MULTIPLIER = 100;

export async function getPastExercises(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });

    return;
  }

  try {
    const rows = await prisma.$queryRaw<PastExerciseRow[]>`
      SELECT
        pp."id",
        pp."practiceListId",
        pl."title",
        pp."correctAnswers",
        pp."wrongAnswers",
        pp."currentPosition",
        pp."reverseMode",
        COALESCE(word_counts."totalWords", 0)::int AS "totalWords",
        pp."updatedAt"
      FROM "PracticeProgress" pp
      INNER JOIN "PracticeList" pl
        ON pl."id" = pp."practiceListId"
      LEFT JOIN (
        SELECT
          w."practiceListId",
          COUNT(*)::int AS "totalWords"
        FROM "Word" w
        GROUP BY w."practiceListId"
      ) AS word_counts
        ON word_counts."practiceListId" = pp."practiceListId"
      WHERE pp."userId" = ${userId}
        AND pp."currentPosition" < COALESCE(word_counts."totalWords", 0)
        AND (
          pl."isPrivate" = false
          OR pl."userId" = ${userId}
        )
      ORDER BY pp."updatedAt" DESC;
    `;

    const items = rows.map(row => ({
      id: row.id,
      practiceListId: row.practiceListId,
      title: row.title,
      correctAnswers: row.correctAnswers,
      wrongAnswers: row.wrongAnswers,
      currentPosition: row.currentPosition,
      reverseMode: row.reverseMode,
      totalWords: row.totalWords,
      completedPercentage: row.totalWords > 0
        ? Math.round((row.currentPosition / row.totalWords) * PERCENTAGE_MULTIPLIER)
        : 0,
      updatedAt: row.updatedAt.toISOString(),
    }));

    const response: PastExercisesResponse = { items };

    res.status(StatusCodes.OK).json(response);
  }
  catch (error) {
    console.error('Get past exercises error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch past exercises' });
  }
}
