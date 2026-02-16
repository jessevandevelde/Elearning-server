import type { Request, Response } from 'express';
import { scryptSync, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import prisma from '../lib/prisma';
import type { User } from '../types/user.interface';

const keylen = 64;
const DAYS_IN_WEEK = 7;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MS_IN_SECOND = 1000;
const oneWeekMs = DAYS_IN_WEEK * HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND;

interface SafeUser {
  id: number
  name: string
  email: string
}

export async function login(req: Request, res: Response): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const { email, password } = req.body as User;

  if (!email || !password) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Email and password are required' });

    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });

      return;
    }

    const [salt, storedHash] = user.password.split(':');

    if (!salt || !storedHash) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });

      return;
    }

    const derivedHash = scryptSync(password, salt, keylen);
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    if (storedHashBuffer.length !== derivedHash.length
      || !timingSafeEqual(derivedHash, storedHashBuffer)) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });

      return;
    }

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'JWT secret not configured' });

      return;
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });

    // Use secure cookies in production (HTTPS).
    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: oneWeekMs,
    });

    res.status(StatusCodes.OK).json({
      message: 'Login successful',
      user: safeUser,
      redirectUrl: 'http://127.0.0.1:4200/dashboard',
    });
  }
  catch (error) {
    console.error('Login error', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to login' });
  }
}
