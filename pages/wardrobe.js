import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import db from '../lib/db';

export default function WardrobePage({ currentUser, userProfile, logoutUser }) {
  const router = useRouter();
  
  // Closet states
  const [closet, setCloset] = useState([]);
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories', 'Laundry'
  
  // Modal states for simulated AI scanner upload
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedUploadTemplate, setSelectedUploadTemplate] = useState(null);
  const [scanState, setScanState] = useState('idle'); // 'idle', 'scanning', 'finished'
  const [detectedItem, setDetectedItem] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Desktop webcam states
  const [webcamActive, setWebcamActive] = useState(false);

  // Helper to compress image client-side before upload
  const compressImage = (base64Str, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  // Refresh Closet List
  const loadCloset = async () => {
    if (!currentUser) return;
    const items = await db.getWardrobe(currentUser.id);
    setCloset(items);
  };

  useEffect(() => {
    loadCloset();
  }, [currentUser]);

  // Handle Laundry & Availability State Toggles
  const handleToggleLaundry = async (item) => {
    await db.updateWardrobeItemStatus(item.id, item.status === 'Laundry' ? 'Available' : 'Laundry');
    loadCloset();
  };

  const handleToggleAvailability = async (item) => {
    await db.updateWardrobeItemStatus(item.id, item.status === 'Unavailable' ? 'Available' : 'Unavailable');
    loadCloset();
  };

  const handleDeleteItem = async (itemId) => {
    if (confirm('Are you sure you want to delete this item from your digital wardrobe?')) {
      await db.deleteWardrobeItem(itemId);
      loadCloset();
    }
  };

  // Trigger base64 scanning pipeline
  const processBase64Image = async (base64Data) => {
    const compressedBase64 = await compressImage(base64Data);

    try {
      // Step 1: Upload compressed image
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64 })
      });
      
      if (!uploadRes.ok) throw new Error('Upload error');
      const uploadData = await uploadRes.json();
      const uploadedUrl = uploadData.url;

      // Step 2: Call Gemini API visual parser
      const analyzeRes = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64 })
      });
      
      if (!analyzeRes.ok) throw new Error('Tag analysis error');
      const parsedTags = await analyzeRes.json();

      setDetectedItem({
        name: parsedTags.name || 'Custom Garment',
        category: parsedTags.category || 'Tops',
        subcategory: parsedTags.subcategory || 'Shirt',
        color: parsedTags.color || 'White',
        fabric: parsedTags.fabric || 'Cotton',
        fit: parsedTags.fit || 'Regular',
        occasion: parsedTags.occasion || 'Casual',
        season: parsedTags.season || 'All-season',
        image_url: uploadedUrl
      });
      
      setScanState('finished');
    } catch (err) {
      console.error('AI scanning pipeline failed', err);
      alert('Visual analysis processing failed. GARDO will default to a standard placeholder entry. You may adjust its values manually.');
      
      setDetectedItem({
        name: 'New Custom Garment',
        category: 'Tops',
        subcategory: 'Shirt',
        color: 'White',
        fabric: 'Cotton',
        fit: 'Regular',
        occasion: 'Casual',
        season: 'All-season',
        image_url: compressedBase64
      });
      setScanState('finished');
    }
  };

  // Convert and process image file
  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    setScanState('scanning');
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setSelectedUploadTemplate({ image_url: base64Data });
      await processBase64Image(base64Data);
    };
  };

  // Webcam controls
  const startWebcam = async () => {
    setWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      const video = document.getElementById('webcam-preview');
      if (video) {
        video.srcObject = stream;
        window.localWebcamStream = stream;
      }
    } catch (err) {
      console.error('Error starting webcam', err);
      alert('Could not access webcam stream. Using standard file picker.');
      setWebcamActive(false);
    }
  };

  const captureWebcamPhoto = () => {
    const video = document.getElementById('webcam-preview');
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      if (window.localWebcamStream) {
        window.localWebcamStream.getTracks().forEach(track => track.stop());
        window.localWebcamStream = null;
      }
      setWebcamActive(false);
      
      setScanState('scanning');
      setSelectedUploadTemplate({ image_url: dataUrl });
      processBase64Image(dataUrl);
    }
  };

  const closeWebcam = () => {
    if (window.localWebcamStream) {
      window.localWebcamStream.getTracks().forEach(track => track.stop());
      window.localWebcamStream = null;
    }
    setWebcamActive(false);
  };

  const handleCameraButtonTrigger = (e) => {
    e.stopPropagation();
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (isMobile) {
      document.getElementById('closet-camera-input').click();
    } else {
      startWebcam();
    }
  };

  // Add the scanned item to the database
  const confirmAIScanAddition = async () => {
    if (!currentUser || !detectedItem) return;

    await db.addWardrobeItem(currentUser.id, {
      category: detectedItem.category,
      subcategory: detectedItem.subcategory,
      name: detectedItem.name,
      color: detectedItem.color,
      fabric: detectedItem.fabric,
      fit: detectedItem.fit,
      occasion: detectedItem.occasion,
      season: detectedItem.season,
      image_url: detectedItem.image_url,
      status: 'Available'
    });

    // Reset modals
    setUploadModalOpen(false);
    setSelectedUploadTemplate(null);
    setScanState('idle');
    setDetectedItem(null);
    
    loadCloset();
  };

  // Filter closet items by tab
  const filteredCloset = closet.filter(item => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Laundry') return item.status === 'Laundry';
    return item.category === activeTab;
  });

  return (
    <Layout currentUser={currentUser} userProfile={userProfile} logoutUser={logoutUser}>
      <Head>
        <title>GARDO | My Wardrobe</title>
      </Head>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
        
        {/* Closet Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: '400', color: '#FFF' }}>
              Your digital <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>Wardrobe Gallery</span>
            </h1>
            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px' }}>
              Interactive digital closet. AI automatically tags items and manages laundry rotations.
            </p>
          </div>
          
          <button onClick={() => setUploadModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>➕</span> AI Upload New Garment
          </button>
        </div>

        {/* Categories Tabs Selector */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', overflowX: 'auto' }}>
          {['All', 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories', 'Laundry'].map(tab => {
            const isActive = activeTab === tab;
            const count = tab === 'All' ? closet.length : (tab === 'Laundry' ? closet.filter(i => i.status === 'Laundry').length : closet.filter(i => i.category === tab).length);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                  border: isActive ? '1px solid #D4AF37' : '1px solid transparent',
                  borderRadius: '24px',
                  color: isActive ? '#FFFFFF' : '#888',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? '600' : '400',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition-smooth)'
                }}
                className="closet-tab-button"
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* WARDROBE MASONRY GRID */}
        {filteredCloset.length > 0 ? (
          <div className="wardrobe-grid">
            {filteredCloset.map(item => {
              const inLaundry = item.status === 'Laundry';
              const unavailable = item.status === 'Unavailable';
              
              return (
                <div key={item.id} className="wardrobe-item animate-fade-scale">
                  <div className="glass-panel" style={{ 
                    overflow: 'hidden', 
                    borderRadius: '16px',
                    border: inLaundry ? '1px solid rgba(234, 67, 53, 0.4)' : (unavailable ? '1px solid rgba(100, 100, 100, 0.3)' : '1px solid rgba(255,255,255,0.06)'),
                    background: 'rgba(20,20,20,0.7)',
                    position: 'relative'
                  }}>
                    
                    {/* Status overlays */}
                    {inLaundry && (
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#EA4335', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 10 }}>
                        🧺 In Laundry
                      </div>
                    )}
                    {unavailable && (
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#444', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 10 }}>
                        🔒 Unavailable
                      </div>
                    )}

                    {/* Image display */}
                    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        loading="lazy"
                        style={{ 
                          width: '100%', 
                          display: 'block', 
                          objectFit: 'cover',
                          opacity: inLaundry || unavailable ? 0.4 : 1,
                          transition: 'var(--transition-smooth)'
                        }}
                      />
                    </div>

                    {/* Item Description details */}
                    <div style={{ padding: '16px' }}>
                      <span style={{ fontSize: '0.65rem', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                        {item.subcategory}
                      </span>
                      <h3 style={{ fontSize: '0.95rem', color: '#FFF', fontWeight: '500', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </h3>
                      
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', fontSize: '0.75rem', color: '#888', flexWrap: 'wrap' }}>
                        <span>Col: <strong>{item.color}</strong></span>
                        <span>•</span>
                        <span>Fab: <strong>{item.fabric}</strong></span>
                        {(item.occasion || item.season) && <span>•</span>}
                        {item.occasion && <span>Occ: <strong>{item.occasion}</strong></span>}
                        {item.season && <span>•</span>}
                        {item.season && <span>Sea: <strong>{item.season}</strong></span>}
                      </div>

                      {/* Stat counters */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.7rem', color: '#555', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                        <span>Worn: {item.usage_count} times</span>
                        <span>{item.last_worn_date ? `Last: ${new Date(item.last_worn_date).toLocaleDateString()}` : 'Never worn'}</span>
                      </div>

                      {/* Card Action Toggles */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <button 
                          onClick={() => handleToggleLaundry(item)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: inLaundry ? 'rgba(234, 67, 53, 0.15)' : 'rgba(255,255,255,0.02)',
                            border: inLaundry ? '1px solid #EA4335' : '1px solid rgba(255,255,255,0.08)',
                            color: inLaundry ? '#EA4335' : '#AAA',
                            fontSize: '0.7rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          🧺 Laundry
                        </button>
                        <button 
                          onClick={() => handleToggleAvailability(item)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: unavailable ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: unavailable ? '#FFF' : '#AAA',
                            fontSize: '0.7rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          {unavailable ? '🔓 Make Avail' : '🔒 Hide'}
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(234, 67, 53, 0.05)',
                            border: '1px solid rgba(234,67,53,0.1)',
                            color: '#EA4335',
                            fontSize: '0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          title="Delete Item"
                        >
                          🗑️
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(26,26,26,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📌</div>
            <h3 style={{ fontSize: '1.4rem', color: '#FFF' }}>Upload your first garment to start building your digital wardrobe.</h3>
            <p style={{ color: '#666', marginTop: '8px', maxWidth: '400px', margin: '8px auto' }}>
              Capture or drag images here to categorize your items dynamically.
            </p>
            <button onClick={() => setUploadModalOpen(true)} className="btn-primary" style={{ marginTop: '24px' }}>
              Upload New Garment
            </button>
          </div>
        )}

      </div>

      {/* LUXURY INTERACTIVE AI CLOSET SCANNER MODAL */}
      {uploadModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}>
          <div className="glass-panel-gold animate-fade-scale" style={{ width: '90%', maxWidth: '650px', padding: '30px', background: '#1A1A1A' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="font-serif" style={{ fontSize: '1.5rem', color: '#FFF', fontWeight: '400' }}>
                Interactive <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>AI Closet Scanner</span>
              </h2>
              <button 
                onClick={() => { setUploadModalOpen(false); setScanState('idle'); closeWebcam(); }} 
                style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.5rem' }}
              >
                &times;
              </button>
            </div>

            {scanState === 'idle' && (
              <div>
                {webcamActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <video id="webcam-preview" autoPlay playsInline style={{ width: '100%', height: 'auto', maxHeight: '340px', borderRadius: '12px', background: '#000', border: '1px solid rgba(212,175,55,0.4)' }}></video>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={captureWebcamPhoto} className="btn-primary" style={{ padding: '10px 20px' }}>📸 Capture Photo</button>
                      <button onClick={closeWebcam} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#B3B3B3', fontSize: '0.85rem', marginBottom: '20px' }}>
                      Upload a photo of your clothing garment. GARDO's AI computer vision will inspect the image to auto-detect its categories.
                    </p>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFile(e.dataTransfer.files[0]);
                        }
                      }}
                      style={{
                        border: isDragOver ? '2px dashed #D4AF37' : '2px dashed rgba(212,175,55,0.3)',
                        background: isDragOver ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                        borderRadius: '16px',
                        padding: '40px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                        marginBottom: '24px',
                        position: 'relative'
                      }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget || e.target.tagName === 'H3' || e.target.tagName === 'P' || e.target.id === 'dropzone-icon') {
                          document.getElementById('closet-file-input').click();
                        }
                      }}
                    >
                      <input
                        type="file"
                        id="closet-file-input"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div id="dropzone-icon" style={{ fontSize: '3rem', marginBottom: '12px' }}>📸</div>
                      <h3 style={{ fontSize: '1rem', color: '#FFF', fontWeight: '500', margin: '0 0 8px 0' }}>
                        Drag & Drop image here
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 16px 0' }}>
                        Supports PNG, JPG, JPEG up to 10MB
                      </p>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById('closet-file-input').click();
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                        >
                          Browse Files
                        </button>
                        <button
                          type="button"
                          onClick={handleCameraButtonTrigger}
                          className="btn-gold-outline"
                          id="take-photo-btn"
                          style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                        >
                          📸 Take Photo
                        </button>
                        <input
                          type="file"
                          id="closet-camera-input"
                          accept="image/*"
                          capture="environment"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {scanState === 'scanning' && selectedUploadTemplate && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                <div style={{ position: 'relative', width: '160px', height: '220px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #D4AF37', boxShadow: '0 0 30px rgba(212,175,55,0.25)' }}>
                  <img src={selectedUploadTemplate.image_url} alt="scanning item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {/* Moving scanning line overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '2px',
                    background: '#D4AF37',
                    boxShadow: '0 0 10px #D4AF37',
                    animation: 'scanAnimation 1.5s linear infinite'
                  }}></div>
                </div>
                <div className="loader-spinner" style={{ margin: '24px 0 12px 0' }}></div>
                <div style={{ color: '#D4AF37', fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 'bold' }}>AI closet vision active</div>
                <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '4px' }}>Analyzing fabric weave structure & color code...</div>
              </div>
            )}

            {scanState === 'finished' && detectedItem && (
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '24px', alignItems: 'center' }}>
                <img src={detectedItem.image_url} alt="detected item" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }} />
                
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      AI Classify Success
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Garment Title</label>
                      <input 
                        type="text" 
                        value={detectedItem.name} 
                        onChange={(e) => setDetectedItem({ ...detectedItem, name: e.target.value })}
                        className="form-input" 
                        style={{ padding: '8px 12px', marginTop: '4px', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>Category</label>
                        <select 
                          value={detectedItem.category} 
                          onChange={(e) => setDetectedItem({ ...detectedItem, category: e.target.value })}
                          className="form-select"
                          style={{ padding: '8px 12px', marginTop: '4px', fontSize: '0.85rem' }}
                        >
                          <option value="Tops">Tops</option>
                          <option value="Bottoms">Bottoms</option>
                          <option value="Footwear">Footwear</option>
                          <option value="Outerwear">Outerwear</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>Subcategory</label>
                        <input 
                          type="text" 
                          value={detectedItem.subcategory} 
                          onChange={(e) => setDetectedItem({ ...detectedItem, subcategory: e.target.value })}
                          className="form-input" 
                          style={{ padding: '8px 12px', marginTop: '4px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>Color Detected</label>
                        <select 
                          value={detectedItem.color} 
                          onChange={(e) => setDetectedItem({ ...detectedItem, color: e.target.value })}
                          className="form-select"
                          style={{ padding: '8px 12px', marginTop: '4px', fontSize: '0.85rem' }}
                        >
                          <option value="White">White</option>
                          <option value="Black">Black</option>
                          <option value="Navy">Navy</option>
                          <option value="Beige">Beige</option>
                          <option value="Grey">Grey</option>
                          <option value="Pink">Pink</option>
                          <option value="Olive">Olive</option>
                          <option value="Maroon">Maroon</option>
                          <option value="Light Blue">Light Blue</option>
                          <option value="Brown">Brown</option>
                          <option value="Tan">Tan</option>
                          <option value="Cream">Cream</option>
                          <option value="Gold">Gold</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>Fabric Detected</label>
                        <input 
                          type="text" 
                          value={detectedItem.fabric} 
                          onChange={(e) => setDetectedItem({ ...detectedItem, fabric: e.target.value })}
                          className="form-input" 
                          style={{ padding: '8px 12px', marginTop: '4px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Occasion and Season edit options */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>Occasion</label>
                        <input 
                          type="text" 
                          value={detectedItem.occasion || ''} 
                          onChange={(e) => setDetectedItem({ ...detectedItem, occasion: e.target.value })}
                          className="form-input" 
                          style={{ padding: '8px 12px', marginTop: '4px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>Season</label>
                        <input 
                          type="text" 
                          value={detectedItem.season || ''} 
                          onChange={(e) => setDetectedItem({ ...detectedItem, season: e.target.value })}
                          className="form-input" 
                          style={{ padding: '8px 12px', marginTop: '4px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button onClick={() => setScanState('idle')} className="btn-secondary" style={{ flex: 1, padding: '10px' }}>Re-scan</button>
                    <button onClick={confirmAIScanAddition} className="btn-primary" style={{ flex: 2, padding: '10px' }}>Confirm Closet Entry</button>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scanAnimation {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </Layout>
  );
}
