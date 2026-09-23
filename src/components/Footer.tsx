'use client';

import { Phone, Mail, MapPin, Smartphone, CreditCard } from 'lucide-react';

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
    <footer id="contact" className="footer relative pt-12 pb-12">

      <div className="container grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12 text-center">
        
        {/* ── Column 1: Brand / Tulip Guest Rooms ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center">
            <h3 className="footer-brand-name text-[1.45rem] font-heading font-bold leading-tight">
              {ghName}
            </h3>
            <div className="footer-divider w-12 h-[2px] rounded-full mt-2" />
          </div>

          <p className="footer-description text-[0.93rem] leading-relaxed mt-1 max-w-sm">
            Experience comfort, elegance, and warm hospitality. Located centrally, offering Standard Room, Premium Room, and Comfort Plus options for individuals and families.
          </p>

          <p className="footer-copyright text-[0.82rem] mt-auto pt-4">
            &copy; 2025 {ghName}. All rights reserved.
          </p>
        </div>

        {/* ── Column 2: Payment Options ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h3 className="footer-section-heading text-[1.28rem] font-heading font-bold">
            Payment Options
          </h3>

          <ul className="flex flex-col items-center gap-3 text-[0.93rem] mt-1 footer-list">
            <li className="flex items-center justify-center gap-3">
              <Smartphone size={17} className="footer-icon shrink-0" />
              <div>
                <span className="footer-label">JazzCash Account:</span>{' '}
                <span className="footer-value font-medium">{jazzNumber}</span>
              </div>
            </li>
            <li className="flex items-center justify-center gap-3">
              <CreditCard size={17} className="footer-icon shrink-0" />
              <div>
                <span className="footer-label">Easypaisa Account:</span>{' '}
                <span className="footer-value font-medium">{easypaisaNumber}</span>
              </div>
            </li>
          </ul>
        </div>

        {/* ── Column 3: Contact Info ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h3 className="footer-section-heading text-[1.28rem] font-heading font-bold">
            Contact Info
          </h3>

          <ul className="flex flex-col items-center gap-3 text-[0.93rem] mt-1 footer-list">
            <li className="flex items-center justify-center gap-3">
              <MapPin size={17} className="footer-icon shrink-0" />
              <span>{ghAddress}</span>
            </li>
            <li className="flex items-center justify-center gap-3">
              <Phone size={17} className="footer-icon shrink-0" />
              <a href={`tel:${ghPhone}`} className="footer-link">
                {ghPhone}
              </a>
            </li>
            <li className="flex items-center justify-center gap-3">
              <Mail size={17} className="footer-icon shrink-0" />
              <a href={`mailto:${ghEmail}`} className="footer-link break-all">
                {ghEmail}
              </a>
            </li>
          </ul>
        </div>

      </div>
    </footer>
  );
}
