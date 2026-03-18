import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// POST /api/upload — accept base64 or binary, return a data URL (local dev)
// In production swap body.base64 for Cloudinary upload
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const { base64, mimeType, fileName } = await req.json()

    if (!base64 || !mimeType) {
      return new NextResponse('base64 and mimeType required', { status: 400 })
    }

    // Validate size
    const byteLength = Math.ceil((base64.length * 3) / 4)
    if (byteLength > MAX_SIZE) {
      return new NextResponse('File too large (max 10 MB)', { status: 413 })
    }

    // In production: upload to Cloudinary and return secure_url
    // For local dev: return base64 data URL
    const cloudinaryUrl = process.env.CLOUDINARY_URL

    if (cloudinaryUrl) {
      // Cloudinary upload via REST (no SDK dependency)
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default'

      const formData = new FormData()
      formData.append('file', `data:${mimeType};base64,${base64}`)
      formData.append('upload_preset', uploadPreset)
      if (fileName) formData.append('public_id', `lets-chat/${Date.now()}_${fileName}`)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Cloudinary upload failed')
      const data = await res.json() as { secure_url: string }
      return NextResponse.json({ url: data.secure_url, mimeType, fileName })
    }

    // Fallback: data URL
    const dataUrl = `data:${mimeType};base64,${base64}`
    return NextResponse.json({ url: dataUrl, mimeType, fileName })
  } catch (e) {
    console.error('Upload error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
