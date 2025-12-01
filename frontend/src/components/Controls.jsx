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
    
    switch(e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        // Increase throttle
        setThrottle(Math.min(1, throttle + 0.05))
        break
      case 's':
      case 'arrowdown':
        // Decrease throttle
        setThrottle(Math.max(0, throttle - 0.05))
        break
      case 'a':
      case 'arrowleft':
        // Gimbal left (negative pitch)
        setGimbal([-2, 0])
        break
      case 'd':
      case 'arrowright':
        // Gimbal right (positive pitch)
        setGimbal([2, 0])
        break
      case 'q':
        // Gimbal forward
        setGimbal([0, -2])
        break
      case 'e':
        // Gimbal backward
        setGimbal([0, 2])
        break
      case ' ':
        // Full throttle
        setThrottle(1)
        break
      case 'x':
        // Cut throttle
        setThrottle(0)
        break
      case 'p':
        // Pause/Resume
        if (paused) {
          resumeGame()
        } else {
          pauseGame()
        }
        break
      case 'r':
        // Reset
        resetGame()
        break
    }
  }, [running, paused, throttle, isGameOver, showMenu])
  
  const handleKeyUp = useCallback((e) => {
    if (!running || isGameOver || showMenu) return
    
    // Reset gimbal when keys released
    if (['a', 'd', 'q', 'e', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
      setGimbal([0, 0])
    }
  }, [running, isGameOver, showMenu])
  
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
    <div className="absolute bottom-20 right-4 pointer-events-auto">
      <div className="hud-panel p-4 rounded-lg w-48">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-display">
          Controls
        </h3>
        
        {/* Throttle slider */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 block mb-1">Throttle</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={throttle}
            onChange={(e) => setThrottle(parseFloat(e.target.value))}
            className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ff6b35 0%, #ff6b35 ${throttle * 100}%, #1a1a25 ${throttle * 100}%, #1a1a25 100%)`
            }}
          />
          <div className="text-center text-sm font-mono text-white mt-1">
            {(throttle * 100).toFixed(0)}%
          </div>
        </div>
        
        {/* Keyboard hints */}
        <div className="text-[10px] text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>W/S</span>
            <span>Throttle ±</span>
          </div>
          <div className="flex justify-between">
            <span>A/D</span>
            <span>Gimbal L/R</span>
          </div>
          <div className="flex justify-between">
            <span>Q/E</span>
            <span>Gimbal F/B</span>
          </div>
          <div className="flex justify-between">
            <span>SPACE</span>
            <span>Full Thrust</span>
          </div>
          <div className="flex justify-between">
            <span>X</span>
            <span>Cut Engine</span>
          </div>
          <div className="flex justify-between">
            <span>P</span>
            <span>Pause</span>
          </div>
          <div className="flex justify-between">
            <span>R</span>
            <span>Reset</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Controls

