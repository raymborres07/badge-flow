'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';

function getNameFontSize(name: string): string {
  if (!name) return '1.875rem';
  let weightedLen = 0;
  for (let i = 0; i < name.length; i++) {
    if (name.charCodeAt(i) > 255) {
      weightedLen += 2;
    } else {
      weightedLen += 1;
    }
  }
  const hasSpace = name.trim().includes(' ');
  const threshold = hasSpace ? 12 : 15;
  if (weightedLen > threshold) {
    const scaledSize = Math.max(1.0, 1.875 * (threshold / weightedLen));
    return `${scaledSize}rem`;
  }
  return '1.875rem';
}

function PrintContent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id');

  const [registrants, setRegistrants] = useState<any[]>([]);
  const [formSlug, setFormSlug] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (formId) fetchData();
  }, [formId]);

  async function fetchData() {
    try {
      const [regRes, formRes] = await Promise.all([
        supabase.from('registrations').select('*').eq('form_id', formId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('forms').select('slug').eq('id', formId).single()
      ]);

      if (regRes.data) setRegistrants(regRes.data);
      if (formRes.data) setFormSlug(formRes.data.slug);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-10 font-black text-gray-400">Loading batch...</div>;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="bg-gray-100 min-h-screen p-0 md:p-10 print:p-0 print:bg-white">
      {/* Top Header - Hidden in Print */}
      <div className="max-w-4xl mx-auto mb-10 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Print Batch</h1>
          <p className="text-gray-500 font-bold">{registrants.length} badges ready to print</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => window.print()}
            className="bg-[#4285F4] text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            Print Now
          </button>
          <button 
            onClick={() => window.history.back()}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-black active:scale-95 transition-all"
          >
            Back
          </button>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="max-w-[210mm] mx-auto grid grid-cols-2 gap-8 print:grid-cols-2 print:gap-4 print:w-full">
        {registrants.map((reg) => {
          const qrValue = reg.linkedin_url || `${origin}/f/${formSlug || 'tech-de-tsunagaru'}`;
          
          return (
            <div key={reg.id} className="relative bg-white border-2 border-dashed border-gray-300 rounded-[24px] overflow-hidden break-inside-avoid shadow-xl aspect-[3/4] flex flex-col print:shadow-none print:border-gray-200">
              {/* Top Bar */}
              <div className="flex w-full h-2">
                <div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
              </div>

              {/* Header */}
              <div className="flex flex-col items-center py-4 border-b border-gray-50 bg-gray-50/50">
                <img src="/favicon.png" className="w-10 h-10 mb-2" />
                <div className="text-lg font-black text-gray-900 leading-none">GDG On Campus</div>
                <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Nagoya University</div>
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 text-center">
                <div className="mb-3">
                  <div className="text-lg font-black text-[#4285F4] tracking-tight">Tech de Tsunagaru</div>
                  <div className="text-[8px] font-black text-[#EA4335] uppercase tracking-[0.2em] mt-1">Event Badge</div>
                </div>

                <div className="flex flex-col items-center w-full mb-3">
                  <div 
                    className="font-black text-gray-900 leading-[1.1] px-4 text-center"
                    style={{ fontSize: getNameFontSize(reg.name) }}
                  >
                    {reg.name}
                  </div>
                  {reg.industry && (
                    <div className="text-xs font-bold text-gray-500 mt-1 px-6 line-clamp-1 italic">
                      {reg.industry}
                    </div>
                  )}
                </div>

                {/* Real QR Code */}
                <div className="mt-2 flex flex-col items-center">
                  <div className="bg-gray-100 p-2 rounded-[1.25rem] border border-gray-100">
                    <div className="bg-white p-2 rounded-lg flex items-center justify-center border border-gray-100">
                      <QRCode 
                        value={qrValue}
                        size={64}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                      />
                    </div>
                  </div>
                  <div className="text-[7px] font-black text-gray-300 uppercase tracking-[0.3em] mt-2">Scan to Connect</div>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="flex w-full h-3">
                <div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
          .break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}

export default function PrintView() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrintContent />
    </Suspense>
  );
}
