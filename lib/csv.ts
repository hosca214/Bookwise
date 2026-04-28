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

const r2 = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => `$${n.toFixed(2)}`

export function generateCPAExport(
  transactions: Transaction[],
  practiceName: string,
  dateRange: string
): string {
  const businessTxns = transactions.filter((t) => !t.is_personal)
  const incomeTxns = businessTxns.filter((t) => t.type === 'income')
  const expenseTxns = businessTxns.filter((t) => t.type === 'expense')

  const groupByCategory = (txns: Transaction[]) =>
    txns.reduce<Record<string, number>>((acc, t) => {
      acc[t.category_key] = r2((acc[t.category_key] ?? 0) + Math.abs(t.amount))
      return acc
    }, {})

  const incomeByCategory = groupByCategory(incomeTxns)
  const expensesByCategory = groupByCategory(expenseTxns)
  const grossIncome = r2(Object.values(incomeByCategory).reduce((a, b) => a + b, 0))
  const totalExpenses = r2(Object.values(expensesByCategory).reduce((a, b) => a + b, 0))
  const netProfit = r2(grossIncome - totalExpenses)
  const taxEstimate = r2(netProfit * TAX_SET_ASIDE_RATE)
  const taxPct = `${Math.round(TAX_SET_ASIDE_RATE * 100)}%`
  const mileageRate = `$${MILEAGE_RATE_USD_PER_MILE.toFixed(2)}`

  const header = [
    `Bookwise Export - ${practiceName} - ${dateRange}`,
    'Always review with a licensed CPA before filing.',
    '',
  ].join('\n')

  const plSummary: (string | number)[][] = [
    ['PROFIT AND LOSS SUMMARY', '', ''],
    ['', '', ''],
    ['INCOME', '', ''],
    ...Object.entries(incomeByCategory).map(([cat, amt]) => [`  ${cat}`, fmt(amt), '']),
    ['Gross Income', fmt(grossIncome), ''],
    ['', '', ''],
    ['EXPENSES', '', ''],
    ...Object.entries(expensesByCategory).map(([cat, amt]) => [`  ${cat}`, fmt(amt), '']),
    ['Total Expenses', fmt(totalExpenses), ''],
    ['', '', ''],
    ['Net Profit', fmt(netProfit), ''],
    ['Tax Reserve', fmt(taxEstimate), `${taxPct} of net profit. Recommended safety rate. Confirm with your CPA.`],
    ['', '', ''],
    ['', '', ''],
  ]

  const transactionDetail: (string | number)[][] = [
    ['TRANSACTION DETAIL', '', '', '', '', '', '', ''],
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

  const methodology: (string | number)[][] = [
    ['', '', ''],
    ['', '', ''],
    ['CALCULATION METHODOLOGY', '', ''],
    ['Item', 'Formula', 'Notes'],
    ['Net Profit', 'Gross Income minus Business Expenses', 'Personal transactions excluded from all calculations'],
    ['Tax Reserve', `Net Profit x ${taxPct}`, 'Recommended safety rate covering federal income tax and self-employment tax. Confirm with your CPA.'],
    ['Mileage Deduction', `Miles x ${mileageRate} per mile`, 'IRS standard mileage rate (2024). Subject to annual IRS adjustment.'],
    ['Schedule C Lines', 'Assigned per category key', 'See Schedule C column above. Always review with a licensed CPA before filing.'],
  ]

  return header + toCSV([...plSummary, ...transactionDetail, ...methodology])
}

