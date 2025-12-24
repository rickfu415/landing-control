import { useState, useEffect } from 'react'
import useGameStore from '../stores/gameStore'
import useLanguageStore from '../stores/languageStore'
import { useTranslation } from '../i18n/translations'

function ThrustProfilePlanner({ inMenu = false }) {
  const { gameState, setThrottle, thrustProfile, setThrustProfile, thrustProfileActive, setThrustProfileActive, gameAttempts } = useGameStore()
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  const [isOpen, setIsOpen] = useState(inMenu) // Auto-open in menu
  
  // Thrust profile unlocks after 5 attempts
  const MIN_ATTEMPTS_TO_UNLOCK = 5
  const isUnlocked = gameAttempts >= MIN_ATTEMPTS_TO_UNLOCK
  
  // Use global state for profile and active status
  const profile = thrustProfile || [
    { time: 0, throttle: 0 },
    { time: 10, throttle: 50 },
    { time: 20, throttle: 100 },
  ]
  const isActive = thrustProfileActive || false
  
  const { running, time } = gameState
  const isGameOver = gameState.rocket.landed || gameState.rocket.crashed
  
  // Apply thrust profile automatically when active (only during game)
  useEffect(() => {
    if (!isActive || !running || isGameOver || inMenu) return
    
    // Find the current segment
    const currentTime = time
    let targetThrottle = 0
    
    // Sort profile by time
    const sortedProfile = [...profile].sort((a, b) => a.time - b.time)
    
    // Find which segment we're in
    for (let i = 0; i < sortedProfile.length; i++) {
      if (currentTime >= sortedProfile[i].time) {
        targetThrottle = sortedProfile[i].throttle
        
        // Interpolate if there's a next point
        if (i < sortedProfile.length - 1) {
          const current = sortedProfile[i]
          const next = sortedProfile[i + 1]
          
          if (currentTime < next.time) {
            // Linear interpolation
            const progress = (currentTime - current.time) / (next.time - current.time)
            targetThrottle = current.throttle + (next.throttle - current.throttle) * progress
          }
        }
      }
    }
    
    // Apply throttle (convert percentage to 0-1)
    setThrottle(targetThrottle / 100)
  }, [time, isActive, running, isGameOver, profile, setThrottle])
  
  // Hide during active gameplay (only show in menu or when game is over)
  if (!inMenu && running && !isGameOver) return null
  
  // Add new waypoint
  const addWaypoint = () => {
    const lastTime = profile.length > 0 ? Math.max(...profile.map(p => p.time)) : 0
    const newProfile = [...profile, { time: lastTime + 5, throttle: 50 }]
    setThrustProfile(newProfile)
  }
  
  // Remove waypoint
  const removeWaypoint = (index) => {
    if (profile.length > 1) {
      const newProfile = profile.filter((_, i) => i !== index)
      setThrustProfile(newProfile)
    }
  }
  
  // Update waypoint
  const updateWaypoint = (index, field, value) => {
    const newProfile = [...profile]
    newProfile[index][field] = parseFloat(value)
    setThrustProfile(newProfile)
  }
  
  // Toggle active status
  const toggleActive = () => {
    setThrustProfileActive(!isActive)
  }
  
  // Preset profiles
  const loadPreset = (presetName) => {
    const presets = {
      gentle: [
        { time: 0, throttle: 0 },
        { time: 5, throttle: 40 },
        { time: 15, throttle: 60 },
        { time: 25, throttle: 45 },
        { time: 30, throttle: 40 },
      ],
      aggressive: [
        { time: 0, throttle: 0 },
        { time: 15, throttle: 100 },
        { time: 20, throttle: 70 },
        { time: 25, throttle: 50 },
      ],
      hover: [
        { time: 0, throttle: 0 },
        { time: 10, throttle: 55 },
        { time: 30, throttle: 55 },
      ],
    }
    
    if (presets[presetName]) {
      setThrustProfile(presets[presetName])
    }
  }
  
  // Hide until unlocked (after 5 attempts)
  if (!isUnlocked) return null
  
  // Only hide if in-game and game is over (don't hide in menu)
  if (!inMenu && (!running || isGameOver)) return null
  
  // Different styling for menu vs in-game
  const containerClass = inMenu 
    ? "bg-space-900/50 p-6 rounded-lg border border-gray-700" 
    : "absolute top-20 right-4 pointer-events-auto"
  
  const panelClass = inMenu
    ? ""
    : "hud-panel p-4 rounded-lg w-80"
  
  return (
    <div className={containerClass}>
      {/* Toggle button (only in-game) */}
      {!inMenu && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`hud-panel px-4 py-2 rounded-lg font-display font-bold text-sm uppercase tracking-wider transition-all ${
            isActive ? 'bg-rocket-orange/20 border-2 border-rocket-orange text-rocket-orange' : 'bg-space-700 text-gray-400'
          }`}
        >
          📈 {t.thrustProfile?.title || 'Thrust Profile'}
          {isActive && ' ✓'}
        </button>
      )}
      
      {/* Planner panel */}
      {(isOpen || inMenu) && (
        <div className={panelClass}>
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <h3 className={`font-display font-bold uppercase tracking-wider ${inMenu ? 'text-sm text-gray-400 flex items-center gap-2' : 'text-sm text-white'}`}>
              {inMenu && <span className="text-rocket-orange">📈</span>}
              {!inMenu && '📈 '}
              {t.thrustProfile?.title || 'Thrust Profile'}
              {inMenu && <span className="ml-2 text-xs text-rocket-green">🔓 {t.thrustProfile?.unlocked || 'Unlocked'}</span>}
            </h3>
            {!inMenu && (
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Active toggle */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">{t.thrustProfile?.active || 'Active'}</span>
            <button
              onClick={toggleActive}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-rocket-orange text-white' 
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {isActive ? (t.thrustProfile?.on || 'ON') : (t.thrustProfile?.off || 'OFF')}
            </button>
          </div>
          
          {/* Current time indicator (only during game) */}
          {!inMenu && (
            <div className="mb-3 text-xs text-gray-400">
              {t.thrustProfile?.currentTime || 'Current Time'}: <span className="text-white font-mono">{time.toFixed(1)}s</span>
            </div>
          )}
          
          {/* Waypoints */}
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {profile.sort((a, b) => a.time - b.time).map((waypoint, index) => (
              <div key={index} className="flex items-center gap-2 bg-space-800 p-2 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={waypoint.time}
                      onChange={(e) => updateWaypoint(index, 'time', e.target.value)}
                      className="w-16 px-2 py-1 bg-space-700 text-white text-xs rounded border border-gray-600 focus:border-rocket-orange outline-none"
                      placeholder="Time"
                      step="0.1"
                    />
                    <span className="text-xs text-gray-400">s</span>
                    <input
                      type="number"
                      value={waypoint.throttle}
                      onChange={(e) => updateWaypoint(index, 'throttle', e.target.value)}
                      className="w-16 px-2 py-1 bg-space-700 text-white text-xs rounded border border-gray-600 focus:border-rocket-orange outline-none"
                      placeholder="%"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </div>
                <button
                  onClick={() => removeWaypoint(index)}
                  className="text-red-400 hover:text-red-300 text-xs"
                  disabled={profile.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          {/* Add waypoint button */}
          <button
            onClick={addWaypoint}
            className="w-full py-2 bg-space-700 hover:bg-space-600 text-gray-300 rounded text-xs font-bold transition-colors mb-3"
          >
            + {t.thrustProfile?.addWaypoint || 'Add Waypoint'}
          </button>
          
          {/* Presets */}
          <div className="border-t border-gray-700 pt-3">
            <div className="text-xs text-gray-400 mb-2">{t.thrustProfile?.presets || 'Presets'}:</div>
            <div className="flex gap-2">
              <button
                onClick={() => loadPreset('gentle')}
                className="flex-1 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded text-xs font-bold transition-colors"
              >
                {t.thrustProfile?.gentle || 'Gentle'}
              </button>
              <button
                onClick={() => loadPreset('aggressive')}
                className="flex-1 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs font-bold transition-colors"
              >
                {t.thrustProfile?.aggressive || 'Aggressive'}
              </button>
              <button
                onClick={() => loadPreset('hover')}
                className="flex-1 py-1 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 rounded text-xs font-bold transition-colors"
              >
                {t.thrustProfile?.hover || 'Hover'}
              </button>
            </div>
          </div>
          
          {/* Visual timeline */}
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="text-xs text-gray-400 mb-2">{t.thrustProfile?.timeline || 'Timeline'}:</div>
            <div className="relative h-16 bg-space-800 rounded overflow-hidden">
              {/* Grid lines */}
              {[0, 10, 20, 30, 40].map((t) => (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 w-px bg-gray-700"
                  style={{ left: `${(t / 40) * 100}%` }}
                />
              ))}
              
              {/* Profile line */}
              <svg className="absolute inset-0 w-full h-full">
                <polyline
                  points={profile
                    .sort((a, b) => a.time - b.time)
                    .map((p) => `${(p.time / 40) * 100},${64 - (p.throttle / 100) * 56}`)
                    .join(' ')}
                  fill="none"
                  stroke="#ff6b35"
                  strokeWidth="2"
                />
                {profile.map((p, i) => (
                  <circle
                    key={i}
                    cx={`${(p.time / 40) * 100}%`}
                    cy={64 - (p.throttle / 100) * 56}
                    r="3"
                    fill="#ff6b35"
                  />
                ))}
              </svg>
              
              {/* Current time indicator (only during game) */}
              {!inMenu && isActive && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rocket-green"
                  style={{ left: `${Math.min((time / 40) * 100, 100)}%` }}
                />
              )}
            </div>
            {/* Time labels */}
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0s</span>
              <span>10s</span>
              <span>20s</span>
              <span>30s</span>
              <span>40s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThrustProfilePlanner

