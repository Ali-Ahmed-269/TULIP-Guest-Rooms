'use client';

import { Phone, Mail, MapPin, Smartphone, CreditCard } from 'lucide-react';

interface FooterProps {
  settings: Record<string, string>;
}

export default function Footer({ settings }: FooterProps) {
  const ghName = settings.guesthouse_name || 'Tulip Guest Rooms';
  const ghAddress = settings.guesthouse_address || 'Karachi, Pakistan';
  const ghPhone = settings.guesthouse_phone || '0300-1234567';
  const ghEmail = settings.guesthouse_email || 'hello@tulipguestrooms.com';
  const jazzNumber = settings.jazzcash_number || '0300-1234567';
  const easypaisaNumber = settings.easypaisa_number || '0311-7654321';

  return (
    <footer id="contact" className="footer">
      <div className="container grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-10 text-left">
        
        {/* Brand Column */}
        <div className="flex flex-col gap-4">
          <h3 className="text-2xl text-gold font-heading">{ghName}</h3>
          <p className="text-[#ccc] text-[0.95rem]">
            Experience comfort, elegance, and warm hospitality. Located centrally, offering Standard Room, Premium Room, and Comfort Plus options for individuals and families.
          </p>
        </div>

        {/* Payment Account Details */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[1.2rem] text-gold">Payment Options</h3>
          <ul className="flex flex-col gap-2 text-[#ccc] text-[0.95rem]">
            <li className="flex items-center gap-2">
              <Smartphone size={18} className="text-gold" />
              <div>
                <strong>JazzCash Account:</strong> <span className="text-white">{jazzNumber}</span>
              </div>
            </li>
            <li className="flex items-center gap-2">
              <CreditCard size={18} className="text-gold" />
              <div>
                <strong>Easypaisa Account:</strong> <span className="text-white">{easypaisaNumber}</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <div className="text-sage font-bold">
                Note: Accounts are registered under &ldquo;Tulip Guest Rooms&rdquo;
              </div>
            </li>
          </ul>
        </div>

        {/* Contact details */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[1.2rem] text-gold">Contact Info</h3>
          <ul className="flex flex-col gap-2 text-[#ccc] text-[0.95rem]">
            <li className="flex items-start gap-2">
              <MapPin size={18} className="text-gold mt-[3px] shrink-0" />
              <span>{ghAddress}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={18} className="text-gold shrink-0" />
              <span>{ghPhone}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={18} className="text-gold shrink-0" />
              <a href={`mailto:${ghEmail}`} className="text-[#ccc] footer-link-hover">{ghEmail}</a>
            </li>
          </ul>
        </div>

      </div>

      {/* Copywrite Bottom Bar */}
      <div className="mt-10 pt-4 border-t border-[#444] text-[#888] text-[0.85rem]">
        <p>&copy; {new Date().getFullYear()} {ghName}. All rights reserved.</p>
      </div>

      <style jsx>{`
        .footer-link-hover:hover {
          color: var(--gold) !important;
        }
      `}</style>
    </footer>
  );
}
