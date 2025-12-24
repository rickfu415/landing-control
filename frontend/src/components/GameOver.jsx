import { useState } from 'react'
import useGameStore from '../stores/gameStore'
import useLanguageStore from '../stores/languageStore'
import { useTranslation } from '../i18n/translations'
import FlightReview from './FlightReview'

function GameOver() {
  const { gameState, resetGame } = useGameStore()
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  const { rocket, score, time, flight_review } = gameState
  const [showReview, setShowReview] = useState(false)
  
  const isSuccess = rocket.landed
  
  // Get initial fuel mass from geometry (for percentage calculation)
  const initialFuelMass = rocket.geometry?.initial_fuel_mass || 3000  // Fallback to 3000 if not available
  const fuelPercent = (rocket.fuel / initialFuelMass) * 100
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="hud-panel p-8 rounded-2xl max-w-md w-full mx-4 text-center">
        {/* Result banner */}
        <div className={`mb-6 ${isSuccess ? 'text-rocket-green' : 'text-red-500'}`}>
          <div className="text-6xl mb-2">
            {isSuccess ? '🚀' : '💥'}
          </div>
          <h1 className="text-4xl font-display font-black">
            {isSuccess ? t.gameOver.landed : t.gameOver.crashed}
          </h1>
          <p className="text-sm opacity-80 mt-2">
            {isSuccess 
              ? t.gameOver.landedMessage 
              : t.gameOver.crashedMessage}
          </p>
        </div>
        
        {/* Score */}
        <div className="mb-6 py-4 border-y border-gray-700">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
            {t.gameOver.finalScore}
          </div>
          <div className="text-5xl font-display font-black text-white">
            {score.toLocaleString()}
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-left">
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
              X: {rocket.position[0].toFixed(1)}m
            </div>
          </div>
          <div className="hud-panel p-3 rounded-lg">
            <div className="text-xs text-gray-400">{t.gameOver.finalSpeed}</div>
            <div className="text-lg font-mono text-white">
              {(rocket.touchdown_velocity || 0).toFixed(1)} m/s
            </div>
          </div>
        </div>
        
        {/* Score breakdown (for successful landing) */}
        {isSuccess && score > 0 && (
          <div className="mb-6 text-left">
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
        <div className="mt-6 text-[10px] text-gray-600">
          {isSuccess 
            ? t.gameOver.tipSuccess
            : t.gameOver.tipFailed}
        </div>
      </div>
      
      {/* Flight Review Modal */}
      {showReview && <FlightReview onClose={() => setShowReview(false)} onTryAgain={resetGame} />}
    </div>
  )
}

export default GameOver

