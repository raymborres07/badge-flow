'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PrintBatchButton = dynamic(
  () => import('@/components/PrintBatchButton'),
  { ssr: false }
);

function RegistrationsContent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id');

  const [registrants, setRegistrants] = useState<any[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [formMeta, setFormMeta] = useState<any>(null);
  const [formConfig, setFormConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedRegistrant, setSelectedRegistrant] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  const downloadBadge = async (regId: string, regName: string) => {
    const prefix = formMeta?.badge_type === 'certificate' ? 'Certificate' : 'Lanyard';
    const filename = `${prefix}-${regName.replace(/\s+/g, '-')}.png`;
    try {
      const res = await fetch(`/api/lanyard?id=${regId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to generate: ' + err.message);
      console.error('Download error:', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (formId) fetchData();
  }, [formId]);

  async function fetchData() {
    try {
      const query = supabase.from('registrations').select('*').eq('form_id', formId);
      
      if (showDeleted) {
        query.not('deleted_at', 'is', null);
      } else {
        query.is('deleted_at', null);
      }

      const [regRes, metaRes, configRes] = await Promise.all([
        query.order('created_at', { ascending: false }),
        supabase.from('forms').select('*').eq('id', formId).single(),
        supabase.from('form_config').select('*').eq('form_id', formId).order('sort_order', { ascending: true })
      ]);

      if (regRes.data) setRegistrants(regRes.data);
      if (metaRes.data) setFormMeta(metaRes.data);
      if (configRes.data) setFormConfig(configRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (formId) fetchData();
  }, [showDeleted]);

  const deleteRegistrant = async (id: string) => {
    if (showDeleted) {
      if (!confirm('PERMANENT DELETE: This attendee data will be gone forever. Continue?')) return;
      try {
        setDeletingId(id);
        const { error } = await supabase.from('registrations').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (err: any) {
        alert('Permanent delete failed');
      } finally {
        setDeletingId(null);
      }
      return;
    }

    if (!confirm('Are you sure you want to delete this registration?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const restoreRegistrant = async (id: string) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Restore failed');
    }
  };

  const origin = mounted ? window.location.origin : '';
  const lanyardUrls = registrants.map(r => `${origin}/api/lanyard?id=${r.id}`);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 font-sans">
      <div className="fixed top-0 left-0 w-full h-1.5 flex z-50">
        <div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
      </div>

      <div className="max-w-6xl mx-auto pt-8">
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Link href="/admin" className="bg-white border-2 border-gray-100 text-gray-400 hover:border-[#4285F4] hover:text-[#4285F4] px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">{formMeta?.slug || '...'}</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Registrations</h1>
            <p className="text-gray-500 font-bold mt-1">
              {showDeleted ? 'Deleted items' : `${registrants.length} active attendees`} for <span className="text-gray-900">{formMeta?.title_en || 'Loading...'}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowDeleted(!showDeleted)}
              className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${showDeleted ? 'bg-gray-900 text-white shadow-xl' : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-200'}`}
            >
              {showDeleted ? 'View Active' : 'View Deleted'}
            </button>
            {formId && registrants.length > 0 && !showDeleted && (
              <Link 
                href={`/admin/print?id=${formId}`}
                className="bg-gradient-to-r from-[#4285F4] to-[#34A853] hover:from-blue-600 hover:to-green-600 shadow-lg shadow-blue-500/20 text-white font-black py-3 px-8 rounded-xl transition-all active:scale-[0.98] flex items-center gap-2"
              >
                Batch Print {formMeta?.badge_type === 'certificate' ? 'Certificates' : 'Badges'}
              </Link>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        {!showDeleted && registrants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Participants</div>
              <div className="text-4xl font-black text-gray-900">{registrants.length}</div>
            </div>
            {formConfig.filter(f => f.type === 'slider').slice(0, 3).map(field => {
              const scores = registrants
                .map(r => parseInt(r.responses?.[field.id]))
                .filter(s => !isNaN(s));
              const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
              
              return (
                <div key={field.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-16 h-16 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                  </div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 truncate pr-8">{field.label_en}</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-black text-[#4285F4]">{avg}</div>
                    <div className="text-xs font-bold text-gray-300 italic">avg</div>
                  </div>
                  <div className="mt-3 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#4285F4] to-[#34A853]" 
                      style={{ width: `${(parseFloat(avg) || 0) * 10}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4285F4]/20 border-b-[#4285F4] mb-4"></div>
            <p className="text-gray-400 font-bold">Loading registrants...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/40 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-6 text-sm font-bold text-gray-400 uppercase tracking-wider">Attendee</th>
                    <th className="px-8 py-6 text-sm font-bold text-gray-400 uppercase tracking-wider">{formMeta?.badge_type === 'certificate' ? 'Role / Interest' : 'Lanyard Role'}</th>
                    <th className="px-8 py-6 text-sm font-bold text-gray-400 uppercase tracking-wider">Registered</th>
                    <th className="px-8 py-6 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {registrants.map((reg) => (
                    <tr key={reg.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-black text-gray-900 text-lg">{reg.name}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-[#4285F4]">
                          {reg.industry}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm text-gray-500 font-bold">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right flex justify-end gap-3">
                        <button
                          onClick={() => setSelectedRegistrant(reg)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-black transition-all"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => downloadBadge(reg.id, reg.name)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-gray-100 text-gray-700 hover:border-[#4285F4] hover:text-[#4285F4] rounded-xl text-xs font-black transition-all transform active:scale-95"
                        >
                          {formMeta?.badge_type === 'certificate' ? 'Get Certificate' : 'Download PNG'}
                        </button>
                        {showDeleted ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => restoreRegistrant(reg.id)}
                              className="p-2.5 text-[#34A853] hover:bg-green-50 rounded-xl transition-all"
                              title="Restore"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <button
                              onClick={() => deleteRegistrant(reg.id)}
                              className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                              title="Permanent Delete"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => deleteRegistrant(reg.id)}
                            disabled={deletingId === reg.id}
                            className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {registrants.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <p className="text-gray-400 font-bold text-lg">No registrations yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedRegistrant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{selectedRegistrant.name}</h3>
                <p className="text-sm font-bold text-gray-400 mt-1">Registration Details</p>
              </div>
              <button onClick={() => setSelectedRegistrant(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formConfig.map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{field.label_en}</label>
                    <div className="text-gray-900 font-bold p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      {selectedRegistrant.responses?.[field.id] || '—'}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedRegistrant.linkedin_url && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">LinkedIn / Social</label>
                  <a href={selectedRegistrant.linkedin_url} target="_blank" className="block text-[#4285F4] font-bold p-4 bg-blue-50 rounded-2xl border border-blue-100 break-all">
                    {selectedRegistrant.linkedin_url}
                  </a>
                </div>
              )}
            </div>
            <footer className="p-8 border-t border-gray-50 bg-gray-50/50 flex justify-between items-center">
               <span className="text-xs font-bold text-gray-400">Registered on {new Date(selectedRegistrant.created_at).toLocaleString()}</span>
               <button onClick={() => setSelectedRegistrant(null)} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black shadow-lg shadow-gray-900/20 active:scale-95 transition-all">Close</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegistrationsView() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black text-gray-400">Loading...</div>}>
      <RegistrationsContent />
    </Suspense>
  );
}
