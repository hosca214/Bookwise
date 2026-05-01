import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  let body: { name?: string; email?: string; practice_type?: string; money_challenge?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const { name, email, practice_type, money_challenge } = body

  if (!email || !practice_type) {
    return new Response('Missing required fields', { status: 400 })
  }

  const { error: dbError } = await supabase
    .from('beta_applications')
    .insert({ name, email, practice_type, money_challenge })

  if (dbError) {
    return new Response('Failed to save application', { status: 500 })
  }

  try {
    await resend?.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to: process.env.ADMIN_NOTIFICATION_EMAIL!,
      subject: `New beta application: ${name || email}`,
      text: [
        'New beta application received.',
        '',
        `Name: ${name || '(not provided)'}`,
        `Email: ${email}`,
        `Practice type: ${practice_type}`,
        `Money challenge: ${money_challenge || '(not provided)'}`,
      ].join('\n'),
    })
  } catch {
    // Email failure does not fail the request. Application is already saved.
  }

  return Response.json({ ok: true })
}
