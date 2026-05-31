export function getWeatherInfo(code, isDay) {
  const conditions = {
    0: { label: 'Clear Sky', icon: isDay ? '☀️' : '🌙' },
    1: { label: 'Mainly Clear', icon: isDay ? '🌤️' : '🌙' },
    2: { label: 'Partly Cloudy', icon: '⛅' },
    3: { label: 'Overcast', icon: '☁️' },
    45: { label: 'Foggy', icon: '🌫️' },
    48: { label: 'Icy Fog', icon: '🌫️' },
    51: { label: 'Light Drizzle', icon: '🌦️' },
    53: { label: 'Moderate Drizzle', icon: '🌦️' },
    55: { label: 'Dense Drizzle', icon: '🌧️' },
    61: { label: 'Slight Rain', icon: '🌧️' },
    63: { label: 'Moderate Rain', icon: '🌧️' },
    65: { label: 'Heavy Rain', icon: '🌧️' },
    71: { label: 'Slight Snow', icon: '🌨️' },
    73: { label: 'Moderate Snow', icon: '❄️' },
    75: { label: 'Heavy Snow', icon: '❄️' },
    77: { label: 'Snow Grains', icon: '🌨️' },
    80: { label: 'Slight Showers', icon: '🌦️' },
    81: { label: 'Moderate Showers', icon: '🌧️' },
    82: { label: 'Heavy Showers', icon: '⛈️' },
    85: { label: 'Snow Showers', icon: '🌨️' },
    86: { label: 'Heavy Snow Showers', icon: '❄️' },
    95: { label: 'Thunderstorm', icon: '⛈️' },
    96: { label: 'Thunderstorm w/ Hail', icon: '⛈️' },
    99: { label: 'Thunderstorm w/ Heavy Hail', icon: '⛈️' },
  }
  return conditions[code] ?? { label: 'Unknown', icon: '🌡️' }
}
