import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  
  try {
    const { searchParams, origin } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return new Response('Missing ID', { status: 400 });

    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (regError || !reg) {
      return new Response('Registration not found', { status: 404 });
    }

    const { data: form } = await supabase
      .from('forms')
      .select('*')
      .eq('id', reg.form_id)
      .single();

    const badgeType: string = form?.badge_type || 'lanyard';
    const signatories: any[] = Array.isArray(form?.signatories) ? form.signatories : [];
    const title: string = form?.title_en || 'Tech de Tsunagaru';
    const name: string = reg.name || 'Attendee';
    const industry: string = reg.industry || '';
    const organizerName: string = form?.organizer_name || 'GDGoC NagoyaUniversity';
    const subtitle: string = form?.badge_subtitle || 'Certificate of Participation';
    const eventDate: string = form?.event_date || '';

    let qrImage: string;
    try {
      const qrUrl = reg.linkedin_url || `${origin}/f/${form?.slug || 'event'}`;
      qrImage = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
    } catch (e) {
      return new Response('QR generation failed', { status: 500 });
    }

    let fontBlack: Buffer, fontBold: Buffer, fontItalic: Buffer;
    try {
      const fontDir = join(process.cwd(), 'public', 'fonts');
      fontBlack = readFileSync(join(fontDir, 'Inter-Black.woff'));
      fontBold = readFileSync(join(fontDir, 'Inter-Bold.woff'));
      fontItalic = readFileSync(join(fontDir, 'Inter-BoldItalic.woff'));
    } catch (e: any) {
      return new Response(`Font loading failed: ${e.message}`, { status: 500 });
    }

    let faviconDataUrl: string;
    try {
      const faviconPath = join(process.cwd(), 'public', 'favicon.png');
      const faviconBuffer = readFileSync(faviconPath);
      faviconDataUrl = `data:image/png;base64,${faviconBuffer.toString('base64')}`;
    } catch (e: any) {
      faviconDataUrl = '';
    }

    const sigImages: (string | null)[] = await Promise.all(
      signatories.map(async (sig: any) => {
        if (!sig?.signature_url) return null;
        try {
          const res = await fetch(sig.signature_url, { cache: 'no-store' });
          if (!res.ok) return null;
          const contentType = res.headers.get('content-type') || 'image/png';
          
          // Safety: skip unsupported formats that crash Satori
          const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
          if (!allowedTypes.includes(contentType)) {
            console.error('Skipping unsupported image format:', contentType);
            return null;
          }

          const arrayBuffer = await res.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return `data:${contentType};base64,${base64}`;
        } catch (e) {
          console.error('Signature fetch failed (non-fatal):', e);
          return null;
        }
      })
    );

    const width = badgeType === 'certificate' ? 800 : 450;
    const height = badgeType === 'certificate' ? 450 : 800;
    const baseFontSize = 52;
    const nameFontSize = name.length > 15 ? Math.max(24, Math.floor(baseFontSize * (15 / name.length))) : baseFontSize;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
            overflow: 'hidden',
            fontFamily: 'Inter',
            position: 'relative',
          }}
        >
          {/* Top color bar */}
          <div style={{ display: 'flex', width: '100%', height: badgeType === 'certificate' ? 8 : 12 }}>
            <div style={{ flex: 1, backgroundColor: '#EA4335', display: 'flex' }} />
            <div style={{ flex: 1, backgroundColor: '#4285F4', display: 'flex' }} />
            <div style={{ flex: 1, backgroundColor: '#FBBC05', display: 'flex' }} />
            <div style={{ flex: 1, backgroundColor: '#34A853', display: 'flex' }} />
          </div>

          {badgeType === 'certificate' ? (
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
              {/* Header */}
              <div style={{ position: 'absolute', top: 40, left: 60, right: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {faviconDataUrl ? (
                  <img src={faviconDataUrl} width={80} height={80} />
                ) : (
                  <div style={{ width: 80, height: 80, backgroundColor: '#4285F4', borderRadius: 8, display: 'flex' }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', fontSize: 24, fontWeight: 900, color: '#111827', textTransform: 'uppercase' }}>{subtitle}</div>
                  <div style={{ display: 'flex', fontSize: 12, fontWeight: 800, color: '#4285F4', marginTop: 4, textTransform: 'uppercase' }}>{title}</div>
                  <div style={{ display: 'flex', fontSize: 9, fontWeight: 700, color: '#9CA3AF', marginTop: 4 }}>
                    CERTIFICATE ID: {(title || 'EVENT').toUpperCase().replace(/\s+/g, '-')}-{reg.id.slice(0, 5).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div style={{ position: 'absolute', top: 140, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', fontSize: 14, fontWeight: 700, color: '#4285F4', textTransform: 'uppercase', letterSpacing: '0.4em' }}>This is to certify that</div>
              </div>

              <div style={{ position: 'absolute', top: 170, left: 60, right: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 80 }}>
                <div style={{ display: 'flex', fontSize: nameFontSize, fontWeight: 900, color: '#111827', textAlign: 'center', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{name}</div>
              </div>

              <div style={{ position: 'absolute', top: 260, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, color: '#6B7280' }}>has successfully participated in</div>
                <div style={{ display: 'flex', fontSize: 18, fontWeight: 900, color: '#111827', marginTop: 5, textAlign: 'center' }}>{title}</div>
                <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, color: '#6B7280', marginTop: 5 }}>
                  {eventDate ? `held on ${eventDate} ` : ''}organized by {organizerName}
                </div>
              </div>

              {/* Footer */}
              <div style={{ position: 'absolute', bottom: 40, left: 60, right: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  {signatories.map((sig: any, i: number) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120 }}>
                      <div style={{ width: 100, height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', marginBottom: 5 }}>
                        {sigImages[i] ? (
                          <img src={sigImages[i] as string} width={100} height={40} style={{ objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: 100, height: 1, backgroundColor: '#E5E7EB' }} />
                        )}
                      </div>
                      <div style={{ display: 'flex', fontSize: 10, fontWeight: 900, color: '#111827' }}>{sig.name}</div>
                      <div style={{ display: 'flex', fontSize: 7, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>{sig.title}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src={qrImage} style={{ width: 70, height: 70, borderRadius: 8 }} />
                </div>
              </div>
            </div>
          ) : (
            // ── LANYARD BADGE — matches the batch print page design ──
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header section with logo + org name */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '48px 0 36px 0',
                borderBottom: '1px solid #F3F4F6',
                backgroundColor: '#FAFAFA',
              }}>
                {faviconDataUrl ? (
                  <img src={faviconDataUrl} width={60} height={60} style={{ marginBottom: 16 }} />
                ) : (
                  <div style={{ width: 60, height: 60, backgroundColor: '#4285F4', borderRadius: 8, marginBottom: 16, display: 'flex' }} />
                )}
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1 }}>GDG On Campus</div>
                <div style={{ display: 'flex', fontSize: 14, fontWeight: 700, color: '#9CA3AF', marginTop: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Nagoya University</div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 40px', textAlign: 'center' }}>
                {/* Event title + "Event Badge" label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
                  <div style={{ display: 'flex', fontSize: 26, fontWeight: 900, color: '#4285F4', letterSpacing: '-0.02em' }}>{title}</div>
                  <div style={{ display: 'flex', fontSize: 13, fontWeight: 900, color: '#EA4335', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 10 }}>Event Badge</div>
                </div>

                {/* Attendee name + industry */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 40 }}>
                  <div style={{ display: 'flex', fontSize: nameFontSize > 52 ? 52 : nameFontSize, fontWeight: 900, color: '#111827', lineHeight: 1.1 }}>{name}</div>
                  {industry && (
                    <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#6B7280', marginTop: 12, fontStyle: 'italic' }}>{industry}</div>
                  )}
                </div>

                {/* QR code */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ backgroundColor: '#F3F4F6', padding: 24, borderRadius: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={qrImage} style={{ width: 140, height: 140, borderRadius: 10, backgroundColor: 'white' }} />
                  </div>
                  <div style={{ display: 'flex', fontSize: 11, fontWeight: 900, color: '#D1D5DB', marginTop: 18, letterSpacing: '0.3em' }}>SCAN TO CONNECT</div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom color bar */}
          <div style={{ display: 'flex', width: '100%', height: badgeType === 'certificate' ? 8 : 16 }}>
            <div style={{ flex: 1, backgroundColor: '#EA4335', display: 'flex' }} />
            <div style={{ flex: 1, backgroundColor: '#4285F4', display: 'flex' }} />
            <div style={{ flex: 1, backgroundColor: '#FBBC05', display: 'flex' }} />
            <div style={{ flex: 1, backgroundColor: '#34A853', display: 'flex' }} />
          </div>
        </div>
      ),
      {
        width,
        height,
        fonts: [
          { name: 'Inter', data: fontBlack, style: 'normal', weight: 900 },
          { name: 'Inter', data: fontBold, style: 'normal', weight: 700 },
          { name: 'Inter', data: fontItalic, style: 'italic', weight: 700 },
        ],
      }
    );
  } catch (error: any) {
    console.error('Lanyard API unhandled error:', error);
    return new Response(`Error: ${error?.message || 'Unknown error'}`, { status: 500 });
  }
}
