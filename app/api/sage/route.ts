import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { IQ_MAPS, type Industry } from '@/lib/iqMaps'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { type, context } = await req.json()

  const vocab = IQ_MAPS[context.industry as Industry] ?? IQ_MAPS.coach

  const system = `You are Sage AI, the financial mentor inside Bookwise. You speak to solo wellness practitioners who run their own practices.
You use these exact terms for this user's industry: ${JSON.stringify(vocab)}
Never use: revenue, COGS, accounts receivable, accounts payable, net income, gross margin.
Never say: you should, you owe, file your taxes, I recommend.
Numbers are evidence. Your job is to say what they mean, not read them back. Lead with the meaning, the pattern, or the feeling the data reflects. You may mention one number when it makes the point land — but never open with a dollar figure, never list multiple figures side by side, and never summarize what the user can already see on screen.
Write the way a trusted mentor would speak: plain, warm, grounded. 1 to 2 sentences. No em dashes. End with a complete thought, not a question.`

  const prompts: Record<string, string> = {
    daily_insight: `Practice: ${context.practiceName}
Industry: ${context.industry}
This month income: $${context.monthIncome ?? 0}, expenses: $${context.monthExpenses ?? 0}
Bucket status: Growth Fund ${context.buckets?.profit ?? 0}% funded, Taxes Set Aside ${context.buckets?.tax ?? 0}% funded, Business Expenses ${context.buckets?.ops ?? 0}% of budget used${context.expenseAlert ? `\n\u26a0\ufe0f Expense alert: ${context.expenseAlert}` : ''}
Focus area: ${
  context.focus === 'take-home' ? 'Speak to what their take-home situation says about how the month is going.' :
  context.focus === 'expense-pace' ? 'Speak to what the expense pace this month means for the practice.' :
  context.focus === 'bucket-health' ? 'Speak to what the bucket picture tells them about where attention belongs right now.' :
  'Speak to what the income-to-cost relationship looks like this month.'
}
Respond as a mentor who just glanced at these numbers. Say what the pattern means for this person, not what the numbers are.`,

    pay_guidance: `Practice: ${context.practiceName}
Operations bucket: $${context.buckets?.opsFunded ?? 0} of $${context.buckets?.opsTarget ?? 0} funded
Days left in month: ${context.daysLeft ?? 15}
Speak to whether this is a good time to pay themselves, and what the picture looks like right now. Warm and grounded.`,

    question: `Practice: ${context.practiceName}
Monthly income: $${context.monthIncome ?? 0}, expenses: $${context.monthExpenses ?? 0}
Recent transactions: ${JSON.stringify(context.recentTransactions?.slice(0, 8) ?? [])}
Question: ${context.question}
Answer the way a trusted mentor would \u2014 plainly and directly, based on what the numbers show.`,

    pay_yourself: `Practice: ${context.practiceName}
Industry: ${context.industry}
Growth Fund this month: $${(context.buckets?.profitFunded ?? 0).toFixed(2)}
Taxes Set Aside this month: $${(context.buckets?.taxFunded ?? 0).toFixed(2)}
Operations: $${(context.buckets?.opsFunded ?? 0).toFixed(2)} of $${(context.buckets?.opsTarget ?? 0).toFixed(2)} covered
Days left in month: ${context.daysLeft ?? 15}
Net this month: $${(context.netProfit ?? 0).toFixed(2)}

Speak to this person like a financially literate friend who is genuinely rooting for them. Lead with what the month looks like overall and whether the picture supports paying themselves. If it does, say so clearly. If it is a leaner month, acknowledge it without alarm. Do not open with a dollar figure. Do not list multiple numbers. Say what the situation means, and close with one grounded, specific encouragement. 2 short paragraphs.`,

    ledger_insight: `Practice: ${context.practiceName}
Industry: ${context.industry}
Period: ${context.period ?? 'this month'}
Total income: $${(context.totalIncome ?? 0).toFixed(2)}, total expenses: $${(context.totalExpenses ?? 0).toFixed(2)}
Top expense categories: ${(context.topExpenses ?? []).map((e: { category: string; total: number }) => `${e.category} ($${e.total.toFixed(2)})`).join(', ') || 'none recorded'}
Transaction count: ${context.transactionCount ?? 0}
Notice what stands out about the spending pattern and say what it means for this practice. Speak to patterns and proportion, not the raw figures.`,

    pulse_insight: `Practice: ${context.practiceName}
Industry: ${context.industry}
Activity logged: ${context.days} days, ${context.sessions} sessions, ${Number(context.hours).toFixed(1)} hours, ${Number(context.miles).toFixed(1)} miles
Period income: $${Number(context.periodIncome ?? 0).toFixed(2)}
Average per session: $${Number(context.avgRevenuePerSession ?? 0).toFixed(2)}
Speak to what this level of activity and income says about the rhythm and sustainability of their practice. Say what the pattern means, not what the numbers are.`,

    seasonality_insight: `Monthly income data for the year so far:
${JSON.stringify(context.monthlyIncome)}

Look at the shape of the year so far. Speak to what the high and low points reveal about the natural rhythm of this practice, and what that means going forward. Plain, warm language. 2 to 3 sentences.`,
  }

  const prompt = prompts[type] ?? prompts.daily_insight
  const maxTokens = type === 'pay_yourself' ? 200 : type === 'seasonality_insight' ? 100 : type === 'pulse_insight' ? 80 : 70

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    })

    const insight = message.content[0].type === 'text' ? message.content[0].text : ''
    return Response.json({ insight })
  } catch {
    return new Response('Sage unavailable', { status: 503 })
  }
}
