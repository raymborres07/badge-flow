'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';

function getNameFontSize(name: string, scale: number): string {
  const baseSize = 1.875 * scale;
  if (!name) return `${baseSize}rem`;
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
    const scaledSize = Math.max(1.0 * scale, baseSize * (threshold / weightedLen));
    return `${scaledSize}rem`;
  }
  return `${baseSize}rem`;
}

function PrintContent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id');

  const [registrants, setRegistrants] = useState<any[]>([]);
  const [formSlug, setFormSlug] = useState('');
  const [loading, setLoading] = useState(true);

  // Configuration States
  const [preset, setPreset] = useState('lanyard');
  const [badgeWidth, setBadgeWidth] = useState(104); // mm
  const [badgeHeight, setBadgeHeight] = useState(150); // mm
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(1);
  const [gap, setGap] = useState(6); // mm
  const [margin, setMargin] = useState(10); // mm
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [borderRadius, setBorderRadius] = useState(20); // px
  const [fontScale, setFontScale] = useState(1.0);
  const [qrSize, setQrSize] = useState(68); // px
  const [cutLineStyle, setCutLineStyle] = useState<'none' | 'dashed' | 'solid'>('dashed');
  const [zoom, setZoom] = useState(0.55);

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

  const applyPreset = (presetName: string) => {
    setPreset(presetName);
    switch (presetName) {
      case 'lanyard':
        setBadgeWidth(104);
        setBadgeHeight(150);
        setCols(2);
        setRows(1);
        setGap(6);
        setMargin(10);
        setOrientation('landscape');
        setBorderRadius(20);
        setFontScale(1.0);
        setQrSize(68);
        setCutLineStyle('dashed');
        break;
      case 'a6':
        setBadgeWidth(105);
        setBadgeHeight(148);
        setCols(2);
        setRows(2);
        setGap(0);
        setMargin(0);
        setOrientation('portrait');
        setBorderRadius(12);
        setFontScale(0.9);
        setQrSize(60);
        setCutLineStyle('solid');
        break;
      case 'id_portrait':
        setBadgeWidth(54);
        setBadgeHeight(86);
        setCols(3);
        setRows(3);
        setGap(6);
        setMargin(10);
        setOrientation('portrait');
        setBorderRadius(8);
        setFontScale(0.7);
        setQrSize(44);
        setCutLineStyle('dashed');
        break;
      case 'id_landscape':
        setBadgeWidth(86);
        setBadgeHeight(54);
        setCols(2);
        setRows(4);
        setGap(6);
        setMargin(10);
        setOrientation('portrait');
        setBorderRadius(8);
        setFontScale(0.7);
        setQrSize(44);
        setCutLineStyle('dashed');
        break;
      case 'large_badge':
        setBadgeWidth(90);
        setBadgeHeight(120);
        setCols(2);
        setRows(2);
        setGap(8);
        setMargin(10);
        setOrientation('portrait');
        setBorderRadius(16);
        setFontScale(0.95);
        setQrSize(64);
        setCutLineStyle('dashed');
        break;
      default:
        break;
    }
  };

  if (loading) return <div className="p-10 font-black text-gray-400">Loading batch...</div>;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Dimension Validations
  const pageWidth = orientation === 'portrait' ? 210 : 297;
  const pageHeight = orientation === 'portrait' ? 297 : 210;
  const maxPrintableWidth = pageWidth - (margin * 2);
  const maxPrintableHeight = pageHeight - (margin * 2);
  const totalOccupiedWidth = (badgeWidth * cols) + (gap * (cols - 1));
  const totalOccupiedHeight = (badgeHeight * rows) + (gap * (rows - 1));
  const isOverflowWidth = totalOccupiedWidth > maxPrintableWidth;
  const isOverflowHeight = totalOccupiedHeight > maxPrintableHeight;
  const isOverflow = isOverflowWidth || isOverflowHeight;

  // Chunking registrants
  const badgesPerPage = cols * rows;
  const chunkedPages: any[][] = [];
  for (let i = 0; i < registrants.length; i += badgesPerPage) {
    chunkedPages.push(registrants.slice(i, i + badgesPerPage));
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0F172A] text-slate-100 print:bg-white print:text-black">
      {/* Sidebar Controls - Hidden in print */}
      <div className="w-full md:w-[380px] bg-[#1E293B]/80 backdrop-blur-md border-b md:border-b-0 md:border-r border-slate-700/50 flex flex-col h-screen overflow-y-auto print:hidden sticky top-0 z-35">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#4285F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Designer
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">GDG Nagoya Badge Batch Print</p>
        </div>

        {/* Configurations */}
        <div className="p-6 flex-1 space-y-6">
          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presets</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPreset('lanyard')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between ${preset === 'lanyard' ? 'bg-[#4285F4] text-white border-transparent' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}
              >
                <span>Lanyard Perfect</span>
                <span className={`text-[9px] mt-1 ${preset === 'lanyard' ? 'text-blue-100' : 'text-slate-500'}`}>104×150mm (2/pg)</span>
              </button>
              <button
                onClick={() => applyPreset('a6')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between ${preset === 'a6' ? 'bg-[#4285F4] text-white border-transparent' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}
              >
                <span>A6 Standard</span>
                <span className={`text-[9px] mt-1 ${preset === 'a6' ? 'text-blue-100' : 'text-slate-500'}`}>105×148mm (4/pg)</span>
              </button>
              <button
                onClick={() => applyPreset('id_portrait')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between ${preset === 'id_portrait' ? 'bg-[#4285F4] text-white border-transparent' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}
              >
                <span>ID Card (Port)</span>
                <span className={`text-[9px] mt-1 ${preset === 'id_portrait' ? 'text-blue-100' : 'text-slate-500'}`}>54×86mm (9/pg)</span>
              </button>
              <button
                onClick={() => applyPreset('id_landscape')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between ${preset === 'id_landscape' ? 'bg-[#4285F4] text-white border-transparent' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}
              >
                <span>ID Card (Land)</span>
                <span className={`text-[9px] mt-1 ${preset === 'id_landscape' ? 'text-blue-100' : 'text-slate-500'}`}>86×54mm (8/pg)</span>
              </button>
              <button
                onClick={() => applyPreset('large_badge')}
                className={`col-span-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between ${preset === 'large_badge' ? 'bg-[#4285F4] text-white border-transparent' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}
              >
                <span>Large Event Badge</span>
                <span className={`text-[9px] mt-1 ${preset === 'large_badge' ? 'text-blue-100' : 'text-slate-500'}`}>90×120mm (4/pg)</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-700/50" />

          {/* Size Configurations */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Card Size (mm)</label>
              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">{badgeWidth}w × {badgeHeight}h mm</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Width</span>
                  <span>{badgeWidth} mm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  value={badgeWidth}
                  onChange={(e) => { setBadgeWidth(parseInt(e.target.value)); setPreset('custom'); }}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Height</span>
                  <span>{badgeHeight} mm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="250"
                  value={badgeHeight}
                  onChange={(e) => { setBadgeHeight(parseInt(e.target.value)); setPreset('custom'); }}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Corner Radius</span>
                  <span>{borderRadius} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={borderRadius}
                  onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-700/50" />

          {/* Layout Grid */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Layout Grid</label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Columns</label>
                <select
                  value={cols}
                  onChange={(e) => { setCols(parseInt(e.target.value)); setPreset('custom'); }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4285F4]"
                >
                  <option value={1}>1 Column</option>
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Rows</label>
                <select
                  value={rows}
                  onChange={(e) => { setRows(parseInt(e.target.value)); setPreset('custom'); }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4285F4]"
                >
                  <option value={1}>1 Row</option>
                  <option value={2}>2 Rows</option>
                  <option value={3}>3 Rows</option>
                  <option value={4}>4 Rows</option>
                  <option value={5}>5 Rows</option>
                </select>
              </div>

              <div className="col-span-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Card Gap</span>
                  <span>{gap} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={gap}
                  onChange={(e) => { setGap(parseInt(e.target.value)); setPreset('custom'); }}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-700/50" />

          {/* Page Settings */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Page Settings (A4)</label>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Orientation</label>
                <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button
                    onClick={() => { setOrientation('portrait'); setPreset('custom'); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${orientation === 'portrait' ? 'bg-[#4285F4] text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => { setOrientation('landscape'); setPreset('custom'); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${orientation === 'landscape' ? 'bg-[#4285F4] text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Page Margin</span>
                  <span>{margin} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={margin}
                  onChange={(e) => { setMargin(parseInt(e.target.value)); setPreset('custom'); }}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Cut Guides</label>
                <select
                  value={cutLineStyle}
                  onChange={(e) => setCutLineStyle(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4285F4]"
                >
                  <option value="dashed">Dashed Border (Light)</option>
                  <option value="solid">Solid Border (Fine)</option>
                  <option value="none">No Borders</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-700/50" />

          {/* Scale Adjustment */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Element Scales</label>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Font Scale</span>
                  <span>{Math.round(fontScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={fontScale}
                  onChange={(e) => setFontScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>QR Code Size</span>
                  <span>{qrSize} px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={qrSize}
                  onChange={(e) => setQrSize(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
              </div>
            </div>
          </div>

          {/* Overflow Warning */}
          {isOverflow && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-amber-400 text-xs animate-pulse">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <span className="font-black block">Layout Overflow Alert</span>
                The selected badge dimensions ({totalOccupiedWidth}x{totalOccupiedHeight}mm) exceed the printable A4 area ({maxPrintableWidth}x{maxPrintableHeight}mm). Consider landscape orientation, fewer columns/rows, or shrinking the gap.
              </div>
            </div>
          )}

          {/* Printer Tips */}
          <div className="p-4 bg-slate-800 border border-slate-700/50 rounded-2xl text-xs text-slate-400 space-y-1.5">
            <span className="font-black text-slate-200 block">🖨️ Printing Tips:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Set printer scale to <strong>100%</strong> (No Scaling).</li>
              <li>Disable "headers and footers".</li>
              <li>Match printer layout orientation to <strong>{orientation}</strong>.</li>
            </ul>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-6 border-t border-slate-700/50 space-y-3 bg-[#1e293b]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom Preview</span>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              disabled={registrants.length === 0}
              className="flex-1 bg-gradient-to-r from-[#4285F4] to-[#34A853] hover:from-blue-600 hover:to-green-600 shadow-lg shadow-blue-500/20 text-white font-black py-3 rounded-xl transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              Print Now
            </button>
            <button
              onClick={() => window.history.back()}
              className="bg-slate-800 text-slate-300 hover:text-white px-4 rounded-xl border border-slate-700 font-black text-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-8 flex flex-col items-center gap-8 overflow-y-auto bg-[#0F172A] print:p-0 print:bg-white print:overflow-visible min-h-screen">
        {registrants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400">
            <p className="font-bold">No registrants found for this form.</p>
          </div>
        ) : (
          chunkedPages.map((pageBadges, pageIdx) => (
            <div
              key={pageIdx}
              className="preview-page-wrapper flex items-center justify-center shrink-0 print:block print:w-auto print:h-auto print:m-0"
              style={{
                width: `calc(${pageWidth}mm * ${zoom})`,
                height: `calc(${pageHeight}mm * ${zoom})`,
              }}
            >
              <div
                className="preview-page-content bg-white shadow-2xl relative overflow-hidden transition-all duration-300 flex flex-col justify-start print:shadow-none print:border-0 print:m-0 print:w-full print:h-full print:scale-100 print:transform-none text-black"
                style={{
                  width: `${pageWidth}mm`,
                  height: `${pageHeight}mm`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  padding: `${margin}mm`,
                  boxSizing: 'border-box',
                  pageBreakAfter: 'always',
                  breakAfter: 'page',
                }}
              >
                {/* Print grid of badges */}
                <div
                  className="grid w-full h-full animate-in fade-in zoom-in-95 duration-300"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, ${badgeWidth}mm)`,
                    gridTemplateRows: `repeat(${rows}, ${badgeHeight}mm)`,
                    gap: `${gap}mm`,
                    alignContent: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {pageBadges.map((reg) => {
                    const qrValue = reg.linkedin_url || `${origin}/f/${formSlug || 'tech-de-tsunagaru'}`;

                    return (
                      <div
                        key={reg.id}
                        className="relative bg-white flex flex-col justify-between overflow-hidden select-none"
                        style={{
                          width: `${badgeWidth}mm`,
                          height: `${badgeHeight}mm`,
                          borderRadius: `${borderRadius}px`,
                          border: cutLineStyle === 'dashed' ? '1px dashed #cbd5e1' :
                                  cutLineStyle === 'solid' ? '1px solid #e2e8f0' : 'none',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Top Bar */}
                        <div className="flex w-full" style={{ height: `${8 * fontScale}px` }}>
                          <div className="flex-1 bg-[#EA4335]" />
                          <div className="flex-1 bg-[#4285F4]" />
                          <div className="flex-1 bg-[#FBBC05]" />
                          <div className="flex-1 bg-[#34A853]" />
                        </div>

                        {/* Card Content Wrapper */}
                        <div className="flex-1 flex flex-col justify-between py-3 px-4 text-center">
                          {/* Header */}
                          <div className="flex flex-col items-center">
                            <img
                              src="/favicon.png"
                              className="object-contain"
                              style={{
                                width: `${36 * fontScale}px`,
                                height: `${36 * fontScale}px`,
                                marginBottom: `${6 * fontScale}px`,
                              }}
                            />
                            <div
                              className="font-black text-gray-900 leading-none"
                              style={{ fontSize: `${1.05 * fontScale}rem` }}
                            >
                              GDG On Campus
                            </div>
                            <div
                              className="font-bold text-gray-400 uppercase tracking-widest mt-0.5"
                              style={{ fontSize: `${0.45 * fontScale}rem` }}
                            >
                              Nagoya University
                            </div>
                          </div>

                          {/* Middle text */}
                          <div>
                            <div>
                              <div
                                className="font-black text-[#4285F4] tracking-tight leading-none"
                                style={{ fontSize: `${1.1 * fontScale}rem` }}
                              >
                                Tech de Tsunagaru
                              </div>
                              <div
                                className="font-black text-[#EA4335] uppercase tracking-[0.2em] mt-0.5"
                                style={{ fontSize: `${0.45 * fontScale}rem` }}
                              >
                                Event Badge
                              </div>
                            </div>

                            <div className="flex flex-col items-center w-full mt-2">
                              <div
                                className="font-black text-gray-900 leading-[1.1] px-1 text-center"
                                style={{ fontSize: getNameFontSize(reg.name, fontScale) }}
                              >
                                {reg.name}
                              </div>
                              {reg.industry && (
                                <div
                                  className="font-bold text-gray-500 mt-0.5 px-2 line-clamp-1 italic"
                                  style={{ fontSize: `${0.65 * fontScale}rem` }}
                                >
                                  {reg.industry}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* QR Code */}
                          <div className="flex flex-col items-center">
                            <div className="bg-gray-50 p-1.5 rounded-[1rem] border border-gray-100/50">
                              <div className="bg-white p-1 rounded-md flex items-center justify-center border border-gray-100">
                                <QRCode
                                  value={qrValue}
                                  size={qrSize}
                                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                  viewBox={`0 0 256 256`}
                                />
                              </div>
                            </div>
                            <div
                              className="font-black text-gray-300 uppercase tracking-[0.3em] mt-1"
                              style={{ fontSize: `${0.4 * fontScale}rem` }}
                            >
                              Scan to Connect
                            </div>
                          </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="flex w-full" style={{ height: `${10 * fontScale}px` }}>
                          <div className="flex-1 bg-[#EA4335]" />
                          <div className="flex-1 bg-[#4285F4]" />
                          <div className="flex-1 bg-[#FBBC05]" />
                          <div className="flex-1 bg-[#34A853]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dynamic Printing Style overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Force page break behavior on printer */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide sidebar and non-printable elements */
          .print\\:hidden, 
          #sidebar-controls,
          .no-print {
            display: none !important;
          }
          
          /* Reset wrapper container sizing */
          .preview-page-wrapper {
            display: block !important;
            width: auto !important;
            height: auto !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          
          /* Apply physical paper margins and orientation to the printed pages */
          @page {
            size: A4 ${orientation};
            margin: 0 !important;
          }
          
          .preview-page-content {
            width: ${pageWidth}mm !important;
            height: ${pageHeight}mm !important;
            transform: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
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
