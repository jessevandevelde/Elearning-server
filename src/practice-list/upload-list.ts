import type { Response } from 'express';
import prisma from '../lib/prisma';
import type { PracticeListCreateInput, PracticeListWordInput } from '../types/practice-list.interface';
import { StatusCodes } from 'http-status-codes';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWordInput(value: unknown): value is PracticeListWordInput {
  if (!isRecord(value)) {
    return false;
  }

  const hasValidDutchWord = typeof value.dutchWord === 'string' && value.dutchWord.trim().length > 0;
  const hasValidEnglishWord = typeof value.englishWord === 'string' && value.englishWord.trim().length > 0;

  return hasValidDutchWord && hasValidEnglishWord;
}

function isPracticeListCreateInput(value: unknown): value is PracticeListCreateInput {
  if (!isRecord(value)) {
    return false;
  }

  const hasValidTitle = typeof value.title === 'string' && value.title.trim().length > 0;
  const hasValidWords = Array.isArray(value.words) && value.words.every(isWordInput);
  const hasValidIsPrivate = value.isPrivate === undefined || typeof value.isPrivate === 'boolean';

  return hasValidTitle && hasValidWords && hasValidIsPrivate;
}

export async function uploadList(
  req: AuthenticatedRequest & {
    body: unknown
  },
  res: Response,
): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });

    return;
  }

  if (!isPracticeListCreateInput(req.body)) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid request body.' });

    return;
  }

  const { title, isPrivate, words } = req.body;

  if (words.length === 0) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: 'Missing required fields.' });

    return;
  }

  const parsedWords = words.map(word => ({
    dutchWord: word.dutchWord,
    englishWord: word.englishWord,
  }));

  try {
    const createdList = await prisma.practiceList.create({
      data: {
        title,
        isPrivate: isPrivate ?? true,
        userId,
        words: {
          create: parsedWords,
        },
      },
      include: { words: true },
    });

    res.status(StatusCodes.CREATED).json(createdList);
  }
  catch (_error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create practice list.' });
  }
}
