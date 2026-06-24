// GARDO Fashion Assistant Logic
// Implements strict guardrails: allowed to discuss only fashion, fabrics, dress codes, and wardrobe styling.
// Rejects code, politics, news, and general knowledge queries.

import { WardrobeItem, Profile, ComfortProfile } from './db';
import { FashionRuleEngine } from './ruleEngine';

export interface ChatMessage {
  sender: 'user' | 'gardo';
  text: string;
  timestamp: string;
}

const FORBIDDEN_KEYWORDS = [
  // Coding / Tech
  'code', 'javascript', 'python', 'html', 'css', 'react', 'function', 'class', 'database', 'sql', 'compile', 'programming', 'bug', 'developer',
  // Politics
  'election', 'president', 'government', 'politics', 'senate', 'parliament', 'minister', 'democracy', 'biden', 'trump', 'modi', 'pm', 'governor',
  // General Knowledge / News
  'news', 'stock market', 'finance', 'weather forecast for tomorrow', 'distance to', 'who is', 'biography', 'capital of', 'math', 'calculator', 'formula',
  'history of', 'science', 'chemistry', 'biology', 'physics'
];

const FASHION_KEYWORDS = [
  'wear', 'style', 'dress', 'match', 'color', 'shirt', 'trouser', 'pant', 'shoe', 'sneaker', 'belt', 'watch', 'fabric', 'linen', 'cotton', 'wool', 'silk',
  'occasion', 'wedding', 'party', 'interview', 'date', 'temple', 'college', 'formal', 'casual', 'outfit', 'wardrobe', 'jeans', 'chinos', 'accessory', 'suit'
];

export class GardoAssistant {
  
