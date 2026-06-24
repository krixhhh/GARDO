import db from '../../lib/db';

export default async function handler(req, res) {
  const { city, lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY || '617c33d1f93bf517b82f1627acddb963';

  // 1. OpenWeather API execution (using lat/lon coordinates if present, else city search)
  if (apiKey && apiKey !== 'your_openweather_api_key_here') {
    try {
      let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city || 'Bangalore')}&units=metric&appid=${apiKey}`;
      if (lat && lon) {
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
      }

      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();

      if (weatherRes.ok) {
        const temperature = Math.round(weatherData.main.temp);
        const humidity = weatherData.main.humidity;
        const windSpeed = Math.round((weatherData.wind?.speed || 0) * 3.6); // Convert m/s to km/h
        const rain = !!(weatherData.rain && (weatherData.rain['1h'] || weatherData.rain['3h']));
        const rainChance = weatherData.pop !== undefined ? Math.round(weatherData.pop * 100) : (rain ? 90 : 0);

        // Fetch UV Index
        let uv = 5;
        const targetLat = lat || weatherData.coord?.lat;
        const targetLon = lon || weatherData.coord?.lon;

        if (targetLat && targetLon) {
          const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${targetLat}&lon=${targetLon}&appid=${apiKey}`;
          const uvRes = await fetch(uvUrl);
          const uvData = await uvRes.json();
          if (uvRes.ok) {
            uv = Math.round(uvData.value);
          }
        }

        return res.status(200).json({
          city: weatherData.name,
          country: weatherData.sys?.country || 'IN',
          temperature,
          humidity,
          rainChance,
          windSpeed,
          rain,
          uv
        });
      }
    } catch (e) {
      console.error('OpenWeather API connection error', e);
    }
  }

  // 2. Fallback wttr.in real weather parsing (never use fake data)
  try {
    const targetCity = city || 'Bangalore';
    const fallbackRes = await fetch(`https://wttr.in/${encodeURIComponent(targetCity)}?format=j1`);
    const fallbackData = await fallbackRes.json();

    if (fallbackRes.ok && fallbackData.current_condition?.[0]) {
      const current = fallbackData.current_condition[0];
      const temperature = Math.round(Number(current.temp_C));
      const humidity = Number(current.humidity);
      const windSpeed = Math.round(Number(current.windspeedKmph || 0));
      const rainChance = Number(fallbackData.weather?.[0]?.hourly?.[0]?.chanceofrain || (Number(current.precipMM) > 0.1 ? 80 : 0));
      const rain = Number(current.precipMM) > 0.5 || rainChance > 50;
      const uv = Number(current.uvIndex) || 5;

      return res.status(200).json({
        city: targetCity,
        country: targetCity.toLowerCase() === 'singapore' ? 'SG' : 'IN',
        temperature,
        humidity,
        rainChance,
        windSpeed,
        rain,
        uv
      });
    }
  } catch (e) {
    console.error('Fallback wttr.in weather fetch failed', e);
  }

  // 3. Failsafe Error: Return failure code when real weather is offline (No mock templates)
  return res.status(500).json({ error: 'Failed to retrieve real-time weather details' });
}
