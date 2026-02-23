import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';

interface AuthenticatedRequest extends Request {
  user?: { id: number }
}

interface PracticeListResponse {
  publicLists: {
    id: number
    title: string
    isPrivate: boolean
    userId: number
  }[]
  privateLists: {
    id: number
    title: string
    isPrivate: boolean
    userId: number
  }[]
}

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
      },
    });

    const publicLists = practiceLists.filter(list => !list.isPrivate);
    const privateLists = practiceLists.filter(list => list.isPrivate);

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
