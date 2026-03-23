import type { RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { AuthenticatedRequest } from '../authentication/isauthenticated';

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

export const removePracticeList: RequestHandler<{ listId: string }> = async (req, res: Response): Promise<void> => {
  const authenticatedRequest = req as AuthenticatedRequest;
  const userId = authenticatedRequest.user?.id;

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
      res.status(StatusCodes.FORBIDDEN).json({ message: 'You can only delete your own practice lists' });

      return;
    }

    await prisma.practiceList.delete({
      where: {
        id: listId,
      },
    });

    res.status(StatusCodes.OK).json({ message: 'Practice list deleted successfully' });
  }
  catch (error) {
    console.error('Delete practice list error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete practice list' });
  }
};
