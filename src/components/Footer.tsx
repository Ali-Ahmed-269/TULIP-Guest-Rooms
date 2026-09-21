'use client';

import { Phone, Mail, MapPin, Smartphone, CreditCard, Info } from 'lucide-react';

interface FooterProps {
  settings?: Record<string, string>;
}

export default function Footer({ settings }: FooterProps) {
  const ghName = settings?.guesthouse_name || 'Tulip Guest Rooms';
  const ghAddress = 'Abbottabad, Pakistan';
  const ghPhone = '0313-3357030';
  const ghEmail = 'alikhanswati42574@gmail.com';
  const jazzNumber = '0324-5369274';
  const easypaisaNumber = '0313-3357030';

  return (
    <footer id="contact" className="footer relative pt-12 pb-12 bg-[#060e18] text-slate-300">

      <div className="container grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12 text-center">
        
        {/* ── Column 1: Brand / Tulip Guest Rooms ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center">
            <h3 className="text-[1.45rem] font-heading font-bold text-white leading-tight">
              {ghName}
            </h3>
            <div className="w-12 h-[2px] bg-[--gold-400,#d4a853] rounded-full mt-2" />
          </div>

          <p className="text-[#94a3b8] text-[0.93rem] leading-relaxed mt-1 max-w-sm">
            Experience comfort, elegance, and warm hospitality. Located centrally, offering Standard Room, Premium Room, and Comfort Plus options for individuals and families.
          </p>

          <p className="text-[#64748b] text-[0.82rem] mt-auto pt-4">
            &copy; 2025 {ghName}. All rights reserved.
          </p>
        </div>

        {/* ── Column 2: Payment Options ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h3 className="text-[1.28rem] font-heading font-bold text-white">
            Payment Options
          </h3>

          <ul className="flex flex-col items-center gap-3 text-[#cbd5e1] text-[0.93rem] mt-1">
            <li className="flex items-center justify-center gap-3">
              <Smartphone size={17} className="text-[--gold-400,#d4a853] shrink-0" />
              <div>
                <span className="text-[#94a3b8]">JazzCash Account:</span>{' '}
                <span className="text-white font-medium">{jazzNumber}</span>
              </div>
            </li>
            <li className="flex items-center justify-center gap-3">
              <CreditCard size={17} className="text-[--gold-400,#d4a853] shrink-0" />
              <div>
                <span className="text-[#94a3b8]">Easypaisa Account:</span>{' '}
                <span className="text-white font-medium">{easypaisaNumber}</span>
              </div>
            </li>
          </ul>

          {/* Note Bordered Box */}
          <div
            className="flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-lg mt-2 text-[0.85rem] text-[--gold-400,#d4a853] text-center"
            style={{
              border: '1px solid rgba(217, 181, 113, 0.3)',
              background: 'rgba(217, 181, 113, 0.07)',
            }}
          >
            <Info size={16} className="shrink-0 text-[--gold-400,#d4a853]" />
            <span>
              Note: Accounts are registered under <strong>&ldquo;Tulip Guest Rooms&rdquo;</strong>
            </span>
          </div>
        </div>

        {/* ── Column 3: Contact Info ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h3 className="text-[1.28rem] font-heading font-bold text-white">
            Contact Info
          </h3>

          <ul className="flex flex-col items-center gap-3 text-[#cbd5e1] text-[0.93rem] mt-1">
            <li className="flex items-center justify-center gap-3">
              <MapPin size={17} className="text-[--gold-400,#d4a853] shrink-0" />
              <span>{ghAddress}</span>
            </li>
            <li className="flex items-center justify-center gap-3">
              <Phone size={17} className="text-[--gold-400,#d4a853] shrink-0" />
              <a href={`tel:${ghPhone}`} className="text-white hover:text-[--gold-400,#d4a853] transition-colors">
                {ghPhone}
              </a>
            </li>
            <li className="flex items-center justify-center gap-3">
              <Mail size={17} className="text-[--gold-400,#d4a853] shrink-0" />
              <a href={`mailto:${ghEmail}`} className="text-white hover:text-[--gold-400,#d4a853] transition-colors break-all">
                {ghEmail}
              </a>
            </li>
          </ul>
        </div>

      </div>
    </footer>
  );
}
