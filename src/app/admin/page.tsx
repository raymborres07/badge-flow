'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function AdminDashboard() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchForms();
  }, [showDeleted]);

  const fetchForms = async () => {
    try {
      let query = supabase.from('forms').select('*').order('created_at', { ascending: false });
      
      if (showDeleted) {
        query = query.not('deleted_at', 'is', null);
      } else {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setForms(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createNewForm = async () => {
    const slug = prompt('Enter slug (e.g. workshop-1):');
    if (!slug) return;
    try {
      const { data, error } = await supabase.from('forms').insert([{ slug, title_en: 'New Event', title_ja: '新しいイベント' }]).select().single();
      if (data) fetchForms();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteForm = async (id: string) => {
    if (showDeleted) {
      if (!confirm('PERMANENT DELETE: This will erase the form and ALL its data forever. Continue?')) return;
      try {
        setLoading(true);
        const { error } = await supabase.from('forms').delete().eq('id', id);
        if (error) throw error;
        fetchForms();
      } catch (err: any) {
        alert('Permanent delete failed: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!confirm('Are you sure you want to delete this form? Attendee data will be hidden but not erased.')) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('forms')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      fetchForms();
    } catch (err: any) {
      alert('Error deleting form: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const restoreForm = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('forms')
        .update({ deleted_at: null })
        .eq('id', id);
      
      if (error) throw error;
      fetchForms();
    } catch (err: any) {
      alert('Error restoring form: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const duplicateForm = async (id: string, oldTitle: string) => {
    const newSlug = prompt(`Enter new slug for duplicate of "${oldTitle}":`);
    if (!newSlug) return;

    try {
      setLoading(true);
      // 1. Get original form
      const { data: originalForm, error: fetchError } = await supabase.from('forms').select('*').eq('id', id).single();
      if (fetchError) throw fetchError;

      // 2. Create new form (copy everything except ID, Slug, and Timestamps)
      const { id: _, created_at: __, ...formToCopy } = originalForm;
      const { data: newForm, error: insertError } = await supabase.from('forms').insert([{ 
        ...formToCopy, 
        slug: newSlug, 
        title_en: `${originalForm.title_en} (Copy)`
      }]).select().single();
      if (insertError) throw insertError;

      // 3. Get original fields
      const { data: originalFields, error: fieldFetchError } = await supabase.from('form_config').select('*').eq('form_id', id);
      if (fieldFetchError) throw fieldFetchError;

      // 4. Duplicate fields
      if (originalFields && originalFields.length > 0) {
        const newFields = originalFields.map(f => {
          const { id: _, created_at: __, updated_at: ___, ...fieldData } = f;
          return {
            ...fieldData,
            id: crypto.randomUUID(),
            form_id: newForm.id
          };
        });
        const { error: fieldInsertError } = await supabase.from('form_config').insert(newFields);
        if (fieldInsertError) throw fieldInsertError;
      }

      fetchForms();
      alert('Form duplicated successfully!');
    } catch (err: any) {
      console.error('Duplication error:', err);
      if (err.code === '23505') {
        alert('Error: This slug is already in use. Please enter a unique slug.');
      } else {
        alert('Error duplicating form: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 font-sans">
      <div className="fixed top-0 left-0 w-full h-1.5 flex z-50">
        <div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
      </div>

      <div className="max-w-5xl mx-auto pt-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight">Admin Console</h1>
            <p className="text-gray-500 font-bold mt-2">Manage your events, badges, and certificates</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowDeleted(!showDeleted)}
              className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${showDeleted ? 'bg-gray-900 text-white shadow-xl' : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-200'}`}
            >
              {showDeleted ? 'View Active' : 'View Deleted'}
            </button>
            <button 
              onClick={createNewForm}
              className="bg-white border-2 border-gray-100 hover:border-[#4285F4] text-gray-400 hover:text-[#4285F4] font-black py-3 px-8 rounded-xl transition-all shadow-sm active:scale-95"
            >
              + Create Form
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 font-bold">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {forms.map(form => (
              <div key={form.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl relative group">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3 ${form.badge_type === 'certificate' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {form.badge_type === 'certificate' ? 'Post-Event (Survey)' : 'Pre-Event (Lanyard)'}
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{form.title_en || 'Untitled Form'}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">slug: {form.slug}</p>
                  </div>
                  <div className="flex gap-2">
                  <button 
                    onClick={() => deleteForm(form.id)}
                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete Form"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  {showDeleted && (
                    <button 
                      onClick={() => restoreForm(form.id)}
                      className="p-3 text-gray-300 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all"
                      title="Restore Form"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  )}
                </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Link href={`/admin/editor?id=${form.id}`} className="text-gray-900 bg-gray-50 p-4 rounded-xl text-center font-bold hover:bg-gray-100 transition-colors">Edit Form</Link>
                  <Link href={`/admin/registrations?id=${form.id}`} className="text-gray-900 bg-gray-50 p-4 rounded-xl text-center font-bold hover:bg-gray-100 transition-colors">Registrations</Link>
                </div>
                <button 
                  onClick={() => duplicateForm(form.id, form.title_en)}
                  className="w-full mt-4 text-[#4285F4] bg-blue-50 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#4285F4] hover:text-white transition-all border border-blue-100"
                >
                  Duplicate Form
                </button>
              </div>
            ))}
            {forms.length === 0 && <p className="text-gray-400 font-bold text-center col-span-2">No forms found. Please create one!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
