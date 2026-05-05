import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { imageUrl } = await req.json()
  if (!imageUrl) return new Response('imageUrl required', { status: 400 })

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            {
              type: 'text',
              text: `Extract from this receipt: vendor name, date, and total amount.
Return JSON only, no other text, no markdown:
{"vendor": "string", "date": "YYYY-MM-DD", "amount": number}
If you cannot determine a value, use null.`,
            },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(text)
    return Response.json(parsed)
  } catch {
    return Response.json({ vendor: null, date: null, amount: null })
  }
}
