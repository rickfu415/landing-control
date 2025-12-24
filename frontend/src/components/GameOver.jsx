import { useState } from 'react'
import useGameStore from '../stores/gameStore'
import useLanguageStore from '../stores/languageStore'
import { useTranslation } from '../i18n/translations'
import FlightReview from './FlightReview'

function GameOver() {
  const { gameState, resetGame, difficulty } = useGameStore()
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  const { rocket, score, time, flight_review } = gameState
  const [showReview, setShowReview] = useState(false)
  
  const isSuccess = rocket.landed
  
  // Get initial fuel mass from geometry (for percentage calculation)
  const initialFuelMass = rocket.geometry?.initial_fuel_mass || 3000  // Fallback to 3000 if not available
  const fuelPercent = (rocket.fuel / initialFuelMass) * 100
  
  // Get difficulty criteria
  const getDifficultyCriteria = () => {
    switch (difficulty) {
      case 'easy':
        return { maxVertVel: 20.0, maxHorizVel: 10.0, maxDist: 10.0, maxAngle: 10.0 }
      case 'professional':
        return { maxVertVel: 5.0, maxHorizVel: 2.0, maxDist: 1.0, maxAngle: 2.0 }
      default: // medium
        return { maxVertVel: 10.0, maxHorizVel: 5.0, maxDist: 5.0, maxAngle: 5.0 }
    }
  }
  
  const criteria = getDifficultyCriteria()
  
  // Get actual touchdown values from backend (stored at moment of touchdown)
  const touchdownVertVel = rocket.touchdown_vertical_speed || Math.abs(rocket.vertical_speed)
  const touchdownHorizVel = rocket.touchdown_horizontal_speed || rocket.horizontal_speed
  const touchdownDist = Math.sqrt(rocket.position[0]**2 + rocket.position[2]**2)
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8">
      <div className="hud-panel p-8 rounded-2xl max-w-6xl w-full mx-4 my-auto">
        {/* Result banner */}
        <div className={`mb-6 text-center ${isSuccess ? 'text-rocket-green' : 'text-red-500'}`}>
          <div className="text-6xl mb-2">
            {isSuccess ? '🚀' : '💥'}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black">
            {isSuccess ? t.gameOver.landed : t.gameOver.crashed}
          </h1>
          <p className="text-sm opacity-80 mt-2">
            {isSuccess 
              ? t.gameOver.landedMessage 
              : t.gameOver.crashedMessage}
          </p>
        </div>
        
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Score */}
            <div className="py-4 border-y border-gray-700 text-center">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                {t.gameOver.finalScore}
              </div>
              <div className="text-5xl font-display font-black text-white">
                {score.toLocaleString()}
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="hud-panel p-3 rounded-lg">
                <div className="text-xs text-gray-400">{t.gameOver.flightTime}</div>
                <div className="text-lg font-mono text-white">{time.toFixed(1)}s</div>
              </div>
              <div className="hud-panel p-3 rounded-lg">
                <div className="text-xs text-gray-400">{t.gameOver.fuelRemaining}</div>
                <div className="text-lg font-mono text-white">
                  {fuelPercent.toFixed(1)}%
                </div>
              </div>
              <div className="hud-panel p-3 rounded-lg">
                <div className="text-xs text-gray-400">{t.gameOver.finalPosition}</div>
                <div className="text-sm font-mono text-white">
                  X: {rocket.position[0].toFixed(1)}m<br/>
                  Y: {(isSuccess || rocket.crashed) ? '0.0' : rocket.position[1].toFixed(1)}m
                </div>
              </div>
              <div className="hud-panel p-3 rounded-lg">
                <div className="text-xs text-gray-400">Touchdown Speed</div>
                <div className="text-sm font-mono text-white">
                  V: {touchdownVertVel.toFixed(1)} m/s<br/>
                  H: {touchdownHorizVel.toFixed(1)} m/s
                </div>
              </div>
            </div>
            
            {/* Score breakdown (for successful landing) */}
            {isSuccess && score > 0 && (
              <div className="text-left">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                  {t.gameOver.scoreBreakdown}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>{t.gameOver.landingAccuracy}</span>
                    <span className="text-white">+{Math.min(3000, score)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>{t.gameOver.velocityBonus}</span>
                    <span className="text-white">+{Math.min(2000, Math.max(0, score - 3000))}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>{t.gameOver.fuelEfficiency}</span>
                    <span className="text-white">+{Math.floor((fuelPercent / 100) * 2000)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Landing Criteria */}
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                {isSuccess ? `Success Criteria (${difficulty})` : 'Touchdown Results'}
              </div>
              <div className="hud-panel p-4 rounded-lg space-y-2 text-sm">
                {isSuccess ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Vertical Speed:</span>
                      <span className="text-green-400">≤ {criteria.maxVertVel} m/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Horizontal Speed:</span>
                      <span className="text-green-400">≤ {criteria.maxHorizVel} m/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Distance from Pad:</span>
                      <span className="text-green-400">≤ {criteria.maxDist} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Tilt Angle:</span>
                      <span className="text-green-400">≤ {criteria.maxAngle}°</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vertical Speed at Y=0:</span>
                      <span className={touchdownVertVel > criteria.maxVertVel ? 'text-red-400' : 'text-white'}>
                        {touchdownVertVel.toFixed(1)} m/s {touchdownVertVel > criteria.maxVertVel && `(max: ${criteria.maxVertVel})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Horizontal Speed at Y=0:</span>
                      <span className={touchdownHorizVel > criteria.maxHorizVel ? 'text-red-400' : 'text-white'}>
                        {touchdownHorizVel.toFixed(1)} m/s {touchdownHorizVel > criteria.maxHorizVel && `(max: ${criteria.maxHorizVel})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Distance from Pad:</span>
                      <span className={touchdownDist > criteria.maxDist ? 'text-red-400' : 'text-white'}>
                        {touchdownDist.toFixed(1)} m {touchdownDist > criteria.maxDist && `(max: ${criteria.maxDist})`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="space-y-3">
              {flight_review && (
                <button
                  onClick={() => setShowReview(true)}
                  className="w-full py-4 rounded-lg bg-blue-900/50 border border-blue-500/50 text-blue-400 hover:bg-blue-800/50 transition-colors font-display font-bold text-lg uppercase tracking-wider"
                >
                  📊 {t.gameOver.viewFlightReview}
                </button>
              )}
              <button
                onClick={resetGame}
                className="w-full py-4 rounded-lg btn-primary font-display font-bold text-lg uppercase tracking-wider"
              >
                {t.gameOver.tryAgain}
              </button>
            </div>
            
            {/* Tip */}
            <div className="text-[10px] text-gray-600 text-center">
              {isSuccess 
                ? t.gameOver.tipSuccess
                : t.gameOver.tipFailed}
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Flight Review Modal */}
      {showReview && <FlightReview onClose={() => setShowReview(false)} onTryAgain={resetGame} />}
    </div>
  )
}

export default GameOver

