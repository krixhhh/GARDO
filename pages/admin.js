import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import db from '../lib/db';

export default function AdminPage({ currentUser, userProfile, logoutUser }) {
  const router = useRouter();

  // DB States
  const [usersList, setUsersList] = useState([]);
  const [countries, setCountries] = useState([]);
  const [products, setProducts] = useState([]);

  // Form States - Add country
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [countryStatus, setCountryStatus] = useState('launch');

  // Form States - Add rule
  const [ruleType, setRuleType] = useState('Color');
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleScore, setRuleScore] = useState('95');
  const [customRules, setCustomRules] = useState([]);

  // Form States - Add Suggestion
  const [sugType, setSugType] = useState('Belt');
  const [sugName, setSugName] = useState('');
  const [sugBrand, setSugBrand] = useState('');
  const [sugPrice, setSugPrice] = useState('');
  const [sugUrl, setSugUrl] = useState('');
  const [sugWhy, setSugWhy] = useState('');
  const [sugScore, setSugScore] = useState('12');

  const [activeAdminTab, setActiveAdminTab] = useState('rules'); // 'rules', 'countries', 'products', 'users'

  // Load all DB elements on mount
  const refreshAdminData = () => {
    // Users profiles
    const rawState = db.readRawStateForAdmin ? db.readRawStateForAdmin() : { users: [], profiles: [], comfort_profiles: [], wardrobe: [] };
    const rawUsers = rawState.users || [];
    const profiles = rawState.profiles || [];
    const comforts = rawState.comfort_profiles || [];
    const wardrobeItems = rawState.wardrobe || [];

    const compiledUsers = rawUsers.map(user => {
      const prof = profiles.find(p => p.user_id === user.id);
      const comf = comforts.find(c => c.user_id === user.id);
      const itemsCount = wardrobeItems.filter(i => i.user_id === user.id).length;
      return {
        id: user.id,
        phone: user.phone_number || 'Google Link',
        email: user.email || 'N/A',
        name: prof?.name || 'Incomplete Profile',
        gender: prof?.gender || 'N/A',
        age: prof?.age || 'N/A',
        city: prof?.city || 'N/A',
        country: prof?.country || 'N/A',
        body_type: prof?.body_type || 'N/A',
        sweat_level: comf?.sweat_level || 'N/A',
        itemsCount
      };
    });

    setUsersList(compiledUsers);
    setCountries(db.getCountries());
    setProducts(db.getProductSuggestions());
  };

  useEffect(() => {
    // Gatekeeper Admin Role Check
    if (!currentUser) {
      router.push('/admin/login');
      return;
    }
    if (currentUser.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    refreshAdminData();
    
    // Add default mock custom rules to show in admin rule table
    setCustomRules([
      { id: 1, type: 'Color', name: 'White Shirt + Black Trouser', score: 98, desc: 'Highest contrast standard formal template.' },
      { id: 2, type: 'Weather', name: 'Linen fabric in hot weather', score: 120, desc: 'Increases comfort score by multiplier factor.' },
      { id: 3, type: 'Sweat', name: 'Avoid light grey in heavy sweat profiles', score: -25, desc: 'Visible sweat marks penalty.' },
      { id: 4, type: 'Accessory', name: 'Brown belt and brown shoes correlation', score: 10, desc: 'Bonus coordinates leather pieces.' }
    ]);
  }, [currentUser]);

  // Handlers
  const handleAddCountry = (e) => {
    e.preventDefault();
    if (!countryCode || !countryName) return;
    
    db.addCountry(countryCode, countryName, countryStatus);
    setCountryCode('');
    setCountryName('');
    refreshAdminData();
    alert(`Country "${countryName}" registered successfully.`);
  };

  const handleAddRule = (e) => {
    e.preventDefault();
    if (!ruleName || !ruleDesc) return;

    const newRule = {
      id: customRules.length + 1,
      type: ruleType,
      name: ruleName,
      score: Number(ruleScore),
      desc: ruleDesc
    };

    setCustomRules([newRule, ...customRules]);
    setRuleName('');
    setRuleDesc('');
    alert(`Fashion Rule "${ruleName}" successfully compiled into the GARDO engine!`);
  };

  const handleAddSuggestion = (e) => {
    e.preventDefault();
    if (!sugName || !sugBrand || !sugPrice || !sugUrl || !sugWhy) return;

    db.addProductSuggestion({
      item_type: sugType,
      product_name: sugName,
      brand: sugBrand,
      price: sugPrice,
      buy_url: sugUrl,
      why_needed: sugWhy,
      score_improvement: Number(sugScore)
    });

    setSugName('');
    setSugBrand('');
    setSugPrice('');
    setSugUrl('');
    setSugWhy('');
    refreshAdminData();
    alert(`Product suggestion "${sugName}" registered successfully.`);
  };

  return (
    <Layout currentUser={currentUser} userProfile={userProfile} logoutUser={logoutUser}>
      <Head>
        <title>GARDO | Admin Console</title>
      </Head>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
        
        {/* Header row */}
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: '400', color: '#FFF' }}>
            GARDO <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>Admin Console</span>
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px' }}>
            Manage launch countries, check global fashion rule matrix indices, inspect profiles, and register product styling suggestions.
          </p>
        </div>

        {/* Tab Buttons bar */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
          {[
            { id: 'rules', name: 'Rule Engine Editor', icon: '📝' },
            { id: 'countries', name: 'Country Support Settings', icon: '🌍' },
            { id: 'products', name: 'Product Recommendations', icon: '🛍️' },
            { id: 'users', name: 'Registered Profiles Monitor', icon: '👤' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: activeAdminTab === tab.id ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                border: activeAdminTab === tab.id ? '1px solid #D4AF37' : '1px solid transparent',
                borderRadius: '24px',
                color: activeAdminTab === tab.id ? '#FFFFFF' : '#888',
                fontSize: '0.85rem',
                fontWeight: activeAdminTab === tab.id ? '600' : '400',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>

        {/* TAB 1: RULES ENGINE */}
        {activeAdminTab === 'rules' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }} className="admin-grid">
            
            {/* Create Rule Form */}
            <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#FFF', marginBottom: '16px' }}>Compile New Fashion Rule</h3>
              <form onSubmit={handleAddRule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Rule Category</label>
                  <select value={ruleType} onChange={e => setRuleType(e.target.value)} className="form-select" style={{ padding: '10px 14px', marginTop: '4px' }}>
                    <option value="Color">Color Matching (200 Rules)</option>
                    <option value="Combination">Outfit Combination (300 Rules)</option>
                    <option value="Occasion">Occasion Suitability (150 Rules)</option>
                    <option value="Weather">Weather Intelligence (100 Rules)</option>
                    <option value="Sweat">Sweat & Comfort (100 Rules)</option>
                    <option value="Accessory">Accessory Pairing (100 Rules)</option>
                    <option value="BodyType">Body Type (50 Rules)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Rule Template Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Navy Shirt + Beige Chino" 
                    value={ruleName} 
                    onChange={e => setRuleName(e.target.value)} 
                    className="form-input" 
                    style={{ padding: '10px', marginTop: '4px' }}
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Weight Score / Effect</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 95 or -15" 
                      value={ruleScore} 
                      onChange={e => setRuleScore(e.target.value)} 
                      className="form-input" 
                      style={{ padding: '10px', marginTop: '4px' }}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Target Scope</label>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '14px' }}>Calculates matching index 0-100</div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Stylist Justification Description</label>
                  <textarea 
                    placeholder="Provide detailed styling description logs shown to users..." 
                    value={ruleDesc} 
                    onChange={e => setRuleDesc(e.target.value)} 
                    className="form-input" 
                    style={{ padding: '10px', marginTop: '4px', height: '80px', resize: 'none' }}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '10px' }}>
                  Inject Rule into AI Engine
                </button>
              </form>
            </div>

            {/* List Active Rules */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#FFF' }}>Current Engine Rules (1000 Total Active)</h3>
                <span style={{ fontSize: '0.75rem', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', padding: '3px 8px', borderRadius: '10px' }}>Programmatic Matrix</span>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#666' }}>
                      <th style={{ padding: '12px 8px' }}>Type</th>
                      <th style={{ padding: '12px 8px' }}>Rule Template</th>
                      <th style={{ padding: '12px 8px' }}>Effect</th>
                      <th style={{ padding: '12px 8px' }}>Stylist Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customRules.map(rule => (
                      <tr key={rule.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#B3B3B3' }}>
                        <td style={{ padding: '12px 8px', color: '#D4AF37', fontWeight: 'bold' }}>{rule.type}</td>
                        <td style={{ padding: '12px 8px', color: '#FFF' }}>{rule.name}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{rule.score > 0 ? `+${rule.score}` : rule.score}</td>
                        <td style={{ padding: '12px 8px', color: '#666', fontSize: '0.8rem' }}>{rule.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: COUNTRY SUPPORT */}
        {activeAdminTab === 'countries' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }} className="admin-grid">
            
            {/* Create Country form */}
            <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#FFF', marginBottom: '16px' }}>Add Supported Country</h3>
              <form onSubmit={handleAddCountry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Code (ISO)</label>
                    <input 
                      type="text" 
                      placeholder="US" 
                      value={countryCode} 
                      onChange={e => setCountryCode(e.target.value)} 
                      maxLength="2"
                      className="form-input" 
                      style={{ padding: '10px', marginTop: '4px', textTransform: 'uppercase' }}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Country Name</label>
                    <input 
                      type="text" 
                      placeholder="United States" 
                      value={countryName} 
                      onChange={e => setCountryName(e.target.value)} 
                      className="form-input" 
                      style={{ padding: '10px', marginTop: '4px' }}
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Infrastructure Status</label>
                  <select value={countryStatus} onChange={e => setCountryStatus(e.target.value)} className="form-select" style={{ padding: '10px 14px', marginTop: '4px' }}>
                    <option value="launch">Active Launch Market (India/Singapore)</option>
                    <option value="architecture">Architecture-Ready (US, UK, Japan, etc.)</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '10px' }}>
                  Register Country
                </button>
              </form>
            </div>

            {/* List Countries */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#FFF', marginBottom: '16px' }}>Configured Global Territories</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                {countries.map(c => {
                  const isLaunch = c.status === 'launch';
                  return (
                    <div key={c.id} style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: isLaunch ? '1px solid var(--border-gold-glass)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{c.code}</span>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          background: isLaunch ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.05)', 
                          color: isLaunch ? '#D4AF37' : '#888',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>{c.status}</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: '500' }}>{c.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: PRODUCT SUGGESTIONS */}
        {activeAdminTab === 'products' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }} className="admin-grid">
            
            {/* Create suggestion Form */}
            <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#FFF', marginBottom: '16px' }}>Configure Smart Styling Addition</h3>
              <form onSubmit={handleAddSuggestion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Accessory Type</label>
                    <select value={sugType} onChange={e => setSugType(e.target.value)} className="form-select" style={{ padding: '10px 14px', marginTop: '4px' }}>
                      <option value="Belt">Leather Belt</option>
                      <option value="Shoes">Footwear / Shoes</option>
                      <option value="Watch">Steel Watch</option>
                      <option value="Sunglasses">Sunglasses</option>
                      <option value="Jacket">Outerwear / Jackets</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Product Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Classic Tan Belt" 
                      value={sugName} 
                      onChange={e => setSugName(e.target.value)} 
                      className="form-input" 
                      style={{ padding: '10px', marginTop: '4px' }}
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Brand Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Zara / Nike" 
                      value={sugBrand} 
                      onChange={e => setSugBrand(e.target.value)} 
                      className="form-input" 
                      style={{ padding: '10px', marginTop: '4px' }}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Retail Price</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ₹2,590 / S$159" 
                      value={sugPrice} 
                      onChange={e => setSugPrice(e.target.value)} 
                      className="form-input" 
                      style={{ padding: '10px', marginTop: '4px' }}
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Score Improvement (+)</label>
                    <input 
                      type="number" 
                      value={sugScore} 
                      onChange={e => setSugScore(e.target.value)} 
                      className="form-input" 
                      style={{ padding: '10px', marginTop: '4px' }}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Vendor Referral URL</label>
                    <input 
                      type="url" 
                      placeholder="https://www.zara.com" 
                      value={sugUrl} 
                      onChange={e => setSugUrl(e.target.value)} 
                      className="form-input" 
                      style={{ padding: '10px', marginTop: '4px' }}
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Recommendation Justification</label>
                  <textarea 
                    placeholder="Explain why this item genuinely completes the outfit first..." 
                    value={sugWhy} 
                    onChange={e => setSugWhy(e.target.value)} 
                    className="form-input" 
                    style={{ padding: '10px', marginTop: '4px', height: '60px', resize: 'none' }}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '10px' }}>
                  Register Product Recommendation
                </button>
              </form>
            </div>

            {/* List suggestions */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#FFF', marginBottom: '16px' }}>Active Shopping Catalog Modifications (Max 1 Suggestion Trigger Rule)</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {products.map(p => (
                  <div key={p.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(212, 175, 55, 0.12)', color: '#D4AF37', padding: '3px 8px', borderRadius: '8px', fontWeight: 'bold' }}>{p.item_type}</span>
                      <h4 style={{ fontSize: '1rem', color: '#FFF', marginTop: '6px' }}>{p.product_name} <span style={{ color: '#666', fontSize: '0.85rem' }}>({p.brand})</span></h4>
                      <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '4px' }}>{p.why_needed}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: '1rem' }}>+{p.score_improvement} pts</div>
                      <div style={{ color: '#FFF', fontWeight: '600', fontSize: '0.9rem', marginTop: '2px' }}>{p.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: USERS REGISTERED */}
        {activeAdminTab === 'users' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#FFF', marginBottom: '16px' }}>Active User Database Profiles</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#666' }}>
                    <th style={{ padding: '12px 8px' }}>User ID</th>
                    <th style={{ padding: '12px 8px' }}>Name</th>
                    <th style={{ padding: '12px 8px' }}>Authentication Link</th>
                    <th style={{ padding: '12px 8px' }}>Gender / Age</th>
                    <th style={{ padding: '12px 8px' }}>Location</th>
                    <th style={{ padding: '12px 8px' }}>Silhouettes</th>
                    <th style={{ padding: '12px 8px' }}>Comfort / Sweat</th>
                    <th style={{ padding: '12px 8px' }}>Closet Items</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#B3B3B3' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#D4AF37' }}>#{user.id}</td>
                      <td style={{ padding: '12px 8px', color: '#FFF', fontWeight: '600' }}>{user.name}</td>
                      <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>{user.phone} {user.email !== 'N/A' && `(${user.email})`}</td>
                      <td style={{ padding: '12px 8px' }}>{user.gender} / {user.age} yrs</td>
                      <td style={{ padding: '12px 8px' }}>{user.city}, {user.country}</td>
                      <td style={{ padding: '12px 8px' }}><span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '3px 6px', borderRadius: '6px' }}>{user.body_type}</span></td>
                      <td style={{ padding: '12px 8px' }}><span style={{ fontSize: '0.75rem', background: user.sweat_level === 'High' ? 'rgba(234,67,53,0.15)' : 'rgba(255,255,255,0.05)', color: user.sweat_level === 'High' ? '#EA4335' : '#AAA', padding: '3px 6px', borderRadius: '6px' }}>{user.sweat_level} Sweat</span></td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#FFF', textAlign: 'center' }}>{user.itemsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .admin-grid {
            grid-template-columns: 320px 1fr !important;
          }
        }
      `}</style>
    </Layout>
  );
}
