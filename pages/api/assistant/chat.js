import db from '../../../lib/db';
import { GardoAssistant } from '../../../lib/aiAssistant';
import rulesData from '../../../public/fashion_rules.json';

export default async function handler(req, res) {
  // --- GET Request: Retrieve Chat History ---
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    try {
      const history = await db.getChatHistory(Number(userId));
      return res.status(200).json(history);
    } catch (e) {
      console.error('Error fetching chat history', e);
      return res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  }

  // --- POST Request: Send Message ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, userId } = req.body;
  if (!message || !userId) {
    return res.status(400).json({ error: 'Missing message or userId' });
  }

  try {
    // 1. Save user's message in the database permanently
    await db.saveChatMessage(Number(userId), 'user', message);

    // 2. Fetch User Context from DB
    const [wardrobe, profile, comfort] = await Promise.all([
      db.getAvailableWardrobe(Number(userId)),
      db.getProfileByUserId(Number(userId)),
      db.getComfortProfile(Number(userId))
    ]);

    const city = profile ? profile.city : 'Bangalore';

    // 3. Fetch Current Weather
    let currentTemp = 25;
    let currentCondition = 'Clear';
    let humidity = 60;
    const apiKey = process.env.OPENWEATHER_API_KEY || '617c33d1f93bf517b82f1627acddb963';

    try {
      const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`);
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        currentTemp = wData.main.temp;
        humidity = wData.main.humidity;
        currentCondition = wData.weather[0]?.main || 'Clear';
      } else {
        // Fallback to wttr.in
        const wttrRes = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        if (wttrRes.ok) {
          const wttrData = await wttrRes.json();
          currentTemp = parseFloat(wttrData.current_condition[0]?.temp_C || '25');
          humidity = parseFloat(wttrData.current_condition[0]?.humidity || '60');
          currentCondition = wttrData.current_condition[0]?.weatherDesc[0]?.value || 'Clear';
        }
      }
    } catch (err) {
      console.error('Weather fetch error in assistant chat API', err);
    }

    const weatherContext = {
      city,
      temperature: currentTemp,
      condition: currentCondition,
      humidity
    };

    // 4. Local guardrail check first (Fast deflection)
    const localResponse = GardoAssistant.processQuery(message, profile?.gender);
    const isLocalDeflection = localResponse.includes('programmed exclusively') || localResponse.includes('styling assistant');

    if (isLocalDeflection) {
      const deflectText = 'GARDO focuses only on fashion, styling and wardrobe assistance.';
      const savedChat = await db.saveChatMessage(Number(userId), 'gardo', deflectText);
      return res.status(200).json(savedChat);
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    // 5. Call Google Gemini 1.5 Flash if API Key is set
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

        // Select rules relevant to user's wardrobe colors to optimize prompt size
        const userColors = new Set(wardrobe.map(w => w.color.toLowerCase()));
        const relevantColorRules = (rulesData.color_match_rules || [])
          .filter(r => r.rule_type === 'color_match' && (userColors.has(r.top_color?.toLowerCase()) || userColors.has(r.bottom_color?.toLowerCase())))
          .slice(0, 30);
        const relevantBodyRules = (rulesData.color_match_rules || [])
          .filter(r => r.rule_type === 'body_type' && r.body_type?.toLowerCase() === (profile?.body_type || '').toLowerCase());
        const relevantOccRules = (rulesData.color_match_rules || [])
          .filter(r => r.rule_type === 'occasion')
          .slice(0, 10);

        const rulesContext = JSON.stringify({
          color_matching_samples: relevantColorRules,
          body_type_rules: relevantBodyRules,
          occasion_rules: relevantOccRules
        }, null, 2);

        const wardrobeInfo = wardrobe.length > 0
          ? wardrobe.map(w => `- [ID: ${w.id}] ${w.name} (${w.category} - ${w.subcategory}), Color: ${w.color}, Fabric: ${w.fabric}, Fit: ${w.fit}, Occasion: ${w.occasion || 'N/A'}, Season: ${w.season || 'N/A'}`).join('\n')
          : 'None (Wardrobe is empty)';

        const profileInfo = profile
          ? `Gender: ${profile.gender}, Age: ${profile.age}, Body Type: ${profile.body_type}, Skin Tone: ${profile.skin_tone}, Country: ${profile.country}, City: ${profile.city}`
          : 'No profile configured';

        const comfortInfo = comfort
          ? `Sweat Level: ${comfort.sweat_level}, Sensitive Skin: ${comfort.sensitive_skin ? 'Yes' : 'No'}, Heat Sensitive: ${comfort.heat_sensitive ? 'Yes' : 'No'}, Cold Sensitive: ${comfort.cold_sensitive ? 'Yes' : 'No'}`
          : 'No comfort profile configured';

        const weatherInfo = `City: ${city}, Temperature: ${currentTemp}°C, Humidity: ${humidity}%, Condition: ${currentCondition}`;

        const systemPrompt = `You are GARDO, a personal fashion intelligence styling assistant. You help users style what they already own.

USER CONTEXT:
1. Wardrobe items:
${wardrobeInfo}

2. Profile Details:
${profileInfo}

3. Comfort Settings:
${comfortInfo}

4. Current Weather:
${weatherInfo}

STYLING INTELLIGENCE RULES (parsed from fashion_rules.json):
${rulesContext}

CRITICAL DIRECTIVES:
1. Do not generate generic fashion advice.
2. Always analyze the user's uploaded garments (Wardrobe items) first.
3. Never suggest random outfits. Priority order for compiling recommendations:
   - 1. User wardrobe items (Recommend combinations using owned garments listed above)
   - 2. fashion_rules.json knowledge (Follow matching templates, fits, and color guides)
   - 3. Weather conditions (Adapt colors, fabrics, and layering to temperature, rain, and humidity)
   - 4. User body type (Select fits flattering to their shape)
   - 5. Occasion (Verify dress code appropriateness)
4. For any styling/outfit recommendation, you MUST explicitly explain:
   - Why the selected colors match (harmony, contrast, accessory coordination)
   - Why the fabrics match (breathability, weight, texture)
   - Why the weather suits the outfit (thermal comfort, precipitation shielding)
5. Return a coordination confidence score (e.g., "Confidence Score: 95/100") at the end of every recommendation.
6. You are ONLY allowed to discuss Fashion, Clothing, Outfits, Dress Codes, Accessories, Color Matching, Weather Dressing, Fabrics, and closet management.
7. You are STRICTLY forbidden from answering questions about coding, programming, tech support, politics, government, current news, history, science, math, or general knowledge.
8. If the user asks you about coding, programming, writing code, politics, or general knowledge (e.g. 'Teach me Java', 'Explain photosynthesis', 'Who is the president of US'), you MUST reply with exactly: 'GARDO focuses only on fashion, styling and wardrobe assistance.' and absolutely nothing else.
9. Maintain a luxury, professional, fashion-forward tone. Speak naturally and assist the user.
10. Weather styling recommendations must use wardrobe items only. You must NEVER suggest or recommend garments that the user does not own for weather-based styling requests. All recommended outfit pieces must exist in the user's wardrobe list provided above.
11. For any styling query (e.g. 'What should I wear today?', 'What matches my black jeans?', 'Best outfit for office?'), you MUST search and prioritize matching items from the user's wardrobe list. Only recommend combinations consisting of garments the user actually owns. If they do not own a queried item, prompt them to upload it.`;

        const payload = {
          systemInstruction: {
            parts: [
              {
                text: systemPrompt
              }
            ]
          },
          contents: [
            {
              parts: [
                {
                  text: message
                }
              ]
            }
          ]
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (response.ok && responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
          let text = responseData.candidates[0].content.parts[0].text.trim();
          
          // Final guardrail check on response content
          const lowerText = text.toLowerCase();
          if (lowerText.includes('java') || lowerText.includes('python') || lowerText.includes('coding') || lowerText.includes('javascript') || lowerText.includes('html')) {
            text = 'GARDO focuses only on fashion, styling and wardrobe assistance.';
          }

          const savedChat = await db.saveChatMessage(Number(userId), 'gardo', text);
          return res.status(200).json(savedChat);
        }
      } catch (e) {
        console.error('Gemini Assistant API Connection error', e);
      }
    }

    // 6. Failover client response (Use rich local rule-based stylist engine with user wardrobe + weather details)
    const failoverText = GardoAssistant.processQueryLocal(message, wardrobe, profile, comfort, weatherContext);
    const savedChat = await db.saveChatMessage(Number(userId), 'gardo', failoverText);
    return res.status(200).json(savedChat);
  } catch (e) {
    console.error('Error handling chat message', e);
    return res.status(500).json({ error: 'Failed to process chat message' });
  }
}
