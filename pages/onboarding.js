import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import db from '../lib/db';

export default function OnboardingPage({ currentUser, loginUser }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Guard against unauthenticated routing
  useEffect(() => {
    if (!currentUser) {
      router.push('/');
    }
  }, [currentUser]);

  // Form State Step 1: Core Profile
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('25');
  const [country, setCountry] = useState('India');
  const [city, setCity] = useState('');
  const [height, setHeight] = useState('175');
  const [weight, setWeight] = useState('');
  const [bodyType, setBodyType] = useState('Average');
  const [skinTone, setSkinTone] = useState('Medium');
  
  // Profile Photo states
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form State Step 2: Comfort Profile
  const [sweatLevel, setSweatLevel] = useState('Medium');
  const [underarmSweat, setUnderarmSweat] = useState(false);
  const [fullBodySweat, setFullBodySweat] = useState(false);
  const [heatSensitive, setHeatSensitive] = useState(false);
  const [coldSensitive, setColdSensitive] = useState(false);
  const [sensitiveSkin, setSensitiveSkin] = useState(false);

  // Dynamic body type categories
  const maleBodyTypes = ['Slim', 'Athletic', 'Muscular', 'Average', 'Heavy'];
  const femaleBodyTypes = ['Pear', 'Apple', 'Rectangle', 'Hourglass', 'Inverted Triangle'];

  // Switch default body type based on gender selection
  useEffect(() => {
    if (gender === 'Male') {
      setBodyType('Average');
    } else {
      setBodyType('Hourglass');
    }
  }, [gender]);

  // Handle Photo selection and API upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result;
        
        // Post to upload API endpoint
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Data })
        });
        
        const data = await uploadRes.json();
        if (uploadRes.ok) {
          setPhotoUrl(data.url);
          // Set user photo in local memory temporarily
          if (currentUser) {
            await db.updateProfilePhoto(currentUser.id, data.url);
          }
        }
        setUploadingPhoto(false);
      };
    } catch (err) {
      console.error('Failed uploading profile image', err);
      setUploadingPhoto(false);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!name || !city || !height || !age) {
      alert('Please fill out all required fields.');
      return;
    }
    setStep(2);
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    // 1. Save Core Profile
    const profile = await db.createOrUpdateProfile(currentUser.id, {
      name,
      gender,
      age: Number(age),
      country,
      city,
      height: Number(height),
      weight: weight ? Number(weight) : undefined,
      body_type: bodyType,
      skin_tone: skinTone
    });

    // 2. Save Comfort Profile
    const comfort = await db.createOrUpdateComfortProfile(currentUser.id, {
      sweat_level: sweatLevel,
      underarm_sweat: underarmSweat,
      full_body_sweat: fullBodySweat,
      heat_sensitive: heatSensitive,
      cold_sensitive: coldSensitive,
      sensitive_skin: sensitiveSkin
    });

    // 3. Save User Photo updates
    if (photoUrl) {
      await db.updateProfilePhoto(currentUser.id, photoUrl);
    }

    // Refresh user state context
    const updatedUser = await db.findUserById(currentUser.id);
    loginUser(updatedUser, profile, comfort);
    
    router.push('/dashboard');
  };

  if (!currentUser) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0F0F0F', position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 70%)', zIndex: 1 }}></div>

      <header style={{ padding: '30px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.jpg" alt="GARDO Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.3)', objectFit: 'cover' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '0.15em', color: '#FFFFFF' }}>GARDO</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Step {step} of 2
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', zIndex: 5 }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px 30px', background: 'rgba(26,26,26,0.7)' }}>
          
          {step === 1 ? (
            <form onSubmit={handleNextStep}>
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h1 className="font-serif" style={{ fontSize: '2rem', color: '#FFFFFF', marginBottom: '8px', fontWeight: '400' }}>
                  Create Your <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>Style Profile</span>
                </h1>
                <p style={{ color: '#B3B3B3', fontSize: '0.9rem' }}>
                  GARDO designs suggestions around your physics. Fill in details to align the 1000 styling rules.
                </p>
              </div>

              {/* Profile Photo selector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', border: '2px solid #D4AF37', overflow: 'hidden', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(212,175,55,0.15)' }}>
                  {photoUrl ? (
                    <img src={photoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2.5rem', color: '#666' }}>👤</span>
                  )}
                  {uploadingPhoto && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="loader-spinner" style={{ width: '20px', height: '20px', margin: 0 }}></div>
                    </div>
                  )}
                </div>
                <label style={{ cursor: 'pointer', color: '#D4AF37', fontSize: '0.85rem', marginTop: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Upload Profile Photo (Optional)
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>Full Name *</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Enter your name" 
                    className="form-input" 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>Gender *</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="form-select">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>Age *</label>
                  <input 
                    type="number" 
                    value={age} 
                    onChange={e => setAge(e.target.value)} 
                    className="form-input" 
                    min="1" 
                    max="120"
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>Country *</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} className="form-select">
                    <optgroup label="Launch Markets">
                      <option value="India">India</option>
                      <option value="Singapore">Singapore</option>
                    </optgroup>
                    <optgroup label="Architecture Markets (Ready)">
                      <option value="Malaysia">Malaysia</option>
                      <option value="UAE">UAE</option>
                      <option value="UK">United Kingdom</option>
                      <option value="USA">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Japan">Japan</option>
                      <option value="South Korea">South Korea</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>City *</label>
                  <input 
                    type="text" 
                    value={city} 
                    onChange={e => setCity(e.target.value)} 
                    placeholder="e.g. Bangalore" 
                    className="form-input" 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>Height (cm) *</label>
                  <input 
                    type="number" 
                    value={height} 
                    onChange={e => setHeight(e.target.value)} 
                    className="form-input" 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>Weight (kg, optional)</label>
                  <input 
                    type="number" 
                    value={weight} 
                    onChange={e => setWeight(e.target.value)} 
                    placeholder="e.g. 70"
                    className="form-input" 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>Body Type *</label>
                  <select value={bodyType} onChange={e => setBodyType(e.target.value)} className="form-select">
                    {gender === 'Male' 
                      ? maleBodyTypes.map(t => <option key={t} value={t}>{t}</option>)
                      : femaleBodyTypes.map(t => <option key={t} value={t}>{t}</option>)
                    }
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#B3B3B3', display: 'block', marginBottom: '8px' }}>Skin Tone *</label>
                  <select value={skinTone} onChange={e => setSkinTone(e.target.value)} className="form-select">
                    <option value="Fair">Fair / Light</option>
                    <option value="Medium">Medium</option>
                    <option value="Olive">Olive</option>
                    <option value="Tan">Tan</option>
                    <option value="Dark">Dark</option>
                  </select>
                </div>
              </div>

              {/* V2 Disclaimer statement */}
              <div style={{ marginTop: '24px', padding: '14px 18px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: '1.5', textAlign: 'justify', margin: 0 }}>
                  💡 <strong>Note:</strong> These details are only used to improve outfit recommendations. GARDO does not promote discrimination or bias. Your information helps us provide more accurate styling suggestions.
                </p>
              </div>

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" style={{ padding: '14px 40px' }}>
                  Continue &rarr;
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinish}>
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h1 className="font-serif" style={{ fontSize: '2rem', color: '#FFFFFF', marginBottom: '8px', fontWeight: '400' }}>
                  Comfort & <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>Sweat Profile</span>
                </h1>
                <p style={{ color: '#B3B3B3', fontSize: '0.9rem' }}>
                  We prioritize comfort. Select factors below to calibrate fabric selections and avoid sweat staining.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#B3B3B3', display: 'block', marginBottom: '12px' }}>General Sweat Level *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    {['Low', 'Medium', 'High'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSweatLevel(level)}
                        style={{
                          padding: '16px',
                          background: sweatLevel === level ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: sweatLevel === level ? '1px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          color: sweatLevel === level ? '#FFFFFF' : '#B3B3B3',
                          fontWeight: sweatLevel === level ? '600' : '400',
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '20px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#B3B3B3', display: 'block', marginBottom: '16px' }}>Additional Adaptations</label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#FFF' }}>
                      <input 
                        type="checkbox" 
                        checked={underarmSweat} 
                        onChange={e => setUnderarmSweat(e.target.checked)} 
                        style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
                      />
                      Underarm Sweat Sensitivity (Avoid tight shirts)
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#FFF' }}>
                      <input 
                        type="checkbox" 
                        checked={fullBodySweat} 
                        onChange={e => setFullBodySweat(e.target.checked)} 
                        style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
                      />
                      Full Body Sweat (Prioritize light, loose linen/cotton)
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#FFF' }}>
                      <input 
                        type="checkbox" 
                        checked={heatSensitive} 
                        onChange={e => setHeatSensitive(e.target.checked)} 
                        style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
                      />
                      Heat Sensitive (Strong preference for cool clothing)
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#FFF' }}>
                      <input 
                        type="checkbox" 
                        checked={coldSensitive} 
                        onChange={e => setColdSensitive(e.target.checked)} 
                        style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
                      />
                      Cold Sensitive (Auto-recommend insulation layers early)
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#FFF' }}>
                      <input 
                        type="checkbox" 
                        checked={sensitiveSkin} 
                        onChange={e => setSensitiveSkin(e.target.checked)} 
                        style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
                      />
                      Sensitive Skin (Flag itchy fibers like synthetic polyester)
                    </label>
                  </div>
                </div>

              </div>

              <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                >
                  &larr; Back
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 2 }}
                >
                  Create Profile & Access GARDO
                </button>
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
