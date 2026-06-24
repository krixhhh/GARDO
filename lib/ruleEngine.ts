// GARDO Fashion Rule Engine
// Implements dynamic fashion rules across Color, Combination, Occasion, Weather, Sweat, Accessories, and Body Type.

import { WardrobeItem, Profile, ComfortProfile } from './db';
import rulesData from '../public/fashion_rules.json';

export interface WeatherCondition {
  temperature: number; // Celsius
  humidity: number; // Percentage (0-100)
  rain: boolean;
  uv: number; // Index (0-11)
}

export interface ScoreBreakdown {
  matchScore: number;       // Color + Combination matching
  comfortScore: number;     // Fabric + Sweat suitability
  weatherScore: number;     // Temperature + Rain + UV compatibility
  occasionScore: number;   // Dress code compatibility
  overallScore: number;    // Weighted combination of the above
  feedback: string[];      // Stylist recommendations (positive and negative)
  warnings: string[];      // Critical warnings (e.g., laundry, rain sensitivity, sweat visibility)
}

// Fallback matrices to ensure 100% uptime if JSON matching returns nothing
const COLOR_MATCH_MATRIX: Record<string, Record<string, number>> = {
  White: { White: 70, Black: 98, Navy: 96, Beige: 95, Grey: 90, Pink: 88, Olive: 92, Maroon: 94, 'Light Blue': 95, Brown: 90, Tan: 92, Cream: 85, Silver: 88, Gold: 90, Charcoal: 95 },
  Black: { White: 98, Black: 70, Navy: 65, Beige: 94, Grey: 88, Pink: 85, Olive: 90, Maroon: 92, 'Light Blue': 90, Brown: 60, Tan: 78, Cream: 90, Silver: 92, Gold: 94, Charcoal: 85 },
  Navy: { White: 96, Black: 65, Navy: 70, Beige: 98, Grey: 90, Pink: 88, Olive: 75, Maroon: 82, 'Light Blue': 85, Brown: 92, Tan: 95, Cream: 94, Silver: 88, Gold: 85, Charcoal: 85 },
  Beige: { White: 95, Black: 94, Navy: 98, Beige: 65, Grey: 80, Pink: 85, Olive: 92, Maroon: 90, 'Light Blue': 92, Brown: 94, Tan: 90, Cream: 90, Silver: 70, Gold: 85, Charcoal: 92 },
  Grey: { White: 90, Black: 88, Navy: 90, Beige: 80, Grey: 60, Pink: 92, Olive: 82, Maroon: 88, 'Light Blue': 90, Brown: 70, Tan: 75, Cream: 80, Silver: 85, Gold: 75, Charcoal: 85 },
  Pink: { White: 88, Black: 85, Navy: 88, Beige: 85, Grey: 92, Pink: 50, Olive: 80, Maroon: 75, 'Light Blue': 80, Brown: 82, Tan: 85, Cream: 88, Silver: 80, Gold: 75, Charcoal: 88 },
  Olive: { White: 92, Black: 90, Navy: 75, Beige: 92, Grey: 82, Pink: 80, Olive: 50, Maroon: 70, 'Light Blue': 75, Brown: 88, Tan: 90, Cream: 92, Silver: 75, Gold: 80, Charcoal: 88 },
  Maroon: { White: 94, Black: 92, Navy: 82, Beige: 90, Grey: 88, Pink: 75, Olive: 70, Maroon: 50, 'Light Blue': 78, Brown: 80, Tan: 82, Cream: 90, Silver: 80, Gold: 85, Charcoal: 90 },
  'Light Blue': { White: 95, Black: 90, Navy: 85, Beige: 92, Grey: 90, Pink: 80, Olive: 75, Maroon: 78, 'Light Blue': 60, Brown: 85, Tan: 88, Cream: 92, Silver: 85, Gold: 78, Charcoal: 90 },
  Brown: { White: 90, Black: 60, Navy: 92, Beige: 94, Grey: 70, Pink: 82, Olive: 88, Maroon: 80, 'Light Blue': 85, Brown: 60, Tan: 90, Cream: 92, Silver: 65, Gold: 88, Charcoal: 75 },
  Tan: { White: 92, Black: 78, Navy: 95, Beige: 90, Grey: 75, Pink: 85, Olive: 90, Maroon: 82, 'Light Blue': 88, Brown: 90, Tan: 60, Cream: 94, Silver: 70, Gold: 90, Charcoal: 80 },
  Cream: { White: 85, Black: 90, Navy: 94, Beige: 90, Grey: 80, Pink: 88, Olive: 92, Maroon: 90, 'Light Blue': 92, Brown: 92, Tan: 94, Cream: 60, Silver: 75, Gold: 88, Charcoal: 88 },
  Silver: { White: 88, Black: 92, Navy: 88, Beige: 70, Grey: 85, Pink: 80, Olive: 75, Maroon: 80, 'Light Blue': 85, Brown: 65, Tan: 70, Cream: 75, Silver: 50, Gold: 50, Charcoal: 85 },
  Gold: { White: 90, Black: 94, Navy: 85, Beige: 85, Grey: 75, Pink: 75, Olive: 80, Maroon: 85, 'Light Blue': 78, Brown: 88, Tan: 90, Cream: 88, Silver: 50, Gold: 50, Charcoal: 82 },
  Charcoal: { White: 95, Black: 85, Navy: 85, Beige: 92, Grey: 85, Pink: 88, Olive: 88, Maroon: 90, 'Light Blue': 90, Brown: 75, Tan: 80, Cream: 88, Silver: 85, Gold: 82, Charcoal: 60 }
};

