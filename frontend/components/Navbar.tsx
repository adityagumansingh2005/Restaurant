'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Navbar({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { isLoggedIn, currentUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const authBtnRef = useRef<HTMLButtonElement>(null);

  const displayName = currentUser?.firstName || currentUser?.email?.split('@')[0] || '';

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      authBtnRef.current &&
      !dropdownRef.current.contains(e.target as Node) &&
      !authBtnRef.current.contains(e.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [handleClickOutside]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      setDropdownOpen(false);
    }
  };

  return (
    <header>
      <nav>
        <div className="logo">
          Delicious<span>Bites</span>
        </div>

        <ul className={`nav-links${mobileMenuOpen ? ' mobile-open' : ''}`} id="navLinks">
          <li><Link href="/#home">Home</Link></li>
          <li><Link href="/#about">About</Link></li>
          <li><Link href="/#menu">Menu</Link></li>
          <li><Link href="/#reviews">Reviews</Link></li>
          <li><Link href="/#reservation">Reservation</Link></li>

          <li className="auth-dropdown">
            <button
              ref={authBtnRef}
              className={`auth-button${isLoggedIn ? ' logged-in' : ''}`}
              onClick={() => setDropdownOpen(prev => !prev)}
            >
              <span>{isLoggedIn ? displayName : 'Login / Signup'}</span>
              <span style={{ marginLeft: 8 }}>&#9660;</span>
            </button>

            {dropdownOpen && (
              <div ref={dropdownRef} className="auth-dropdown-menu">
                {isLoggedIn ? (
                  <>
                    <div className="auth-dropdown-item">
                      <span className="dropdown-user-name">Hi, {displayName}</span>
                    </div>
                    <div className="auth-dropdown-item">
                      <Link href="/my-reservations" onClick={() => setDropdownOpen(false)}>My Reservations</Link>
                    </div>
                    <div className="auth-dropdown-item logout-item">
                      <a
                        href="#"
                        className="logout-link"
                        onClick={(e) => { e.preventDefault(); handleLogout(); }}
                      >
                        Logout
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="auth-dropdown-item">
                    <a
                      href="#"
                      className="login-link"
                      onClick={(e) => { e.preventDefault(); onOpenAuth(); setDropdownOpen(false); }}
                    >
                      Login / Signup
                    </a>
                  </div>
                )}
              </div>
            )}
          </li>
        </ul>

        <button
          className="menu-icon"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
    </header>
  );
}