  public static processQuery(query: string, userGender: string = 'Male'): string {
    const normalized = query.toLowerCase().trim();

    // 1. Guardrail Check: Block forbidden topics
    const triggersForbidden = FORBIDDEN_KEYWORDS.some(keyword => normalized.includes(keyword));
    if (triggersForbidden) {
      return `As your GARDO styling assistant, I am programmed exclusively to discuss wardrobe curation, color combinations, fabrics, and styling logic. I cannot answer queries regarding coding, politics, general knowledge, or news. Let's focus on elevating your personal style!`;
    }

    // 2. Guardrail Check: Must have a fashion intent or not be too general
    const hasFashionIntent = FASHION_KEYWORDS.some(keyword => normalized.includes(keyword));
    
    // Default deflection if it doesn't sound like fashion
    if (!hasFashionIntent && normalized.length > 0) {
      // If it looks like a simple greeting
      if (['hi', 'hello', 'hey', 'gardo', 'greetings'].some(g => normalized === g || normalized.startsWith(g + ' '))) {
        return `Hello! I am your GARDO Fashion Intelligence Assistant. I am here to help you style the clothes you already own. Ask me something like "How should I match a navy shirt?" or "What fabric is best for a hot wedding?"`;
      }
      return `I am here to help you get the most out of your current wardrobe. Could you rephrase your question to focus on styling, outfit pairing, dress codes, or fabric choice?`;
    }

    // 3. Intelligent Fashion Responses
    if (normalized.includes('navy') || normalized.includes('blue shirt')) {
      return `Navy is one of the most versatile colors in a premium wardrobe. 
- For a **Business Casual** or **Office** setting, pair a navy shirt with beige chinos and rich tan leather shoes. Ensure your leather belt is also tan to coordinate.
  - **Why Colors Match**: Navy blue and beige create a high-contrast corporate-casual balance, and matching the tan shoes with the belt locks the leathers.
  - **Why Fabrics Match**: Cotton-twill chinos provide a clean structured drape that matches the breathable weave of a premium cotton/linen shirt.
  - **Why Weather Suits**: Cotton and linen provide ideal thermal regulation for mild weather conditions.
  - **Confidence Score**: 98/100
- For a **Casual Outing**, pair it with dark indigo selvedge jeans and clean white leather sneakers for a luxury minimalist appearance. 
  - **Why Colors Match**: Navy and dark indigo are analogous, creating a uniform clean base that is highlighted by contrast of white sneakers.
  - **Why Fabrics Match**: Structured raw denim complements the casual look of a cotton top.
  - **Why Weather Suits**: Double-layer cotton is ideal for mild outdoor walks.
  - **Confidence Score**: 94/100`;
    }

    if (normalized.includes('interview') || normalized.includes('business meeting')) {
      return `An interview outfit should project high competence and confidence:
- **For Men**: A well-pressed White or Light Blue Formal Shirt paired with Dark Grey/Charcoal Trousers. Finish with black oxford shoes, a black leather belt, and a classic metal-strap watch.
  - **Why Colors Match**: Monochromatic shades of grey/charcoal with blue/white shirts express conservative authority.
  - **Why Fabrics Match**: Tailored wool/polyester blend trousers pair cleanly with structured poplin.
  - **Why Weather Suits**: Standard indoor office conditions.
  - **Confidence Score**: 97/100
- **For Women**: A sleek button-up shirt with dark trousers or a structured midi skirt, paired with closed-toe pumps and minimal silver accessories.
  - **Why Colors Match**: Classic dark-light contrasting coordinates.
  - **Why Fabrics Match**: Structured draping fabric projects professional posture.
  - **Why Weather Suits**: Indoor weather control compatibility.
  - **Confidence Score**: 96/100`;
    }

    if (normalized.includes('wedding')) {
      if (userGender.toLowerCase() === 'female') {
        return `For a wedding, look for traditional elegance or luxury draping:
- A premium silk Saree in jewel tones (emerald, deep red, royal blue) paired with gold sandals and a metallic clutch.
  - **Why Colors Match**: Gold accessories reflect off jewel silk tones, heightening ethnic richness.
  - **Why Fabrics Match**: Silk drapes elegantly and supports structural styling.
  - **Why Weather Suits**: Heavy silk holds structure well in conditioned spaces.
  - **Confidence Score**: 98/100`;
      } else {
        return `For a wedding, we want to balance tradition and modern sophistication:
- A rich Silk Kurta in mustard, maroon, or cream, paired with cream trousers and leather sandals or juttis.
  - **Why Colors Match**: Cream trousers provide a neutral base to highlight deep jewel kurta colors.
  - **Why Fabrics Match**: Pure silk or khadi textures offer heritage styling.
  - **Why Weather Suits**: Breathable weave suited for long functions.
  - **Confidence Score**: 95/100`;
      }
    }

    if (normalized.includes('sweat') || normalized.includes('hot') || normalized.includes('summer')) {
      return `To stay comfortable under high sweat or hot conditions:
- **Fabrics**: Maximize **Linen** and **Oxford Cotton**. These fabrics have open weaves that allow maximum airflow. Avoid polyester or heavy denim.
- **Colors**: Stick to White, Beige, Light Sand, or very dark colors (Black, Navy) which hide sweat marks. **Crucial WARNING**: Avoid Light Grey, Light Blue, or Pink tops—they change color drastically when wet, making sweat marks immediately visible.
- **Why Colors Match**: Light tones reflect heat, while dark colors block sweat contouring.
- **Why Fabrics Match**: Lightweight linens pair with thin twills.
- **Why Weather Suits**: Keeps body temperature 2-3 degrees cooler than synthetics.
- **Confidence Score**: 92/100`;
    }

    if (normalized.includes('laundry')) {
      return `In GARDO, you can toggle **Laundry Mode** on any wardrobe item. When you mark an item as "In Laundry", our Fashion Rule Engine immediately excludes it from your daily dashboard recommendations. This ensures you never get excited about wearing a shirt that is currently in the wash!`;
    }

    if (normalized.includes('rotation') || normalized.includes('repeat')) {
      return `GARDO's Outfit Rotation logic tracks your history. If you wore a 'White Shirt + Black Jeans' combo earlier this week, GARDO will automatically deprioritize that pairing and suggest 'White Shirt + Beige Chinos' instead. This keeps your look fresh and extends the lifespan of your garments.`;
    }

    if (normalized.includes('accessory') || normalized.includes('belt') || (normalized.includes('shoe') && normalized.includes('watch'))) {
      return `Accessory pairing rules are simple but separate the amateurs from the professionals:
1. **Match Your Leathers**: If you wear brown shoes, you *must* wear a brown belt. The tones don't have to be identical, but black and brown leathers should never mix.
2. **Match Your Metals**: Match your watch buckle or steel strap to your belt buckle. Gold buckles pair with gold watches; silver with silver.
3. **Why Colors Match**: Aligning accents avoids visual clutter.
4. **Why Fabrics Match**: Leather coordinates with leather, steel with metal buckle tabs.
5. **Why Weather Suits**: Heavy accessories are avoided in humid weather.
- **Confidence Score**: 95/100`;
    }

    // Generic helpful response
    return `Excellent styling question. When building outfits, always start with a high-quality neutral base (like a White Linen shirt or Navy Chinos), layer appropriately for the temperature, coordinate your leathers (belt and shoes), and check your Comfort Profile. What specific garments from your wardrobe are you styling today?`;
  }

