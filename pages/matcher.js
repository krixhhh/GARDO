import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import db from '../lib/db';
import { FashionRuleEngine } from '../lib/ruleEngine';

export default function MatcherPage({ currentUser, userProfile, userComfort, weather, logoutUser }) {
  const router = useRouter();
  
  const [closet, setCloset] = useState([]);
  const [tops, setTops] = useState([]);
  const [selectedTop, setSelectedTop] = useState(null);
  const [matchedOutfits, setMatchedOutfits] = useState([]);
  const [selectedOccasion, setSelectedOccasion] = useState('Casual');
  const [successWornId, setSuccessWornId] = useState(null);

  // Load wardrobe data on mount
  useEffect(() => {
    if (!currentUser) return;
    const fetchItems = async () => {
      const items = await db.getAvailableWardrobe(currentUser.id);
      setCloset(items);

      const filteredTops = items.filter(i => i.category === 'Tops');
      setTops(filteredTops);
      
      // Auto-select first top if available
      if (filteredTops.length > 0) {
        setSelectedTop(filteredTops[0]);
      }
    };
    fetchItems();
  }, [currentUser]);

  // Recalculate matches when selected shirt, occasion, or weather changes
  useEffect(() => {
    if (!selectedTop || closet.length === 0 || !userProfile || !userComfort || !weather) return;

    const recommendations = FashionRuleEngine.matchGarment(
      selectedTop,
      closet,
      userProfile,
      userComfort,
      {
        temperature: weather.temperature,
        humidity: weather.humidity,
        rain: weather.rain,
        uv: weather.uv
      },
      selectedOccasion
    );

    setMatchedOutfits(recommendations);
  }, [selectedTop, selectedOccasion, weather, closet]);

  const handleWearOutfit = async (index, combo) => {
    if (!currentUser) return;

    const itemIds = [selectedTop.id, combo.bottom.id];
    if (combo.shoes) itemIds.push(combo.shoes.id);
    if (combo.watch) itemIds.push(combo.watch.id);
    if (combo.belt) itemIds.push(combo.belt.id);

    await db.addWornHistory(currentUser.id, itemIds, selectedOccasion, combo.score.overallScore);

    setSuccessWornId(index);
    setTimeout(() => {
      setSuccessWornId(null);
      router.push('/dashboard');
    }, 2000);
  };

  const occasions = [
    'Casual', 'Office', 'College', 'Interview', 'Wedding', 'Temple', 'Party', 'Date', 'Travel', 'Business Meeting', 'Family Function'
  ];

  if (!weather) {
    return (
      <Layout currentUser={currentUser} userProfile={userProfile} logoutUser={logoutUser}>
        <Head>
          <title>GARDO | Outfit Matcher</title>
        </Head>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '20px' }}>
          <div style={{ fontSize: '3rem' }}>🌤️</div>
          <h2 className="font-serif" style={{ color: '#FFF', fontSize: '1.8rem', fontWeight: '400', margin: 0 }}>Weather Data Required</h2>
          <p style={{ color: '#888', maxWidth: '400px', margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
            We need real-time weather details to match your outfit accurately. Please configure your location on the Dashboard first.
          </p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary" style={{ marginTop: '10px', padding: '12px 24px' }}>
            Go to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentUser={currentUser} userProfile={userProfile} logoutUser={logoutUser}>
      <Head>
        <title>GARDO | Outfit Matcher</title>
      </Head>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
        
        {/* Header Section */}
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: '400', color: '#FFF' }}>
            Interactive <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>Outfit Matcher</span>
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px' }}>
            Select a key garment from your wardrobe. GARDO will automatically recommend coordinating pants, footwear, and accessories.
          </p>
        </div>

        {/* Filters and occasion options */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', background: 'rgba(26,26,26,0.6)' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Active Occasion</label>
            <select 
              value={selectedOccasion} 
              onChange={e => setSelectedOccasion(e.target.value)}
              className="form-select"
              style={{ padding: '10px 14px' }}
            >
              {occasions.map(occ => (
                <option key={occ} value={occ}>{occ}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 2, minWidth: '300px' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Weather Context</div>
            <div style={{ fontSize: '0.9rem', color: '#FFF', display: 'flex', gap: '16px' }}>
              <span>🌡️ <strong>{weather.temperature}°C</strong></span>
              <span>💧 <strong>{weather.humidity}% Humidity</strong></span>
              <span>⛈️ <strong>{weather.rain ? 'Raining' : 'Dry'}</strong></span>
              <span>☀️ <strong>UV Index {weather.uv}</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }} className="matcher-split-grid">
          
          {/* LEFT PANEL: SELECT TOP SHIRT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="font-serif" style={{ fontSize: '1.4rem', color: '#FFF', fontWeight: '400' }}>
              1. Select a <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>Garment</span>
            </h2>

            {tops.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', maxHeight: '480px', overflowY: 'auto', paddingRight: '6px' }}>
                {tops.map(top => {
                  const isSelected = selectedTop?.id === top.id;
                  return (
                    <button
                      key={top.id}
                      onClick={() => setSelectedTop(top)}
                      style={{
                        background: isSelected ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1.5px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '10px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'var(--transition-smooth)'
                      }}
                      className="top-selection-card"
                    >
                      <img src={top.image_url} alt={top.name} style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px' }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#FFF', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#888' }}>{top.color}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '30px', background: 'rgba(26,26,26,0.3)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color: '#666', fontSize: '0.85rem' }}>No Shirts or Tops available in closet.</p>
                <button onClick={() => router.push('/wardrobe')} className="btn-primary" style={{ marginTop: '16px', padding: '8px 16px' }}>Add Tops</button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: SUGGESTIONS LIST (TOP 3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 className="font-serif" style={{ fontSize: '1.4rem', color: '#FFF', fontWeight: '400' }}>
              2. GARDO's <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>Match Recommendations</span>
            </h2>

            {selectedTop ? (
              matchedOutfits.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {matchedOutfits.map((combo, index) => {
                    const isSuccess = successWornId === index;
                    return (
                      <div key={index} className="glass-panel-gold" style={{ 
                        padding: '24px', 
                        background: 'rgba(20,20,20,0.8)',
                        border: '1px solid rgba(212, 175, 55, 0.25)',
                        position: 'relative'
                      }}>
                        
                        {/* Worn overlay */}
                        {isSuccess && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,15,0.9)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px', flexDirection: 'column' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✨</div>
                            <div style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: '1.1rem' }}>Enjoy your styling look today!</div>
                          </div>
                        )}

                        {/* Top header row of card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px', marginBottom: '16px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#D4AF37', fontWeight: 'bold', letterSpacing: '0.05rem' }}>
                            RECOMMENDATION CHOICE #{index + 1}
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.2rem', color: '#D4AF37', fontWeight: 'bold' }}>{combo.score.overallScore}%</div>
                              <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase' }}>Compatibility</div>
                            </div>
                          </div>
                        </div>

                        {/* Pieces breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                          {/* Selected Top reminder */}
                          <div style={{ padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase' }}>Selected Top</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#FFF', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTop.name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#D4AF37' }}>{selectedTop.color}</div>
                          </div>

                          {/* Recommended bottom */}
                          <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase' }}>Pant / Bottom</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#FFF', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{combo.bottom.name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#D4AF37' }}>{combo.bottom.color}</div>
                          </div>

                          {/* Shoes */}
                          {combo.shoes && (
                            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase' }}>Footwear</div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#FFF', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{combo.shoes.name}</div>
                              <div style={{ fontSize: '0.65rem', color: '#D4AF37' }}>{combo.shoes.color}</div>
                            </div>
                          )}

                          {/* Watch */}
                          {combo.watch && (
                            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase' }}>Watch</div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#FFF', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{combo.watch.name}</div>
                              <div style={{ fontSize: '0.65rem', color: '#D4AF37' }}>{combo.watch.color}</div>
                            </div>
                          )}

                          {/* Belt */}
                          {combo.belt && (
                            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase' }}>Belt</div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#FFF', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{combo.belt.name}</div>
                              <div style={{ fontSize: '0.65rem', color: '#D4AF37' }}>{combo.belt.color}</div>
                            </div>
                          )}
                        </div>

                        {/* Scores grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', fontSize: '0.75rem', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#888' }}>Match</div>
                            <div style={{ color: '#FFF', fontWeight: 'bold', marginTop: '2px' }}>{combo.score.matchScore}%</div>
                          </div>
                          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ color: '#888' }}>Comfort</div>
                            <div style={{ color: '#FFF', fontWeight: 'bold', marginTop: '2px' }}>{combo.score.comfortScore}%</div>
                          </div>
                          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ color: '#888' }}>Weather</div>
                            <div style={{ color: '#FFF', fontWeight: 'bold', marginTop: '2px' }}>{combo.score.weatherScore}%</div>
                          </div>
                          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ color: '#888' }}>Occasion</div>
                            <div style={{ color: '#FFF', fontWeight: 'bold', marginTop: '2px' }}>{combo.score.occasionScore}%</div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={() => handleWearOutfit(index, combo)}
                            className="btn-primary" 
                            style={{ flex: 2, padding: '10px', fontSize: '0.8rem' }}
                          >
                            Wear This Combination
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '30px', background: 'rgba(26,26,26,0.3)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', color: '#888' }}>
                  <p>Not enough matching items (pants/shoes) in closet to generate variations.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Add clothes in the digital closet first.</p>
                </div>
              )
            ) : (
              <div style={{ padding: '40px', background: 'rgba(26,26,26,0.3)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', color: '#666' }}>
                Please select a top shirt first on the left panel.
              </div>
            )}

          </div>

        </div>

      </div>

      <style jsx global>{`
        .top-selection-card:hover {
          border-color: #D4AF37 !important;
          background: rgba(212, 175, 55, 0.05) !important;
          transform: translateY(-2px);
        }
        @media (min-width: 1024px) {
          .matcher-split-grid {
            grid-template-columns: 280px 1fr !important;
          }
        }
      `}</style>
    </Layout>
  );
}
