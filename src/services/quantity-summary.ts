import type { QuantityLog, LotProgress } from '../lib/database.types';

export function calcLotProgress(
  orderQty: number,
  logs: Pick<QuantityLog, 'quantity'>[]
): LotProgress {
  const produced_qty = logs.reduce((s, l) => s + l.quantity, 0);
  const remaining_qty = orderQty - produced_qty;
  const progress_pct = orderQty > 0 ? produced_qty / orderQty : 0;
  return {
    order_lot_id: '',
    order_qty: orderQty,
    produced_qty,
    remaining_qty,
    progress_pct,
    is_over_produced: remaining_qty < 0,
  };
}

export function progressBarColor(pct: number): string {
  if (pct > 1) return 'bg-red-500';
  if (pct >= 0.8) return 'bg-amber-500';
  return 'bg-blue-500';
}

export function validateQuantityLog(qty: number): string | null {
  if (isNaN(qty) || qty < 0) return 'Số lượng không được âm';
  if (!Number.isInteger(qty)) return 'Số lượng phải là số nguyên';
  return null;
}
