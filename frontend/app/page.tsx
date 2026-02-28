'use client';

import { useState } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Menu from '@/components/Menu';
import Reviews from '@/components/Reviews';
import Reservation from '@/components/Reservation';
import Footer from '@/components/Footer';

export default function Home() {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const openAuth = () => setAuthModalOpen(true);
  const closeAuth = () => setAuthModalOpen(false);

  return (
    <ErrorBoundary>
      <Navbar onOpenAuth={openAuth} />
      <AuthModal isOpen={authModalOpen} onClose={closeAuth} />
      <Hero />
      <About />
      <Menu />
      <Reviews />
      <Reservation onOpenAuth={openAuth} />
      <Footer />
    </ErrorBoundary>
  );
}