const COMBINATION_AFFINITY: Record<string, Record<string, number>> = {
  'T-Shirt': { Jeans: 95, Chino: 92, Trouser: 75, Shorts: 90, Skirts: 88 },
  'Polo Shirt': { Jeans: 88, Chino: 95, Trouser: 85, Shorts: 92, Skirts: 80 },
  'Casual Shirt': { Jeans: 94, Chino: 96, Trouser: 80, Shorts: 88, Skirts: 85 },
  'Formal Shirt': { Jeans: 70, Chino: 88, Trouser: 98, Shorts: 40, Skirts: 90 },
  Tops: { Jeans: 96, Chino: 90, Trouser: 92, Shorts: 85, Skirts: 94 },
  Shirts: { Jeans: 92, Chino: 94, Trouser: 95, Shorts: 78, Skirts: 90 },
  Kurtas: { Jeans: 88, Chino: 85, Trouser: 92, Shorts: 30, Skirts: 80 },
  Kurtis: { Jeans: 92, Chino: 80, Trouser: 88, Shorts: 30, Skirts: 85 },
  Hoodies: { Jeans: 95, Chino: 82, Trouser: 60, Shorts: 85, Skirts: 70 },
  Jackets: { Jeans: 96, Chino: 90, Trouser: 80, Shorts: 70, Skirts: 78 }
};

// Access the compiled JSON rules
const ALL_JSON_RULES = rulesData.color_match_rules || [];

// Sub-arrays by rule_type
const colorRules = ALL_JSON_RULES.filter(r => r.rule_type === 'color_match');
const comboRules = ALL_JSON_RULES.filter(r => r.rule_type === 'outfit_combination');
const occasionRules = ALL_JSON_RULES.filter(r => r.rule_type === 'occasion');
const weatherRules = ALL_JSON_RULES.filter(r => r.rule_type === 'weather');
const sweatRules = ALL_JSON_RULES.filter(r => r.rule_type === 'sweat');
const accessoryRules = ALL_JSON_RULES.filter(r => r.rule_type === 'accessory');
const bodyTypeRules = ALL_JSON_RULES.filter(r => r.rule_type === 'body_type');

export class FashionRuleEngine {
  
