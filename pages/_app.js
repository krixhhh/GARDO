import '../styles/globals.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import db from '../lib/db';
import ErrorBoundary from '../components/ErrorBoundary';
import { auth as firebaseAuthInstance } from '../lib/firebase';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userComfort, setUserComfort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [firebaseAuth, setFirebaseAuth] = useState(null);
  
  // V2: Automatic Weather Defaults
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('prompt'); // 'prompt', 'loading', 'success', 'denied', 'error'

  const requestGeolocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setWeatherStatus('denied');
      return;
    }
    setWeatherStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const weatherRes = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          const weatherData = await weatherRes.json();
          if (weatherRes.ok) {
            setWeather(weatherData);
            setWeatherStatus('success');
            localStorage.setItem('gardo_weather', JSON.stringify(weatherData));
          } else {
            setWeatherStatus('error');
          }
        } catch (err) {
          console.error('Fetch weather by coordinates failed', err);
          setWeatherStatus('error');
        }
      },
      (error) => {
        console.error('Geolocation error or denied', error);
        setWeatherStatus('denied');
      }
    );
  };

  // 1. Failsafe loading timeout: Max 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timed out after 3 seconds. Forcing page render.');
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  // 2. Initialize Firebase and Restore Sessions on Startup
  useEffect(() => {
    let unsubscribe = null;

    const restoreSessionAndInitAuth = async () => {
      const storedUser = localStorage.getItem('gardo_user');
      const storedProfile = localStorage.getItem('gardo_profile');
      const storedComfort = localStorage.getItem('gardo_comfort');
      const storedWeather = localStorage.getItem('gardo_weather');

      const safeParse = (str) => {
        if (!str || str === 'undefined') return null;
        try {
          return JSON.parse(str);
        } catch (e) {
          console.error('Failed to parse storage item:', e);
          return null;
        }
      };

      const parsedUser = safeParse(storedUser);
      const parsedProfile = safeParse(storedProfile);
      const parsedComfort = safeParse(storedComfort);
      const parsedWeather = safeParse(storedWeather);

      if (parsedUser) {
        setCurrentUser(parsedUser);
        console.log('SESSION_CREATED'); // Debug Log
      }
      if (parsedProfile) setUserProfile(parsedProfile);
      if (parsedComfort) setUserComfort(parsedComfort);
      
      if (parsedWeather) {
        setWeather(parsedWeather);
        setWeatherStatus('success');
      } else {
        requestGeolocation();
      }

      // Use the statically initialized firebaseAuthInstance
      if (firebaseAuthInstance) {
        setFirebaseConfigured(true);
        setFirebaseAuth(firebaseAuthInstance);
        console.log('AUTH_READY'); // Debug Log

        try {
          // Firebase Auth observer
          const { onAuthStateChanged } = require('firebase/auth');
          unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (fbUser) => {
            if (fbUser) {
              // Find or create in DB
              let dbUser = null;
              if (fbUser.email) {
                dbUser = await db.findUserByEmail(fbUser.email);
              }
              if (!dbUser) {
                dbUser = await db.createUser({
                  email: fbUser.email || null,
                  phone_number: null,
                  google_id: fbUser.uid,
                  profile_picture_url: fbUser.photoURL || null,
                  role: 'user'
                });
              }

              const profile = await db.getProfileByUserId(dbUser.id);
              const comfort = await db.getComfortProfile(dbUser.id);

              setCurrentUser(dbUser);
              setUserProfile(profile);
              setUserComfort(comfort);

              localStorage.setItem('gardo_user', JSON.stringify(dbUser));
              if (profile) localStorage.setItem('gardo_profile', JSON.stringify(profile));
              if (comfort) localStorage.setItem('gardo_comfort', JSON.stringify(comfort));
              console.log('SESSION_CREATED'); // Debug Log
            } else {
              // User signed out in Firebase
              const hasGardoUser = localStorage.getItem('gardo_user');
              if (hasGardoUser && hasGardoUser !== 'undefined') {
                try {
                  const parsed = JSON.parse(hasGardoUser);
                  if (parsed && parsed.google_id) {
                    logoutUser();
                  }
                } catch (e) {
                  console.error(e);
                }
              }
            }
            setLoading(false);
          });

        } catch (e) {
          console.error('Firebase Auth observer setup failed:', e);
          setLoading(false);
        }
      } else {
        setFirebaseConfigured(false);
        setLoading(false);
      }
    };

    restoreSessionAndInitAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loginUser = (user, profile, comfort) => {
    setCurrentUser(user);
    setUserProfile(profile);
    setUserComfort(comfort);
    localStorage.setItem('gardo_user', JSON.stringify(user));
    if (profile) localStorage.setItem('gardo_profile', JSON.stringify(profile));
    if (comfort) localStorage.setItem('gardo_comfort', JSON.stringify(comfort));
    console.log('SESSION_CREATED'); // Debug Log
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setUserProfile(null);
    setUserComfort(null);
    localStorage.removeItem('gardo_user');
    localStorage.removeItem('gardo_profile');
    localStorage.removeItem('gardo_comfort');

    // Sign out from Firebase client SDK if active
    if (firebaseAuth) {
      const { signOut } = require('firebase/auth');
      signOut(firebaseAuth).catch(err => console.error('Sign out error', err));
    }
  };

  const updateProfile = (profile) => {
    setUserProfile(profile);
    localStorage.setItem('gardo_profile', JSON.stringify(profile));
  };

  const updateComfort = (comfort) => {
    setUserComfort(comfort);
    localStorage.setItem('gardo_comfort', JSON.stringify(comfort));
  };

  const updateWeather = (newWeather) => {
    setWeather(newWeather);
    setWeatherStatus(newWeather ? 'success' : 'prompt');
    if (newWeather) {
      localStorage.setItem('gardo_weather', JSON.stringify(newWeather));
    } else {
      localStorage.removeItem('gardo_weather');
    }
  };

  // Missing credentials failsafe display
  if (!loading && !firebaseConfigured) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0F0F0F', justifyContent: 'center', alignItems: 'center', color: '#FFF', padding: '20px', textAlign: 'center' }}>
        <Head>
          <title>GARDO | Missing Configuration</title>
        </Head>
        <h2 style={{ color: '#EA4335', marginBottom: '16px' }}>Missing Firebase Configuration</h2>
        <p style={{ maxWidth: '500px', color: '#B3B3B3', lineHeight: '1.6', fontSize: '0.95rem' }}>
          Please add the required Firebase Authentication credentials to your <code>.env.local</code> file and restart the development server.
        </p>
      </div>
    );
  }

  // Premium loading screen
  if (loading) {
    return (
      <div className="loader-container">
        <Head>
          <title>GARDO | Style What You Own.</title>
          <link rel="icon" href="/logo.jpg" />
        </Head>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src="/logo.jpg" 
            alt="GARDO Logo" 
            style={{ 
              width: '180px', 
              height: '180px', 
              borderRadius: '24px', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15)',
              objectFit: 'cover'
            }} 
          />
          <div className="loader-spinner"></div>
          <p style={{ marginTop: '24px', color: '#D4AF37', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '500' }}>
            Style What You Own
          </p>
        </div>
      </div>
    );
  }

  const props = {
    ...pageProps,
    currentUser,
    userProfile,
    userComfort,
    weather,
    weatherStatus,
    requestGeolocation,
    loginUser,
    logoutUser,
    updateProfile,
    updateComfort,
    updateWeather,
    firebaseAuth
  };

  return (
    <>
      <Head>
        <title>GARDO | Style What You Own.</title>
        <meta name="description" content="AI Wardrobe Assistant & Outfit Recommendation Engine. Style what you already own. Don't buy more. Wear it better." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.jpg" />
      </Head>
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    </>
  );
}
