import { useEffect, useCallback } from 'react'
import useGameStore from '../stores/gameStore'

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
      case 'w':
      case 'arrowup':
        setThrottle(Math.min(1, throttle + 0.05))
        break
      case 's':
      case 'arrowdown':
        setThrottle(Math.max(0, throttle - 0.05))
        break
      case 'a':
      case 'arrowleft':
        setGimbal([-2, 0])
        break
      case 'd':
      case 'arrowright':
        setGimbal([2, 0])
        break
      case 'q':
        setGimbal([0, -2])
        break
      case 'e':
        setGimbal([0, 2])
        break
      case ' ':
        setThrottle(1)
        break
      case 'x':
        setThrottle(0)
        break
      case 'r':
        resetGame()
        break
    }
  }, [running, paused, throttle, isGameOver, showMenu])
  
  const handleKeyUp = useCallback((e) => {
    if (!running || isGameOver || showMenu || paused) return
    
    if (['a', 'd', 'q', 'e', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
      setGimbal([0, 0])
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
  
  if (!running || isGameOver || showMenu) return null
  
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="hud-panel p-4 rounded-lg flex items-center gap-6">
        {/* Throttle control */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <label className="text-xs text-gray-400 block mb-2 uppercase tracking-wider">Throttle</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setThrottle(0)}
                className="w-10 h-10 rounded bg-red-900/50 border border-red-500/50 text-red-400 
                         hover:bg-red-800/50 transition-colors text-xs font-bold"
              >
                CUT
              </button>
              <div className="relative w-32">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={throttle}
                  onChange={(e) => setThrottle(parseFloat(e.target.value))}
                  className="w-full h-3 bg-space-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ff6b35 0%, #ff6b35 ${throttle * 100}%, #1a1a25 ${throttle * 100}%, #1a1a25 100%)`
                  }}
                />
                <div className="text-center text-lg font-mono text-white mt-1 font-bold">
                  {(throttle * 100).toFixed(0)}%
                </div>
              </div>
              <button
                onClick={() => setThrottle(1)}
                className="w-10 h-10 rounded bg-green-900/50 border border-green-500/50 text-green-400 
                         hover:bg-green-800/50 transition-colors text-xs font-bold"
              >
                MAX
              </button>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="w-px h-16 bg-gray-700" />
        
        {/* Gimbal controls */}
        <div className="text-center">
          <label className="text-xs text-gray-400 block mb-2 uppercase tracking-wider">Gimbal</label>
          <div className="grid grid-cols-3 gap-1">
            <div></div>
            <button
              onMouseDown={() => setGimbal([0, 2])}
              onMouseUp={() => setGimbal([0, 0])}
              onMouseLeave={() => setGimbal([0, 0])}
              className="w-8 h-8 rounded bg-space-700 border border-gray-600 text-gray-300 
                       hover:bg-space-800 hover:border-rocket-orange transition-colors text-xs"
            >
              ▲
            </button>
            <div></div>
            <button
              onMouseDown={() => setGimbal([-2, 0])}
              onMouseUp={() => setGimbal([0, 0])}
              onMouseLeave={() => setGimbal([0, 0])}
              className="w-8 h-8 rounded bg-space-700 border border-gray-600 text-gray-300 
                       hover:bg-space-800 hover:border-rocket-orange transition-colors text-xs"
            >
              ◀
            </button>
            <div className="w-8 h-8 rounded bg-space-800 border border-gray-700 flex items-center justify-center">
              <div className="w-2 h-2 bg-rocket-orange rounded-full"></div>
            </div>
            <button
              onMouseDown={() => setGimbal([2, 0])}
              onMouseUp={() => setGimbal([0, 0])}
              onMouseLeave={() => setGimbal([0, 0])}
              className="w-8 h-8 rounded bg-space-700 border border-gray-600 text-gray-300 
                       hover:bg-space-800 hover:border-rocket-orange transition-colors text-xs"
            >
              ▶
            </button>
            <div></div>
            <button
              onMouseDown={() => setGimbal([0, -2])}
              onMouseUp={() => setGimbal([0, 0])}
              onMouseLeave={() => setGimbal([0, 0])}
              className="w-8 h-8 rounded bg-space-700 border border-gray-600 text-gray-300 
                       hover:bg-space-800 hover:border-rocket-orange transition-colors text-xs"
            >
              ▼
            </button>
            <div></div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="w-px h-16 bg-gray-700" />
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => paused ? resumeGame() : pauseGame()}
            className={`px-4 py-2 rounded font-display font-bold text-sm uppercase tracking-wider transition-all
                      ${paused 
                        ? 'bg-green-600 hover:bg-green-500 text-white' 
                        : 'bg-yellow-600 hover:bg-yellow-500 text-black'}`}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={resetGame}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white 
                     font-display font-bold text-sm uppercase tracking-wider transition-colors"
          >
            ↺ Reset
          </button>
        </div>
        
        {/* Divider */}
        <div className="w-px h-16 bg-gray-700" />
        
        {/* Keyboard hints */}
        <div className="text-[10px] text-gray-500 space-y-0.5">
          <div>W/S: Throttle</div>
          <div>A/D/Q/E: Gimbal</div>
          <div>SPACE: Full | X: Cut</div>
          <div>P: Pause | R: Reset</div>
        </div>
      </div>
    </div>
  )
}

export default Controls
