import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { IQ_MAPS, type Industry } from '@/lib/iqMaps'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { type, context } = await req.json()

  const vocab = IQ_MAPS[context.industry as Industry] ?? IQ_MAPS.coach

  const system = `You are Sage AI, a warm and direct financial mentor inside the Bookwise app.
You speak to solo wellness practitioners who run their own practices.
You use these exact terms for this user's industry: ${JSON.stringify(vocab)}
You never use: revenue, COGS, accounts receivable, accounts payable, net income, gross margin.
You never say: you should, you owe, file your taxes, I recommend.
You say: here is what your numbers show, based on what you have coming in, consider.
Write exactly 2 to 3 sentences total. No more. Be specific with the numbers in front of you.
No em dashes. Plain warm language. End with one concrete observation, not a question.
Never say "Great question" or "I hope this helps".`

  const prompts: Record<string, string> = {
    daily_insight: `Practice: ${context.practiceName}
Industry: ${context.industry}
This month income: $${context.monthIncome ?? 0}, expenses: $${context.monthExpenses ?? 0}
Bucket status: Growth Fund ${context.buckets?.profit ?? 0}% funded, Taxes Set Aside ${context.buckets?.tax ?? 0}% funded, Business Expenses ${context.buckets?.ops ?? 0}% of budget used${context.expenseAlert ? `\n\u26a0\ufe0f Expense alert: ${context.expenseAlert}` : ''}
Write a brief financial insight for this practitioner based on these numbers.`,

    pay_guidance: `Practice: ${context.practiceName}
Operations bucket: $${context.buckets?.opsFunded ?? 0} of $${context.buckets?.opsTarget ?? 0} funded
Days left in month: ${context.daysLeft ?? 15}
What is a healthy pay-myself range right now? Give a specific dollar range.`,

    question: `Practice: ${context.practiceName}
Monthly income: $${context.monthIncome ?? 0}, expenses: $${context.monthExpenses ?? 0}
Recent transactions: ${JSON.stringify(context.recentTransactions?.slice(0, 8) ?? [])}
Question: ${context.question}
Answer directly and specifically using the numbers provided.`,

    pay_yourself: `Practice: ${context.practiceName}
Industry: ${context.industry}
Growth Fund this month: $${(context.buckets?.profitFunded ?? 0).toFixed(2)}
Taxes Set Aside this month: $${(context.buckets?.taxFunded ?? 0).toFixed(2)}
Operations: $${(context.buckets?.opsFunded ?? 0).toFixed(2)} of $${(context.buckets?.opsTarget ?? 0).toFixed(2)} covered
Days left in month: ${context.daysLeft ?? 15}
Net this month: $${(context.netProfit ?? 0).toFixed(2)}

Your tone for this response: warm and direct, like a financially literate friend who is rooting for this person. Lead with what they can do right now, not what to watch out for. If the numbers support paying themselves, say so clearly and specifically. If it is a leaner month, acknowledge it without alarm. Never use the word "recommend." Never say "you should consider." Be specific with the dollar amounts in front of you. End with one short encouraging line that is specific to these exact numbers, not a generic platitude. Keep it to 2 short paragraphs.`,

    seasonality_insight: `Monthly income data for the year so far:
${JSON.stringify(context.monthlyIncome)}

Identify the two months with the lowest income and the two months with the highest income.
Give one practical sentence about what to do with that pattern.
Keep the full response to 3 sentences maximum.
Tone: warm and direct. No em dashes. No accounting terms.`,
  }

  const prompt = prompts[type] ?? prompts.daily_insight

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 120,
      system,
      messages: [{ role: 'user', content: prompt }],
    })

    const insight = message.content[0].type === 'text' ? message.content[0].text : ''
    return Response.json({ insight })
  } catch {
    return new Response('Sage unavailable', { status: 503 })
  }
}
