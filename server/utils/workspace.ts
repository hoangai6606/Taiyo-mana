import type { Request } from 'express';

/**
 * Get workspace ID from request, considering impersonation mode.
 * Returns impersonatingWorkspaceId if set (super admin in impersonation mode),
 * otherwise returns workspaceId from user profile.
 */
export function getWorkspaceId(req: Request): string | null {
  if (!req.user) {
    return null;
  }

  // If impersonating, return the impersonated workspace ID
  if (req.user.impersonatingWorkspaceId) {
    return req.user.impersonatingWorkspaceId;
  }

  // Otherwise return the user's own workspace ID
  return req.user.workspaceId || null;
}