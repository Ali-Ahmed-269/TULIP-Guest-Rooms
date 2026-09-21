'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  Bell,
  Calendar as CalendarIcon,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Calendar,
  Bed,
  CreditCard,
  Star,
  Users,
  UserCheck,
  Settings,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const ADMIN_NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', pillLabel: 'Home', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', pillLabel: 'Bookings', icon: Calendar },
  { href: '/admin/rooms', label: 'Rooms', pillLabel: 'Rooms', icon: Bed },
  { href: '/admin/payments', label: 'Payments', pillLabel: 'Payments', icon: CreditCard },
  { href: '/admin/reviews', label: 'Reviews', pillLabel: 'Reviews', icon: Star },
  { href: '/admin/guests', label: 'Guests', pillLabel: 'Guests', icon: Users },
  { href: '/admin/walkin', label: 'Walk-in', pillLabel: 'Walk-in', icon: UserCheck },
  { href: '/admin/settings', label: 'Settings', pillLabel: 'Settings', icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const adminMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const isLinkActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin' || pathname === '/admin/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Formatted current date e.g., "Sat, Sep 19, 2026"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="admin-nav-header">
      <div className="admin-nav-content">
        {/* Top Header Row: Logo & Brand + Title & Quick Control Badges */}
        <div className="flex items-center justify-between gap-3 sm:gap-6 flex-wrap">
          {/* Left: Brand Logo Block + Admin Portal Heading */}
          <div className="flex items-center gap-3 sm:gap-6 lg:gap-8 flex-wrap">
            <Link href="/admin/dashboard" className="flex items-center gap-3 group shrink-0">
              {/* Tulip Gold Icon */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#d9b571]/20 to-[#d9b571]/5 border border-[#d9b571]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-inner">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[#d9b571]"
                >
                  <path
                    d="M12 3C10.5 6 9.5 8.5 9.5 12C9.5 14.5 10.6 16.5 12 17C13.4 16.5 14.5 14.5 14.5 12C14.5 8.5 13.5 6 12 3Z"
                    fill="currentColor"
                    fillOpacity="0.9"
                  />
                  <path
                    d="M6.5 7C5 9.5 4.5 12.5 5 14.5C5.5 16.5 7.5 18 10 18C10.8 18 11.5 17.7 12 17.2C10.2 16.2 9 14.2 9 11.8C9 9 10 7.2 10.8 6C9.2 6.2 7.8 6.5 6.5 7Z"
                    fill="currentColor"
                    fillOpacity="0.75"
                  />
                  <path
                    d="M17.5 7C19 9.5 19.5 12.5 19 14.5C18.5 16.5 16.5 18 14 18C13.2 18 12.5 17.7 12 17.2C13.8 16.2 15 14.2 15 11.8C15 9 14 7.2 13.2 6C14.8 6.2 16.2 6.5 17.5 7Z"
                    fill="currentColor"
                    fillOpacity="0.75"
                  />
                  <path
                    d="M12 18V22"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-white tracking-tight leading-tight">
                  Tulip Guest Rooms
                </h2>
                <p className="text-[9px] text-[#d9b571] tracking-widest uppercase font-medium mt-0.5 opacity-90">
                  Comfort · Stay · Relax
                </p>
              </div>
            </Link>

            {/* Vertical Divider Line */}
            <div className="w-[1px] h-9 bg-white/15 shrink-0 hidden md:block" />

            <div className="hidden sm:block">
              <h1 className="text-lg lg:text-2xl font-heading font-bold text-white tracking-tight flex items-center">
                <span>Admin Portal</span>
                <span
                  className="text-[10px] rounded-full bg-[#d9b571]/15 text-[#d9b571] border border-[#d9b571]/30 font-body font-semibold uppercase tracking-wider shrink-0"
                  style={{
                    marginLeft: '12px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                  }}
                >
                  Live
                </span>
              </h1>
              <p className="text-xs text-[#b7c0cb] mt-0.5 hidden md:block">
                Manage reservations, room availability, payments and guest settings.
              </p>
            </div>
          </div>

          {/* Right Action Badges */}
          <div className="flex items-center gap-3">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative w-9 h-9 rounded-xl bg-[#0b1c30]/90 border border-[#1b3859] flex items-center justify-center text-slate-300 hover:text-white hover:border-[#d9b571]/50 transition-colors shadow-sm"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell size={17} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0b1c30]" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-80 bg-[#0c1e34] border border-[#1b3859] rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="font-heading font-bold text-white text-sm">Notifications</span>
                    <span className="text-[11px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-semibold">2 New</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <div className="p-2.5 rounded-xl bg-[#071322] border border-white/5 hover:border-[#d9b571]/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-white">Payment Verified</span>
                      </div>
                      <p className="text-[11px] text-slate-300">Room 108 booking verified (TGR-2026-0013)</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">15 mins ago</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#071322] border border-white/5 hover:border-[#d9b571]/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-amber-400" />
                        <span className="text-xs font-semibold text-white">Room 106 Booked</span>
                      </div>
                      <p className="text-[11px] text-slate-300">Reservation confirmed for Sep 20 - Sep 22</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">1 hour ago</span>
                    </div>
                  </div>
                  <Link
                    href="/admin/bookings"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-center text-xs font-semibold text-[#d9b571] hover:underline pt-1"
                  >
                    View all bookings →
                  </Link>
                </div>
              )}
            </div>

            {/* Admin User Account Dropdown */}
            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#0b1c30]/90 border border-[#1b3859] hover:border-[#d9b571]/50 transition-colors cursor-pointer select-none shadow-sm"
                aria-expanded={adminMenuOpen}
              >
                <div className="w-6 h-6 rounded-lg bg-[#071322] border border-[#d9b571]/40 text-[#d9b571] text-xs font-bold flex items-center justify-center font-heading">
                  A
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white">Admin</span>
                <ChevronDown size={14} className={`text-[#b7c0cb] transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {adminMenuOpen && (
                <div className="absolute right-0 top-12 w-64 bg-[#0c1e34] border border-[#1b3859] rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 border-b border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck size={16} className="text-[#d9b571]" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Super Admin</span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">alikhanswati42574@gmail.com</p>
                  </div>

                  <Link
                    href="/admin/settings"
                    onClick={() => setAdminMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Settings size={14} className="text-[#d9b571]" />
                    <span>System Settings</span>
                  </Link>

                  <Link
                    href="/"
                    target="_blank"
                    onClick={() => setAdminMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <ExternalLink size={14} className="text-emerald-400" />
                    <span>View Public Site</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors border-t border-white/5 mt-1"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Date-Picker Pill */}
            <div
              className="hidden sm:flex items-center gap-3 rounded-xl bg-[#0b1c30]/90 border border-[#1b3859] text-white text-xs sm:text-sm font-medium shadow-sm hover:border-[#d9b571]/50 transition-colors"
              style={{ paddingLeft: '18px', paddingRight: '18px', paddingTop: '8px', paddingBottom: '8px' }}
            >
              <CalendarIcon size={16} className="text-[#d9b571] shrink-0" />
              <span className="text-slate-200">{formattedDate}</span>
              <ChevronDown size={14} className="text-[#b7c0cb] shrink-0" style={{ marginLeft: '4px' }} />
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Pill Bar */}
        <nav className="flex items-center justify-start sm:justify-between gap-2 sm:gap-2.5 overflow-x-auto py-1 no-scrollbar w-full scroll-smooth">
          {ADMIN_NAV_LINKS.map((item) => {
            const active = isLinkActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 min-w-[85px] sm:min-w-[95px] inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border shrink-0 ${
                  active
                    ? 'border-[#d9b571] bg-gradient-to-r from-[#d9b571]/25 via-[#d9b571]/15 to-[#d9b571]/10 text-[#d9b571] shadow-[0_0_14px_rgba(217,181,113,0.25)] font-bold'
                    : 'border-[#1b3859] bg-[#0b1c30]/90 text-slate-300 hover:border-[#d9b571]/60 hover:text-white hover:bg-[#112742]'
                }`}
              >
                <Icon size={15} className={active ? 'text-[#d9b571]' : 'text-slate-400'} />
                <span>{item.pillLabel}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleSignOut}
            className="flex-1 min-w-[85px] sm:min-w-[95px] inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border border-[#d9b571]/70 bg-[#0b1c30]/90 text-white hover:bg-rose-500/15 hover:border-rose-400 hover:text-rose-300 shadow-sm shrink-0"
          >
            <LogOut size={15} className="text-[#d9b571]" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
