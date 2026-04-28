import { Transaction } from './supabase'
import { SCHEDULE_C_MAP } from './iqMaps'
import { TAX_SET_ASIDE_RATE, MILEAGE_RATE_USD_PER_MILE } from './finance'

export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r.map((c) => {
        const s = String(c)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')
    )
    .join('\n')
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generateCPAExport(
  transactions: Transaction[],
  practiceName: string,
  dateRange: string
): string {
  const businessTxns = transactions.filter((t) => !t.is_personal)

  const header = [
    `Bookwise Export - ${practiceName} - ${dateRange}`,
    'Always review with a licensed CPA before filing.',
    '',
  ].join('\n')

  const rows: (string | number)[][] = [
    ['Date', 'Description', 'Category', 'Schedule C Category', 'Schedule C Line', 'Amount', 'Type', 'Receipt URL'],
    ...businessTxns
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => {
        const scheduleC = SCHEDULE_C_MAP[t.category_key]
        return [
          t.date,
          t.notes || t.category_key,
          t.category_key,
          scheduleC?.label || 'Other Expense',
          scheduleC?.line || 'Line 27a',
          t.type === 'expense' ? -Math.abs(t.amount) : t.amount,
          t.type,
          t.receipt_url || '',
        ]
      }),
  ]

  const taxPct = `${Math.round(TAX_SET_ASIDE_RATE * 100)}%`
  const mileageRate = `$${MILEAGE_RATE_USD_PER_MILE.toFixed(2)}`

  const methodology = [
    '',
    '',
    'CALCULATION METHODOLOGY',
    '',
    ['Item', 'Formula', 'Notes'],
    ['Net Profit', 'Gross Income minus Business Expenses', 'Personal transactions excluded from all calculations'],
    ['Tax Reserve', `Net Profit x ${taxPct}`, `Recommended safety rate covering federal income tax and self-employment tax. Confirm with your CPA.`],
    ['Gross Income', 'Sum of all income transactions marked as business', 'Excludes personal income entries'],
    ['Business Expenses', 'Sum of all expense transactions marked as business', 'Excludes personal expense entries'],
    ['Mileage Deduction', `Miles x ${mileageRate} per mile`, 'IRS standard mileage rate (2024). Subject to annual IRS adjustment.'],
    ['Schedule C Lines', 'Assigned per category key', 'See Schedule C column above. Always review with a licensed CPA before filing.'],
  ].map((r) => (Array.isArray(r) ? toCSV([r]) : r)).join('\n')

  return header + toCSV(rows) + methodology
}

