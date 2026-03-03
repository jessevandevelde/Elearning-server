import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';

export interface AuthenticatedRequest extends Request {
  user?: { id: number }
}

function getTokenFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');

    if (rawName !== 'auth_token') {
      continue;
    }

    const rawValue = rawValueParts.join('=');

    if (!rawValue) {
      return null;
    }

    return decodeURIComponent(rawValue);
  }

  return null;
}

function getTokenFromHeader(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export function isauthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'JWT secret not configured' });

    return;
  }

  const tokenFromCookie = getTokenFromCookieHeader(req.header('cookie'));
  const tokenFromHeader = getTokenFromHeader(req.header('authorization'));
  const token = tokenFromCookie ?? tokenFromHeader;

  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });

    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);

    if (typeof payload === 'string') {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });

      return;
    }

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });

      return;
    }

    req.user = { id: userId };
    next();
  }
  catch (_error) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated' });
  }
}
