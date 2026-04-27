import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { IQ_MAPS, type Industry } from '@/lib/iqMaps'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { type, context } = await req.json()

  const vocab = IQ_MAPS[context.industry as Industry] ?? IQ_MAPS.coach

  const system = `You are Sage, a warm and direct financial mentor inside the Bookwise app.
You speak to solo wellness practitioners who run their own practices.
You use these exact terms for this user's industry: ${JSON.stringify(vocab)}
You never use: revenue, COGS, accounts receivable, accounts payable, net income, gross margin.
You never say: you should, you owe, file your taxes, I recommend.
You say: here is what your numbers show, based on what you have coming in, consider.
Keep responses to 2 short paragraphs. Be specific with numbers when you have them.
No em dashes. Plain warm language. End with one concrete observation, not a question.
Never say "Great question" or "I hope this helps".`

  const prompts: Record<string, string> = {
    daily_insight: `Practice: ${context.practiceName}
Industry: ${context.industry}
This month income: $${context.monthIncome ?? 0}, expenses: $${context.monthExpenses ?? 0}
Bucket status: Growth Fund ${context.buckets?.profit ?? 0}% funded, Tax Set-Aside ${context.buckets?.tax ?? 0}% funded, Daily Operations ${context.buckets?.ops ?? 0}% funded
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
  }

  const prompt = prompts[type] ?? prompts.daily_insight

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 350,
      system,
      messages: [{ role: 'user', content: prompt }],
    })

    const insight = message.content[0].type === 'text' ? message.content[0].text : ''
    return Response.json({ insight })
  } catch {
    return new Response('Sage unavailable', { status: 503 })
  }
}
