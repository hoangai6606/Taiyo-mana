import type { InspectionLine, InspectionLineCalc, SessionSummary } from '../lib/database.types';
import { DEFECT_THRESHOLD } from '../lib/database.types';

export function calcLine(line: InspectionLine): InspectionLineCalc {
  const accepted_qty = line.first_pass_good_qty + line.reinspection_good_qty;
  const defect_rate =
    line.inspected_qty > 0 ? line.defect_qty / line.inspected_qty : 0;
  return { ...line, accepted_qty, defect_rate };
}

export function calcSessionSummary(lines: InspectionLine[]): SessionSummary {
  const totals = lines.reduce(
    (acc, l) => ({
      total_inspected: acc.total_inspected + l.inspected_qty,
      total_first_pass_good: acc.total_first_pass_good + l.first_pass_good_qty,
      total_defect: acc.total_defect + l.defect_qty,
      total_reinspection: acc.total_reinspection + l.reinspection_qty,
      total_reinspection_good: acc.total_reinspection_good + l.reinspection_good_qty,
      total_accepted: acc.total_accepted + l.first_pass_good_qty + l.reinspection_good_qty,
      total_shipment: acc.total_shipment + l.shipment_qty,
    }),
    {
      total_inspected: 0,
      total_first_pass_good: 0,
      total_defect: 0,
      total_reinspection: 0,
      total_reinspection_good: 0,
      total_accepted: 0,
      total_shipment: 0,
    }
  );
  const session_defect_rate =
    totals.total_inspected > 0
      ? totals.total_defect / totals.total_inspected
      : 0;
  return { ...totals, session_defect_rate };
}

export function isDefectRateHigh(rate: number): boolean {
  return rate > DEFECT_THRESHOLD;
}

export function formatDefectRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function validateLine(line: Partial<InspectionLine>): string[] {
  const errors: string[] = [];
  if ((line.inspected_qty ?? 0) < 0) errors.push('Số lượng kiểm không được âm');
  if ((line.defect_qty ?? 0) < 0) errors.push('Số lượng lỗi không được âm');
  if ((line.first_pass_good_qty ?? 0) < 0) errors.push('Số lượng đạt không được âm');
  if ((line.reinspection_qty ?? 0) < 0) errors.push('Số lượng tái kiểm không được âm');
  if ((line.reinspection_good_qty ?? 0) < 0) errors.push('Số lượng tái kiểm đạt không được âm');
  if (
    (line.defect_qty ?? 0) > (line.inspected_qty ?? 0) &&
    (line.inspected_qty ?? 0) > 0
  ) {
    errors.push('Số lượng lỗi không được vượt quá số lượng kiểm');
  }
  if ((line.reinspection_good_qty ?? 0) > (line.reinspection_qty ?? 0)) {
    errors.push('Số lượng tái kiểm đạt không được vượt số lượng tái kiểm');
  }
  return errors;
}
