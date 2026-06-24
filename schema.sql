-- GARDO PostgreSQL Database Schema
-- Production Ready Structure (V2 Upgraded)

-- 1. COUNTRIES TABLE
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) UNIQUE NOT NULL, -- e.g., 'IN', 'SG', 'US'
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'architecture' -- 'launch' or 'architecture'
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE,
    google_id VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    profile_picture_url TEXT, -- V2 Profile photo url
    role VARCHAR(20) DEFAULT 'user', -- V2 Role separation: 'user' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL, -- 'Male', 'Female'
    age INTEGER NOT NULL,
    height INTEGER NOT NULL, -- in cm
    weight INTEGER, -- in kg (optional)
    body_type VARCHAR(30) NOT NULL, -- Slim, Athletic, Muscular, Apple, Pear, etc.
    skin_tone VARCHAR(30) NOT NULL, -- Fair, Medium, Olive, Dark, etc.
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. COMFORT PROFILES TABLE
CREATE TABLE IF NOT EXISTS comfort_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    sweat_level VARCHAR(10) NOT NULL, -- 'Low', 'Medium', 'High'
    underarm_sweat BOOLEAN DEFAULT FALSE,
    full_body_sweat BOOLEAN DEFAULT FALSE,
    heat_sensitive BOOLEAN DEFAULT FALSE,
    cold_sensitive BOOLEAN DEFAULT FALSE,
    sensitive_skin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. WARDROBE ITEMS TABLE (includes laundry / unavailable status)
CREATE TABLE IF NOT EXISTS wardrobe_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL, -- 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories'
    subcategory VARCHAR(50) NOT NULL, -- 'T-Shirt', 'Formal Shirt', 'Jeans', etc.
    name VARCHAR(100) NOT NULL,
    color VARCHAR(30) NOT NULL,
    fabric VARCHAR(50) NOT NULL,
    fit VARCHAR(30) NOT NULL, -- 'Slim', 'Regular', 'Oversized'
    status VARCHAR(20) DEFAULT 'Available', -- 'Available', 'Laundry', 'Unavailable'
    image_url TEXT, -- V2 Wardrobe Image URL stored in Cloudinary
    usage_count INTEGER DEFAULT 0,
    last_worn_date TIMESTAMP,
    occasion VARCHAR(100),
    season VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. WARDROBE IMAGES TABLE
CREATE TABLE IF NOT EXISTS wardrobe_images (
    id SERIAL PRIMARY KEY,
    wardrobe_id INTEGER UNIQUE REFERENCES wardrobe_items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    cloudinary_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. ACCESSORIES TABLE
CREATE TABLE IF NOT EXISTS accessories (
    id SERIAL PRIMARY KEY,
    wardrobe_id INTEGER UNIQUE REFERENCES wardrobe_items(id) ON DELETE CASCADE,
    accessory_type VARCHAR(50) NOT NULL -- 'Watch', 'Belt', 'Shoes', etc.
);

-- 8. FASHION RULES TABLE
CREATE TABLE IF NOT EXISTS fashion_rules (
    id SERIAL PRIMARY KEY,
    rule_type VARCHAR(50) NOT NULL, -- 'Color', 'Combination', 'Occasion', 'Weather', 'Sweat', 'Accessory', 'BodyType'
    rule_name VARCHAR(150) NOT NULL,
    description TEXT,
    score_effect INTEGER NOT NULL, -- e.g., 95 (absolute match score) or -15 (adjustment score)
    metadata JSONB, -- stores colors/items/conditions matching details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. WEATHER PROFILES TABLE
CREATE TABLE IF NOT EXISTS weather_profiles (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL, -- Celsius
    humidity DECIMAL(5,2) NOT NULL, -- percentage
    rain_probability DECIMAL(5,2) DEFAULT 0,
    uv_index INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. OUTFITS TABLE
CREATE TABLE IF NOT EXISTS outfits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    items JSONB NOT NULL, -- array of wardrobe item IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    outfit_id INTEGER REFERENCES outfits(id) ON DELETE CASCADE,
    match_score INTEGER NOT NULL,
    comfort_score INTEGER NOT NULL,
    weather_suitability INTEGER NOT NULL,
    occasion_suitability INTEGER NOT NULL,
    occasion VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. OUTFIT HISTORY TABLE
CREATE TABLE IF NOT EXISTS outfit_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    outfit_id INTEGER REFERENCES outfits(id) ON DELETE CASCADE,
    worn_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    repeat_frequency INTEGER DEFAULT 1
);

-- 13. PRODUCT SUGGESTIONS TABLE
CREATE TABLE IF NOT EXISTS product_suggestions (
    id SERIAL PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL, -- e.g. 'belt', 'watch'
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    buy_url TEXT NOT NULL,
    price VARCHAR(30) NOT NULL,
    why_needed TEXT NOT NULL,
    score_improvement INTEGER NOT NULL
);

-- 14. ASSISTANT CHATS TABLE (V2 Upgraded)
CREATE TABLE IF NOT EXISTS assistant_chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL, -- 'user' or 'gardo'
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR SPEED
CREATE INDEX IF NOT EXISTS idx_wardrobe_user ON wardrobe_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_status ON wardrobe_items(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
CREATE INDEX If NOT EXISTS idx_outfit_history_user ON outfit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_user ON assistant_chats(user_id);
