import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function LandingPage({ currentUser, userProfile, loginUser, firebaseAuth }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Automatically redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      if (userProfile) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    }
  }, [currentUser, userProfile]);

  // Handle Google sign-in
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const currentAuth = firebaseAuth || auth;
    if (currentAuth) {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(currentAuth, provider);
        console.log(result.user);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Google Sign-In failed');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Firebase Authentication is not ready. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0F0F0F', position: 'relative', overflow: 'hidden' }}>
      
      <Head>
        <title>GARDO | Style What You Own.</title>
        <link rel="icon" href="/logo.jpg" />
      </Head>

      {/* Decorative background gradients */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(0,0,0,0) 70%)', zIndex: 1 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 70%)', zIndex: 1 }}></div>

      {/* Header / Navbar */}
      <header className="glass-panel" style={{ margin: '20px', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, borderRadius: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.jpg" alt="GARDO Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.3)', objectFit: 'cover' }} />
          <span style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '0.15em', color: '#FFFFFF' }}>GARDO</span>
        </div>
        <div className="font-serif" style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#D4AF37', letterSpacing: '0.05em' }}>
          Style What You Own.
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', zIndex: 5, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '60px', width: '100%', alignItems: 'center' }} className="responsive-hero-grid">
          
          {/* Visual statement / Left column */}
          <div className="animate-fade-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="font-serif" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: '#FFFFFF', fontWeight: '400', lineHeight: 1.1, marginBottom: '20px' }}>
              Style <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>What You</span> Own.
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#B3B3B3', maxWidth: '600px', marginBottom: '32px', lineHeight: '1.6', fontWeight: '300' }}>
              GARDO helps people make better use of the clothes they already own. No shopping loops, no social feeds. Just personal styling intelligence powered by your closet.
            </p>
            
            <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', width: '100%', maxWidth: '500px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#D4AF37', fontSize: '1.6rem', fontWeight: '600' }}>1000+</div>
                <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Styling Rules</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '30px' }}>
                <div style={{ color: '#D4AF37', fontSize: '1.6rem', fontWeight: '600' }}>Weather</div>
                <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Intelligence</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '30px' }}>
                <div style={{ color: '#D4AF37', fontSize: '1.6rem', fontWeight: '600' }}>Sweat</div>
                <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Comfort Profiling</div>
              </div>
            </div>
          </div>

          {/* Interactive Authentication Box */}
          <div className="animate-fade-scale" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div className="glass-panel-gold" style={{ padding: '40px 30px', width: '100%', maxWidth: '440px', textAlign: 'center', background: 'rgba(20,20,20,0.75)' }}>
              <img src="/logo.jpg" alt="GARDO Logo" style={{ width: '80px', height: '80px', borderRadius: '18px', border: '1px solid rgba(212,175,55,0.4)', margin: '0 auto 20px', display: 'block', objectFit: 'cover' }} />
              
              <h2 style={{ fontSize: '1.6rem', color: '#FFFFFF', marginBottom: '8px', fontWeight: '500' }}>Welcome to GARDO</h2>
              <p style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '32px' }}>Personal Styling Platform</p>

              {error && <div style={{ color: '#EA4335', fontSize: '0.85rem', marginBottom: '16px', background: 'rgba(234, 67, 53, 0.1)', padding: '10px', borderRadius: '8px' }}>⚠️ {error}</div>}

              {loading ? (
                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="loader-spinner"></div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>Contacting Authentication Servers...</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Google Login */}
                  <button 
                    onClick={handleGoogleLogin}
                    className="btn-secondary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-3.3-4.53-6.16-4.53z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Philosophy Banner */}
      <section style={{ backgroundColor: '#131313', padding: '60px 20px', borderTop: '1px solid rgba(255,255,255,0.03)', zIndex: 2 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#D4AF37', letterSpacing: '0.3em', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>
            Core Philosophy
          </span>
          <h2 className="font-serif" style={{ fontSize: '2rem', color: '#FFFFFF', marginBottom: '24px', fontWeight: '400' }}>
            "Don't buy more clothes. Wear your clothes better."
          </h2>
          <p style={{ color: '#B3B3B3', fontSize: '1rem', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto' }}>
            We believe in high-utility fashion and style sustainability. GARDO's intelligent rule engine helps you uncover premium combinations from your existing wardrobe tailored specifically to weather comfort, sweat resistance, and occasions.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-panel" style={{ margin: '20px', padding: '30px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', zIndex: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <img src="/logo.jpg" alt="GARDO Logo" style={{ width: '45px', height: '45px', borderRadius: '10px', filter: 'grayscale(30%)', objectFit: 'cover' }} />
          <div style={{ fontSize: '0.8rem', color: '#666666', letterSpacing: '0.1em' }}>
            &copy; 2026 GARDO. All rights reserved. Launching in India & Singapore.
          </div>
        </div>
      </footer>

      {/* Desktop Responsive Style Adjuster */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          .responsive-hero-grid {
            grid-template-columns: 1.2fr 0.8fr !important;
            padding: 80px 0 !important;
          }
          .responsive-hero-grid > div:first-child {
            text-align: left !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}
