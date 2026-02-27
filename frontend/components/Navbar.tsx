'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

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
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#menu">Menu</a></li>
          <li><a href="#reviews">Reviews</a></li>
          <li><a href="#reservation">Reservation</a></li>

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
                  <div className="auth-dropdown-item logout-item">
                    <span className="dropdown-user-name">Hi, {displayName}</span>
                    <a
                      href="#"
                      className="logout-link"
                      onClick={(e) => { e.preventDefault(); handleLogout(); }}
                    >
                      Logout
                    </a>
                  </div>
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

        <div className="menu-icon" onClick={() => setMobileMenuOpen(prev => !prev)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </nav>
    </header>
  );
}
