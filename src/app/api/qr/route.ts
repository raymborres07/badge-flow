import QRCode from 'qrcode';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Generate QR code as PNG buffer
  const pngBuffer = await QRCode.toBuffer(url, {
    width: 300,
    margin: 2,
    color: { dark: '#202124', light: '#ffffff' },
  });

  return new Response(pngBuffer as any, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
