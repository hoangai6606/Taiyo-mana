import type { SessionStatus, UserRole } from '../lib/database.types';
import { supabase } from '../lib/supabase';

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

export async function logApproval(
  entityType: string,
  entityId: string,
  fromStatus: string,
  toStatus: string,
  userId: string,
  reason?: string
): Promise<void> {
  await supabase.from('approval_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    from_status: fromStatus,
    to_status: toStatus,
    performed_by: userId,
    reason: reason ?? null,
  });
}

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  notes?: string
): Promise<void> {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_snapshot: before ?? null,
    new_snapshot: after ?? null,
    notes: notes ?? null,
  });
}
