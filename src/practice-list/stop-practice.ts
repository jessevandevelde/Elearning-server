import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';
import type { PracticeProgressRecord, PracticeProgressResponse, StopPracticeRequest, StopPracticeResponse } from '../types/practice-list.interface';

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

function isStopPracticeRequest(value: unknown): value is StopPracticeRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const correctAnswersValue: unknown = Reflect.get(value, 'correctAnswers');
  const wrongAnswersValue: unknown = Reflect.get(value, 'wrongAnswers');
  const currentPositionValue: unknown = Reflect.get(value, 'currentPosition');
  const reverseModeValue: unknown = Reflect.get(value, 'reverseMode');

  const hasValidCorrectAnswers = Number.isInteger(correctAnswersValue) && Number(correctAnswersValue) >= 0;
  const hasValidWrongAnswers = Number.isInteger(wrongAnswersValue) && Number(wrongAnswersValue) >= 0;
  const hasValidCurrentPosition = Number.isInteger(currentPositionValue) && Number(currentPositionValue) >= 0;
  const hasValidReverseMode = typeof reverseModeValue === 'boolean' || reverseModeValue === undefined;

  return hasValidCorrectAnswers && hasValidWrongAnswers && hasValidCurrentPosition && hasValidReverseMode;
}

export async function stopPractice(
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

  if (!isStopPracticeRequest(req.body)) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid request body' });

    return;
  }

  const { correctAnswers, wrongAnswers, currentPosition, reverseMode = false } = req.body;

  try {
    // Verify the practice list exists and user has access
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
        title: true,
        _count: {
          select: { words: true },
        },
      },
    });

    if (!practiceList) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Practice list not found' });

      return;
    }

    // Validate current position is not exceeding total words
    if (currentPosition > practiceList._count.words) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Current position exceeds total words' });

      return;
    }

    if (currentPosition >= practiceList._count.words) {
      await prisma.practiceProgress.deleteMany({
        where: {
          userId,
          practiceListId: listId,
        },
      });

      const response: StopPracticeResponse = {
        message: 'Practice is already completed; no progress saved',
        data: null,
        results: {
          totalAttempts: correctAnswers + wrongAnswers,
          correctAnswers,
          wrongAnswers,
          accuracy: (correctAnswers + wrongAnswers) > 0 ? Math.round((correctAnswers / (correctAnswers + wrongAnswers)) * PERCENTAGE_MULTIPLIER) : 0,
          position: currentPosition,
          totalWords: practiceList._count.words,
          completedPercentage: practiceList._count.words > 0
            ? Math.round((currentPosition / practiceList._count.words) * PERCENTAGE_MULTIPLIER)
            : 0,
        },
      };

      res.status(StatusCodes.OK).json(response);

      return;
    }

    // Upsert practice progress (create or update)
    const [practiceProgress] = await prisma.$queryRaw<PracticeProgressRecord[]>`
      INSERT INTO "PracticeProgress" (
        "userId",
        "practiceListId",
        "correctAnswers",
        "wrongAnswers",
        "currentPosition",
        "reverseMode",
        "updatedAt"
      )
      VALUES (
        ${userId},
        ${listId},
        ${correctAnswers},
        ${wrongAnswers},
        ${currentPosition},
        ${reverseMode},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId", "practiceListId")
      DO UPDATE SET
        "correctAnswers" = EXCLUDED."correctAnswers",
        "wrongAnswers" = EXCLUDED."wrongAnswers",
        "currentPosition" = EXCLUDED."currentPosition",
        "reverseMode" = EXCLUDED."reverseMode",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING
        "id",
        "userId",
        "practiceListId",
        "correctAnswers",
        "wrongAnswers",
        "currentPosition",
        "reverseMode",
        "createdAt",
        "updatedAt";
    `;

    const practiceProgressResponse: PracticeProgressResponse = {
      id: practiceProgress.id,
      userId: practiceProgress.userId,
      practiceListId: practiceProgress.practiceListId,
      correctAnswers: practiceProgress.correctAnswers,
      wrongAnswers: practiceProgress.wrongAnswers,
      currentPosition: practiceProgress.currentPosition,
      reverseMode: practiceProgress.reverseMode,
      createdAt: practiceProgress.createdAt.toISOString(),
      updatedAt: practiceProgress.updatedAt.toISOString(),
    };

    const response: StopPracticeResponse = {
      message: 'Practice progress saved successfully',
      data: practiceProgressResponse,
      results: {
        totalAttempts: correctAnswers + wrongAnswers,
        correctAnswers,
        wrongAnswers,
        accuracy: (correctAnswers + wrongAnswers) > 0 ? Math.round((correctAnswers / (correctAnswers + wrongAnswers)) * PERCENTAGE_MULTIPLIER) : 0,
        position: currentPosition,
        totalWords: practiceList._count.words,
        completedPercentage: practiceList._count.words > 0
          ? Math.round((currentPosition / practiceList._count.words) * PERCENTAGE_MULTIPLIER)
          : 0,
      },
    };

    res.status(StatusCodes.OK).json(response);
  }
  catch (error) {
    console.error('Stop practice error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to save practice progress' });
  }
}
