import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import db from '../../lib/db';

export default function AdminLoginPage({ loginUser }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    
    // Secret administration passcode trigger
    if (passcode === 'gardo_admin_2026') {
      const mockAdminUser = {
        id: 1000, // Special ID
        email: 'admin@gardo.com',
        role: 'admin',
        created_at: new Date().toISOString()
      };
      
      const adminProfile = {
        name: 'GARDO Administrator',
        gender: 'Male',
        country: 'Singapore',
        city: 'Singapore',
        body_type: 'Athletic',
        skin_tone: 'Medium'
      };

      // Set global session state
      loginUser(mockAdminUser, adminProfile, null);
      
      router.push('/admin');
    } else {
      setError('Invalid administrator credentials.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0F0F0F', position: 'relative', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.04) 0%, rgba(0,0,0,0) 70%)', zIndex: 1 }}></div>

      <div className="glass-panel" style={{ padding: '45px 35px', width: '90%', maxWidth: '400px', textAlign: 'center', zIndex: 10, background: 'rgba(26, 26, 26, 0.7)' }}>
        <img 
          src="/logo.jpg" 
          alt="GARDO Logo" 
          style={{ width: '60px', height: '60px', borderRadius: '14px', border: '1px solid rgba(212,175,55,0.3)', margin: '0 auto 20px', display: 'block', objectFit: 'cover' }} 
        />
        
        <h2 className="font-serif" style={{ fontSize: '1.6rem', color: '#FFFFFF', marginBottom: '8px', fontWeight: '400' }}>
          Console Authority
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '32px' }}>
          GARDO Admin Login
        </p>

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#B3B3B3', marginBottom: '8px', display: 'block' }}>Administrator Passcode</label>
            <input 
              type="password"
              placeholder="••••••••••••"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="form-input"
              required
              autoFocus
            />
            {error && <p style={{ color: '#EA4335', fontSize: '0.8rem', marginTop: '6px' }}>{error}</p>}
            <p style={{ color: '#555', fontSize: '0.75rem', marginTop: '8px' }}>Demo Key: gardo_admin_2026</p>
          </div>
          
          <button 
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
          >
            Authorize Entry
          </button>
        </form>
      </div>
    </div>
  );
}
