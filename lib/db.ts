// Database abstraction for GARDO V2 (Supports PostgreSQL/Supabase, local JSON/localStorage, and Firestore)
import { firestoreDb } from './firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  orderBy 
} from 'firebase/firestore';

export interface User {
  id: number;
  phone_number?: string;
  google_id?: string;
  email?: string;
  profile_picture_url?: string; // V2 Profile Photo
  role: 'user' | 'admin'; // V2 Admin check
  created_at: string;
}

export interface Profile {
  id: number;
  user_id: number;
  name: string;
  gender: string;
  age: number;
  height: number;
  weight?: number;
  body_type: string;
  skin_tone: string;
  country: string;
  city: string;
  created_at: string;
}

export interface ComfortProfile {
  id: number;
  user_id: number;
  sweat_level: string;
  underarm_sweat: boolean;
  full_body_sweat: boolean;
  heat_sensitive: boolean;
  cold_sensitive: boolean;
  sensitive_skin: boolean;
  created_at: string;
}

export interface WardrobeItem {
  id: number;
  user_id: number;
  userId?: number;
  category: 'Tops' | 'Bottoms' | 'Footwear' | 'Outerwear' | 'Accessories';
  subcategory: string;
  name: string;
  color: string;
  fabric: string;
  fit: string;
  image_url: string;
  imageUrl?: string;
  status: 'Available' | 'Laundry' | 'Unavailable';
  usage_count: number;
  usageCount?: number;
  last_worn_date?: string;
  lastWornDate?: string;
  occasion?: string;
  season?: string;
  created_at: string;
  createdAt?: string;
}

export interface ProductSuggestion {
  id: number;
  item_type: string;
  product_name: string;
  brand: string;
  buy_url: string;
  price: string;
  why_needed: string;
  score_improvement: number;
}

export interface Country {
  id: number;
  code: string;
  name: string;
  status: 'launch' | 'architecture';
}

export interface ChatMessage {
  id?: number;
  user_id: number;
  sender: 'user' | 'gardo';
  text: string;
  created_at: string;
}

export interface DatabaseState {
  users: User[];
  profiles: Profile[];
  comfort_profiles: ComfortProfile[];
  wardrobe_items: WardrobeItem[];
  countries: Country[];
  product_suggestions: ProductSuggestion[];
  worn_history: { id: number; user_id: number; items: number[]; date: string; occasion: string; score: number }[];
  chats: ChatMessage[];
}

// Initial Mock Seed Data
const INITIAL_COUNTRIES: Country[] = [
  { id: 1, code: 'IN', name: 'India', status: 'launch' },
  { id: 2, code: 'SG', name: 'Singapore', status: 'launch' },
  { id: 3, code: 'MY', name: 'Malaysia', status: 'architecture' },
  { id: 4, code: 'AE', name: 'UAE', status: 'architecture' },
  { id: 5, code: 'GB', name: 'UK', status: 'architecture' },
  { id: 6, code: 'US', name: 'USA', status: 'architecture' },
  { id: 7, code: 'CA', name: 'Canada', status: 'architecture' },
  { id: 8, code: 'JP', name: 'Japan', status: 'architecture' },
  { id: 9, code: 'KR', name: 'South Korea', status: 'architecture' }
];

const INITIAL_PRODUCTS: ProductSuggestion[] = [];

export const normalizeWardrobeItem = (item: any): WardrobeItem => {
  if (!item) return item;
  return {
    ...item,
    userId: item.userId !== undefined ? item.userId : item.user_id,
    user_id: item.user_id !== undefined ? item.user_id : item.userId,
    imageUrl: item.imageUrl !== undefined ? item.imageUrl : item.image_url,
    image_url: item.image_url !== undefined ? item.image_url : item.imageUrl,
    usageCount: item.usageCount !== undefined ? item.usage_count : item.usage_count,
    usage_count: item.usage_count !== undefined ? item.usage_count : item.usageCount,
    lastWornDate: item.lastWornDate !== undefined ? item.lastWornDate : item.last_worn_date,
    last_worn_date: item.last_worn_date !== undefined ? item.last_worn_date : item.lastWornDate,
    createdAt: item.createdAt !== undefined ? item.createdAt : item.created_at,
    created_at: item.created_at !== undefined ? item.created_at : item.createdAt,
  };
};

