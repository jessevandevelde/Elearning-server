import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';
import type { PracticeListWordInput } from '../types/practice-list.interface';

interface UpdatePracticeListRequest {
  title?: string
  isPrivate?: boolean
  words?: PracticeListWordInput[]
}

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

function isUpdatePracticeListRequest(value: unknown): value is UpdatePracticeListRequest {
  if (!isRecord(value)) {
    return false;
  }

  const titleValue: unknown = Reflect.get(value, 'title');
  const isPrivateValue: unknown = Reflect.get(value, 'isPrivate');
  const wordsValue: unknown = Reflect.get(value, 'words');

  const hasValidTitle = titleValue === undefined || (typeof titleValue === 'string' && titleValue.trim().length > 0);
  const hasValidIsPrivate = isPrivateValue === undefined || typeof isPrivateValue === 'boolean';
  const hasValidWords = wordsValue === undefined || (Array.isArray(wordsValue) && wordsValue.every(isWordInput));
  const hasAtLeastOneField = titleValue !== undefined || isPrivateValue !== undefined || wordsValue !== undefined;

  return hasValidTitle && hasValidIsPrivate && hasValidWords && hasAtLeastOneField;
}

export async function updateList(
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

  const requestBody: unknown = req.body;

  if (!isUpdatePracticeListRequest(requestBody)) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid request body' });

    return;
  }

  const { title, isPrivate, words } = requestBody;

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
      res.status(StatusCodes.FORBIDDEN).json({ message: 'You can only edit your own practice lists' });

      return;
    }

    const updatedList = await prisma.$transaction(async (tx) => {
      const list = await tx.practiceList.update({
        where: { id: listId },
        data: {
          title,
          isPrivate,
        },
      });

      if (words !== undefined) {
        await tx.word.deleteMany({
          where: {
            practiceListId: listId,
          },
        });

        if (words.length > 0) {
          await tx.word.createMany({
            data: words.map(word => ({
              dutchWord: word.dutchWord,
              englishWord: word.englishWord,
              practiceListId: listId,
            })),
          });
        }
      }

      return tx.practiceList.findUnique({
        where: { id: list.id },
        include: { words: true },
      });
    });

    res.status(StatusCodes.OK).json(updatedList);
  }
  catch (error) {
    console.error('Update practice list error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update practice list' });
  }
}
