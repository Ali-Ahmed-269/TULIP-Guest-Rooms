'use client';

import Link from 'next/link';

export default function AdminSidebar() {
  return (
    <aside className="w-64 xl:w-72 bg-[#0e1e33] border-r border-white/10 min-h-screen flex flex-col justify-between sticky top-0 shrink-0 select-none z-30">
      {/* Top Logo & Branding Block */}
      <div className="p-6 border-b border-white/10">
        <Link href="/admin/dashboard" className="flex items-center gap-3.5 group">
          {/* Tulip Flower Gold Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d9b571]/20 to-[#d9b571]/5 border border-[#d9b571]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-inner">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#d9b571]"
            >
              {/* Tulip center petal */}
              <path
                d="M12 3C10.5 6 9.5 8.5 9.5 12C9.5 14.5 10.6 16.5 12 17C13.4 16.5 14.5 14.5 14.5 12C14.5 8.5 13.5 6 12 3Z"
                fill="currentColor"
                fillOpacity="0.9"
              />
              {/* Left petal */}
              <path
                d="M6.5 7C5 9.5 4.5 12.5 5 14.5C5.5 16.5 7.5 18 10 18C10.8 18 11.5 17.7 12 17.2C10.2 16.2 9 14.2 9 11.8C9 9 10 7.2 10.8 6C9.2 6.2 7.8 6.5 6.5 7Z"
                fill="currentColor"
                fillOpacity="0.75"
              />
              {/* Right petal */}
              <path
                d="M17.5 7C19 9.5 19.5 12.5 19 14.5C18.5 16.5 16.5 18 14 18C13.2 18 12.5 17.7 12 17.2C13.8 16.2 15 14.2 15 11.8C15 9 14 7.2 13.2 6C14.8 6.2 16.2 6.5 17.5 7Z"
                fill="currentColor"
                fillOpacity="0.75"
              />
              {/* Stem */}
              <path
                d="M12 18V22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <h2 className="font-heading font-bold text-[1.15rem] text-white tracking-tight leading-tight">
              Tulip Guest Rooms
            </h2>
            <p className="text-[10px] text-[#d9b571] tracking-widest uppercase font-medium mt-0.5 opacity-90">
              Comfort · Stay · Relax
            </p>
          </div>
        </Link>
      </div>

      {/* Bottom Decorative Section */}
      <div className="p-6 relative overflow-hidden border-t border-white/5 flex flex-col items-center text-center">
        {/* Decorative Gold Botanical Leaf Graphic */}
        <div className="mb-2 opacity-25 text-[#d9b571]">
          <svg
            width="48"
            height="32"
            viewBox="0 0 64 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M32 34C32 20 20 8 2 4C18 8 28 20 32 34Z"
              fill="currentColor"
            />
            <path
              d="M32 34C32 20 44 8 62 4C46 8 36 20 32 34Z"
              fill="currentColor"
            />
            <path
              d="M32 34V12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="32" cy="8" r="3" fill="currentColor" />
          </svg>
        </div>

        <p className="text-xs font-heading font-medium text-slate-300">
          Tulip Guest Rooms
        </p>
        <p className="text-[11px] text-[#64748b] tracking-wider uppercase mt-0.5">
          Admin Panel
        </p>
      </div>
    </aside>
  );
}
