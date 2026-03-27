import type { SessionStatus, UserRole } from '../lib/database.types';

export type ApprovalTransition = {
  from: SessionStatus;
  to: SessionStatus;
  requiredRoles: UserRole[];
  label: string;
};

export const APPROVAL_TRANSITIONS: ApprovalTransition[] = [
  { from: 'draft', to: 'submitted', requiredRoles: ['staff', 'leader', 'manager'], label: 'Nộp duyệt' },
  { from: 'submitted', to: 'approved', requiredRoles: ['leader', 'manager'], label: 'Duyệt' },
  { from: 'submitted', to: 'rejected', requiredRoles: ['leader', 'manager'], label: 'Từ chối' },
  { from: 'rejected', to: 'draft', requiredRoles: ['staff', 'leader', 'manager'], label: 'Sửa lại' },
  { from: 'approved', to: 'locked', requiredRoles: ['manager'], label: 'Khóa' },
  { from: 'approved', to: 'submitted', requiredRoles: ['manager'], label: 'Hoàn trả' },
];

export function getAllowedTransitions(
  currentStatus: SessionStatus,
  userRole: UserRole
): ApprovalTransition[] {
  return APPROVAL_TRANSITIONS.filter(
    t => t.from === currentStatus && t.requiredRoles.includes(userRole)
  );
}

export function canEditSession(status: SessionStatus, role: UserRole): boolean {
  if (status === 'locked') return role === 'manager';
  if (status === 'approved') return role === 'manager';
  if (status === 'submitted') return role !== 'staff';
  return true;
}

export function logApproval(
  _entityType: string,
  _entityId: string,
  _fromStatus: string,
  _toStatus: string,
  _userId: string,
  _reason?: string
): void {}

export function logAudit(
  _userId: string,
  _action: string,
  _entityType: string,
  _entityId: string,
  _before?: Record<string, unknown>,
  _after?: Record<string, unknown>,
  _notes?: string
): void {}
