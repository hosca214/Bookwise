import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bookwise/1.0)' },
    redirect: 'follow',
  })

  if (!res.ok) return NextResponse.json({ error: 'Could not load image' }, { status: 502 })

  const contentType = res.headers.get('Content-Type') ?? ''
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Not an image' }, { status: 502 })
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
