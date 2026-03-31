import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { userId: string; role: string; workspaceId?: string; impersonatingWorkspaceId?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; role: string; workspaceId?: string; impersonatingWorkspaceId?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; workspaceId?: string; impersonatingWorkspaceId?: string };
  } catch {
    return null;
  }
}