  public static processQueryLocal(
    query: string,
    wardrobe: WardrobeItem[],
    profile: Profile | undefined,
    comfort: ComfortProfile | undefined,
    weather: any
  ): string {
    const normalized = query.toLowerCase().trim();

    // 1. Guardrail Check: Block forbidden topics
    const triggersForbidden = FORBIDDEN_KEYWORDS.some(keyword => normalized.includes(keyword));
    if (triggersForbidden) {
      return `As your GARDO styling assistant, I am programmed exclusively to discuss wardrobe curation, color combinations, fabrics, and styling logic. I cannot answer queries regarding coding, politics, general knowledge, or news. Let's focus on elevating your personal style!`;
    }

    // 2. Guardrail Check: Must have a fashion intent or wardrobe/weather relevance
    const hasFashionIntent = FASHION_KEYWORDS.some(keyword => normalized.includes(keyword)) ||
                             normalized.includes('weather') || normalized.includes('laundry') || 
                             normalized.includes('how many') || normalized.includes('own') ||
                             normalized.includes('outfit') || normalized.includes('wear') ||
                             normalized.includes('match') || normalized.includes('suggest');

    if (!hasFashionIntent && normalized.length > 0) {
      if (['hi', 'hello', 'hey', 'gardo', 'greetings'].some(g => normalized === g || normalized.startsWith(g + ' '))) {
        return `Hello! I am your GARDO Fashion Intelligence Assistant. I am here to help you style the clothes you already own. Ask me something like "How should I match a navy shirt?" or "What fabric is best for a hot wedding?"`;
      }
      return `I am here to help you get the most out of your current wardrobe. Could you rephrase your question to focus on styling, outfit pairing, dress codes, or fabric choice?`;
    }

    // 3. Dynamic Wardrobe Garment Analysis Priority
    if (normalized.includes('match') || normalized.includes('style') || normalized.includes('wear') || normalized.includes('outfit') || normalized.includes('suggest')) {
      if (wardrobe.length === 0) {
        return `Your digital wardrobe is currently empty. Go to "My Wardrobe" to upload your first garment so I can analyze it and generate tailored styling suggestions!`;
      }

      // Identify specific color and category keywords from query
      const colors = ['black', 'white', 'grey', 'gray', 'navy', 'blue', 'brown', 'tan', 'beige', 'khaki', 'green', 'red', 'yellow', 'pink', 'orange', 'purple', 'cream', 'mustard', 'maroon', 'gold', 'silver', 'emerald'];
      const categories = ['jeans', 'shirt', 't-shirt', 'chinos', 'trousers', 'pants', 'jacket', 'hoodie', 'shoes', 'sneakers', 'belt', 'watch', 'suit', 'kurta', 'saree', 'top', 'bottom', 'outerwear', 'accessory'];

      let queryColor = '';
      let queryCategory = '';

      for (const c of colors) {
        if (normalized.includes(c)) {
          queryColor = c;
          break;
        }
      }
      for (const cat of categories) {
        if (normalized.includes(cat)) {
          queryCategory = cat;
          break;
        }
      }

      if (queryColor || queryCategory) {
        const found = wardrobe.some(w => {
          const itemColor = w.color.toLowerCase();
          const itemName = w.name.toLowerCase();
          const itemSub = w.subcategory.toLowerCase();
          const itemCat = w.category.toLowerCase();

          const colorMatches = !queryColor || itemColor.includes(queryColor) || itemName.includes(queryColor);
          const catMatches = !queryCategory || itemSub.includes(queryCategory) || itemName.includes(queryCategory) || itemCat.includes(queryCategory) || (queryCategory === 'pants' && itemSub.includes('trousers'));
          
          return colorMatches && catMatches;
        });

        if (!found) {
          const displayColor = queryColor || 'matching';
          const displayCategory = queryCategory || 'items';
          const phrase = queryColor && queryCategory ? `${queryColor} ${queryCategory}` : `${displayColor} ${displayCategory}`;
          return `I searched your digital wardrobe but couldn't find any items matching '${phrase}'. Please upload your '${phrase}' to My Wardrobe so I can suggest matching pieces you already own!`;
        }
      }

      // Check if user is asking about a specific item in their closet (by color/subcategory match)
      const matchingItem = wardrobe.find(w => 
        normalized.includes(w.color.toLowerCase()) || 
        normalized.includes(w.subcategory.toLowerCase()) ||
        normalized.includes(w.name.toLowerCase())
      );

      const activeItem = matchingItem || wardrobe[0];
      
      const tops = wardrobe.filter(w => w.category === 'Tops');
      const bottoms = wardrobe.filter(w => w.category === 'Bottoms');
      const footwear = wardrobe.filter(w => w.category === 'Footwear');

      let topItem = activeItem.category === 'Tops' ? activeItem : tops[0];
      let bottomItem = activeItem.category === 'Bottoms' ? activeItem : bottoms[0];
      let shoesItem = activeItem.category === 'Footwear' ? activeItem : footwear[0];

      if (!topItem || !bottomItem) {
        return `I analyzed your "${activeItem.name}" (${activeItem.color} ${activeItem.subcategory}) from your wardrobe:
- **Why Colors Match**: Recommending pairing it with a contrasting neutral color like White, Navy, or Beige.
- **Why Fabrics Match**: Balance textured fabrics like linen or denim with smooth cotton weaves.
- **Why Weather Suits**: Lightweight cotton/linen is suited for warm weather; layer with outerwear if cool.
- **Confidence Score**: 80/100 (Upload at least one Top and one Bottom to receive custom matched styling recommendations).`;
      }

      const itemsToEvaluate = [topItem, bottomItem];
      if (shoesItem) itemsToEvaluate.push(shoesItem);

      // Evaluate Outfit compatibility dynamically using engine rules
      const scoreBreakdown = FashionRuleEngine.evaluate(
        itemsToEvaluate,
        profile || { gender: 'Male', body_type: 'Average', age: 25, height: 175, country: 'India', city: 'Bangalore' } as any,
        comfort || { sweat_level: 'Medium' } as any,
        {
          temperature: weather?.temperature || 25,
          humidity: weather?.humidity || 60,
          rain: weather?.rain || false,
          uv: weather?.uv || 3
        },
        'Casual'
      );

      let responseText = `Here is a custom outfit recommended directly from your wardrobe garments:
- **Top**: ${topItem.name} (${topItem.color} ${topItem.fabric} - ${topItem.fit})
- **Bottom**: ${bottomItem.name} (${bottomItem.color} ${bottomItem.fabric} - ${bottomItem.fit})`;
      if (shoesItem) responseText += `\n- **Footwear**: ${shoesItem.name} (${shoesItem.color} ${shoesItem.fabric})`;
      
      responseText += `\n\n**Styling Explanations**:
- **Why Colors Match**: ${topItem.color} and ${bottomItem.color} match with a rule-derived color harmony score of ${scoreBreakdown.matchScore}/100. ${scoreBreakdown.feedback.find(f => f.toLowerCase().includes('color')) || 'This forms a clean, premium visual aesthetic.'}
- **Why Fabrics Match**: ${topItem.fabric} and ${bottomItem.fabric} textures pair together naturally. ${comfort?.sweat_level === 'High' ? 'Airflow optimized for your high sweat comfort settings.' : 'Drapes cleanly for all-day comfort.'}
- **Why Weather Suits**: ${scoreBreakdown.feedback.find(f => f.toLowerCase().includes('weather') || f.toLowerCase().includes('layering') || f.toLowerCase().includes('breathable')) || `Selected pieces are suited for current weather conditions (${weather?.temperature || 25}°C).`}`;

      if (scoreBreakdown.warnings.length > 0) {
        responseText += `\n- **Warnings**: ${scoreBreakdown.warnings.join(', ')}`;
      }

      responseText += `\n\n**Confidence Score**: ${scoreBreakdown.overallScore}/100`;
      return responseText;
    }

    // Handle "how many" or wardrobe inventory queries
    if (normalized.includes('how many') || normalized.includes('what do i have') || normalized.includes('show my wardrobe') || normalized.includes('garment count') || normalized.includes('what i own')) {
      if (wardrobe.length === 0) {
        return `Your digital wardrobe is currently empty. Go to "My Wardrobe" to upload your first garment so I can start styling for you!`;
      }
      const categoryCounts: Record<string, number> = {};
      wardrobe.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      });
      const countsStr = Object.entries(categoryCounts).map(([cat, count]) => `${cat}: ${count}`).join(', ');
      return `You have a total of ${wardrobe.length} garment(s) in your wardrobe. Here is the breakdown: ${countsStr || 'None'}. I can help you mix and match them for any occasion!`;
    }

    // Handle weather specific advice
    if (normalized.includes('weather') || normalized.includes('temperature') || normalized.includes('today')) {
      if (!weather) {
        return `I can't fetch current weather right now. Please configure your location on the Dashboard to load real-time weather and view wardrobe-matching suggestions.`;
      }
      const temp = weather.temperature || 25;
      const cond = weather.condition || 'Clear';
      let advice = `The current weather in ${weather.city || 'your city'} is ${temp}°C and ${cond}. `;
      
      const tops = wardrobe.filter(w => w.category === 'Tops');
      const bottoms = wardrobe.filter(w => w.category === 'Bottoms');
      const outerwear = wardrobe.filter(w => w.category === 'Outerwear');
      
      if (tops.length === 0 || bottoms.length === 0) {
        return `${advice}To get specific weather-adapted recommendations, please add at least one Top and one Bottom to your wardrobe.`;
      }

      if (temp >= 28) {
        advice += `Since it's hot, I recommend lightweight, breathable fabrics. `;
        const hotTops = tops.filter(t => ['linen', 'cotton'].some(fab => t.fabric.toLowerCase().includes(fab)));
        const hotBottoms = bottoms.filter(b => ['linen', 'cotton', 'chambray'].some(fab => b.fabric.toLowerCase().includes(fab)));
        if (hotTops.length > 0 && hotBottoms.length > 0) {
          advice += `From your wardrobe, you can pair your "${hotTops[0].name}" with your "${hotBottoms[0].name}" for optimal heat styling.`;
        } else {
          advice += `From your wardrobe, you can wear your "${tops[0].name}" with your "${bottoms[0].name}".`;
        }
      } else if (temp <= 18) {
        advice += `Since it's cool, I recommend layering up. `;
        const jacket = outerwear[0] || tops.find(t => ['jacket', 'hoodie', 'outerwear'].some(sub => t.subcategory.toLowerCase().includes(sub)));
        const suitableTops = tops.filter(t => t.id !== jacket?.id);
        const innerTop = suitableTops[0] || tops[0];
        if (jacket) {
          advice += `From your wardrobe, I recommend layering your "${jacket.name}" over your "${innerTop.name}", paired with your "${bottoms[0].name}".`;
        } else {
          advice += `From your wardrobe, you can pair your "${innerTop.name}" with your "${bottoms[0].name}".`;
        }
      } else {
        advice += `The weather is mild and comfortable! From your wardrobe, I recommend pairing your "${tops[0].name}" with your "${bottoms[0].name}".`;
      }
      return advice;
    }

    // Default to the main query processor
    return this.processQuery(query, profile?.gender);
  }
}
