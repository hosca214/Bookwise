/**
 * Bookwise finance logic.
 *
 * Pure, deterministic financial calculations for the Reservoir system.
 * No UI, no side effects — safe to port to a server runtime (Claude Code,
 * Cloudflare Workers, Node) for final deployment.
 *
 * Hard rules (Bookwise Architect spec):
 *   - 25% of every business deposit is allocated to the Tax reservoir.
 *   - IRS standard mileage rate: $0.67 per mile (2024).
 *   - Personal transactions are flagged via `is_personal` and excluded
 *     from all reservoir math.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard-coded Tax Set-Aside rate. 25% of every business deposit. */
export const TAX_SET_ASIDE_RATE = 0.25;

/** IRS 2024 standard mileage rate, USD per mile. */
export const MILEAGE_RATE_USD_PER_MILE = 0.67;

/** Default operations allocation rate (mock; tunable per business). */
export const DEFAULT_OPS_RATE = 0.2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReservoirKey = "profit" | "tax" | "ops";

export interface ReservoirAllocation {
  profit: number;
  tax: number;
  ops: number;
}

/**
 * Tip calculation result.
 *
 *   - "matched"    → deposit and serviceValue both present; tip = deposit - serviceValue.
 *   - "unmatched"  → deposit recorded with no service value to reconcile against.
 *   - "no-deposit" → no deposit recorded; nothing to compute.
 */
export type TipFlag = "matched" | "unmatched" | "no-deposit";

export interface TipResult {
  flag: TipFlag;
  /** Bank deposit amount in USD. */
  deposit: number;
  /** Service value (invoiced amount) in USD. */
  serviceValue: number;
  /** Calculated tip (deposit - serviceValue). 0 when not matched. */
  tip: number;
}

/**
 * Financial transaction. Mirrors the row shape we'll persist when
 * Lovable Cloud / wrangler is wired up.
 */
export interface FinancialTransaction {
  id: string;
  /** ISO date (YYYY-MM-DD) of the transaction. */
  date: string;
  /** Amount in USD. Positive = inflow, negative = outflow. */
  amount: number;
  /** Optional matched service value used to compute tips. */
  service_value?: number | null;
  /** Free-text label (e.g. "Massage — J. Smith"). */
  description?: string | null;
  /**
   * Personal vs business. Personal transactions are excluded from all
   * reservoir allocations and tax math.
   */
  is_personal: boolean;
  /** URL of forwarded receipt (e.g. email forwarder, Google Drive). */
  forwarded_receipt_link: string;
}

/** Helper for constructing new transactions with the required defaults. */
export function createTransaction(
  partial: Partial<FinancialTransaction> & Pick<FinancialTransaction, "id" | "date" | "amount">,
): FinancialTransaction {
  return {
    service_value: null,
    description: null,
    is_personal: false,
    forwarded_receipt_link: "",
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Tip logic
// ---------------------------------------------------------------------------

/**
 * Calculate tip from a bank deposit and the day's invoiced service value.
 *
 * Rules:
 *   - If no deposit → flag: "no-deposit", tip = 0.
 *   - If deposit > 0 but no serviceValue → flag: "unmatched", tip = 0.
 *     (We refuse to guess; this surfaces a reconciliation task.)
 *   - Otherwise → flag: "matched", tip = max(0, deposit - serviceValue).
 */
export function calculateTip(deposit: number, serviceValue?: number | null): TipResult {
  const dep = Number.isFinite(deposit) ? Math.max(0, deposit) : 0;
  const sv = serviceValue == null || !Number.isFinite(serviceValue) ? null : Math.max(0, serviceValue);

  if (dep === 0) {
    return { flag: "no-deposit", deposit: 0, serviceValue: sv ?? 0, tip: 0 };
  }
  if (sv === null || sv === 0) {
    return { flag: "unmatched", deposit: dep, serviceValue: 0, tip: 0 };
  }
  const tip = Math.max(0, round2(dep - sv));
  return { flag: "matched", deposit: dep, serviceValue: sv, tip };
}

// ---------------------------------------------------------------------------
// Tax / reservoir allocation
// ---------------------------------------------------------------------------

/**
 * Allocate a business deposit across the three reservoirs.
 *
 * Hard rule: 25% of every business deposit goes to Tax.
 * Operations rate is configurable (default 20%). Profit gets the remainder.
 *
 * Personal transactions (`is_personal: true`) return zeroed allocations —
 * they never touch the reservoirs.
 */
export function allocateDeposit(
  amount: number,
  options: { isPersonal?: boolean; opsRate?: number } = {},
): ReservoirAllocation {
  const { isPersonal = false, opsRate = DEFAULT_OPS_RATE } = options;

  if (isPersonal || !Number.isFinite(amount) || amount <= 0) {
    return { profit: 0, tax: 0, ops: 0 };
  }

  const tax = round2(amount * TAX_SET_ASIDE_RATE);
  const ops = round2(amount * clamp(opsRate, 0, 1 - TAX_SET_ASIDE_RATE));
  const profit = round2(amount - tax - ops);

  return { profit, tax, ops };
}

/**
 * Allocate a batch of transactions. Personal transactions are skipped.
 * Negative amounts (refunds/expenses) reverse the allocation.
 */
export function allocateTransactions(
  txns: FinancialTransaction[],
  options: { opsRate?: number } = {},
): ReservoirAllocation {
  return txns.reduce<ReservoirAllocation>(
    (acc, t) => {
      if (t.is_personal) return acc;
      const sign = t.amount >= 0 ? 1 : -1;
      const a = allocateDeposit(Math.abs(t.amount), { opsRate: options.opsRate });
      return {
        profit: round2(acc.profit + sign * a.profit),
        tax: round2(acc.tax + sign * a.tax),
        ops: round2(acc.ops + sign * a.ops),
      };
    },
    { profit: 0, tax: 0, ops: 0 },
  );
}

// ---------------------------------------------------------------------------
// Mileage logic
// ---------------------------------------------------------------------------

export interface MileageDeduction {
  miles: number;
  /** Deductible amount = miles * $0.67. */
  deduction: number;
  /** Tax savings = deduction * tax rate (defaults to 25%). */
  taxSavings: number;
}

/**
 * Calculate deduction and tax savings from miles driven for business.
 *
 *   deduction   = miles * $0.67
 *   taxSavings  = deduction * taxRate (defaults to the 25% set-aside)
 */
export function calculateMileageDeduction(
  miles: number,
  taxRate: number = TAX_SET_ASIDE_RATE,
): MileageDeduction {
  const m = Number.isFinite(miles) ? Math.max(0, miles) : 0;
  const deduction = round2(m * MILEAGE_RATE_USD_PER_MILE);
  const taxSavings = round2(deduction * clamp(taxRate, 0, 1));
  return { miles: m, deduction, taxSavings };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Format a dollar amount for display. Always rounds up to the nearest dollar. */
export function fmt(amount: number): string {
  return `$${Math.ceil(amount)}`;
}