  public static evaluate(
    items: WardrobeItem[],
    profile: Profile,
    comfort: ComfortProfile,
    weather: WeatherCondition,
    occasion: string
  ): ScoreBreakdown {
    const feedback: string[] = [];
    const warnings: string[] = [];
    
    // Categorize item types
    const tops = items.filter(i => 
      ['Tops', 'T-Shirt', 'Polo Shirt', 'Casual Shirt', 'Formal Shirt', 'Kurtas', 'Kurtis', 'Hoodies', 'Jackets'].includes(i.category) ||
      ['Shirt', 'T-Shirt', 'Polo Shirt', 'Casual Shirt', 'Formal Shirt', 'Tops', 'Shirts', 'Kurtas', 'Kurtis', 'Hoodies', 'Jackets'].includes(i.subcategory)
    );
    const bottoms = items.filter(i => 
      ['Bottoms', 'Jeans', 'Chino', 'Trouser', 'Shorts', 'Skirts', 'Salwars'].includes(i.category) ||
      ['Jeans', 'Chino', 'Trouser', 'Shorts', 'Skirts', 'Salwars'].includes(i.subcategory)
    );
    const footwear = items.filter(i => 
      ['Footwear', 'Shoes', 'Sneakers', 'Sandals'].includes(i.category) ||
      ['Shoes', 'Sneakers', 'Sandals'].includes(i.subcategory)
    );
    const accessoriesList = items.filter(i => 
      ['Accessories', 'Watches', 'Belts', 'Sunglasses', 'Caps', 'Bags'].includes(i.category) ||
      ['Watches', 'Belts', 'Sunglasses', 'Caps', 'Bags', 'Watch', 'Belt', 'Accessory'].includes(i.subcategory)
    );

    // Initial scores (0-100)
    let matchScore = 80;
    let comfortScore = 80;
    let weatherScore = 80;
    let occasionScore = 80;

    // Check laundry and availability
    items.forEach(item => {
      if (item.status === 'Laundry') {
        warnings.push(`Warning: "${item.name}" is marked In Laundry.`);
      } else if (item.status === 'Unavailable') {
        warnings.push(`Warning: "${item.name}" is marked Unavailable.`);
      }
    });

    const activeTop = tops[0];
    const activeBottom = bottoms[0];
    const activeShoes = footwear[0];

    const genderStr = (profile.gender || 'Male').toLowerCase();
    const occasionStr = (occasion || 'Casual').toLowerCase();

    // --- 1. COLOR HARMONY & COMBINATION ENGINE (from json color_match_rules) ---
    let colorMatched = false;
    if (activeTop && activeBottom) {
      const topCol = activeTop.color.toLowerCase();
      const bottomCol = activeBottom.color.toLowerCase();
      const shoeCol = activeShoes ? activeShoes.color.toLowerCase() : '';

      // Find exact color match rule
      const rule = colorRules.find(r => 
        r.top_color?.toLowerCase() === topCol &&
        r.bottom_color?.toLowerCase() === bottomCol &&
        (!shoeCol || !r.shoe_color || r.shoe_color.toLowerCase() === shoeCol) &&
        (!r.gender || r.gender.toLowerCase() === genderStr)
      );

      if (rule) {
        matchScore = rule.score ?? rule.style_score ?? 85;
        if (rule.reason) {
          feedback.push(rule.reason);
        }
        colorMatched = true;
      } else {
        // Partial color match (top and bottom only)
        const partialRule = colorRules.find(r => 
          r.top_color?.toLowerCase() === topCol &&
          r.bottom_color?.toLowerCase() === bottomCol &&
          (!r.gender || r.gender.toLowerCase() === genderStr)
        );
        if (partialRule) {
          matchScore = partialRule.score ?? partialRule.style_score ?? 80;
          if (partialRule.reason) feedback.push(partialRule.reason);
          colorMatched = true;
        }
      }
    }

    if (!colorMatched && activeTop && activeBottom) {
      const topCol = activeTop.color;
      const bottomCol = activeBottom.color;
      const fallbackColorScore = COLOR_MATCH_MATRIX[topCol]?.[bottomCol] ?? 80;
      matchScore = fallbackColorScore;
      if (fallbackColorScore >= 95) {
        feedback.push(`Sophisticated color harmony: ${topCol} matches beautifully with ${bottomCol}.`);
      } else if (fallbackColorScore <= 70) {
        feedback.push(`Color clash: Pairing ${topCol} with ${bottomCol} is styling-degraded.`);
      }
    }

    // Outfit combination matrix combinations
    if (activeTop && activeBottom) {
      const topSub = activeTop.subcategory;
      const bottomSub = activeBottom.subcategory;

      // Check outfit combination rules
      const outfitRule = comboRules.find(r => 
        r.top_wear?.toLowerCase().includes(topSub.toLowerCase()) &&
        r.bottom_wear?.toLowerCase().includes(bottomSub.toLowerCase()) &&
        (!r.gender || r.gender.toLowerCase() === genderStr)
      );

      if (outfitRule) {
        const comboAffinity = outfitRule.match_score ?? outfitRule.style_score ?? 85;
        matchScore = Math.round((matchScore + comboAffinity) / 2);
        if (outfitRule.reason) feedback.push(outfitRule.reason);
      } else {
        const defaultAffinity = COMBINATION_AFFINITY[topSub]?.[bottomSub] ?? 80;
        matchScore = Math.round((matchScore + defaultAffinity) / 2);
        if (defaultAffinity >= 95) {
          feedback.push(`Premium silhouette: ${topSub} + ${bottomSub} is a proven fashion template.`);
        } else if (defaultAffinity <= 65) {
          feedback.push(`Style collision: ${topSub} and ${bottomSub} conflict in dress code formality.`);
        }
      }
    }

    // --- 2. OCCASION SUITABILITY ENGINE ---
    const matchedOccRule = occasionRules.find(r => r.occasion?.toLowerCase() === occasionStr);
    if (matchedOccRule) {
      let occasionScoreAccumulator = matchedOccRule.score || 80;
      let matchedCount = 0;

      const recommendedItems: string[] = matchedOccRule.recommended_items || [];
      const avoidItems: string[] = matchedOccRule.avoid_items || [];
      const recommendedColors: string[] = matchedOccRule.recommended_colors || [];

      items.forEach(item => {
        const subLower = item.subcategory.toLowerCase();
        const catLower = item.category.toLowerCase();
        const colorLower = item.color.toLowerCase();

        const isRecommended = recommendedItems.some(rec => 
          subLower.includes(rec.toLowerCase()) || 
          rec.toLowerCase().includes(subLower) ||
          catLower.includes(rec.toLowerCase())
        );
        const isAvoid = avoidItems.some(av => 
          subLower.includes(av.toLowerCase()) || 
          av.toLowerCase().includes(subLower) ||
          catLower.includes(av.toLowerCase())
        );
        const isColorRec = recommendedColors.some(col => col.toLowerCase() === colorLower);

        if (isRecommended) {
          occasionScoreAccumulator += 5;
          matchedCount++;
        }
        if (isAvoid) {
          occasionScoreAccumulator -= 15;
          warnings.push(`Occasion Alert: "${item.name}" (${item.subcategory}) is not recommended for a ${occasion}.`);
          matchedCount++;
        }
        if (isColorRec) {
          occasionScoreAccumulator += 3;
        }
      });

      if (matchedCount > 0 && matchedOccRule.reason) {
        feedback.push(matchedOccRule.reason);
      }
      occasionScore = Math.min(100, Math.max(0, occasionScoreAccumulator));
    } else {
      // Occasion suitability fallback
      occasionScore = 80;
    }

    // --- 3. WEATHER SUITABILITY ENGINE ---
    let weatherScoreAccumulator = 80;
    
    // Check dynamic weather rules based on current conditions
    const weatherState = weather.temperature >= 28 ? 'hot' : (weather.temperature <= 18 ? 'cold' : 'mild');
    const matchedWeatherRule = weatherRules.find(r => r.weather?.toLowerCase() === weatherState);

    if (matchedWeatherRule) {
      const recFabrics = (matchedWeatherRule.recommended_fabric || '').split(',').map(f => f.trim().toLowerCase());
      const avoidFabrics = (matchedWeatherRule.avoid_fabric || '').split(',').map(f => f.trim().toLowerCase());
      const recColors = matchedWeatherRule.recommended_colors || [];

      items.forEach(item => {
        const fabricLower = item.fabric.toLowerCase();
        const colorLower = item.color.toLowerCase();

        const isRecFabric = recFabrics.some(f => fabricLower.includes(f) || f.includes(fabricLower));
        const isAvoidFabric = avoidFabrics.some(f => fabricLower.includes(f) || f.includes(fabricLower));
        const isRecColor = recColors.some(c => c.toLowerCase() === colorLower);

        if (isRecFabric) {
          weatherScoreAccumulator += 5;
        }
        if (isAvoidFabric) {
          weatherScoreAccumulator -= 12;
          warnings.push(`Fabric Alert: ${item.fabric} fabrics should be avoided in ${weatherState} weather.`);
        }
        if (isRecColor) {
          weatherScoreAccumulator += 3;
        }

        // Specific subcategory checks for high/low temps
        if (weatherState === 'hot' && ['Hoodies', 'Jackets'].includes(item.subcategory)) {
          weatherScoreAccumulator -= 15;
          warnings.push(`Layering Alert: Wearing a ${item.subcategory} is uncomfortable in ${weather.temperature}°C heat.`);
        }
      });

      if (matchedWeatherRule.reason && items.length > 0) {
        feedback.push(matchedWeatherRule.reason);
      }
    }

    // Rain protection check
    if (weather.rain) {
      weatherScoreAccumulator -= 10;
      const sensitiveShoes = footwear.find(f => 
        ['suede', 'leather'].some(mat => f.fabric.toLowerCase().includes(mat)) || 
        f.subcategory.toLowerCase() === 'sandals'
      );
      if (sensitiveShoes) {
        weatherScoreAccumulator -= 15;
        warnings.push(`Rain warning: Protect your ${sensitiveShoes.fabric} shoes or sandals from getting ruined in the rain.`);
      } else {
        feedback.push(`Rain ready: Durable sneakers or boots selected.`);
      }
    }

    // Cold layering protection
    if (weather.temperature <= 18) {
      const hasLayer = items.some(item => ['Hoodies', 'Jackets'].includes(item.subcategory) || item.category === 'Outerwear');
      if (!hasLayer) {
        weatherScoreAccumulator -= 20;
        warnings.push(`Chills warning: You need an outerwear jacket or hoodie layer for ${weather.temperature}°C.`);
      } else {
        weatherScoreAccumulator += 10;
        feedback.push(`Layering active: Insulated outerwear keeps you comfortable.`);
      }
    }

    // Humidity checks
    if (weather.humidity >= 70) {
      const trapsSweat = items.find(item => ['polyester', 'synthetic', 'denim'].some(fab => item.fabric.toLowerCase().includes(fab)));
      if (trapsSweat) {
        weatherScoreAccumulator -= 8;
        warnings.push(`Humidity Warning: ${trapsSweat.fabric} fabric traps sweat in ${weather.humidity}% humidity.`);
      }
    }

    // UV checks
    if (weather.uv >= 6) {
      const hasSunProtection = accessoriesList.some(a => ['Sunglasses', 'Caps', 'Cap'].includes(a.subcategory));
      if (!hasSunProtection) {
        weatherScoreAccumulator -= 5;
        feedback.push(`UV Warning: UV index is high (${weather.uv}). Consider adding styled sunglasses or a cap.`);
      } else {
        weatherScoreAccumulator += 5;
        feedback.push(`UV shielding: Styled sunglasses/cap protect you from solar radiation.`);
      }
    }

    weatherScore = Math.min(100, Math.max(0, weatherScoreAccumulator));

    // --- 4. SWEAT & COMFORT ENGINE ---
    let comfortScoreAccumulator = 80;

    const sweatLevel = (comfort.sweat_level || 'Medium').toLowerCase();
    const matchedSweatRule = sweatRules.find(r => r.sweat_type?.toLowerCase() === `${sweatLevel} sweat`);

    if (matchedSweatRule) {
      const recColors = matchedSweatRule.recommended_colors || [];
      const avoidColors = matchedSweatRule.avoid_colors || [];
      const recFabric = matchedSweatRule.recommended_fabric || '';

      items.forEach(item => {
        const colLower = item.color.toLowerCase();
        const fabricLower = item.fabric.toLowerCase();

        const isAvoidColor = avoidColors.some(c => c.toLowerCase() === colLower);
        const isRecColor = recColors.some(c => c.toLowerCase() === colLower);
        const isRecFabric = recFabric.toLowerCase().includes(fabricLower) || fabricLower.includes(recFabric.toLowerCase());

        if (isAvoidColor && ['Shirt', 'T-Shirt', 'Polo Shirt', 'Tops'].includes(item.subcategory)) {
          comfortScoreAccumulator -= 20;
          warnings.push(`Sweat Risk: ${item.color} shows sweat stains clearly on your ${item.subcategory}.`);
        }
        if (isRecColor) {
          comfortScoreAccumulator += 4;
        }
        if (isRecFabric) {
          comfortScoreAccumulator += 4;
        }

        // Fit evaluation
        if (item.fit === 'Slim' && ['Shirt', 'T-Shirt', 'Polo Shirt'].includes(item.subcategory) && (sweatLevel === 'high' || comfort.underarm_sweat)) {
          comfortScoreAccumulator -= 10;
          warnings.push(`Comfort warning: Slim fitting tops restrict ventilation and increase sweat risk.`);
        }
      });

      if (matchedSweatRule.reason && items.length > 0) {
        feedback.push(matchedSweatRule.reason);
      }
    }

    comfortScore = Math.min(100, Math.max(0, comfortScoreAccumulator));

    // --- 5. ACCESSORY PAIRING ENGINE ---
    const activeBelt = accessoriesList.find(a => a.subcategory === 'Belts' || a.name.toLowerCase().includes('belt'));
    
    if (activeBelt && activeShoes) {
      const shoeCol = activeShoes.color.toLowerCase();
      const beltCol = activeBelt.color.toLowerCase();

      // Check accessory rules
      const beltShoesRule = accessoryRules.find(r => 
        r.recommended_accessory?.toLowerCase().includes('belt') &&
        (!r.gender || r.gender.toLowerCase() === genderStr)
      );

      if (['brown', 'tan'].includes(shoeCol) && ['brown', 'tan'].includes(beltCol)) {
        matchScore += 8;
        feedback.push(`Leather coordination: Harmonious brown/tan leather accessories.`);
      } else if (shoeCol === 'black' && beltCol === 'black') {
        matchScore += 6;
        feedback.push(`Dark coordination: Clean black belt and footwear.`);
      } else if (['brown', 'tan'].includes(shoeCol) && beltCol === 'black') {
        matchScore -= 12;
        warnings.push(`Accessory clash: Wearing a black belt with brown shoes disrupts styling symmetry.`);
      }

      if (beltShoesRule && beltShoesRule.reason) {
        feedback.push(beltShoesRule.reason);
      }
    }

    // --- 6. BODY TYPE ENGINE ---
    const matchedBodyRule = bodyTypeRules.find(r => 
      r.body_type?.toLowerCase() === profile.body_type?.toLowerCase() &&
      (!r.gender || r.gender.toLowerCase() === genderStr)
    );

    if (matchedBodyRule) {
      const recFit = matchedBodyRule.recommended_fit || '';
      const avoidFit = matchedBodyRule.avoid_fit || '';
      const recItems = matchedBodyRule.recommended_items || [];

      items.forEach(item => {
        const fitLower = item.fit.toLowerCase();
        const subLower = item.subcategory.toLowerCase();

        const isRecFit = recFit.toLowerCase().includes(fitLower);
        const isAvoidFit = avoidFit.toLowerCase().includes(fitLower);
        const isRecItem = recItems.some(ri => subLower.includes(ri.toLowerCase()));

        if (isRecFit || isRecItem) {
          comfortScore += 3;
        }
        if (isAvoidFit) {
          comfortScore -= 5;
          feedback.push(`Body tip: ${profile.body_type} body shapes should generally avoid ${fitLower} cuts.`);
        }
      });

      if (matchedBodyRule.reason && items.length > 0) {
        feedback.push(matchedBodyRule.reason);
      }
    }

    // Clamp all scores
    matchScore = Math.min(100, Math.max(0, Math.round(matchScore)));
    comfortScore = Math.min(100, Math.max(0, Math.round(comfortScore)));
    weatherScore = Math.min(100, Math.max(0, Math.round(weatherScore)));
    occasionScore = Math.min(100, Math.max(0, Math.round(occasionScore)));

    // Calculate Overall Score (Weighted combination)
    const overallScore = Math.round(
      matchScore * 0.35 +
      comfortScore * 0.25 +
      weatherScore * 0.20 +
      occasionScore * 0.20
    );

    return {
      matchScore,
      comfortScore,
      weatherScore,
      occasionScore,
      overallScore,
      feedback: Array.from(new Set(feedback)),
      warnings: Array.from(new Set(warnings))
    };
  }

