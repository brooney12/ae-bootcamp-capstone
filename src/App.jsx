import { useState, useEffect } from 'react'
import './App.css'

const LATITUDE = 44.9778
const LONGITUDE = -93.265
const API_URL =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
  `precipitation,weather_code,wind_speed_10m,is_day` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
  `&forecast_days=7` +
  `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago`

function getWeatherInfo(code, isDay) {
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

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  })
}

function formatDayShort(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  if (isToday) return 'Today'
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function App() {
  const [weather, setWeather] = useState(null)
  const [daily, setDaily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch weather data')
        return res.json()
      })
      .then((data) => {
        setWeather(data.current)
        setDaily(data.daily)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="weather-app">
        <div className="loading">Loading weather…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="weather-app">
        <div className="error">⚠️ {error}</div>
      </div>
    )
  }

  const { label, icon } = getWeatherInfo(weather.weather_code, weather.is_day)

  return (
    <div className="weather-app">
      <div className="weather-container">
      <div className="weather-card">
        <div className="location">
          <span className="pin">📍</span>
          <span>Minneapolis, MN</span>
        </div>
        <p className="date">{formatDate(weather.time)}</p>

        <div className="main-weather">
          <span className="weather-icon">{icon}</span>
          <span className="temperature">{Math.round(weather.temperature_2m)}°F</span>
        </div>
        <p className="condition">{label}</p>

        <div className="details">
          <div className="detail-item">
            <span className="detail-icon">🌡️</span>
            <span className="detail-label">Feels Like</span>
            <span className="detail-value">{Math.round(weather.apparent_temperature)}°F</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💧</span>
            <span className="detail-label">Humidity</span>
            <span className="detail-value">{weather.relative_humidity_2m}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💨</span>
            <span className="detail-label">Wind</span>
            <span className="detail-value">{Math.round(weather.wind_speed_10m)} mph</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">🌧️</span>
            <span className="detail-label">Precipitation</span>
            <span className="detail-value">{weather.precipitation} in</span>
          </div>
        </div>
      </div>

      {daily && (
        <div className="weekly-forecast">
          <h2 className="weekly-title">This Week</h2>
          <div className="weekly-days">
            {daily.time.map((dateStr, i) => {
              const { icon: dayIcon } = getWeatherInfo(daily.weather_code[i], true)
              return (
                <div key={dateStr} className="day-card">
                  <span className="day-name">{formatDayShort(dateStr)}</span>
                  <span className="day-icon">{dayIcon}</span>
                  <span className="day-high">{Math.round(daily.temperature_2m_max[i])}°</span>
                  <span className="day-low">{Math.round(daily.temperature_2m_min[i])}°</span>
                  <span className="day-precip">💧 {daily.precipitation_sum[i].toFixed(2)}"</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default App
