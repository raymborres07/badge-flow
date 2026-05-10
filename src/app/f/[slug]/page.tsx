'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/utils/supabase/client';

type Language = 'en' | 'ja';

interface FormField {
  id: string;
  label_en: string;
  label_ja: string;
  placeholder_en: string;
  placeholder_ja: string;
  type: 'text' | 'dropdown' | 'radio' | 'checkbox' | 'textarea' | 'slider' | 'rating' | 'date' | 'time' | 'grid_mc' | 'grid_cb';
  options: { label_en: string; label_ja: string; value: string }[] | null;
  grid_rows: { label_en: string; label_ja: string; value: string }[] | null;
  required: boolean;
  target_lanyard_field: string;
}

interface FormMetadata {
  id: string;
  slug: string;
  title_en: string;
  title_ja: string;
  hero_text_en: string;
  hero_text_ja: string;
  logo_url: string | null;
  badge_type: 'lanyard' | 'certificate';
}

export default function DynamicRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [lang, setLang] = useState<Language>('ja');
  const [mounted, setMounted] = useState(false);
  const [formConfig, setFormConfig] = useState<FormField[]>([]);
  const [formMeta, setFormMeta] = useState<FormMetadata | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [otherDetails, setOtherDetails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    if (slug) fetchConfig();
  }, [slug]);

  const fetchConfig = async () => {
    try {
      const { data: metaData, error: metaError } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .single();

      if (metaError || !metaData) {
        setError('Event not found.');
        setLoading(false);
        return;
      }
      setFormMeta(metaData);

      const { data: fieldData, error: fieldError } = await supabase
        .from('form_config')
        .select('*')
        .eq('form_id', metaData.id)
        .order('sort_order', { ascending: true });

      if (fieldData) {
        setFormConfig(fieldData);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Could not load form configuration.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const toggleLang = () => setLang(prev => prev === 'en' ? 'ja' : 'en');

  const handleInputChange = (fieldId: string, value: any) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
    
    // If it's an email field, try to auto-fill
    const field = formConfig.find(f => f.id === fieldId);
    if (field?.target_lanyard_field === 'email' && value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      fetchPreviousRegistration(value);
    }
  };

  const fetchPreviousRegistration = async (email: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('registrations')
        .select('responses, name, industry')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;
      if (data && data.length > 0) {
        const lastReg = data[0];
        const prevResponses = lastReg.responses;
        
        setResponses(currentAllResponses => {
          const updated = { ...currentAllResponses };
          
          // 1. Map by explicit columns (Name/Industry)
          const nameField = formConfig.find(f => f.target_lanyard_field === 'name');
          if (nameField && lastReg.name && !updated[nameField.id]) {
            updated[nameField.id] = lastReg.name;
          }

          const industryField = formConfig.find(f => f.target_lanyard_field === 'industry');
          if (industryField && lastReg.industry && !updated[industryField.id]) {
            updated[industryField.id] = lastReg.industry;
          }

          // Map responses from previous registration
          formConfig.forEach(field => {
            if (field.target_lanyard_field === 'email') return;
            if (prevResponses[field.id] && !updated[field.id]) {
              updated[field.id] = prevResponses[field.id];
            }
          });

          return updated;
        });
      }
    } catch (err) {
      console.error('Auto-fill error:', err);
    }
  };

  const handleOtherChange = (fieldId: string, value: string) => {
    setOtherDetails(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMeta) return;
    setSubmitting(true);
    setError('');

    try {
      const nameField = formConfig.find(f => f.target_lanyard_field === 'name');
      const industryField = formConfig.find(f => f.target_lanyard_field === 'industry');
      const emailField = formConfig.find(f => f.target_lanyard_field === 'email');

      const nameValue = nameField ? responses[nameField.id] : 'Unknown';
      const industryValue = industryField ? responses[industryField.id] : '';
      const emailValue = emailField ? responses[emailField.id] : '';

      const finalResponses = { ...responses };
      Object.keys(otherDetails).forEach(id => {
        if (responses[id] === 'others') {
          finalResponses[id] = `${responses[id]}: ${otherDetails[id]}`;
        }
      });

      const { data: existingReg, error: checkError } = await supabase
        .from('registrations')
        .select('id')
        .eq('form_id', formMeta.id)
        .eq('email', emailValue)
        .maybeSingle();

      if (existingReg) {
        setError(labels.alreadyRegistered);
        setSubmitting(false);
        return;
      }

      const { data, error: insertError } = await supabase
        .from('registrations')
        .insert([
          {
            form_id: formMeta.id,
            name: nameValue,
            email: emailValue,
            industry: industryValue,
            linkedin_url: responses[formConfig.find(f => f.label_en.toLowerCase().includes('social'))?.id || ''] || '',
            responses: finalResponses
          }
        ])
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation code
          throw new Error(labels.alreadyRegistered);
        }
        throw insertError;
      }
      
      setRegistrationId(data.id);
      setSuccess(true);
      setResponses({});
      setOtherDetails({});
    } catch (err: any) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const labels = {
    submitBtn: lang === 'en' ? (formMeta?.badge_type === 'certificate' ? 'Submit Survey' : 'Register Now') : (formMeta?.badge_type === 'certificate' ? 'アンケートを送信' : '登録する'),
    submittingBtn: lang === 'en' ? 'Submitting...' : '送信中...',
    successTitle: formMeta?.badge_type === 'certificate' 
      ? (lang === 'en' ? 'Form Submitted!' : '送信完了！')
      : (lang === 'en' ? 'Registration Complete!' : '登録が完了しました！'),
    successDesc: formMeta?.badge_type === 'certificate'
      ? (lang === 'en' ? 'Thank you for completing the survey. Your certificate is ready!' : 'アンケートへのご協力ありがとうございました。修了証の準備ができました！')
      : (lang === 'en' ? 'Awesome! Your registration is confirmed.' : 'ありがとうございます！登録が完了しました。'),
    viewBadgeBtn: formMeta?.badge_type === 'certificate'
      ? (lang === 'en' ? 'Get My Certificate' : '修了証を取得する')
      : (lang === 'en' ? 'View My Badge' : 'バッジを確認する'),
    registerAnother: lang === 'en' ? 'Register another person' : '他の人を登録する',
    langSwitch: lang === 'en' ? '日本語' : 'English',
    othersLabel: lang === 'en' ? 'Please specify:' : '具体的にお書きください：',
    alreadyRegistered: lang === 'en' ? 'You are already registered for this event!' : 'このイベントには既に登録されています！'
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-gray-300">Loading Form...</div>;
  if (error && !formMeta) return <div className="min-h-screen flex items-center justify-center font-black text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center p-6 font-sans">
      <div className="fixed top-0 left-0 w-full h-1.5 flex z-50">
        <div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
      </div>

      <div className="w-full max-w-2xl flex justify-end mb-4 pt-4">
        <button onClick={toggleLang} className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
          {labels.langSwitch}
        </button>
      </div>

      <main className="w-full max-w-2xl pb-20">
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-full max-w-md h-24 bg-gray-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-gray-800 mb-12 group transition-all hover:scale-[1.02] overflow-hidden">
            <div className="h-20 w-full flex items-center justify-center px-4">
              <img src={formMeta?.logo_url || "/GDGoC_Nagoya_Logo.svg"} alt="Logo" className="h-full w-auto object-contain" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-black text-[#4285F4] tracking-tight mb-4 px-4 leading-tight">
              {lang === 'en' ? formMeta?.title_en : formMeta?.title_ja}
            </h2>
            <p className="text-gray-600 font-bold text-lg max-w-md mx-auto leading-relaxed px-6">
              {lang === 'en' ? formMeta?.hero_text_en : formMeta?.hero_text_ja}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-700 delay-150">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-50 text-[#34A853] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-4">{labels.successTitle}</h3>
              <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">{labels.successDesc}</p>
              <div className="flex flex-col gap-4">
                {registrationId && (
                  <button
                    onClick={async () => {
                      try {
                        const nameField = formConfig.find(f => f.target_lanyard_field === 'name');
                        // Note: responses are cleared on success, but for simplicity we can just use "Badge" 
                        // or better, we should have kept the name. 
                        // For now, let's just use "My-Badge" as a fallback.
                        const prefix = formMeta?.badge_type === 'certificate' ? 'Certificate' : 'Badge';
                        const filename = `${prefix}.png`;
                        
                        const res = await fetch(`/api/lanyard?id=${registrationId}`);
                        if (!res.ok) throw new Error(`Server error: ${res.status}`);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err: any) {
                        alert('Download failed: ' + err.message);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-black text-white bg-[#34A853] hover:bg-[#2D8F47] rounded-2xl transition-all shadow-lg shadow-green-500/25 active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {labels.viewBadgeBtn}
                  </button>
                )}
                <button onClick={() => { setSuccess(false); setRegistrationId(null); }} className="inline-flex items-center justify-center px-10 py-4 text-base font-black text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all active:scale-95">
                  {labels.registerAnother}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              {error && <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-sm font-bold">{error}</div>}

              <div className="grid grid-cols-1 gap-8">
                {formConfig.map((field) => (
                  <div key={field.id} className="group space-y-2">
                    <label className="text-sm font-black text-gray-700 ml-1 transition-colors group-focus-within:text-[#4285F4]">
                      {lang === 'en' ? field.label_en : field.label_ja} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={lang === 'en' ? field.placeholder_en : field.placeholder_ja}
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#4285F4] focus:outline-none transition-all text-lg font-bold resize-none shadow-sm"
                        rows={3}
                      />
                    ) : field.type === 'dropdown' ? (
                      <div className="space-y-4">
                        <select
                          required={field.required}
                          value={responses[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-gray-900 focus:bg-white focus:border-[#4285F4] focus:outline-none transition-all text-lg font-bold shadow-sm"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt: any) => (
                            <option key={opt.value} value={opt.value}>{lang === 'en' ? opt.label_en : opt.label_ja}</option>
                          ))}
                        </select>
                        {responses[field.id] === 'others' && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-black text-[#4285F4] ml-2 mb-2 block">{labels.othersLabel}</label>
                            <input
                              type="text"
                              required
                              value={otherDetails[field.id] || ''}
                              onChange={(e) => handleOtherChange(field.id, e.target.value)}
                              className="w-full bg-blue-50 border-2 border-transparent rounded-xl px-6 py-3 text-gray-900 focus:bg-white focus:border-[#4285F4] focus:outline-none transition-all text-base font-bold shadow-sm"
                              placeholder="..."
                            />
                          </div>
                        )}
                      </div>
                    ) : field.type === 'slider' ? (
                      <div className="space-y-6 py-4 px-2 relative">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={responses[field.id] || 5}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className="w-full h-3 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                        />
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                          <div className="flex flex-col items-start">
                            <span className="text-[#4285F4]">1</span>
                            <span>{lang === 'en' ? (field.options?.[0]?.label_en || 'Poor') : (field.options?.[0]?.label_ja || '悪い')}</span>
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 -top-2 flex flex-col items-center">
                             <div className="bg-[#4285F4] text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shadow-lg shadow-blue-500/30">
                               {responses[field.id] || 5}
                             </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[#4285F4]">10</span>
                            <span>{lang === 'en' ? (field.options?.[1]?.label_en || 'Excellent') : (field.options?.[1]?.label_ja || '良い')}</span>
                          </div>
                        </div>
                      </div>
                    ) : field.type === 'rating' ? (
                      <div className="flex gap-4 items-center py-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleInputChange(field.id, star)}
                            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${responses[field.id] >= star ? 'bg-[#FBBC05] text-white shadow-lg shadow-yellow-500/30' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'}`}
                          >
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                          </button>
                        ))}
                      </div>
                    ) : (field.type === 'date' || field.type === 'time') ? (
                      <input
                        type={field.type}
                        required={field.required}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-gray-900 focus:bg-white focus:border-[#4285F4] focus:outline-none transition-all text-lg font-bold shadow-sm"
                      />
                    ) : (field.type === 'grid_mc' || field.type === 'grid_cb') ? (
                      <div className="overflow-x-auto -mx-2 px-2 pb-4">
                        <table className="w-full text-left min-w-[400px]">
                          <thead>
                            <tr>
                              <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">Questions</th>
                              {field.options?.map((col) => (
                                <th key={col.value} className="py-4 px-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                                  {lang === 'en' ? col.label_en : col.label_ja}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {field.grid_rows?.map((row) => (
                              <tr key={row.value} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-4 text-sm font-black text-gray-700">
                                  {lang === 'en' ? row.label_en : row.label_ja}
                                </td>
                                {field.options?.map((col) => {
                                  const isChecked = field.type === 'grid_mc' 
                                    ? responses[field.id]?.[row.value] === col.value
                                    : responses[field.id]?.[row.value]?.includes(col.value);
                                  
                                  return (
                                    <td key={col.value} className="py-4 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (field.type === 'grid_mc') {
                                            handleInputChange(field.id, { ...(responses[field.id] || {}), [row.value]: col.value });
                                          } else {
                                            const current = responses[field.id]?.[row.value] || [];
                                            const next = current.includes(col.value) 
                                              ? current.filter((v: string) => v !== col.value)
                                              : [...current, col.value];
                                            handleInputChange(field.id, { ...(responses[field.id] || {}), [row.value]: next });
                                          }
                                        }}
                                        className={`w-6 h-6 rounded-full border-2 transition-all mx-auto flex items-center justify-center ${isChecked ? 'bg-[#4285F4] border-[#4285F4] shadow-lg shadow-blue-500/20' : 'border-gray-200 hover:border-gray-400'}`}
                                      >
                                        {isChecked && <div className="w-2 h-2 bg-white rounded-full" />}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <input
                        type={field.type === 'text' ? 'text' : field.type}
                        required={field.required}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={lang === 'en' ? field.placeholder_en : field.placeholder_ja}
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#4285F4] focus:outline-none transition-all text-lg font-bold shadow-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" disabled={submitting} className="w-full relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#34A853]" />
                <div className="relative bg-white m-[2px] rounded-[14px] flex items-center justify-center px-8 py-5 group-hover:bg-transparent transition-all">
                  <span className="text-xl font-black text-gray-900 group-hover:text-white transition-colors">
                    {submitting ? labels.submittingBtn : labels.submitBtn}
                  </span>
                </div>
              </button>
            </form>
          )}
        </div>

        <footer className="mt-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
          <p>© 2026 {lang === 'en' ? formMeta?.title_en : formMeta?.title_ja} • Powered by BadgeFlow</p>
        </footer>
      </main>
    </div>
  );
}
