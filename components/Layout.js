import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children, currentUser, userProfile, logoutUser }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Home Dashboard', path: '/dashboard', icon: '🏠' },
    { name: 'My Wardrobe', path: '/wardrobe', icon: '📌' },
    { name: 'Outfit Matcher', path: '/matcher', icon: '✨' },
    { name: 'Stylist Chatbot', path: '/assistant', icon: '💬' }
  ];

  const handleLogout = () => {
    logoutUser();
    router.push('/');
  };

  // Guard: if user not logged in, they should go to landing
  if (!currentUser) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return null;
  }

  const userDisplayName = userProfile?.name || 'Gardo User';
  const userLoc = userProfile ? `${userProfile.city}, ${userProfile.country}` : 'Bangalore, India';

  return (
    <div className="dashboard-layout">
      {/* 1. DESKTOP SIDEBAR (Hidden on mobile) */}
      <aside className="glass-panel desktop-sidebar" style={{ 
        margin: '20px', 
        padding: '30px 20px', 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 40px)', 
        position: 'sticky', 
        top: '20px',
        background: 'var(--bg-glass-heavy)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        zIndex: 100
      }}>
        
        {/* Brand Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '10px' }}>
          <img src="/logo.jpg" alt="GARDO Logo" style={{ width: '42px', height: '42px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.3)', objectFit: 'cover' }} />
          <div>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '0.15em', color: '#FFFFFF', display: 'block', lineHeight: 1 }}>GARDO</span>
            <span style={{ fontSize: '0.65rem', color: '#D4AF37', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '4px', display: 'block' }}>Style What You Own</span>
          </div>
        </div>

        {/* User Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '16px', marginBottom: '32px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '50%', border: '1.5px solid #D4AF37', overflow: 'hidden', flexShrink: 0, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentUser?.profile_picture_url ? (
              <img src={currentUser.profile_picture_url} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.2rem', color: '#888' }}>👤</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userDisplayName}</div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span>📍</span> {userLoc}
            </div>
          </div>
        </div>
        {userProfile && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '-20px', marginBottom: '24px', paddingLeft: '10px' }}>
            <span style={{ fontSize: '0.65rem', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', padding: '3px 8px', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              {userProfile.body_type}
            </span>
            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.05)', color: '#AAA', padding: '3px 8px', borderRadius: '10px' }}>
              {userProfile.gender}
            </span>
          </div>
        )}

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {menuItems.map(item => {
            const isActive = router.pathname === item.path;
            return (
              <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '14px', 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  color: isActive ? '#D4AF37' : '#B3B3B3', 
                  background: isActive ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid #D4AF37' : '3px solid transparent',
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }} className="sidebar-link">
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="btn-secondary"
          style={{ width: '100%', padding: '12px', fontSize: '0.8rem', borderRadius: '10px', marginTop: '20px' }}
        >
          Logout
        </button>

      </aside>

      {/* 2. MOBILE RESPONSIVE HEADER & NAVIGATION */}
      <div className="mobile-header" style={{ display: 'none', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 20px', zIndex: 1000, position: 'sticky', top: 0, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.jpg" alt="GARDO Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '0.1em', color: '#FFFFFF' }}>GARDO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #D4AF37', overflow: 'hidden', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentUser?.profile_picture_url ? (
              <img src={currentUser.profile_picture_url} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#888' }}>👤</span>
            )}
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'transparent', border: 'none', color: '#FFF', fontSize: '1.6rem', cursor: 'pointer' }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Slide-out Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" style={{ 
          position: 'fixed', 
          inset: '57px 0 0 0', 
          background: 'rgba(15,15,15,0.95)', 
          zIndex: 998, 
          padding: '24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '24px' 
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {menuItems.map(item => {
              const isActive = router.pathname === item.path;
              return (
                <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>
                  <div style={{ 
                    padding: '16px', 
                    background: isActive ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px', 
                    color: isActive ? '#D4AF37' : '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: isActive ? '600' : '400',
                    borderLeft: isActive ? '4px solid #D4AF37' : 'none'
                  }}>
                    <span>{item.icon}</span>
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '12px' }}>Logged in as: {userDisplayName}</div>
            <button 
              onClick={handleLogout}
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT WORKSPACE */}
      <main style={{ padding: '20px', overflowY: 'auto', maxHeight: '100vh', zIndex: 5 }} className="main-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {children}
        </div>
      </main>

      <style jsx global>{`
        /* Responsive CSS Rules for Layout container */
        @media (max-width: 1023px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-header {
            display: flex !important;
          }
          .dashboard-layout {
            grid-template-columns: 1fr !important;
          }
          .main-content {
            max-height: calc(100vh - 57px) !important;
            padding: 16px !important;
          }
        }
        .sidebar-link:hover {
          color: #D4AF37 !important;
          background: rgba(212, 175, 55, 0.04) !important;
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
}
