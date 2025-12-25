import { useEffect, useCallback } from 'react'
import useGameStore from '../stores/gameStore'
import useLanguageStore from '../stores/languageStore'
import { useTranslation } from '../i18n/translations'

function Controls() {
  const { 
    throttle, 
    setThrottle, 
    setGimbal, 
    gameState,
    pauseGame,
    resumeGame,
    resetGame,
    showMenu
  } = useGameStore()
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  
  const { running, paused } = gameState
  const isGameOver = gameState.rocket.landed || gameState.rocket.crashed
  
  // Keyboard controls
  const handleKeyDown = useCallback((e) => {
    if (!running || isGameOver || showMenu) return
    
    // Allow pause even when paused
    if (e.key.toLowerCase() === 'p') {
      if (paused) {
        resumeGame()
      } else {
        pauseGame()
      }
      return
    }
    
    // Don't process other keys when paused
    if (paused) return
    
    switch(e.key.toLowerCase()) {
      // WSAD for gimbal control
      case 'w':
        setGimbal([0, 2])  // Gimbal up
        break
      case 's':
        setGimbal([0, -2])  // Gimbal down
        break
      case 'a':
        setGimbal([-2, 0])  // Gimbal left
        break
      case 'd':
        setGimbal([2, 0])  // Gimbal right
        break
      case 'q':
        setGimbal([-2, 2])  // Gimbal diagonal up-left
        break
      case 'e':
        setGimbal([2, 2])  // Gimbal diagonal up-right
        break
      // Arrow keys for throttle
      case 'arrowup':
        setThrottle(1)  // Full throttle while holding
        break
      case 'arrowdown':
        setThrottle(0)  // Cut throttle
        break
      case ' ':
        setThrottle(1)  // Space for full throttle
        break
      case 'r':
        resetGame()
        break
    }
  }, [running, paused, isGameOver, showMenu])
  
  const handleKeyUp = useCallback((e) => {
    if (!running || isGameOver || showMenu || paused) return
    
    // Reset gimbal when releasing WSAD/QE keys
    if (['w', 'a', 's', 'd', 'q', 'e'].includes(e.key.toLowerCase())) {
      setGimbal([0, 0])
    }
    
    // Reset throttle when releasing arrow keys or space (realistic handle behavior)
    if (['arrowup', 'arrowdown', ' '].includes(e.key.toLowerCase())) {
      setThrottle(0)
    }
  }, [running, isGameOver, showMenu, paused])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
  
  if (!running || isGameOver) return null
  
  return (
    <>
      {/* Gimbal control - LEFT */}
      <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 pointer-events-auto">
        <div className="hud-panel p-2 md:p-4 rounded-lg">
          <div className="text-center">
            <label className="text-[10px] md:text-xs text-gray-400 block mb-1 md:mb-2 uppercase tracking-wider">{t.controls.gimbal}</label>
            <div className="grid grid-cols-3 gap-1">
              <div></div>
              <button
                onMouseDown={() => setGimbal([0, 2])}
                onMouseUp={() => setGimbal([0, 0])}
                onMouseLeave={() => setGimbal([0, 0])}
                onTouchStart={(e) => { e.preventDefault(); setGimbal([0, 2]); }}
                onTouchEnd={(e) => { e.preventDefault(); setGimbal([0, 0]); }}
                className="w-8 h-8 md:w-10 md:h-10 rounded bg-space-700 border border-gray-600 text-gray-300 
                         hover:bg-space-800 hover:border-rocket-orange active:bg-space-800 active:border-rocket-orange transition-colors text-sm touch-none"
              >
                ▲
              </button>
              <div></div>
              <button
                onMouseDown={() => setGimbal([-2, 0])}
                onMouseUp={() => setGimbal([0, 0])}
                onMouseLeave={() => setGimbal([0, 0])}
                onTouchStart={(e) => { e.preventDefault(); setGimbal([-2, 0]); }}
                onTouchEnd={(e) => { e.preventDefault(); setGimbal([0, 0]); }}
                className="w-8 h-8 md:w-10 md:h-10 rounded bg-space-700 border border-gray-600 text-gray-300 
                         hover:bg-space-800 hover:border-rocket-orange active:bg-space-800 active:border-rocket-orange transition-colors text-sm touch-none"
              >
                ◀
              </button>
              {/* Center with stick indicator */}
              <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-space-800 border border-gray-700 flex items-center justify-center relative">
                {/* Crosshair */}
                <div className="absolute w-full h-px bg-gray-600"></div>
                <div className="absolute h-full w-px bg-gray-600"></div>
                {/* Stick indicator */}
                <div 
                  className="absolute w-2 h-2 md:w-3 md:h-3 bg-rocket-orange rounded-full transition-all duration-100 shadow-lg"
                  style={{
                    transform: `translate(${gameState.rocket.gimbal[0] * 10}px, ${-gameState.rocket.gimbal[1] * 10}px)`
                  }}
                >
                  {/* Stick line */}
                  <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                    <line 
                      x1="4" 
                      y1="4" 
                      x2={4 - gameState.rocket.gimbal[0] * 10} 
                      y2={4 + gameState.rocket.gimbal[1] * 10}
                      stroke="#ff6b35" 
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
              <button
                onMouseDown={() => setGimbal([2, 0])}
                onMouseUp={() => setGimbal([0, 0])}
                onMouseLeave={() => setGimbal([0, 0])}
                onTouchStart={(e) => { e.preventDefault(); setGimbal([2, 0]); }}
                onTouchEnd={(e) => { e.preventDefault(); setGimbal([0, 0]); }}
                className="w-8 h-8 md:w-10 md:h-10 rounded bg-space-700 border border-gray-600 text-gray-300 
                         hover:bg-space-800 hover:border-rocket-orange active:bg-space-800 active:border-rocket-orange transition-colors text-sm touch-none"
              >
                ▶
              </button>
              <div></div>
              <button
                onMouseDown={() => setGimbal([0, -2])}
                onMouseUp={() => setGimbal([0, 0])}
                onMouseLeave={() => setGimbal([0, 0])}
                onTouchStart={(e) => { e.preventDefault(); setGimbal([0, -2]); }}
                onTouchEnd={(e) => { e.preventDefault(); setGimbal([0, 0]); }}
                className="w-8 h-8 md:w-10 md:h-10 rounded bg-space-700 border border-gray-600 text-gray-300 
                         hover:bg-space-800 hover:border-rocket-orange active:bg-space-800 active:border-rocket-orange transition-colors text-sm touch-none"
              >
                ▼
              </button>
              <div></div>
            </div>
            <div className="text-[8px] md:text-[10px] text-gray-500 mt-1 md:mt-2">
              <span className="hidden md:inline">WSAD/QE or </span>Touch
            </div>
          </div>
        </div>
      </div>
      
      {/* Throttle control - RIGHT (vertical handle) */}
      <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 pointer-events-auto">
        <div className="hud-panel p-2 md:p-4 rounded-lg">
          <div className="text-center">
            <label className="text-[10px] md:text-xs text-gray-400 block mb-1 md:mb-2 uppercase tracking-wider">{t.controls.throttle}</label>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Percentage bar (result display) */}
              <div className="relative">
                <div className="w-5 md:w-6 h-32 md:h-40 bg-space-800 rounded border border-gray-700 relative overflow-hidden">
                  {/* Fill indicator */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rocket-orange to-yellow-500 transition-all duration-100"
                    style={{ height: `${throttle * 100}%` }}
                  />
                  
                  {/* Tick marks */}
                  {[0, 50, 100].map((mark) => (
                    <div 
                      key={mark}
                      className="absolute left-0 right-0 border-t border-gray-600"
                      style={{ bottom: `${mark}%` }}
                    />
                  ))}
                </div>
                {/* Percentage display */}
                <div className="text-xs md:text-sm font-mono text-white font-bold mt-1">
                  {(throttle * 100).toFixed(0)}%
                </div>
              </div>
              
              {/* Throttle handle/stick (interactive) */}
              <div className="relative h-32 md:h-40 w-10 md:w-12 flex items-end">
                {/* Track/slot for the handle */}
                <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-full bg-space-900 rounded-full border border-gray-700"></div>
                
                {/* Draggable handle */}
                <div 
                  className="absolute left-1/2 w-10 md:w-12 cursor-grab active:cursor-grabbing touch-none"
                  style={{ 
                    bottom: `${throttle * 100}%`,
                    transform: `translate(-50%, 50%)`
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    const trackRect = e.currentTarget.parentElement.getBoundingClientRect()
                    
                    const handleMouseMove = (moveEvent) => {
                      const y = trackRect.bottom - moveEvent.clientY
                      const percentage = Math.max(0, Math.min(1, y / trackRect.height))
                      setThrottle(percentage)
                    }
                    
                    const handleMouseUp = () => {
                      setThrottle(0)
                      document.removeEventListener('mousemove', handleMouseMove)
                      document.removeEventListener('mouseup', handleMouseUp)
                    }
                    
                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                    
                    // Set initial position
                    handleMouseMove(e)
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    const trackRect = e.currentTarget.parentElement.getBoundingClientRect()
                    
                    const handleTouchMove = (moveEvent) => {
                      const touch = moveEvent.touches[0]
                      const y = trackRect.bottom - touch.clientY
                      const percentage = Math.max(0, Math.min(1, y / trackRect.height))
                      setThrottle(percentage)
                    }
                    
                    const handleTouchEnd = () => {
                      setThrottle(0)
                      document.removeEventListener('touchmove', handleTouchMove)
                      document.removeEventListener('touchend', handleTouchEnd)
                    }
                    
                    document.addEventListener('touchmove', handleTouchMove, { passive: false })
                    document.addEventListener('touchend', handleTouchEnd)
                    
                    // Set initial position
                    if (e.touches[0]) {
                      const touch = e.touches[0]
                      const y = trackRect.bottom - touch.clientY
                      const percentage = Math.max(0, Math.min(1, y / trackRect.height))
                      setThrottle(percentage)
                    }
                  }}
                >
                  {/* Handle grip */}
                  <div className="relative">
                    {/* Connecting rod */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-3 md:h-4 bg-gray-600 -top-3 md:-top-4"></div>
                    
                    {/* Handle knob */}
                    <div className="w-10 h-7 md:w-12 md:h-8 bg-gradient-to-b from-gray-700 to-gray-800 rounded border-2 border-gray-600 shadow-lg
                                  flex items-center justify-center relative overflow-hidden">
                      {/* Grip texture */}
                      <div className="absolute inset-0 flex flex-col justify-around py-1.5">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-px bg-gray-600 mx-1.5"></div>
                        ))}
                      </div>
                      {/* Center indicator */}
                      <div className="w-2 h-2 rounded-full bg-rocket-orange shadow-lg z-10"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[8px] md:text-[10px] text-gray-500 mt-1 md:mt-2">
              <span className="hidden md:inline">Drag or ↑↓ / </span>Touch & drag
            </div>
          </div>
        </div>
      </div>
      
    </>
  )
}

export default Controls
