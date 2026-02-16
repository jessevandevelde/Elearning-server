import type { Request, Response } from 'express';
import { randomBytes, scryptSync } from 'crypto';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { User } from '../types/user.interface';

const randomBytesNumber = 16;
const keylen = 64;

export async function register(req: Request, res: Response): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const { name, email, password } = req.body as User;

  if (!name || !email || !password) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Name, email, and password are required' });

    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      res.status(StatusCodes.CONFLICT).json({ message: 'User already exists' });

      return;
    }

    const salt = randomBytes(randomBytesNumber).toString('hex');
    const hashedPassword = scryptSync(password, salt, keylen).toString('hex');
    const storedPassword = `${salt}:${hashedPassword}`;

    await prisma.user.create({
      data: {
        name,
        email,
        password: storedPassword,
      },
    });

    res.status(StatusCodes.CREATED).json({ message: 'User registered successfully' });
  }
  catch (error) {
    console.error('Register error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to register user' });
  }
}
