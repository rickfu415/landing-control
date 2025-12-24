import useGameStore from '../stores/gameStore'
import useLanguageStore from '../stores/languageStore'
import { useTranslation } from '../i18n/translations'

// Constants
const DRY_MASS = 22200  // kg (default, will be overridden by rocket data)
const ENGINE_THRUST = 845  // kN (default, will be overridden by rocket data)
const GRAVITY = 9.80665  // m/s²

function Gauge({ label, value, unit, max, color = 'rocket-orange', warning = false }) {
  const percentage = Math.min(100, (Math.abs(value) / max) * 100)
  
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={`font-bold ${warning ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {typeof value === 'number' ? value.toFixed(1) : value} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-space-700 rounded-full overflow-hidden">
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

function StatRow({ label, value, unit, warning = false }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-400">{label}</span>
      <span className={`font-mono ${warning ? 'text-red-400' : 'text-white'}`}>
        {value} {unit}
      </span>
    </div>
  )
}

function HUD() {
  const { gameState, prevVelocity } = useGameStore()
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  const { rocket, time, running, paused } = gameState
  
  // Show HUD when game is running or finished (landed/crashed)
  if (!running && !rocket.landed && !rocket.crashed) return null
  
  const isLowAltitude = rocket.altitude < 500
  const isHighSpeed = Math.abs(rocket.vertical_speed) > 50 && rocket.altitude < 200
  const speed = Math.sqrt(rocket.velocity[0]**2 + rocket.velocity[1]**2 + rocket.velocity[2]**2)
  
  // Calculate acceleration (approximate from velocity change at 60Hz)
  const accelX = (rocket.velocity[0] - (prevVelocity?.[0] || rocket.velocity[0])) * 60
  const accelY = (rocket.velocity[1] - (prevVelocity?.[1] || rocket.velocity[1])) * 60
  const accelZ = (rocket.velocity[2] - (prevVelocity?.[2] || rocket.velocity[2])) * 60
  const totalAccel = Math.sqrt(accelX**2 + accelY**2 + accelZ**2)
  const gForce = Math.abs(accelY + GRAVITY) / GRAVITY  // G-force (1G = hovering)
  
  // Distance from landing pad
  const distanceFromPad = Math.sqrt(rocket.position[0]**2 + rocket.position[2]**2)
  
  // Get rocket parameters from geometry (with fallbacks)
  const maxFuel = rocket.geometry?.initial_fuel_mass || 3000  // kg
  const dryMass = rocket.geometry?.dry_mass || DRY_MASS  // kg
  const engineThrust = rocket.geometry?.thrust || (ENGINE_THRUST * 1000)  // N
  const engineThrustKN = engineThrust / 1000  // kN
  const engineISP = rocket.geometry?.isp || 282  // seconds
  
  // Fuel percentage
  const fuelPercent = (rocket.fuel / maxFuel) * 100
  
  // Time to impact (rough estimate)
  const timeToImpact = rocket.vertical_speed < 0 
    ? rocket.altitude / Math.abs(rocket.vertical_speed) 
    : Infinity
  
  // TWR (Thrust to Weight Ratio) - using actual mass and thrust
  const totalMass = dryMass + rocket.fuel  // Correct: dry mass + remaining fuel
  const currentThrust = rocket.throttle * engineThrust  // N
  const weight = totalMass * GRAVITY
  const twr = rocket.throttle > 0 ? currentThrust / weight : 0
  
  // Mass flow rate at current throttle (mdot = Thrust / (ISP * g0))
  const maxMassFlowRate = engineThrust / (engineISP * GRAVITY)  // kg/s at full throttle
  const massFlowRate = rocket.throttle * maxMassFlowRate  // kg/s at current throttle
  
  // Get translated phase
  const getPhase = (phase) => {
    const phaseKey = phase.toLowerCase().replace(' ', '_')
    return t.hud.phases[phaseKey] || phase.replace('_', ' ')
  }
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Mission Time - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="bg-black/30 backdrop-blur-sm px-6 py-2 rounded-lg border border-gray-700/50">
          <div className="text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t.hud.missionTime}</span>
            <div className="text-3xl font-display font-black text-white font-mono">
              {time.toFixed(1)}<span className="text-sm text-gray-400">s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Left panel - Telemetry */}
      <div className="absolute top-4 left-4 w-56">
        <div className="hud-panel p-3 rounded-lg">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-display">
            {t.hud.telemetry}
          </h3>
          
          <Gauge 
            label={t.hud.altitude} 
            value={rocket.altitude} 
            unit="m" 
            max={5000} 
            warning={isLowAltitude}
          />
          
          <Gauge 
            label={t.hud.verticalSpeed} 
            value={rocket.vertical_speed} 
            unit="m/s" 
            max={200}
            warning={isHighSpeed}
          />
          
          <Gauge 
            label={t.hud.horizontalSpeed} 
            value={rocket.horizontal_speed} 
            unit="m/s" 
            max={50}
          />
          
          <Gauge 
            label={t.hud.totalSpeed} 
            value={speed} 
            unit="m/s" 
            max={200}
          />
          
          <div className="mt-2 pt-2 border-t border-gray-700">
            <StatRow label={t.hud.acceleration} value={totalAccel.toFixed(1)} unit="m/s²" />
            <StatRow label={t.hud.gForce} value={gForce.toFixed(2)} unit="G" warning={gForce > 3} />
            <StatRow label={t.hud.twr} value={twr.toFixed(2)} unit="" warning={twr > 0 && twr < 1} />
            <StatRow label={t.hud.distToPad} value={distanceFromPad.toFixed(1)} unit="m" warning={distanceFromPad > 30} />
            <StatRow 
              label={t.hud.timeToImpact} 
              value={timeToImpact < 1000 ? timeToImpact.toFixed(1) : '---'} 
              unit="s" 
              warning={timeToImpact < 10 && timeToImpact > 0}
            />
          </div>
        </div>
      </div>
      
      {/* Right panel - Position & Propulsion */}
      <div className="absolute top-4 right-4 w-56">
        {/* Systems - Position & Propulsion combined */}
        <div className="hud-panel p-3 rounded-lg">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-display">
            {t.hud.position} & {t.hud.propulsion}
          </h3>
          
          {/* Position */}
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
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
          
          <div className="border-t border-gray-700 pt-2 mt-2">
            <Gauge 
              label={t.hud.throttle} 
              value={rocket.throttle * 100} 
              unit="%" 
              max={100}
            />
            
            <Gauge 
              label={t.hud.fuel} 
              value={rocket.fuel} 
              unit="kg" 
              max={maxFuel}
              warning={rocket.fuel < (maxFuel * 0.25)}
            />
            
            <div className="mt-2 pt-2 border-t border-gray-700">
              <StatRow label={t.hud.fuelPercent} value={fuelPercent.toFixed(1)} unit="%" warning={fuelPercent < 25} />
              <StatRow label={t.hud.thrust} value={(rocket.throttle * engineThrustKN).toFixed(0)} unit="kN" />
              <StatRow label={t.hud.totalMass} value={totalMass.toFixed(0)} unit="kg" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Paused overlay */}
      {paused && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl font-display font-bold text-white animate-pulse mb-4">
              {t.hud.paused}
            </div>
            <div className="text-gray-400 text-sm">{t.hud.pausedHint}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HUD