  // Generates outfit suggestions for a selected shirt
  public static matchGarment(
    shirt: WardrobeItem,
    allWardrobe: WardrobeItem[],
    profile: Profile,
    comfort: ComfortProfile,
    weather: WeatherCondition,
    occasion: string
  ): Array<{
    bottom: WardrobeItem;
    shoes: WardrobeItem;
    watch?: WardrobeItem;
    belt?: WardrobeItem;
    score: ScoreBreakdown;
  }> {
    // Filter wardrobe items under the new clean category structures or subcategory matches
    const bottoms = allWardrobe.filter(w => 
      (w.category === 'Bottoms' || ['Jeans', 'Chino', 'Trouser', 'Shorts', 'Skirts'].includes(w.subcategory)) && 
      w.status === 'Available'
    );
    const footwear = allWardrobe.filter(w => 
      (w.category === 'Footwear' || ['Shoes', 'Sneakers', 'Sandals'].includes(w.subcategory)) && 
      w.status === 'Available'
    );
    const watches = allWardrobe.filter(w => 
      (w.subcategory === 'Watches' || w.subcategory === 'Watch') && 
      w.status === 'Available'
    );
    const belts = allWardrobe.filter(w => 
      w.subcategory === 'Belts' && 
      w.status === 'Available'
    );

    const combinations: Array<{
      bottom: WardrobeItem;
      shoes: WardrobeItem;
      watch?: WardrobeItem;
      belt?: WardrobeItem;
      score: ScoreBreakdown;
    }> = [];

    // Loop through combinations to find top matches
    for (const bottom of bottoms) {
      for (const shoes of footwear) {
        // Find best watch and belt
        const watch = watches[0]; // Take primary watch
        const belt = belts.find(b => b.color === shoes.color) || belts[0]; // Match belt color to shoes if possible

        const comboItems = [shirt, bottom, shoes];
        if (watch) comboItems.push(watch);
        if (belt) comboItems.push(belt);

        const score = this.evaluate(comboItems, profile, comfort, weather, occasion);
        combinations.push({ bottom, shoes, watch, belt, score });
      }
    }

    // Sort by overall score descending, take top 3
    return combinations
      .sort((a, b) => b.score.overallScore - a.score.overallScore)
      .slice(0, 3);
  }
}
