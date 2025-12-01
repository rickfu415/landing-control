import useGameStore from '../stores/gameStore'

function Gauge({ label, value, unit, max, color = 'rocket-orange', warning = false }) {
  const percentage = Math.min(100, (Math.abs(value) / max) * 100)
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={`font-bold ${warning ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {typeof value === 'number' ? value.toFixed(1) : value} {unit}
        </span>
      </div>
      <div className="h-2 bg-space-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-100 ${
            warning ? 'bg-red-500' : `bg-${color}`
          }`}
          style={{ 
            width: `${percentage}%`,
            background: warning 
              ? '#ef4444' 
              : `linear-gradient(90deg, #ff6b35 0%, ${percentage > 80 ? '#ff3333' : '#00ff88'} 100%)`
          }}
        />
      </div>
    </div>
  )
}

function HUD() {
  const { gameState } = useGameStore()
  const { rocket, time, running, paused } = gameState
  
  if (!running && !rocket.landed && !rocket.crashed) return null
  
  const isLowAltitude = rocket.altitude < 500
  const isHighSpeed = Math.abs(rocket.vertical_speed) > 50 && rocket.altitude < 200
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top center - Phase indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="hud-panel px-6 py-2 rounded-lg">
          <div className="text-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Phase</span>
            <div className="text-lg font-display font-bold text-rocket-orange uppercase">
              {rocket.phase.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
      
      {/* Left panel - Telemetry */}
      <div className="absolute top-20 left-4 w-64">
        <div className="hud-panel p-4 rounded-lg">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-display">
            Telemetry
          </h3>
          
          <Gauge 
            label="Altitude" 
            value={rocket.altitude} 
            unit="m" 
            max={5000} 
            warning={isLowAltitude}
          />
          
          <Gauge 
            label="Vertical Speed" 
            value={rocket.vertical_speed} 
            unit="m/s" 
            max={300}
            warning={isHighSpeed}
          />
          
          <Gauge 
            label="Horizontal Speed" 
            value={rocket.horizontal_speed} 
            unit="m/s" 
            max={100}
          />
          
          <Gauge 
            label="Total Speed" 
            value={rocket.speed} 
            unit="m/s" 
            max={300}
          />
        </div>
        
        {/* Position display */}
        <div className="hud-panel p-4 rounded-lg mt-3">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-display">
            Position
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-gray-500">X</div>
              <div className="text-sm font-mono">{rocket.position[0].toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Y</div>
              <div className="text-sm font-mono">{rocket.position[1].toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Z</div>
              <div className="text-sm font-mono">{rocket.position[2].toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right panel - Systems */}
      <div className="absolute top-20 right-4 w-64">
        <div className="hud-panel p-4 rounded-lg">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-display">
            Systems
          </h3>
          
          <Gauge 
            label="Throttle" 
            value={rocket.throttle * 100} 
            unit="%" 
            max={100}
          />
          
          <Gauge 
            label="Fuel" 
            value={rocket.fuel} 
            unit="kg" 
            max={30000}
            warning={rocket.fuel < 5000}
          />
          
          <div className="flex justify-between text-xs mt-3">
            <span className="text-gray-400">Mass</span>
            <span className="font-mono">{rocket.mass.toFixed(0)} kg</span>
          </div>
          
          <div className="flex justify-between text-xs mt-2">
            <span className="text-gray-400">Legs</span>
            <span className={rocket.legs_deployed ? 'text-rocket-green' : 'text-gray-500'}>
              {rocket.legs_deployed ? 'DEPLOYED' : 'STOWED'}
            </span>
          </div>
        </div>
        
        {/* Gimbal display */}
        <div className="hud-panel p-4 rounded-lg mt-3">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-display">
            Gimbal
          </h3>
          <div className="flex items-center justify-center">
            <div className="relative w-20 h-20 border border-gray-600 rounded-full">
              <div 
                className="absolute w-3 h-3 bg-rocket-orange rounded-full"
                style={{
                  left: `${50 + rocket.gimbal[0] * 8}%`,
                  top: `${50 - rocket.gimbal[1] * 8}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-px h-full bg-gray-700" />
                <div className="absolute w-full h-px bg-gray-700" />
              </div>
            </div>
          </div>
          <div className="text-center text-xs mt-2 text-gray-400">
            P: {rocket.gimbal[0].toFixed(1)}° Y: {rocket.gimbal[1].toFixed(1)}°
          </div>
        </div>
      </div>
      
      {/* Bottom center - Time and score */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="hud-panel px-8 py-3 rounded-lg flex gap-8">
          <div className="text-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Time</span>
            <div className="text-2xl font-display font-bold text-white font-mono">
              {time.toFixed(1)}s
            </div>
          </div>
          <div className="w-px bg-gray-700" />
          <div className="text-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Mode</span>
            <div className="text-lg font-display text-rocket-blue uppercase">
              {gameState.mode}
            </div>
          </div>
        </div>
      </div>
      
      {/* Paused overlay */}
      {paused && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-4xl font-display font-bold text-white animate-pulse">
            PAUSED
          </div>
        </div>
      )}
    </div>
  )
}

export default HUD

