'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // If it doesn't look like an email, treat it as a username and append a domain
      const finalEmail = email.includes('@') ? email : `${email}@admin.local`;

      const { error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      });

      if (error) throw error;

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 font-sans">
      <div className="fixed top-0 left-0 w-full h-1.5 flex z-50">
        <div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">
          <div className="flex flex-col items-center mb-8">
            <img src="/favicon.png" alt="Logo" className="h-16 w-16 mb-6 object-contain" />
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Login</h1>
            <p className="text-gray-500 font-bold mt-2">Authorized access only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
              <input 
                type="text" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-gray-900 focus:bg-white focus:border-[#4285F4] focus:outline-none transition-all font-bold shadow-sm"
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-gray-900 focus:bg-white focus:border-[#4285F4] focus:outline-none transition-all font-bold shadow-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center border border-red-100">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#4285F4] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-[#3367D6] transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-gray-400 font-bold text-xs">
          Not authorized? <a href="/" className="text-[#4285F4] hover:underline">Return to Home</a>
        </p>
      </div>
    </div>
  );
}
