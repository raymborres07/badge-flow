'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F1F3F4] flex flex-col font-sans">
      <div className="fixed top-0 left-0 w-full h-1.5 flex z-50">
        <div className="flex-1 bg-[#EA4335]" /><div className="flex-1 bg-[#4285F4]" /><div className="flex-1 bg-[#FBBC05]" /><div className="flex-1 bg-[#34A853]" />
      </div>

      <nav className="w-full p-8 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="h-12 px-3 bg-gray-900 rounded-2xl shadow-xl flex items-center justify-center border border-gray-800">
            <img src="/favicon.png" alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-black text-gray-900 tracking-tighter">BadgeFlow</span>
            <span className="text-[8px] font-black text-[#4285F4] uppercase tracking-widest">by GDGoC NagoyaUniversity</span>
          </div>
        </div>
        <Link href="/admin" className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/10 active:scale-95">
          Admin Console
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto pb-32">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8F0FE] text-[#4285F4] rounded-full text-[10px] font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Next-Gen GDG Registration Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
          Build Smarter Events. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05]">Automate Badges.</span>
        </h1>

        <p className="text-gray-500 font-bold text-lg md:text-xl max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          Create beautiful, dynamic registration forms and generate automated lanyard badges for your attendees in seconds. No code required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <Link href="/admin" className="px-10 py-5 bg-[#4285F4] text-white rounded-[2rem] text-lg font-black shadow-2xl shadow-blue-500/30 hover:bg-[#3367D6] hover:scale-105 active:scale-95 transition-all">
            Get Started Free
          </Link>
          <a href="#features" className="px-10 py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-[2rem] text-lg font-black hover:border-gray-300 hover:bg-gray-50 transition-all">
            Learn More
          </a>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white shadow-sm">
            <div className="w-12 h-12 bg-red-50 text-[#EA4335] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Dynamic Forms</h3>
            <p className="text-gray-500 text-sm font-bold">Custom questions, dropdowns, and social links tailored to your event.</p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white shadow-sm">
            <div className="w-12 h-12 bg-blue-50 text-[#4285F4] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Instant Lanyards</h3>
            <p className="text-gray-500 text-sm font-bold">Automatically generate printable badges with attendee info and QR codes.</p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white shadow-sm">
            <div className="w-12 h-12 bg-yellow-50 text-[#FBBC05] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3a10.003 10.003 0 00-6.93 17.151l-.054.09m12.796-1.144A9 9 0 0115 20a9 9 0 01-9-9m9 5l-3.44 2.03m3.541-1.191L13.5 20" /></svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Supabase Powered</h3>
            <p className="text-gray-500 text-sm font-bold">Secure, real-time data management for all your registrations and forms.</p>
          </div>
        </div>
      </main>

      <footer className="w-full p-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-auto">
        © 2026 BadgeFlow Platform • All Rights Reserved
      </footer>
    </div>
  );
}
