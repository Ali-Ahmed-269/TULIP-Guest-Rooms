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
  const [activeSection, setActiveSection] = useState<string>('home');
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

  // Track active section on homepage based on scroll position
  useEffect(() => {
    if (pathname !== '/') return;

    const sectionIds = ['home', 'rooms', 'about', 'booking', 'contact'];

    const updateActiveSection = () => {
      if (window.scrollY < 80) {
        setActiveSection('home');
        return;
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
        setActiveSection('contact');
        return;
      }

      const headerOffset = 120;
      let current = 'home';

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= headerOffset && rect.bottom >= headerOffset) {
            current = id;
            break;
          }
        }
      }
      setActiveSection(current);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveSection);
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
              <Link
                href={isHome ? '#home' : '/'}
                className={isHome ? (activeSection === 'home' ? 'active' : '') : (pathname === '/' ? 'active' : '')}
                onClick={closeMenu}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href={isHome ? '#rooms' : '/#rooms'}
                className={isHome && activeSection === 'rooms' ? 'active' : ''}
                onClick={closeMenu}
              >
                Rooms
              </Link>
            </li>
            <li>
              <Link
                href={isHome ? '#about' : '/#about'}
                className={isHome && activeSection === 'about' ? 'active' : ''}
                onClick={closeMenu}
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href={isHome ? '#booking' : '/#booking'}
                className={isHome && activeSection === 'booking' ? 'active' : ''}
                onClick={closeMenu}
              >
                Book Now
              </Link>
            </li>
            <li>
              <Link
                href={isHome ? '#contact' : '/#contact'}
                className={isHome && activeSection === 'contact' ? 'active' : ''}
                onClick={closeMenu}
              >
                Contact
              </Link>
            </li>
            <li>
              <Link
                href="/lookup"
                className={pathname === '/lookup' ? 'active' : ''}
                onClick={closeMenu}
              >
                My Bookings
              </Link>
            </li>
            <li>
              <Link
                href="/reviews"
                className={pathname === '/reviews' ? 'active' : ''}
                onClick={closeMenu}
              >
                Reviews
              </Link>
            </li>
            <li>
              <Link
                href="/admin/login"
                className={pathname === '/admin/login' ? 'active' : ''}
                onClick={closeMenu}
              >
                Admin
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
