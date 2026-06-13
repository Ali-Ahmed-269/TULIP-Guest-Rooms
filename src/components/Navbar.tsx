'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  guesthouseName?: string;
}

export default function Navbar({ guesthouseName = 'Tulip Guest Rooms' }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    // If we're not on the homepage, navbar is always "scrolled" (solid color background)
    if (pathname !== '/') {
      setScrolled(true);
      window.removeEventListener('scroll', handleScroll);
    } else {
      // For homepage, initialize state on mount
      setScrolled(window.scrollY > 50);
      window.addEventListener('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const isHome = pathname === '/';

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <Link href="/" className="logo" onClick={closeMenu}>
          {guesthouseName}
        </Link>
        
        <button 
          className="hamburger"
          onClick={toggleMenu}
          aria-label="Toggle Navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <ul>
            <li>
              <Link href={isHome ? '#home' : '/'} onClick={closeMenu}>Home</Link>
            </li>
            <li>
              <Link href={isHome ? '#about' : '/#about'} onClick={closeMenu}>About</Link>
            </li>
            <li>
              <Link href={isHome ? '#rooms' : '/#rooms'} onClick={closeMenu}>Rooms</Link>
            </li>
            <li>
              <Link href="/lookup" className={pathname === '/lookup' ? 'active' : ''} onClick={closeMenu}>My Bookings</Link>
            </li>
            <li>
              <Link href="/reviews" className={pathname === '/reviews' ? 'active' : ''} onClick={closeMenu}>Reviews</Link>
            </li>
            <li>
              <Link href="/admin/login" className={pathname === '/admin/login' ? 'active' : ''} onClick={closeMenu}>Admin</Link>
            </li>
            <li>
              <Link href={isHome ? '#booking' : '/#booking'} onClick={closeMenu}>Book Now</Link>
            </li>
            <li>
              <Link href={isHome ? '#contact' : '/#contact'} onClick={closeMenu}>Contact</Link>
            </li>
          </ul>
        </nav>
      </div>

      <style jsx global>{`
        /* Active links style */
        .nav-links a.active {
          color: var(--primary) !important;
          border-bottom: 2px solid var(--primary);
        }
        .navbar.scrolled .nav-links a.active {
          color: var(--primary) !important;
        }
      `}</style>
    </header>
  );
}