const sanitizeFirestoreData = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item));
  }
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const val = data[key];
        if (val !== undefined) {
          result[key] = sanitizeFirestoreData(val);
        }
      }
    }
    return result;
  }
  return data;
};

class Database {
  private isServer = typeof window === 'undefined';
  private pgPool = null;

  private useFirestore(): boolean {
    return !!firestoreDb;
  }

  constructor() {
    if (this.isServer && process.env.DATABASE_URL) {
      try {
        const { Pool } = require('pg');
        const globalAny = global as any;
        if (!globalAny.gardoPgPool) {
          globalAny.gardoPgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
          });
        }
        this.pgPool = globalAny.gardoPgPool;
      } catch (e) {
        console.error('Failed to initialize PostgreSQL pool', e);
      }
    }
  }

  // Helper to run query on PG or return null
  private async queryPg(text: string, params: any[] = []): Promise<any[] | null> {
    if (!this.pgPool) return null;
    try {
      const res = await this.pgPool.query(text, params);
      return res.rows;
    } catch (e) {
      console.error(`PostgreSQL query error: ${text}`, e);
      return null;
    }
  }

  private read(): DatabaseState {
    if (!this.isServer) {
      const localData = localStorage.getItem('gardo_db_state');
      if (localData) {
        try {
          const state = JSON.parse(localData);
          if (state && state.wardrobe && !state.wardrobe_items) {
            state.wardrobe_items = state.wardrobe;
            delete state.wardrobe;
          }
          return state;
        } catch (e) {
          console.error('Error parsing localStorage DB state', e);
        }
      }
      
      const defaultState: DatabaseState = {
        users: [],
        profiles: [],
        comfort_profiles: [],
        wardrobe_items: [],
        countries: INITIAL_COUNTRIES,
        product_suggestions: INITIAL_PRODUCTS,
        worn_history: [],
        chats: []
      };
      localStorage.setItem('gardo_db_state', JSON.stringify(defaultState));
      return defaultState;
    }

    const fs = require('fs');
    const path = require('path');
    const serverDbPath = path.join(process.cwd(), 'gardo_db.json');

    if (!fs.existsSync(serverDbPath)) {
      const defaultState: DatabaseState = {
        users: [],
        profiles: [],
        comfort_profiles: [],
        wardrobe_items: [],
        countries: INITIAL_COUNTRIES,
        product_suggestions: INITIAL_PRODUCTS,
        worn_history: [],
        chats: []
      };
      fs.writeFileSync(serverDbPath, JSON.stringify(defaultState, null, 2), 'utf-8');
      return defaultState;
    }
    try {
      const content = fs.readFileSync(serverDbPath, 'utf-8');
      const state = JSON.parse(content);
      if (state && state.wardrobe && !state.wardrobe_items) {
        state.wardrobe_items = state.wardrobe;
        delete state.wardrobe;
      }
      return state;
    } catch (e) {
      return {
        users: [],
        profiles: [],
        comfort_profiles: [],
        wardrobe_items: [],
        countries: INITIAL_COUNTRIES,
        product_suggestions: INITIAL_PRODUCTS,
        worn_history: [],
        chats: []
      };
    }
  }

  private write(state: DatabaseState) {
    if (!this.isServer) {
      localStorage.setItem('gardo_db_state', JSON.stringify(state));
      return;
    }
    try {
      const fs = require('fs');
      const path = require('path');
      const serverDbPath = path.join(process.cwd(), 'gardo_db.json');
      fs.writeFileSync(serverDbPath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file', e);
    }
  }

  // Users CRUD
  public async findUserById(id: number): Promise<User | undefined> {
    if (this.useFirestore()) {
      try {
        const q = query(collection(firestoreDb!, 'users'), where('id', '==', id));
        const snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].data() as User;
        return undefined;
      } catch (e) {
        console.error('Firestore findUserById error', e);
      }
    }
    const pgRes = await this.queryPg('SELECT * FROM users WHERE id = $1', [id]);
    if (pgRes) return pgRes[0];
    return this.read().users.find(u => u.id === id);
  }

  public async findUserByPhone(phone: string): Promise<User | undefined> {
    if (this.useFirestore()) {
      try {
        const q = query(collection(firestoreDb!, 'users'), where('phone_number', '==', phone));
        const snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].data() as User;
        return undefined;
      } catch (e) {
        console.error('Firestore findUserByPhone error', e);
      }
    }
    const pgRes = await this.queryPg('SELECT * FROM users WHERE phone_number = $1', [phone]);
    if (pgRes) return pgRes[0];
    return this.read().users.find(u => u.phone_number === phone);
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    if (this.useFirestore()) {
      try {
        const q = query(collection(firestoreDb!, 'users'), where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].data() as User;
        return undefined;
      } catch (e) {
        console.error('Firestore findUserByEmail error', e);
      }
    }
    const pgRes = await this.queryPg('SELECT * FROM users WHERE email = $1', [email]);
    if (pgRes) return pgRes[0];
    return this.read().users.find(u => u.email === email);
  }

  public async createUser(userData: Partial<User>): Promise<User> {
    if (this.useFirestore()) {
      try {
        const q = query(collection(firestoreDb!, 'users'), limit(1));
        const snap = await getDocs(q);
        const isFirstUser = snap.empty;
        const assignedRole = isFirstUser ? 'admin' : (userData.role || 'user');

        const newId = Date.now();
        const newUser: User = {
          id: newId,
          phone_number: userData.phone_number || undefined,
          google_id: userData.google_id || undefined,
          email: userData.email || undefined,
          profile_picture_url: userData.profile_picture_url || undefined,
          role: assignedRole,
          created_at: new Date().toISOString()
        };

        await setDoc(doc(firestoreDb!, 'users', String(newId)), sanitizeFirestoreData(newUser));
        return newUser;
      } catch (e) {
        console.error('Firestore createUser error', e);
      }
    }
    const isFirstUser = (await this.queryPg('SELECT id FROM users LIMIT 1'))?.length === 0 || this.read().users.length === 0;
    const assignedRole = isFirstUser ? 'admin' : (userData.role || 'user'); // Automatically make the first user an Admin!

    const pgInsert = await this.queryPg(
      'INSERT INTO users (phone_number, google_id, email, profile_picture_url, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userData.phone_number, userData.google_id, userData.email, userData.profile_picture_url, assignedRole]
    );
    if (pgInsert) {
      return pgInsert[0];
    }

    const state = this.read();
    const newUser: User = {
      id: state.users.length > 0 ? Math.max(...state.users.map(u => u.id)) + 1 : 1,
      phone_number: userData.phone_number,
      google_id: userData.google_id,
      email: userData.email,
      profile_picture_url: userData.profile_picture_url,
      role: assignedRole,
      created_at: new Date().toISOString()
    };
    state.users.push(newUser);
    this.write(state);
    return newUser;
  }

  public async updateProfilePhoto(userId: number, photoUrl: string): Promise<boolean> {
    if (this.useFirestore()) {
      try {
        const userDocRef = doc(firestoreDb!, 'users', String(userId));
        await updateDoc(userDocRef, sanitizeFirestoreData({ profile_picture_url: photoUrl }));
        return true;
      } catch (e) {
        console.error('Firestore updateProfilePhoto error', e);
      }
    }
    const pgUpdate = await this.queryPg('UPDATE users SET profile_picture_url = $1 WHERE id = $2', [photoUrl, userId]);
    if (pgUpdate) return true;

    const state = this.read();
    const idx = state.users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      state.users[idx].profile_picture_url = photoUrl;
      this.write(state);
      return true;
    }
    return false;
  }

  // Profile CRUD
  public async getProfileByUserId(userId: number): Promise<Profile | undefined> {
    if (this.useFirestore()) {
      try {
        const docRef = doc(firestoreDb!, 'profiles', String(userId));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data() as Profile;
        return undefined;
      } catch (e) {
        console.error('Firestore getProfileByUserId error', e);
      }
    }
    const pgRes = await this.queryPg('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (pgRes) return pgRes[0];
    return this.read().profiles.find(p => p.user_id === userId);
  }

  public async createOrUpdateProfile(userId: number, profileData: Partial<Profile>): Promise<Profile> {
    if (this.useFirestore()) {
      try {
        const docRef = doc(firestoreDb!, 'profiles', String(userId));
        const docSnap = await getDoc(docRef);
        
        const baseProfile: Profile = {
          id: docSnap.exists() ? docSnap.data().id : Date.now(),
          user_id: userId,
          name: profileData.name || 'Anonymous',
          gender: profileData.gender || 'Male',
          age: Number(profileData.age) || 25,
          height: Number(profileData.height) || 175,
          weight: profileData.weight ? Number(profileData.weight) : undefined,
          body_type: profileData.body_type || 'Average',
          skin_tone: profileData.skin_tone || 'Medium',
          country: profileData.country || 'India',
          city: profileData.city || 'Bangalore',
          created_at: docSnap.exists() ? docSnap.data().created_at : new Date().toISOString()
        };

        await setDoc(docRef, sanitizeFirestoreData(baseProfile));
        return baseProfile;
      } catch (e) {
        console.error('Firestore createOrUpdateProfile error', e);
      }
    }
    const pgCheck = await this.queryPg('SELECT id FROM profiles WHERE user_id = $1', [userId]);
    let result = null;
    if (pgCheck) {
      if (pgCheck.length > 0) {
        result = await this.queryPg(
          'UPDATE profiles SET name=$1, gender=$2, age=$3, height=$4, weight=$5, body_type=$6, skin_tone=$7, country=$8, city=$9 WHERE user_id=$10 RETURNING *',
          [profileData.name, profileData.gender, profileData.age, profileData.height, profileData.weight, profileData.body_type, profileData.skin_tone, profileData.country, profileData.city, userId]
        );
      } else {
        result = await this.queryPg(
          'INSERT INTO profiles (user_id, name, gender, age, height, weight, body_type, skin_tone, country, city) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
          [userId, profileData.name, profileData.gender, profileData.age, profileData.height, profileData.weight, profileData.body_type, profileData.skin_tone, profileData.country, profileData.city]
        );
      }
      if (result) return result[0];
    }

    const state = this.read();
    const index = state.profiles.findIndex(p => p.user_id === userId);
    const baseProfile: Profile = {
      id: index >= 0 ? state.profiles[index].id : (state.profiles.length > 0 ? Math.max(...state.profiles.map(p => p.id)) + 1 : 1),
      user_id: userId,
      name: profileData.name || 'Anonymous',
      gender: profileData.gender || 'Male',
      age: Number(profileData.age) || 25,
      height: Number(profileData.height) || 175,
      weight: profileData.weight ? Number(profileData.weight) : undefined,
      body_type: profileData.body_type || 'Average',
      skin_tone: profileData.skin_tone || 'Medium',
      country: profileData.country || 'India',
      city: profileData.city || 'Bangalore',
      created_at: new Date().toISOString()
    };
    if (index >= 0) state.profiles[index] = baseProfile;
    else state.profiles.push(baseProfile);
    this.write(state);
    return baseProfile;
  }

  // Comfort Profile CRUD
  public async getComfortProfile(userId: number): Promise<ComfortProfile | undefined> {
    if (this.useFirestore()) {
      try {
        const docRef = doc(firestoreDb!, 'comfort_profiles', String(userId));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data() as ComfortProfile;
        return undefined;
      } catch (e) {
        console.error('Firestore getComfortProfile error', e);
      }
    }
    const pgRes = await this.queryPg('SELECT * FROM comfort_profiles WHERE user_id = $1', [userId]);
    if (pgRes) return pgRes[0];
    return this.read().comfort_profiles.find(cp => cp.user_id === userId);
  }

  public async createOrUpdateComfortProfile(userId: number, comfortData: Partial<ComfortProfile>): Promise<ComfortProfile> {
    if (this.useFirestore()) {
      try {
        const docRef = doc(firestoreDb!, 'comfort_profiles', String(userId));
        const docSnap = await getDoc(docRef);

        const baseComfort: ComfortProfile = {
          id: docSnap.exists() ? docSnap.data().id : Date.now(),
          user_id: userId,
          sweat_level: comfortData.sweat_level || 'Medium',
          underarm_sweat: !!comfortData.underarm_sweat,
          full_body_sweat: !!comfortData.full_body_sweat,
          heat_sensitive: !!comfortData.heat_sensitive,
          cold_sensitive: !!comfortData.cold_sensitive,
          sensitive_skin: !!comfortData.sensitive_skin,
          created_at: docSnap.exists() ? docSnap.data().created_at : new Date().toISOString()
        };

        await setDoc(docRef, sanitizeFirestoreData(baseComfort));
        return baseComfort;
      } catch (e) {
        console.error('Firestore createOrUpdateComfortProfile error', e);
      }
    }
    const pgCheck = await this.queryPg('SELECT id FROM comfort_profiles WHERE user_id = $1', [userId]);
    let result = null;
    if (pgCheck) {
      if (pgCheck.length > 0) {
        result = await this.queryPg(
          'UPDATE comfort_profiles SET sweat_level=$1, underarm_sweat=$2, full_body_sweat=$3, heat_sensitive=$4, cold_sensitive=$5, sensitive_skin=$6 WHERE user_id=$7 RETURNING *',
          [comfortData.sweat_level, comfortData.underarm_sweat, comfortData.full_body_sweat, comfortData.heat_sensitive, comfortData.cold_sensitive, comfortData.sensitive_skin, userId]
        );
      } else {
        result = await this.queryPg(
          'INSERT INTO comfort_profiles (user_id, sweat_level, underarm_sweat, full_body_sweat, heat_sensitive, cold_sensitive, sensitive_skin) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [userId, comfortData.sweat_level, comfortData.underarm_sweat, comfortData.full_body_sweat, comfortData.heat_sensitive, comfortData.cold_sensitive, comfortData.sensitive_skin]
        );
      }
      if (result) return result[0];
    }

    const state = this.read();
    const index = state.comfort_profiles.findIndex(cp => cp.user_id === userId);
    const baseComfort: ComfortProfile = {
      id: index >= 0 ? state.comfort_profiles[index].id : (state.comfort_profiles.length > 0 ? Math.max(...state.comfort_profiles.map(cp => cp.id)) + 1 : 1),
      user_id: userId,
      sweat_level: comfortData.sweat_level || 'Medium',
      underarm_sweat: !!comfortData.underarm_sweat,
      full_body_sweat: !!comfortData.full_body_sweat,
      heat_sensitive: !!comfortData.heat_sensitive,
      cold_sensitive: !!comfortData.cold_sensitive,
      sensitive_skin: !!comfortData.sensitive_skin,
      created_at: new Date().toISOString()
    };
    if (index >= 0) state.comfort_profiles[index] = baseComfort;
    else state.comfort_profiles.push(baseComfort);
    this.write(state);
    return baseComfort;
  }

  // Wardrobe CRUD
  public async getWardrobe(userId: number): Promise<WardrobeItem[]> {
    if (this.useFirestore()) {
      try {
        const q = query(collection(firestoreDb!, 'wardrobe_items'), where('user_id', '==', userId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => normalizeWardrobeItem(d.data()));
        return list.sort((a, b) => b.id - a.id);
      } catch (e) {
        console.error('Firestore getWardrobe error', e);
      }
    }
    const pgRes = await this.queryPg('SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY id DESC', [userId]);
    if (pgRes) return pgRes.map(normalizeWardrobeItem);
    return this.read().wardrobe_items.filter(item => item.user_id === userId).reverse().map(normalizeWardrobeItem);
  }

  public async getAvailableWardrobe(userId: number): Promise<WardrobeItem[]> {
    if (this.useFirestore()) {
      try {
        const q = query(
          collection(firestoreDb!, 'wardrobe_items'), 
          where('user_id', '==', userId), 
          where('status', '==', 'Available')
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => normalizeWardrobeItem(d.data()));
        return list.sort((a, b) => b.id - a.id);
      } catch (e) {
        console.error('Firestore getAvailableWardrobe error', e);
      }
    }
    const pgRes = await this.queryPg("SELECT * FROM wardrobe_items WHERE user_id = $1 AND status = 'Available' ORDER BY id DESC", [userId]);
    if (pgRes) return pgRes.map(normalizeWardrobeItem);
    return this.read().wardrobe_items.filter(item => item.user_id === userId && item.status === 'Available').reverse().map(normalizeWardrobeItem);
  }

  public async addWardrobeItem(userId: number, itemData: Partial<WardrobeItem>): Promise<WardrobeItem> {
    if (this.useFirestore()) {
      try {
        const newId = Date.now();
        const newItem = normalizeWardrobeItem({
          id: newId,
          user_id: userId,
          category: itemData.category || 'Tops',
          subcategory: itemData.subcategory || 'Shirt',
          name: itemData.name || 'Custom Garment',
          color: itemData.color || 'White',
          fabric: itemData.fabric || 'Cotton',
          fit: itemData.fit || 'Regular',
          image_url: itemData.image_url || '',
          status: itemData.status || 'Available',
          usage_count: 0,
          occasion: itemData.occasion || '',
          season: itemData.season || '',
          created_at: new Date().toISOString()
        });

        await setDoc(doc(firestoreDb!, 'wardrobe_items', String(newId)), sanitizeFirestoreData(newItem));
        return newItem;
      } catch (e) {
        console.error('Firestore addWardrobeItem error', e);
      }
    }
    const pgRes = await this.queryPg(
      'INSERT INTO wardrobe_items (user_id, category, subcategory, name, color, fabric, fit, image_url, status, occasion, season) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [
        userId,
        itemData.category,
        itemData.subcategory,
        itemData.name,
        itemData.color,
        itemData.fabric,
        itemData.fit,
        itemData.image_url,
        itemData.status || 'Available',
        itemData.occasion || '',
        itemData.season || ''
      ]
    );
    if (pgRes) return normalizeWardrobeItem(pgRes[0]);

    const state = this.read();
    const newItem: WardrobeItem = normalizeWardrobeItem({
      id: state.wardrobe_items.length > 0 ? Math.max(...state.wardrobe_items.map(w => w.id)) + 1 : 1,
      user_id: userId,
      category: itemData.category || 'Tops',
      subcategory: itemData.subcategory || 'Shirt',
      name: itemData.name || 'Custom Garment',
      color: itemData.color || 'White',
      fabric: itemData.fabric || 'Cotton',
      fit: itemData.fit || 'Regular',
      image_url: itemData.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
      status: itemData.status || 'Available',
      usage_count: 0,
      occasion: itemData.occasion || '',
      season: itemData.season || '',
      created_at: new Date().toISOString()
    });
    state.wardrobe_items.push(newItem);
    this.write(state);
    return newItem;
  }

  public async updateWardrobeItemStatus(itemId: number, status: 'Available' | 'Laundry' | 'Unavailable'): Promise<boolean> {
    if (this.useFirestore()) {
      try {
        const docRef = doc(firestoreDb!, 'wardrobe_items', String(itemId));
        await updateDoc(docRef, sanitizeFirestoreData({ status }));
        return true;
      } catch (e) {
        console.error('Firestore updateWardrobeItemStatus error', e);
      }
    }
    const pgRes = await this.queryPg('UPDATE wardrobe_items SET status = $1 WHERE id = $2', [status, itemId]);
    if (pgRes) return true;

    const state = this.read();
    const index = state.wardrobe_items.findIndex(w => w.id === itemId);
    if (index >= 0) {
      state.wardrobe_items[index].status = status;
      this.write(state);
      return true;
    }
    return false;
  }

  public async deleteWardrobeItem(itemId: number): Promise<boolean> {
    if (this.useFirestore()) {
      try {
        await deleteDoc(doc(firestoreDb!, 'wardrobe_items', String(itemId)));
        return true;
      } catch (e) {
        console.error('Firestore deleteWardrobeItem error', e);
      }
    }
    const pgRes = await this.queryPg('DELETE FROM wardrobe_items WHERE id = $1', [itemId]);
    if (pgRes) return true;

    const state = this.read();
    const initialLength = state.wardrobe_items.length;
    state.wardrobe_items = state.wardrobe_items.filter(w => w.id !== itemId);
    if (state.wardrobe_items.length < initialLength) {
      this.write(state);
      return true;
    }
    return false;
  }

  // Worn History CRUD
  public async getWornHistory(userId: number) {
    if (this.useFirestore()) {
      try {
        const q = query(collection(firestoreDb!, 'worn_history'), where('user_id', '==', userId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => d.data());
        return list.sort((a, b) => b.id - a.id);
      } catch (e) {
        console.error('Firestore getWornHistory error', e);
      }
    }
    const pgRes = await this.queryPg(
      'SELECT oh.id, oh.user_id, oh.worn_date as date, oh.repeat_frequency, r.occasion, r.match_score as score, o.items ' +
      'FROM outfit_history oh ' +
      'JOIN outfits o ON oh.outfit_id = o.id ' +
      'LEFT JOIN recommendations r ON r.outfit_id = o.id AND r.user_id = oh.user_id ' +
      'WHERE oh.user_id = $1 ORDER BY oh.id DESC', [userId]
    );
    if (pgRes) return pgRes;
    return this.read().worn_history.filter(h => h.user_id === userId);
  }

  public async addWornHistory(userId: number, itemIds: number[], occasion: string, score: number) {
    if (this.useFirestore()) {
      try {
        const newId = Date.now();
        const newHistory = {
          id: newId,
          user_id: userId,
          items: itemIds,
          date: new Date().toISOString(),
          occasion,
          score
        };

        await setDoc(doc(firestoreDb!, 'worn_history', String(newId)), sanitizeFirestoreData(newHistory));

        // Update usage count for wardrobe items in Firestore
        for (const id of itemIds) {
          const itemRef = doc(firestoreDb!, 'wardrobe_items', String(id));
          const docSnap = await getDoc(itemRef);
          if (docSnap.exists()) {
            const currentCount = docSnap.data().usage_count || 0;
            await updateDoc(itemRef, sanitizeFirestoreData({
              usage_count: currentCount + 1,
              last_worn_date: new Date().toISOString()
            }));
          }
        }
        return newHistory;
      } catch (e) {
        console.error('Firestore addWornHistory error', e);
      }
    }
    const pgOutfit = await this.queryPg(
      'INSERT INTO outfits (name, items) VALUES ($1, $2) RETURNING id',
      [`Look for ${occasion}`, JSON.stringify(itemIds)]
    );
    if (pgOutfit) {
      const outfitId = pgOutfit[0].id;
      await this.queryPg(
        'INSERT INTO recommendations (user_id, outfit_id, match_score, comfort_score, weather_suitability, occasion_suitability, occasion) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, outfitId, score, score, score, score, occasion]
      );
      await this.queryPg('INSERT INTO outfit_history (user_id, outfit_id) VALUES ($1, $2)', [userId, outfitId]);
      
      // Update usage count in PG
      for (const id of itemIds) {
        await this.queryPg('UPDATE wardrobe_items SET usage_count = usage_count + 1, last_worn_date = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      }
      return;
    }

    const state = this.read();
    const newHistory = {
      id: state.worn_history.length > 0 ? Math.max(...state.worn_history.map(h => h.id)) + 1 : 1,
      user_id: userId,
      items: itemIds,
      date: new Date().toISOString(),
      occasion,
      score
    };
    state.worn_history.push(newHistory);
    itemIds.forEach(id => {
      const idx = state.wardrobe_items.findIndex(w => w.id === id);
      if (idx >= 0) {
        state.wardrobe_items[idx].usage_count = (state.wardrobe_items[idx].usage_count || 0) + 1;
        state.wardrobe_items[idx].last_worn_date = new Date().toISOString();
      }
    });
    this.write(state);
    return newHistory;
  }

  // Chats CRUD (V2 Upgraded)
  public async getChatHistory(userId: number): Promise<ChatMessage[]> {
    if (this.useFirestore()) {
      try {
        const q = query(collection(firestoreDb!, 'chats'), where('user_id', '==', userId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => d.data() as ChatMessage);
        return list.sort((a, b) => (a.id || 0) - (b.id || 0));
      } catch (e) {
        console.error('Firestore getChatHistory error', e);
      }
    }
    const pgRes = await this.queryPg('SELECT * FROM assistant_chats WHERE user_id = $1 ORDER BY id ASC', [userId]);
    if (pgRes) {
      return pgRes.map(chat => ({
        ...chat,
        created_at: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    }

    const state = this.read();
    if (!state.chats) state.chats = [];
    return state.chats.filter(c => c.user_id === userId);
  }

  public async saveChatMessage(userId: number, sender: 'user' | 'gardo', text: string): Promise<ChatMessage> {
    if (this.useFirestore()) {
      try {
        const newId = Date.now();
        const newChat: ChatMessage = {
          id: newId,
          user_id: userId,
          sender,
          text,
          created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        await setDoc(doc(firestoreDb!, 'chats', String(newId)), sanitizeFirestoreData(newChat));
        return newChat;
      } catch (e) {
        console.error('Firestore saveChatMessage error', e);
      }
    }
    const pgInsert = await this.queryPg(
      'INSERT INTO assistant_chats (user_id, sender, text) VALUES ($1, $2, $3) RETURNING *',
      [userId, sender, text]
    );
    if (pgInsert) {
      const chat = pgInsert[0];
      return {
        ...chat,
        created_at: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }

    const state = this.read();
    if (!state.chats) state.chats = [];
    
    const newChat: ChatMessage = {
      id: state.chats.length > 0 ? Math.max(...state.chats.map(c => c.id || 0)) + 1 : 1,
      user_id: userId,
      sender,
      text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.chats.push(newChat);
    this.write(state);
    return newChat;
  }

  // Countries
  public getCountries(): Country[] {
    return this.read().countries;
  }

  public addCountry(code: string, name: string, status: 'launch' | 'architecture'): Country {
    const state = this.read();
    const existing = state.countries.find(c => c.code.toLowerCase() === code.toLowerCase());
    if (existing) {
      existing.status = status;
      this.write(state);
      return existing;
    }
    const newCountry: Country = {
      id: state.countries.length > 0 ? Math.max(...state.countries.map(c => c.id)) + 1 : 1,
      code: code.toUpperCase(),
      name,
      status
    };
    state.countries.push(newCountry);
    this.write(state);
    
    this.queryPg('INSERT INTO countries (code, name, status) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET status = EXCLUDED.status', [code.toUpperCase(), name, status]);
    
    return newCountry;
  }

  // Product Suggestions
  public getProductSuggestions(): ProductSuggestion[] {
    return this.read().product_suggestions;
  }

  public addProductSuggestion(suggestion: Omit<ProductSuggestion, 'id'>): ProductSuggestion {
    const state = this.read();
    const newSug: ProductSuggestion = {
      id: state.product_suggestions.length > 0 ? Math.max(...state.product_suggestions.map(s => s.id)) + 1 : 1,
      ...suggestion
    };
    state.product_suggestions.push(newSug);
    this.write(state);
    
    this.queryPg(
      'INSERT INTO product_suggestions (item_type, product_name, brand, buy_url, price, why_needed, score_improvement) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [suggestion.item_type, suggestion.product_name, suggestion.brand, suggestion.buy_url, suggestion.price, suggestion.why_needed, suggestion.score_improvement]
    );

    return newSug;
  }

  // Admin query helpers (pulling compiled totals)
  public readRawStateForAdmin() {
    return this.read();
  }
}

export const db = new Database();
export default db;
