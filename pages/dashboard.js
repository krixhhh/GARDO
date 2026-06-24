import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import db from '../lib/db';
import { FashionRuleEngine } from '../lib/ruleEngine';

export default function Dashboard({
  currentUser,
  userProfile,
  userComfort,
  weather,
  weatherStatus,
  requestGeolocation,
  updateWeather,
  logoutUser
}) {
  const router = useRouter();

  // Selected occasion for outfit recommendation (Default: Casual)
  const [selectedOccasion, setSelectedOccasion] = useState('Casual');
  const [recommendationMode, setRecommendationMode] = useState('general'); // 'weather' or 'general'
  const [recommendedOutfit, setRecommendedOutfit] = useState(null);
  const [generalOutfit, setGeneralOutfit] = useState(null);
  
  // Stats & Analytics states
  const [wardrobeStats, setWardrobeStats] = useState({ tops: 0, bottoms: 0, footwear: 0, accessories: 0, outerwear: 0, laundry: 0 });
  const [seasonalBreakdown, setSeasonalBreakdown] = useState({ Summer: 0, Winter: 0, 'All-Season': 0, Monsoon: 0 });
  const [mostWorn, setMostWorn] = useState(null);
  const [leastWorn, setLeastWorn] = useState(null);
  const [wornHistory, setWornHistory] = useState([]);
  const [wornSuccess, setWornSuccess] = useState(false);

  // Manual weather states
  const [manualCity, setManualCity] = useState('');
  const [fetchingManual, setFetchingManual] = useState(false);
  const [manualError, setManualError] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  // Automatically select weather recommendation mode if weather is active
  useEffect(() => {
    if (weather) {
      setRecommendationMode('weather');
    } else {
      setRecommendationMode('general');
    }
  }, [weather]);


  // Dynamic affiliate state
  const [affiliateSuggestion, setAffiliateSuggestion] = useState(null);

  // Routing Guard: Redirect to onboarding if profile is incomplete
  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }
    if (!userProfile) {
      router.push('/onboarding');
      return;
    }
  }, [currentUser, userProfile]);

  // Load wardrobe data and generate outfit recommendation
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const fetchData = async () => {
      const closet = await db.getWardrobe(currentUser.id);
      const available = await db.getAvailableWardrobe(currentUser.id);

      // 1. Calculate counts
      const topsCount = closet.filter(i => i.category === 'Tops').length;
      const bottomsCount = closet.filter(i => i.category === 'Bottoms').length;
      const footwearCount = closet.filter(i => i.category === 'Footwear').length;
      const outerwearCount = closet.filter(i => i.category === 'Outerwear').length;
      const accCount = closet.filter(i => i.category === 'Accessories').length;
      const laundryCount = closet.filter(i => i.status === 'Laundry').length;

      setWardrobeStats({
        tops: topsCount,
        bottoms: bottomsCount,
        footwear: footwearCount,
        outerwear: outerwearCount,
        accessories: accCount,
        laundry: laundryCount
      });

      // 2. Most and Least Worn Garments
      const itemsWithUsage = closet.filter(i => i.status !== 'Unavailable');
      if (itemsWithUsage.length > 0) {
        const sortedByUsage = [...itemsWithUsage].sort((a, b) => b.usage_count - a.usage_count);
        setMostWorn(sortedByUsage[0].usage_count > 0 ? sortedByUsage[0] : null);
        
        // Least worn: sort ascending
        const sortedAsc = [...itemsWithUsage].sort((a, b) => a.usage_count - b.usage_count);
        setLeastWorn(sortedAsc[0]);
      } else {
        setMostWorn(null);
        setLeastWorn(null);
      }

      // 3. Seasonal Breakdown Percentages
      const breakdown = { Summer: 0, Winter: 0, 'All-Season': 0, Monsoon: 0 };
      let seasonTagged = 0;
      closet.forEach(item => {
        const s = item.season ? item.season.toLowerCase() : '';
        if (s.includes('summer')) { breakdown.Summer++; seasonTagged++; }
        else if (s.includes('winter')) { breakdown.Winter++; seasonTagged++; }
        else if (s.includes('monsoon')) { breakdown.Monsoon++; seasonTagged++; }
        else { breakdown['All-Season']++; seasonTagged++; }
      });

      const totalItems = seasonTagged || 1;
      setSeasonalBreakdown({
        Summer: Math.round((breakdown.Summer / totalItems) * 100),
        Winter: Math.round((breakdown.Winter / totalItems) * 100),
        Monsoon: Math.round((breakdown.Monsoon / totalItems) * 100),
        'All-Season': Math.round((breakdown['All-Season'] / totalItems) * 100)
      });
      
      const history = await db.getWornHistory(currentUser.id);
      setWornHistory(history.slice().reverse().slice(0, 3));

      // 4. Generate recommendations
      generateOutfitRecommendations(available, history);
    };

    fetchData();
  }, [currentUser, selectedOccasion, weather]);

  const generateOutfitRecommendations = (availableItems, historyItems = []) => {
    if (availableItems.length === 0 || !userProfile || !userComfort) return;

    // Filter by categories
    const tops = availableItems.filter(i => i.category === 'Tops');
    const bottoms = availableItems.filter(i => i.category === 'Bottoms');
    const footwear = availableItems.filter(i => i.category === 'Footwear');
    const outerwear = availableItems.filter(i => i.category === 'Outerwear');
    const accessories = availableItems.filter(i => i.category === 'Accessories');

    if (tops.length === 0 || bottoms.length === 0) {
      setRecommendedOutfit(null);
      setGeneralOutfit(null);
      return;
    }

    const recentlyWornIds = historyItems.slice(-5).flatMap(h => h.items);

    // --- A. GENERAL RECOMMENDATION ---
    const genTop = tops.find(t => !recentlyWornIds.includes(t.id)) || tops[0];
    const genBottom = bottoms.find(b => !recentlyWornIds.includes(b.id)) || bottoms[0];
    const genShoes = footwear.find(f => !recentlyWornIds.includes(f.id)) || footwear[0];
    const genWatch = accessories.find(a => a.subcategory.toLowerCase().includes('watch'));
    const genBelt = accessories.find(a => a.subcategory.toLowerCase().includes('belt'));

    const genCombo = [genTop, genBottom];
    if (genShoes) genCombo.push(genShoes);
    if (genWatch) genCombo.push(genWatch);
    if (genBelt) genCombo.push(genBelt);

    // Score using ideal weather
    const generalScore = FashionRuleEngine.evaluate(
      genCombo,
      userProfile,
      userComfort,
      { temperature: 22, humidity: 50, rain: false, uv: 3 },
      selectedOccasion
    );

    setGeneralOutfit({
      top: genTop,
      bottom: genBottom,
      shoes: genShoes,
      watch: genWatch,
      belt: genBelt,
      score: generalScore
    });

    // --- B. WEATHER-ADAPTED RECOMMENDATION ---
    let weatherTop = null;
    let weatherBottom = null;
    let weatherShoes = null;
    let weatherOuterwear = null;

    if (weather) {
      // Hot Weather filters: prefer Linen, Cotton
      if (weather.temperature >= 28) {
        weatherTop = tops.find(t => ['linen', 'cotton'].some(fab => t.fabric.toLowerCase().includes(fab))) || tops[0];
        weatherBottom = bottoms.find(b => ['linen', 'cotton', 'chambray'].some(fab => b.fabric.toLowerCase().includes(fab))) || bottoms[0];
      } 
      // Cold Weather filters: select Outerwear layer if exists
      else if (weather.temperature <= 18) {
        weatherOuterwear = outerwear[0] || tops.find(t => ['jacket', 'hoodie', 'outerwear'].some(sub => t.subcategory.toLowerCase().includes(sub)));
        weatherTop = tops.find(t => t.id !== weatherOuterwear?.id) || tops[0];
        weatherBottom = bottoms.find(b => b.fabric.toLowerCase().includes('denim') || b.fabric.toLowerCase().includes('wool') || b.fabric.toLowerCase().includes('twill')) || bottoms[0];
      }

      // Default fallbacks
      if (!weatherTop) weatherTop = tops.find(t => !recentlyWornIds.includes(t.id)) || tops[0];
      if (!weatherBottom) weatherBottom = bottoms.find(b => !recentlyWornIds.includes(b.id)) || bottoms[0];
      
      // Rain filters: avoid suede or leather shoes
      if (weather.rain) {
        weatherShoes = footwear.find(f => !['suede', 'leather'].some(m => f.fabric.toLowerCase().includes(m))) || footwear[0];
      } else {
        weatherShoes = footwear.find(f => !recentlyWornIds.includes(f.id)) || footwear[0];
      }

      const weatherWatch = accessories.find(a => a.subcategory.toLowerCase().includes('watch'));
      const weatherBelt = accessories.find(a => a.subcategory.toLowerCase().includes('belt') && a.color === weatherShoes?.color) || accessories.find(a => a.subcategory.toLowerCase().includes('belt'));

      const weatherCombo = [weatherTop, weatherBottom];
      if (weatherShoes) weatherCombo.push(weatherShoes);
      if (weatherOuterwear) weatherCombo.push(weatherOuterwear);
      if (weatherWatch) weatherCombo.push(weatherWatch);
      if (weatherBelt) weatherCombo.push(weatherBelt);

      const activeWeatherScore = FashionRuleEngine.evaluate(
        weatherCombo,
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

      setRecommendedOutfit({
        top: weatherTop,
        bottom: weatherBottom,
        shoes: weatherShoes,
        outerwear: weatherOuterwear,
        watch: weatherWatch,
        belt: weatherBelt,
        score: activeWeatherScore
      });
    } else {
      setRecommendedOutfit(null);
    }

    // --- C. DYNAMIC AFFILIATE UPDATES ---
    const activeShoes = weatherShoes || genShoes;
    const hasBelt = accessories.some(i => i.subcategory?.toLowerCase().includes('belt'));
    const hasWatch = accessories.some(i => i.subcategory?.toLowerCase().includes('watch'));
    const isAccessoryMissing = !hasBelt || !hasWatch;

    // Run occasionally (e.g., 20% chance if accessories are missing)
    if (activeShoes && isAccessoryMissing && Math.random() < 0.2) {
      const shoeColor = activeShoes.color.toLowerCase();
      if (!hasBelt) {
        if (shoeColor.includes('brown') || shoeColor.includes('tan')) {
          setAffiliateSuggestion({
            title: 'Zara Men Classic Tan Leather Belt',
            brand: 'Zara',
            price: '₹2,590',
            why: 'A rich brown leather belt coordinates with your shoes and completes the look, boosting compatibility by +14 points.',
            url: 'https://www.zara.com?tag=gardo-aff-21'
          });
        } else {
          setAffiliateSuggestion({
            title: 'Classic Black Matte Leather Belt',
            brand: 'Zara',
            price: '₹2,390',
            why: 'Matching black leathers establishes clean waist partitions, improving the style harmony score.',
            url: 'https://www.zara.com?tag=gardo-aff-21'
          });
        }
      } else {
        // Recommend watch if they already have belts but lack watch
        setAffiliateSuggestion({
          title: 'Daniel Wellington Rose Gold Classic Watch',
          brand: 'Daniel Wellington',
          price: 'S$249',
          why: 'A slim rose gold chronograph creates high-status finish for formal dress codes.',
          url: 'https://www.danielwellington.com?tag=gardo-aff-21'
        });
      }
    } else {
      setAffiliateSuggestion(null);
    }
  };

  const handleMarkAsWorn = async () => {
    const activeCombo = recommendationMode === 'weather' ? recommendedOutfit : generalOutfit;
    if (!activeCombo || !activeCombo.score) return;

    const itemIds = [
      activeCombo.top.id,
      activeCombo.bottom.id
    ];
    if (activeCombo.shoes) itemIds.push(activeCombo.shoes.id);
    if (activeCombo.outerwear) itemIds.push(activeCombo.outerwear.id);
    if (activeCombo.watch) itemIds.push(activeCombo.watch.id);
    if (activeCombo.belt) itemIds.push(activeCombo.belt.id);

    await db.addWornHistory(currentUser.id, itemIds, selectedOccasion, activeCombo.score.overallScore);
    
    // Show notification popup
    setWornSuccess(true);
    setTimeout(() => {
      setWornSuccess(false);
    }, 3000);

    // Reload states
    const available = await db.getAvailableWardrobe(currentUser.id);
    const history = await db.getWornHistory(currentUser.id);
    setWornHistory(history.slice().reverse().slice(0, 3));
    generateOutfitRecommendations(available, history);
  };

  const occasions = [
    { name: 'College', icon: '🎓' },
    { name: 'Office', icon: '💼' },
    { name: 'Interview', icon: '🤝' },
    { name: 'Wedding', icon: '💒' },
    { name: 'Party', icon: '🎉' },
    { name: 'Date', icon: '❤️' },
    { name: 'Travel', icon: '✈️' },
    { name: 'Temple', icon: '🛕' },
    { name: 'Family Function', icon: '👨‍👩‍👧' },
    { name: 'Casual Outing', icon: '🚶' },
    { name: 'Business Meeting', icon: '💼' }
  ];

  const activeOutfit = recommendationMode === 'weather' ? recommendedOutfit : generalOutfit;

  return (
    <Layout currentUser={currentUser} userProfile={userProfile} logoutUser={logoutUser}>
      <Head>
        <title>GARDO | Dashboard</title>
      </Head>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">div
        
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #D4AF37', overflow: 'hidden', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {currentUser?.profile_picture_url ? (
                <img src={currentUser.profile_picture_url} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '1.6rem', color: '#888' }}>👤</span>
              )}
            </div>
            <div>
              <h1 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: '400', color: '#FFF', margin: 0 }}>
                Welcome back, <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>{userProfile?.name}</span>
              </h1>
              <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px', margin: 0 }}>
                Personalized Digital Wardrobe dashboard. Analytics & styling suggestions {weather ? `for ${weather.city}` : ''}.
              </p>
            </div>
          </div>
          
          {/* Quick Stats Summary */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#D4AF37', fontWeight: '600' }}>
                {wardrobeStats.tops + wardrobeStats.bottoms + wardrobeStats.footwear + wardrobeStats.outerwear + wardrobeStats.accessories}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Garments</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#FFF', fontWeight: '600' }}>{wardrobeStats.laundry}</div>
              <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Laundry</div>
            </div>
          </div>
        </div>

        {/* Worn Success Notification */}
        {wornSuccess && (
          <div className="glass-panel-gold animate-fade-in" style={{ 
            padding: '16px 24px', 
            background: 'rgba(212, 175, 55, 0.1)', 
            borderLeft: '4px solid #D4AF37', 
            color: '#FFF', 
            borderRadius: '8px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>✨</span> Outfit marked worn! Your wardrobe rotation history has been updated.
          </div>
        )}

        {/* WARDROBE ANALYTICS PANEL */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 className="font-serif" style={{ fontSize: '1.4rem', color: '#FFF', fontWeight: '400', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📈</span> Wardrobe Analytics & Breakdown
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            
            {/* Counts Breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ color: '#D4AF37', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Collection Stats</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: '#B3B3B3' }}>
                <div>Tops: <strong style={{ color: '#FFF' }}>{wardrobeStats.tops}</strong></div>
                <div>Bottoms: <strong style={{ color: '#FFF' }}>{wardrobeStats.bottoms}</strong></div>
                <div>Footwear: <strong style={{ color: '#FFF' }}>{wardrobeStats.footwear}</strong></div>
                <div>Outerwear: <strong style={{ color: '#FFF' }}>{wardrobeStats.outerwear}</strong></div>
                <div>Accessories: <strong style={{ color: '#FFF' }}>{wardrobeStats.accessories}</strong></div>
                <div>Laundry: <strong style={{ color: '#EA4335' }}>{wardrobeStats.laundry}</strong></div>
              </div>
            </div>

            {/* Worn Analytics (Most/Least Worn) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h4 style={{ color: '#D4AF37', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Most Worn Garment</h4>
                {mostWorn ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#FFF' }}>
                    <img src={mostWorn.image_url} alt={mostWorn.name} style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mostWorn.name} ({mostWorn.usage_count} times)</div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>None yet</span>
                )}
              </div>
              <div>
                <h4 style={{ color: '#D4AF37', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Least Worn Garment</h4>
                {leastWorn ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#FFF' }}>
                    <img src={leastWorn.image_url} alt={leastWorn.name} style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leastWorn.name} ({leastWorn.usage_count} times)</div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>None yet</span>
                )}
              </div>
            </div>

            {/* Seasonal Breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ color: '#D4AF37', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Seasonal Distribution</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#B3B3B3' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Summer</span><span>{seasonalBreakdown.Summer}%</span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1.5px' }}>
                    <div style={{ height: '100%', background: '#D4AF37', width: `${seasonalBreakdown.Summer}%` }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Winter</span><span>{seasonalBreakdown.Winter}%</span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1.5px' }}>
                    <div style={{ height: '100%', background: '#D4AF37', width: `${seasonalBreakdown.Winter}%` }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>All-Season / General</span><span>{seasonalBreakdown['All-Season']}%</span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1.5px' }}>
                    <div style={{ height: '100%', background: '#D4AF37', width: `${seasonalBreakdown['All-Season']}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Split grid: Outfit Suggestion (Left) + Weather Control (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }} className="grid-split">
          
          {/* OUTFIT SUGGESTION CARD */}
          <div className="glass-panel-gold" style={{ padding: '30px', background: 'rgba(20,20,20,0.85)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: '600' }}>Today's Suggestion</span>
                <h2 className="font-serif" style={{ fontSize: '1.6rem', color: '#FFF', fontWeight: '400', marginTop: '4px', margin: 0 }}>
                  Recommended Look (<span style={{ color: '#D4AF37' }}>{selectedOccasion}</span>)
                </h2>
              </div>
              
              {/* Tabs for Weather-Adapted vs General recommendations */}
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <button
                  onClick={() => weather && setRecommendationMode('weather')}
                  disabled={!weather}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    background: recommendationMode === 'weather' ? '#D4AF37' : 'transparent',
                    color: recommendationMode === 'weather' ? '#000' : (!weather ? '#444' : '#B3B3B3'),
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: weather ? 'pointer' : 'not-allowed',
                    opacity: weather ? 1 : 0.5,
                    transition: '0.2s ease'
                  }}
                  title={!weather ? "Configure location to enable weather recommendations" : ""}
                >
                  🌤️ Weather-Adapted
                </button>
                <button
                  onClick={() => setRecommendationMode('general')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    background: recommendationMode === 'general' ? '#D4AF37' : 'transparent',
                    color: recommendationMode === 'general' ? '#000' : '#B3B3B3',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: '0.2s ease'
                  }}
                >
                  ✨ Classic Standard
                </button>
              </div>

              {activeOutfit?.score && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '2rem', color: '#D4AF37', fontWeight: '700', lineHeight: 1 }}>{activeOutfit.score.overallScore}%</div>
                  <span style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Suitability</span>
                </div>
              )}
            </div>

            {activeOutfit ? (
              <div>
                {/* Outfit layout cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '30px' }}>
                  
                  {/* Top Garment Card */}
                  <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', textAlign: 'center', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>Top</div>
                    <img src={activeOutfit.top.image_url} alt={activeOutfit.top.name} loading="lazy" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', background: '#333' }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFF', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeOutfit.top.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#D4AF37', marginTop: '2px' }}>{activeOutfit.top.fabric} • {activeOutfit.top.color}</div>
                  </div>

                  {/* Outerwear Garment Card (If cold weather requires) */}
                  {activeOutfit.outerwear && (
                    <div className="glass-panel" style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.2)', padding: '12px', textAlign: 'center', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#D4AF37', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>Outer Layer</div>
                      <img src={activeOutfit.outerwear.image_url} alt={activeOutfit.outerwear.name} loading="lazy" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', background: '#333' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFF', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeOutfit.outerwear.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#D4AF37', marginTop: '2px' }}>{activeOutfit.outerwear.subcategory} • {activeOutfit.outerwear.color}</div>
                    </div>
                  )}

                  {/* Bottom Garment Card */}
                  <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', textAlign: 'center', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>Bottom</div>
                    <img src={activeOutfit.bottom.image_url} alt={activeOutfit.bottom.name} loading="lazy" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', background: '#333' }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFF', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeOutfit.bottom.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#D4AF37', marginTop: '2px' }}>{activeOutfit.bottom.subcategory} • {activeOutfit.bottom.color}</div>
                  </div>

                  {/* Shoes Card */}
                  {activeOutfit.shoes && (
                    <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', textAlign: 'center', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>Footwear</div>
                      <img src={activeOutfit.shoes.image_url} alt={activeOutfit.shoes.name} loading="lazy" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', background: '#333' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFF', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeOutfit.shoes.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#D4AF37', marginTop: '2px' }}>{activeOutfit.shoes.color} • {activeOutfit.shoes.fabric}</div>
                    </div>
                  )}

                  {/* Accessories Card */}
                  {(activeOutfit.watch || activeOutfit.belt) && (
                    <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', textAlign: 'center', marginBottom: '6px' }}>Accessories</div>
                      
                      {activeOutfit.watch && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '6px', marginBottom: '6px' }}>
                          <img src={activeOutfit.watch.image_url} alt="watch" loading="lazy" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.75rem', color: '#FFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{activeOutfit.watch.name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#D4AF37' }}>Watch</div>
                          </div>
                        </div>
                      )}
                      
                      {activeOutfit.belt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '6px' }}>
                          <img src={activeOutfit.belt.image_url} alt="belt" loading="lazy" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.75rem', color: '#FFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{activeOutfit.belt.name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#D4AF37' }}>Belt ({activeOutfit.belt.color})</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Score breakdown metrics bars */}
                {activeOutfit.score && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span>Color & Piece Match</span>
                        <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>{activeOutfit.score.matchScore}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', background: '#D4AF37', width: `${activeOutfit.score.matchScore}%`, borderRadius: '2px' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span>Comfort & Sweat Profile</span>
                        <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>{activeOutfit.score.comfortScore}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', background: '#D4AF37', width: `${activeOutfit.score.comfortScore}%`, borderRadius: '2px' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span>Weather Adaptation</span>
                        <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>{activeOutfit.score.weatherScore}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', background: '#D4AF37', width: `${activeOutfit.score.weatherScore}%`, borderRadius: '2px' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span>Occasion Dress Code</span>
                        <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>{activeOutfit.score.occasionScore}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', background: '#D4AF37', width: `${activeOutfit.score.occasionScore}%`, borderRadius: '2px' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stylist feedback statements */}
                {activeOutfit.score && (activeOutfit.score.feedback.length > 0 || activeOutfit.score.warnings.length > 0) && (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '30px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 'bold' }}>Stylist Engine Analysis</div>
                    <ul style={{ listStyleType: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeOutfit.score.warnings.map((w, idx) => (
                        <li key={`w-${idx}`} style={{ fontSize: '0.85rem', color: '#EA4335', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ marginTop: '2px' }}>⚠️</span> {w}
                        </li>
                      ))}
                      {activeOutfit.score.feedback.map((f, idx) => (
                        <li key={`f-${idx}`} style={{ fontSize: '0.85rem', color: '#B3B3B3', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ color: '#D4AF37', marginTop: '2px' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <button onClick={handleMarkAsWorn} className="btn-primary" style={{ flex: 1, minWidth: '200px' }}>
                    Mark Outfit as Worn Today
                  </button>
                  <button onClick={() => router.push('/matcher')} className="btn-secondary" style={{ flex: 1, minWidth: '200px' }}>
                    Adjust Pieces Individually
                  </button>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📌</div>
                <h3 style={{ fontSize: '1.2rem', color: '#FFF', fontWeight: '500' }}>
                  Upload your first garment to start building your digital wardrobe.
                </h3>
                <p style={{ fontSize: '0.85rem', marginTop: '8px', color: '#666' }}>
                  Add clothes in the digital wardrobe first to generate recommendations.
                </p>
                <button onClick={() => router.push('/wardrobe')} className="btn-primary" style={{ marginTop: '24px' }}>
                  Open My Wardrobe
                </button>
              </div>
            )}

          </div>

          {/* LIVE WEATHER CONDITIONS PANEL */}
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="font-serif" style={{ fontSize: '1.4rem', color: '#FFF', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <span>☀️</span> Live Weather
              </h2>
              {weather && !isEditingLocation && (
                <span style={{ fontSize: '0.65rem', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                  Active
                </span>
              )}
            </div>
            
            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
              GARDO scans location weather via satellite data feed to dynamically weigh comfort and material parameters.
            </p>

            {(weatherStatus === 'loading' || fetchingManual) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '16px' }}>
                <div className="loader-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Retrieving weather data...</p>
              </div>
            ) : (!weather || isEditingLocation) ? (
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#B3B3B3', marginBottom: '4px' }}>
                  {!weather ? 'Location access is required. Enter your city or use browser GPS.' : 'Change Location'}
                </div>
                <input
                  type="text"
                  placeholder="Enter city (e.g., Singapore, London)"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#D4AF37'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                {manualError && (
                  <div style={{ color: '#EA4335', fontSize: '0.8rem', marginTop: '2px' }}>⚠️ {manualError}</div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>
                    Get Weather
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      requestGeolocation();
                      setIsEditingLocation(false);
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <span>📍</span> Use GPS
                  </button>
                </div>
                {weather && (
                  <button
                    type="button"
                    onClick={() => setIsEditingLocation(false)}
                    style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.75rem', marginTop: '6px', alignSelf: 'center' }}
                  >
                    Cancel
                  </button>
                )}
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                {/* Location indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.85rem', color: '#B3B3B3' }}>Location</span>
                  <span style={{ color: '#D4AF37', fontWeight: '600', fontSize: '0.9rem' }}>📍 {weather.city}{weather.country ? `, ${weather.country}` : ''}</span>
                </div>

                {/* Temperature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.85rem', color: '#B3B3B3' }}>Temperature</span>
                  <span style={{ color: '#FFF', fontWeight: '600', fontSize: '0.9rem' }}>🌡️ {weather.temperature}°C</span>
                </div>

                {/* Humidity */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.85rem', color: '#B3B3B3' }}>Humidity</span>
                  <span style={{ color: '#FFF', fontWeight: '600', fontSize: '0.9rem' }}>💧 {weather.humidity}%</span>
                </div>

                {/* Rain Chance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.85rem', color: '#B3B3B3' }}>Rain Chance</span>
                  <span style={{ color: '#FFF', fontWeight: '600', fontSize: '0.9rem' }}>☔ {weather.rainChance}%</span>
                </div>

                {/* Wind Speed */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.85rem', color: '#B3B3B3' }}>Wind Speed</span>
                  <span style={{ color: '#FFF', fontWeight: '600', fontSize: '0.9rem' }}>💨 {weather.windSpeed} km/h</span>
                </div>

                <button
                  onClick={() => setIsEditingLocation(true)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#B3B3B3',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginTop: '8px',
                    transition: '0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.05)';
                    e.target.style.color = '#FFF';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.02)';
                    e.target.style.color = '#B3B3B3';
                  }}
                >
                  Change Location 🔄
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 11 OCCASION SELECTOR CARDS */}
        <div>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', color: '#FFF', fontWeight: '400', marginBottom: '18px' }}>
            Browse Occasion Dress Codes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px' }}>
            {occasions.map(occ => {
              const isSelected = selectedOccasion === occ.name;
              return (
                <button
                  key={occ.name}
                  onClick={() => setSelectedOccasion(occ.name)}
                  style={{
                    background: isSelected ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '20px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                  className="occasion-card-button"
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{occ.icon}</div>
                  <div style={{ fontSize: '0.85rem', color: isSelected ? '#FFFFFF' : '#B3B3B3', fontWeight: isSelected ? '600' : '400' }}>
                    {occ.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RECENTLY WORN OUTFITS AND PRODUCT RECOMMENDATION */}
        <div style={{ display: 'grid', gridTemplateColumns: affiliateSuggestion ? '1fr' : '1fr', gap: '30px' }} className={affiliateSuggestion ? "grid-split-bottom" : ""}>
          
          {/* History list */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#FFF', marginBottom: '16px' }}>Recently Worn History</h3>
            {wornHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wornHistory.map((hist, index) => (
                  <div key={hist.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px 18px', borderRadius: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#FFF', fontWeight: '500' }}>Suggested Look ({hist.occasion})</div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>Worn on {new Date(hist.date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: '1.1rem', color: '#D4AF37', fontWeight: 'bold' }}>{hist.score}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontSize: '0.85rem' }}>No outfits worn yet. Tapping "Mark Outfit as Worn" will document your history.</p>
            )}
          </div>

          {/* DYNAMIC PRODUCT RECOMMENDATION CARD */}
          {affiliateSuggestion && (
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid #D4AF37', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                    Optional Upgrade
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#666', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    Affiliate Link Partner
                  </span>
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.2rem', color: '#FFF', fontWeight: '400', marginTop: '12px' }}>
                  {affiliateSuggestion.title} ({affiliateSuggestion.brand})
                </h3>
                <p style={{ color: '#B3B3B3', fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.5' }}>
                  "{affiliateSuggestion.why}"
                </p>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#666' }}>Suggested Retail Price</div>
                  <div style={{ fontSize: '1rem', color: '#FFF', fontWeight: 'bold' }}>{affiliateSuggestion.price}</div>
                </div>
                <a href={affiliateSuggestion.url} target="_blank" rel="noopener noreferrer">
                  <button className="btn-gold-outline" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                    View Deal ↗ (Sponsor Link)
                  </button>
                </a>
              </div>
            </div>
          )}

        </div>

      </div>

      <style jsx global>{`
        .occasion-card-button:hover {
          border-color: #D4AF37 !important;
          background: rgba(212, 175, 55, 0.05) !important;
          transform: translateY(-2px);
        }
        @media (min-width: 1024px) {
          .grid-split {
            grid-template-columns: 1.2fr 0.8fr !important;
          }
          .grid-split-bottom {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </Layout>
  );
}
