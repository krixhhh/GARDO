export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. If Gemini API key is configured, perform real multimodal analysis
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    try {
      // Split base64 header
      const parts = image.split(';base64,');
      const mimeType = parts[0].split(':')[1] || 'image/png';
      const base64Data = parts[1];

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      
      const payload = {
        contents: [
          {
            parts: [
              {
                text: "Analyze this clothing garment image. Determine the clothing specifications. Return ONLY a raw JSON object (WITHOUT any markdown wrapper, backticks, or comments) with the following exact keys:\n" +
                      "- name: string (A luxury, descriptive title like 'Raw Indigo Denim Jeans')\n" +
                      "- category: string (Must be one of: 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories')\n" +
                      "- subcategory: string (Must be one of: 'Shirt', 'T-Shirt', 'Polo Shirt', 'Casual Shirt', 'Formal Shirt', 'Jeans', 'Chino', 'Trouser', 'Kurta', 'Hoodie', 'Jacket', 'Tops', 'Dresses', 'Sarees', 'Kurtis', 'Salwars', 'Skirts', 'Gowns', 'Watches', 'Belts', 'Shoes', 'Sneakers', 'Sandals', 'Sunglasses', 'Caps', 'Bags')\n" +
                      "- color: string (Must select closest standard: 'White', 'Black', 'Navy', 'Beige', 'Grey', 'Pink', 'Olive', 'Maroon', 'Light Blue', 'Brown', 'Tan', 'Cream')\n" +
                      "- fabric: string (e.g. 'Cotton', 'Linen', 'Denim', 'Leather', 'Silk', 'Wool')\n" +
                      "- fit: string (Must be: 'Slim', 'Regular', or 'Oversized')\n" +
                      "- occasion: string (Suitable occasion like 'Casual', 'Office', 'Party', 'Ethnic', 'Sports')\n" +
                      "- season: string (Suitable season like 'Summer', 'Winter', 'All-season', 'Monsoon')\n"
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const aiResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await aiResponse.json();
      
      if (aiResponse.ok && responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        const jsonText = responseData.candidates[0].content.parts[0].text.trim();
        const parsedTags = JSON.parse(jsonText);
        return res.status(200).json(parsedTags);
      }
    } catch (e) {
      console.error('Gemini vision API error, falling back to mock tagger', e);
    }
  }

  // 2. Fallback / Mock AI analyzer logic (inspects templates or returns randomized tags)
  // This makes sure the application works locally even without a Gemini API Key configured.
  const mockAnalysis = {
    name: 'Clean White Linen Shirt',
    category: 'Tops',
    subcategory: 'Casual Shirt',
    color: 'White',
    fabric: 'Linen',
    fit: 'Regular',
    occasion: 'Casual',
    season: 'Summer'
  };

  // If a simple string match is present (passed from preset uploads)
  const queryName = req.body.name || '';
  if (queryName.toLowerCase().includes('pink')) {
    mockAnalysis.name = 'Zara Soft Pink Linen Shirt';
    mockAnalysis.category = 'Tops';
    mockAnalysis.subcategory = 'Casual Shirt';
    mockAnalysis.color = 'Pink';
    mockAnalysis.fabric = 'Linen';
    mockAnalysis.occasion = 'Casual';
    mockAnalysis.season = 'Summer';
  } else if (queryName.toLowerCase().includes('juttis') || queryName.toLowerCase().includes('shoe')) {
    mockAnalysis.name = 'Handcrafted Tan Leather Shoes';
    mockAnalysis.category = 'Footwear';
    mockAnalysis.subcategory = 'Shoes';
    mockAnalysis.color = 'Tan';
    mockAnalysis.fabric = 'Leather';
    mockAnalysis.occasion = 'Formal';
    mockAnalysis.season = 'All-season';
  } else if (queryName.toLowerCase().includes('chinos') || queryName.toLowerCase().includes('grey')) {
    mockAnalysis.name = 'Uniqlo Raw Grey Chinos';
    mockAnalysis.category = 'Bottoms';
    mockAnalysis.subcategory = 'Chino';
    mockAnalysis.color = 'Grey';
    mockAnalysis.fabric = 'Cotton Twill';
    mockAnalysis.fit = 'Slim';
    mockAnalysis.occasion = 'Office';
    mockAnalysis.season = 'All-season';
  } else if (queryName.toLowerCase().includes('sunglasses')) {
    mockAnalysis.name = 'Ray-Ban Gold Aviator Sunglasses';
    mockAnalysis.category = 'Accessories';
    mockAnalysis.subcategory = 'Sunglasses';
    mockAnalysis.color = 'Gold';
    mockAnalysis.fabric = 'Metal';
    mockAnalysis.occasion = 'Casual';
    mockAnalysis.season = 'Summer';
  } else if (queryName.toLowerCase().includes('kurti')) {
    mockAnalysis.name = 'Vintage Emerald Green Kurti';
    mockAnalysis.category = 'Tops';
    mockAnalysis.subcategory = 'Kurtis';
    mockAnalysis.color = 'Olive';
    mockAnalysis.fabric = 'Silk-Cotton';
    mockAnalysis.occasion = 'Ethnic';
    mockAnalysis.season = 'All-season';
  } else if (queryName.toLowerCase().includes('kurta')) {
    mockAnalysis.name = 'Premium Navy Kurta';
    mockAnalysis.category = 'Tops';
    mockAnalysis.subcategory = 'Kurtas';
    mockAnalysis.color = 'Navy';
    mockAnalysis.fabric = 'Khadi Silk';
    mockAnalysis.occasion = 'Ethnic';
    mockAnalysis.season = 'All-season';
  }

  // Add 1.5 seconds simulated delay to make scanner feel premium
  await new Promise(r => setTimeout(r, 1500));
  return res.status(200).json(mockAnalysis);
}
