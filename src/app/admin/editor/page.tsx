'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type FieldType = 'text' | 'dropdown' | 'radio' | 'checkbox' | 'textarea' | 'slider' | 'rating' | 'date' | 'time' | 'grid_mc' | 'grid_cb';
type TargetField = 'none' | 'name' | 'industry' | 'email';

interface FormField {
  id: string;
  label_en: string;
  label_ja: string;
  placeholder_en: string;
  placeholder_ja: string;
  type: FieldType;
  options: { label_en: string; label_ja: string; value: string }[] | null;
  grid_rows: { label_en: string; label_ja: string; value: string }[] | null;
  required: boolean;
  target_lanyard_field: TargetField;
  sort_order: number;
  form_id: string;
}

interface Signatory {
  name: string;
  title: string;
  signature_url: string;
}

interface FormMetadata {
  id: string;
  slug: string;
  title_en: string;
  title_ja: string;
  hero_text_en: string;
  hero_text_ja: string;
  logo_url: string;
  badge_type: 'lanyard' | 'certificate';
  signatories: Signatory[];
  organizer_name: string;
  badge_subtitle: string;
  event_date: string;
}

function FormEditorContent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id');

  const [fields, setFields] = useState<FormField[]>([]);
  const [formMeta, setFormMeta] = useState<FormMetadata>({
    id: formId || '',
    slug: '',
    title_en: 'New Event',
    title_ja: '新しいイベント',
    hero_text_en: 'Join the community',
    hero_text_ja: 'コミュニティに参加',
    logo_url: '',
    badge_type: 'lanyard',
    signatories: [],
    organizer_name: 'GDGoC NagoyaUniversity',
    badge_subtitle: 'Certificate of Participation',
    event_date: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (formId) fetchConfig();
  }, [formId]);

  const fetchConfig = async () => {
    try {
      const { data: metaData, error: metaError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (metaError) throw metaError;
      setFormMeta(metaData);

      const { data: fieldData, error: fieldError } = await supabase
        .from('form_config')
        .select('*')
        .eq('form_id', formId)
        .order('sort_order', { ascending: true });

      if (fieldError) throw fieldError;
      setFields(fieldData || []);
    } catch (err: any) {
      console.error(err);
      setError('Error loading form config: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    if (!formId) return;
    const newField: FormField = {
      id: crypto.randomUUID(),
      form_id: formId,
      label_en: 'New Question',
      label_ja: '新しい質問',
      placeholder_en: 'Placeholder',
      placeholder_ja: 'プレースホルダー',
      type: 'text',
      options: null,
      grid_rows: null,
      required: false,
      target_lanyard_field: 'none',
      sort_order: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = async (id: string) => {
    if (confirm('Are you sure you want to remove this field?')) {
      await supabase.from('form_config').delete().eq('id', id);
      setFields(fields.filter(f => f.id !== id));
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const addOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const newOptions = [...(field.options || []), { label_en: 'New Option', label_ja: '新規選択肢', value: crypto.randomUUID() }];
    updateField(fieldId, { options: newOptions });
  };

  const updateOption = (fieldId: string, optIndex: number, updates: any) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = [...field.options];
    newOptions[optIndex] = { ...newOptions[optIndex], ...updates };
    updateField(fieldId, { options: newOptions });
  };

  const removeOption = (fieldId: string, optIndex: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = field.options.filter((_, i) => i !== optIndex);
    updateField(fieldId, { options: newOptions });
  };

  const duplicateField = (id: string) => {
    const fieldIndex = fields.findIndex(f => f.id === id);
    if (fieldIndex === -1) return;
    
    const original = fields[fieldIndex];
    const copy = {
      ...original,
      id: crypto.randomUUID(),
    };
    
    const newFields = [...fields];
    newFields.splice(fieldIndex + 1, 0, copy);
    setFields(newFields);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, signatoryIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file || !formId) return;

    if (signatoryIndex === undefined) setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${formId}-${signatoryIndex !== undefined ? `sig-${signatoryIndex}-` : ''}${Date.now()}.${fileExt}`;
      
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PNG or JPEG image. AVIF and other formats are not supported for certificates.');
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      if (!data?.publicUrl) throw new Error('Could not get public URL');

      if (signatoryIndex !== undefined) {
        const newSignatories = [...formMeta.signatories];
        newSignatories[signatoryIndex] = { ...newSignatories[signatoryIndex], signature_url: data.publicUrl };
        setFormMeta(prev => ({ ...prev, signatories: newSignatories }));
      } else {
        setFormMeta(prev => ({ ...prev, logo_url: data.publicUrl }));
      }
    } catch (err: any) {
      console.error('Upload Error:', err);
      alert('Upload failed: ' + (err.message || 'Check your internet and Supabase bucket settings.'));
    } finally {
      if (signatoryIndex === undefined) setUploadingLogo(false);
    }
  };

  const addSignatory = () => {
    setFormMeta({
      ...formMeta,
      signatories: [...formMeta.signatories, { name: '', title: '', signature_url: '' }]
    });
  };

  const removeSignatory = (index: number) => {
    setFormMeta({
      ...formMeta,
      signatories: formMeta.signatories.filter((_, i) => i !== index)
    });
  };

  const updateSignatory = (index: number, updates: Partial<Signatory>) => {
    const newSignatories = [...formMeta.signatories];
    newSignatories[index] = { ...newSignatories[index], ...updates };
    setFormMeta({ ...formMeta, signatories: newSignatories });
  };

  const saveConfig = async () => {
    if (!formId) return;
    setSaving(true);
    setError('');
    try {
      console.log('Saving metadata:', formMeta);
      
      const { error: metaError } = await supabase
        .from('forms')
        .update({
          title_en: formMeta.title_en,
          title_ja: formMeta.title_ja,
          hero_text_en: formMeta.hero_text_en,
          hero_text_ja: formMeta.hero_text_ja,
          logo_url: formMeta.logo_url,
          badge_type: formMeta.badge_type,
          signatories: formMeta.signatories,
          organizer_name: formMeta.organizer_name,
          badge_subtitle: formMeta.badge_subtitle,
          event_date: formMeta.event_date
        })
        .eq('id', formId);

      if (metaError) {
        console.error('Metadata Save Error:', metaError);
        throw new Error(`Database Error (Forms): ${metaError.message}. Did you run the SQL sync?`);
      }

      const sanitizedFields = fields.map((f, i) => ({
        id: f.id,
        form_id: formId,
        label_en: f.label_en,
        label_ja: f.label_ja,
        placeholder_en: f.placeholder_en,
        placeholder_ja: f.placeholder_ja,
        type: f.type,
        options: f.options,
        grid_rows: f.grid_rows,
        required: f.required,
        target_lanyard_field: f.target_lanyard_field,
        sort_order: i + 1
      }));

      const { error: fieldError } = await supabase
        .from('form_config')
        .upsert(sanitizedFields, { onConflict: 'id' });

      if (fieldError) {
        console.error('Fields Save Error Details:', JSON.stringify(fieldError, null, 2));
        throw new Error(`Database Error (Fields): ${fieldError.message || 'Unknown error'}. Check if columns match.`);
      }
      
      alert('Configuration saved successfully! Your certificate is now ready.');
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Connection failed. Please check the console.');
    } finally {
      setSaving(false);
    }
  };

  const mappedNameField = fields.find(f => f.target_lanyard_field === 'name');
  const mappedIndustryField = fields.find(f => f.target_lanyard_field === 'industry');

  if (loading) return <div className="p-20 text-center font-black text-gray-400">Loading Builder...</div>;

  return (
    <div className="min-h-screen bg-[#F1F3F4] p-4 md:p-8 font-sans pb-32">
      <div className="fixed top-0 left-0 w-full h-1.5 flex z-50">
        <div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
      </div>

      <div className="max-w-6xl mx-auto pt-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <header className="bg-white rounded-2xl border-t-[10px] border-t-[#4285F4] p-8 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <img src="/favicon.png" alt="GDG" className="w-10 h-10 object-contain" />
                <h1 className="text-3xl font-black text-gray-900 leading-none">Form Builder</h1>
              </div>
              <div className="flex gap-2">
                <Link href="/admin" className="bg-white border-2 border-gray-100 text-gray-400 hover:border-[#4285F4] hover:text-[#4285F4] px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Back
                </Link>
                <Link href={`/f/${formMeta.slug}`} target="_blank" className="bg-[#E8F0FE] text-[#4285F4] px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors flex items-center gap-2">
                  View Live Form
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Title (EN)</label>
                <input className="w-full text-gray-900 bg-gray-50 p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" value={formMeta.title_en || ''} onChange={e => setFormMeta({...formMeta, title_en: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">イベント名 (JA)</label>
                <input className="w-full text-gray-900 bg-gray-50 p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" value={formMeta.title_ja || ''} onChange={e => setFormMeta({...formMeta, title_ja: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hero Text (EN)</label>
                <input className="w-full text-gray-900 bg-gray-50 p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" value={formMeta.hero_text_en || ''} onChange={e => setFormMeta({...formMeta, hero_text_en: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ヒーローテキスト (JA)</label>
                <input className="w-full text-gray-900 bg-gray-50 p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" value={formMeta.hero_text_ja || ''} onChange={e => setFormMeta({...formMeta, hero_text_ja: e.target.value})} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Organizer Name</label>
                <input className="w-full text-gray-900 bg-gray-50 p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" placeholder="e.g. GDGoC NagoyaUniversity" value={formMeta.organizer_name || ''} onChange={e => setFormMeta({...formMeta, organizer_name: e.target.value})} />
              </div>
              <div className="space-y-1 md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                <label className="text-[10px] font-black text-[#4285F4] uppercase tracking-widest">Branding Logo</label>
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={uploadingLogo}
                    />
                    <div className="w-full text-gray-400 bg-gray-50 p-3 rounded-xl font-bold border-2 border-dashed border-gray-200 flex items-center justify-center gap-3 group-hover:border-[#4285F4] transition-all">
                      {uploadingLogo ? (
                        <div className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      )}
                      <span className="text-xs uppercase tracking-widest">{uploadingLogo ? 'Uploading...' : 'Upload Logo Image'}</span>
                    </div>
                  </div>
                  {formMeta.logo_url && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center p-2 shadow-sm relative group">
                        <img src={formMeta.logo_url} className="max-w-full max-h-full object-contain" />
                        <button onClick={() => setFormMeta({...formMeta, logo_url: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter italic">Custom</span>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-tight">Best for square or wide logos. Will be displayed on forms and badges.</p>
              </div>
              
              <div className="space-y-4 md:col-span-2 border-t border-gray-100 pt-6 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black text-[#4285F4] uppercase tracking-widest block mb-1">Badge Type</label>
                    <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
                      <button 
                        onClick={() => setFormMeta({...formMeta, badge_type: 'lanyard'})}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${formMeta.badge_type === 'lanyard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        LANYARD
                      </button>
                      <button 
                        onClick={() => setFormMeta({...formMeta, badge_type: 'certificate'})}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${formMeta.badge_type === 'certificate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        CERTIFICATE
                      </button>
                    </div>
                  </div>
                </div>

                {formMeta.badge_type === 'certificate' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Certificate Subtitle (Top Right)</label>
                        <input className="w-full text-gray-900 bg-gray-50 p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" placeholder="e.g. Certificate of Participation" value={formMeta.badge_subtitle || ''} onChange={e => setFormMeta({...formMeta, badge_subtitle: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Date</label>
                        <input className="w-full text-gray-900 bg-gray-50 p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" placeholder="e.g. May 10, 2026" value={formMeta.event_date || ''} onChange={e => setFormMeta({...formMeta, event_date: e.target.value})} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-[#EA4335] uppercase tracking-widest">Signatories</label>
                      <button onClick={addSignatory} className="text-[10px] font-black bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-100 transition-all">+ Add Signatory</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formMeta.signatories.map((sig, idx) => (
                        <div key={idx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3 relative group">
                          <button onClick={() => removeSignatory(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Name</label>
                            <input className="w-full text-xs font-bold bg-white p-2 rounded-lg outline-none border border-transparent focus:border-[#4285F4]" value={sig.name} onChange={e => updateSignatory(idx, { name: e.target.value })} placeholder="Dr. John Doe" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Title</label>
                            <input className="w-full text-xs font-bold bg-white p-2 rounded-lg outline-none border border-transparent focus:border-[#4285F4]" value={sig.title} onChange={e => updateSignatory(idx, { title: e.target.value })} placeholder="Event Organizer" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">E-Signature</label>
                            <div className="flex gap-2 items-center">
                              <div className="relative flex-1">
                                <input type="file" accept="image/png, image/jpeg" onChange={e => handleLogoUpload(e, idx)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <div className="w-full text-[10px] font-bold bg-white p-2 rounded-lg border border-gray-100 text-gray-400 text-center uppercase tracking-tighter italic">Upload Signature</div>
                              </div>
                              {sig.signature_url && <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-1"><img src={sig.signature_url} className="max-w-full max-h-full object-contain grayscale" /></div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {error && <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">{error}</div>}
          </header>

          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-gray-300 transition-all">
                <div className="flex justify-between items-start gap-4 mb-6">
                  <div className="flex-1 space-y-4">
                    <input className="w-full text-gray-900 text-lg font-black border-b-2 border-transparent focus:border-[#4285F4] outline-none py-1" value={field.label_en || ''} onChange={e => updateField(field.id, { label_en: e.target.value })} placeholder="Question (English)" />
                    <input className="w-full text-gray-900 text-lg font-black border-b-2 border-transparent focus:border-[#4285F4] outline-none py-1 font-ja" value={field.label_ja || ''} onChange={e => updateField(field.id, { label_ja: e.target.value })} placeholder="質問 (日本語)" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveField(fields.indexOf(field), 'up')} disabled={fields.indexOf(field) === 0} className="text-gray-300 hover:text-[#4285F4] disabled:opacity-0 transition-colors p-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                    <button onClick={() => moveField(fields.indexOf(field), 'down')} disabled={fields.indexOf(field) === fields.length - 1} className="text-gray-300 hover:text-[#4285F4] disabled:opacity-0 transition-colors p-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => duplicateField(field.id)}
                      className="text-gray-200 hover:text-[#4285F4] transition-all p-2"
                      title="Duplicate Question"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                    </button>
                    <button onClick={() => removeField(field.id)} className="text-gray-200 hover:text-red-500 transition-colors p-2" title="Delete Question"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Placeholder (EN)</label>
                    <input className="w-full text-gray-900 bg-gray-50 p-2 rounded-lg text-xs font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" value={field.placeholder_en || ''} onChange={e => updateField(field.id, { placeholder_en: e.target.value })} placeholder="e.g. AI, Robotics..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">プレースホルダー (JA)</label>
                    <input className="w-full text-gray-900 bg-gray-50 p-2 rounded-lg text-xs font-bold outline-none border-2 border-transparent focus:border-[#4285F4]" value={field.placeholder_ja || ''} onChange={e => updateField(field.id, { placeholder_ja: e.target.value })} placeholder="例：AI、ロボティクス..." />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 items-center border-t border-gray-50 pt-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Input Type</span>
                    <select className="bg-gray-50 p-2 rounded-lg text-xs font-bold outline-none" value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FieldType, options: (['dropdown', 'radio', 'checkbox'].includes(e.target.value)) ? (field.options || []) : null })}>
                      <option value="text">Short Answer</option>
                      <option value="textarea">Paragraph</option>
                      <option value="dropdown">Drop-down</option>
                      <option value="checkbox">Checkboxes</option>
                      <option value="slider">Linear Scale (1-10)</option>
                      <option value="rating">Star Rating</option>
                      <option value="date">Date Picker</option>
                      <option value="time">Time Picker</option>
                      <option value="grid_mc">Multiple-choice grid</option>
                      <option value="grid_cb">Tick box grid</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Lanyard mapping</span>
                    <select className={`p-2 rounded-lg text-xs font-bold transition-all outline-none ${field.target_lanyard_field !== 'none' ? 'bg-[#EA4335] text-white shadow-lg shadow-red-500/20' : 'bg-gray-50 text-gray-500'}`} value={field.target_lanyard_field} onChange={e => updateField(field.id, { target_lanyard_field: e.target.value as TargetField })}>
                      <option value="none">Not on Badge</option>
                      <option value="name">Map to NAME Area</option>
                      <option value="industry">Map to SUBTITLE Area</option>
                      <option value="email">Mapping to EMAIL (for auto-fill)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer ml-auto group/req">
                    <span className="text-xs font-bold text-gray-400 group-hover/req:text-gray-900">Required</span>
                    <div className={`w-8 h-4 rounded-full relative transition-all ${field.required ? 'bg-[#34A853]' : 'bg-gray-100'}`}>
                      <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="sr-only" />
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${field.required ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </label>
                </div>

                {(field.type === 'dropdown' || field.type === 'radio') && (
                  <div className="mt-8 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Menu Options</h4>
                      <button onClick={() => addOption(field.id)} className="text-[10px] font-black text-[#4285F4] hover:underline uppercase tracking-widest">+ Add Option</button>
                    </div>
                    <div className="space-y-3">
                      {field.options?.map((opt, optIndex) => (
                        <div key={opt.value} className="flex gap-4 items-center animate-in fade-in slide-in-from-left-2">
                          <input className="flex-1 text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-sm font-bold outline-none shadow-sm" value={opt.label_en || ''} onChange={e => updateOption(field.id, optIndex, { label_en: e.target.value })} placeholder="Option label (EN)" />
                          <input className="flex-1 text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-sm font-bold outline-none font-ja shadow-sm" value={opt.label_ja || ''} onChange={e => updateOption(field.id, optIndex, { label_ja: e.target.value })} placeholder="選択肢名 (JA)" />
                          <button onClick={() => removeOption(field.id, optIndex)} className="text-gray-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      ))}
                      {(!field.options || field.options.length === 0) && <p className="text-[10px] text-gray-400 text-center font-bold italic py-2">No options added yet.</p>}
                    </div>
                  </div>
                )}

                {field.type === 'slider' && (
                  <div className="mt-8 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Slider Labels</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Min Label (e.g. Poor)</label>
                        <input 
                          className="w-full text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-sm font-bold outline-none shadow-sm" 
                          value={field.options?.[0]?.label_en || ''} 
                          onChange={e => {
                            const opts = [...(field.options || [{label_en: '', label_ja: '', value: 'min'}, {label_en: '', label_ja: '', value: 'max'}])];
                            opts[0] = { ...opts[0], label_en: e.target.value, value: 'min' };
                            updateField(field.id, { options: opts });
                          }} 
                          placeholder="Poor" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Max Label (e.g. Excellent)</label>
                        <input 
                          className="w-full text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-sm font-bold outline-none shadow-sm" 
                          value={field.options?.[1]?.label_en || ''} 
                          onChange={e => {
                            const opts = [...(field.options || [{label_en: '', label_ja: '', value: 'min'}, {label_en: '', label_ja: '', value: 'max'}])];
                            opts[1] = { ...opts[1], label_en: e.target.value, value: 'max' };
                            updateField(field.id, { options: opts });
                          }} 
                          placeholder="Excellent" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">最小ラベル (日本語)</label>
                        <input 
                          className="w-full text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-sm font-bold outline-none shadow-sm font-ja" 
                          value={field.options?.[0]?.label_ja || ''} 
                          onChange={e => {
                            const opts = [...(field.options || [{label_en: '', label_ja: '', value: 'min'}, {label_en: '', label_ja: '', value: 'max'}])];
                            opts[0] = { ...opts[0], label_ja: e.target.value, value: 'min' };
                            updateField(field.id, { options: opts });
                          }} 
                          placeholder="悪い" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">最大ラベル (日本語)</label>
                        <input 
                          className="w-full text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-sm font-bold outline-none shadow-sm font-ja" 
                          value={field.options?.[1]?.label_ja || ''} 
                          onChange={e => {
                            const opts = [...(field.options || [{label_en: '', label_ja: '', value: 'min'}, {label_en: '', label_ja: '', value: 'max'}])];
                            opts[1] = { ...opts[1], label_ja: e.target.value, value: 'max' };
                            updateField(field.id, { options: opts });
                          }} 
                          placeholder="良い" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(field.type === 'grid_mc' || field.type === 'grid_cb') && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Rows (Questions)</h4>
                        <button onClick={() => {
                          const newRows = [...(field.grid_rows || [])];
                          newRows.push({ label_en: '', label_ja: '', value: `row-${Date.now()}` });
                          updateField(field.id, { grid_rows: newRows });
                        }} className="text-[10px] font-black text-[#4285F4] hover:underline uppercase tracking-widest">+ Add Row</button>
                      </div>
                      <div className="space-y-3">
                        {field.grid_rows?.map((row, rowIdx) => (
                          <div key={rowIdx} className="flex gap-2 items-center">
                            <input className="flex-1 text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-xs font-bold outline-none shadow-sm" value={row.label_en || ''} onChange={e => {
                              const newRows = [...field.grid_rows!];
                              newRows[rowIdx].label_en = e.target.value;
                              updateField(field.id, { grid_rows: newRows });
                            }} placeholder="Row label (EN)" />
                            <input className="flex-1 text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-xs font-bold outline-none font-ja shadow-sm" value={row.label_ja || ''} onChange={e => {
                              const newRows = [...field.grid_rows!];
                              newRows[rowIdx].label_ja = e.target.value;
                              updateField(field.id, { grid_rows: newRows });
                            }} placeholder="行名 (JA)" />
                            <button onClick={() => updateField(field.id, { grid_rows: field.grid_rows!.filter((_, i) => i !== rowIdx) })} className="text-gray-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Columns (Options)</h4>
                        <button onClick={() => addOption(field.id)} className="text-[10px] font-black text-[#4285F4] hover:underline uppercase tracking-widest">+ Add Column</button>
                      </div>
                      <div className="space-y-3">
                        {field.options?.map((opt, optIdx) => (
                          <div key={optIdx} className="flex gap-2 items-center">
                            <input className="flex-1 text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-xs font-bold outline-none shadow-sm" value={opt.label_en || ''} onChange={e => updateOption(field.id, optIdx, { label_en: e.target.value })} placeholder="Col label (EN)" />
                            <input className="flex-1 text-gray-900 bg-white border-2 border-transparent focus:border-[#4285F4] p-2 rounded-lg text-xs font-bold outline-none font-ja shadow-sm" value={opt.label_ja || ''} onChange={e => updateOption(field.id, optIdx, { label_ja: e.target.value })} placeholder="列名 (JA)" />
                            <button onClick={() => removeOption(field.id, optIdx)} className="text-gray-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={addField} className="w-full py-5 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-black hover:border-[#4285F4] hover:text-[#4285F4] hover:bg-white hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Add Question
          </button>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="bg-gray-900 p-5 flex items-center justify-between">
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Live Preview</span>
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" /><div className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" /><div className="w-2.5 h-2.5 rounded-full bg-[#FBBC05]" />
                </div>
              </div>
              
              <div className="p-10 flex justify-center bg-[#F8F9FA] relative">
                <div className={`${formMeta.badge_type === 'certificate' ? 'w-[480px] h-[270px]' : 'w-64 h-[420px]'} bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col relative overflow-hidden ring-4 ring-gray-100 transition-all duration-500`}>
                  <div className="h-1 flex w-full"><div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" /></div>
                  
                  {formMeta.badge_type === 'certificate' ? (
                    <div className="flex-1 flex flex-col p-8 relative overflow-hidden bg-white">
                      {/* Header */}
                      <div className="absolute top-6 left-8 right-8 flex justify-between items-center">
                        <img src="/favicon.png" alt="Logo" className="h-10 w-10 object-contain" />
                        <div className="text-right">
                          <div className="text-[12px] font-black text-gray-900 uppercase">{formMeta.badge_subtitle || 'Certificate of Participation'}</div>
                          <div className="text-[7px] font-black text-[#4285F4] uppercase mt-0.5">{formMeta.title_en || 'Event Title'}</div>
                          <div className="text-[5px] font-bold text-gray-400 mt-0.5">CERTIFICATE ID: {(formMeta.title_en || 'EVENT').toUpperCase().replace(/\s+/g, '-')}-001</div>
                        </div>
                      </div>
                      
                      {/* Main Content */}
                      <div className="absolute top-20 left-0 right-0 flex flex-col items-center">
                        <div className="text-[7px] font-black text-[#4285F4] uppercase tracking-[0.4em] mb-1">This is to certify that</div>
                        <div className="text-[22px] font-black text-gray-900 leading-none mb-3 px-10 truncate w-full text-center uppercase tracking-tight">Attendee Name</div>
                        
                        <div className="text-[8px] font-bold text-gray-500 mb-1">has successfully participated in</div>
                        <div className="text-[10px] font-black text-gray-900 mb-1">{formMeta.title_en || 'Event Name'}</div>
                        <div className="text-[7px] font-bold text-gray-400 max-w-[80%] text-center">
                          {formMeta.event_date ? `held on ${formMeta.event_date} ` : ''}organized by {formMeta.organizer_name || 'GDGoC NagoyaUniversity'}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                        <div className="flex gap-2">
                          {formMeta.signatories.map((sig, i) => (
                            <div key={i} className="flex flex-col items-start min-w-[50px]">
                              <div className="h-5 w-full flex items-end justify-start mb-0.5">
                                {sig.signature_url && <img src={sig.signature_url} className="h-full object-contain" />}
                              </div>
                              <div className="text-[5px] font-black text-gray-900 truncate max-w-[50px]">{sig.name || 'Signatory'}</div>
                              <div className="text-[4px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[50px]">{sig.title || 'Title'}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-md flex items-center justify-center p-1">
                            <svg className="w-full h-full text-gray-200" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v5h-3v-5zm-3 3h2v2h-2v-2zm-3-3h2v3h-2v-3zm0 3h2v2h-2v-2z" /></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-6 flex flex-col items-center border-b border-gray-50 bg-gray-50/30">
                        <img src="/favicon.png" alt="Branding" className="h-12 w-12 mb-2 drop-shadow-sm object-contain" />
                        <div className="text-[12px] font-black text-gray-900 leading-none">GDG On Campus</div>
                        <div className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest leading-none">Nagoya University</div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="flex flex-col items-center mb-6">
                          <div className="text-[14px] font-black text-[#4285F4] tracking-tight">{formMeta.title_en}</div>
                          <div className="text-[10px] font-black text-[#EA4335] tracking-[0.1em] mt-1 uppercase">Event Badge</div>
                        </div>
                        <div className="w-full space-y-2">
                          <div className="text-2xl font-black text-gray-900 leading-tight truncate px-2">
                            Attendee Name
                          </div>
                          <div className="text-[11px] font-bold text-gray-500 truncate px-4 leading-relaxed">
                            Industry / Interest
                          </div>
                        </div>
                        <div className="mt-8 w-20 h-20 bg-gray-100 rounded-xl border-2 border-gray-200 flex items-center justify-center shadow-inner">
                          <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v5h-3v-5zm-3 3h2v2h-2v-2zm-3-3h2v3h-2v-3zm0 3h2v2h-2v-2z" /></svg>
                        </div>
                        <div className="text-[8px] font-black text-gray-400 mt-3 tracking-[0.2em]">SCAN TO CONNECT</div>
                      </div>
                    </>
                  )}
                  
                  <div className="h-1 flex w-full absolute bottom-0"><div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" /></div>
                </div>
              </div>
            </div>

            <button onClick={saveConfig} disabled={saving} className="w-full bg-[#4285F4] text-white py-5 rounded-[1.5rem] font-black shadow-2xl shadow-blue-500/30 hover:bg-[#3367D6] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
              {saving ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormEditor() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black text-gray-400">Loading Editor...</div>}>
      <FormEditorContent />
    </Suspense>
  );
}
