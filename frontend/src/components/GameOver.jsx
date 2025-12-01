import useGameStore from '../stores/gameStore'

function GameOver() {
  const { gameState, resetGame } = useGameStore()
  const { rocket, score, time } = gameState
  
  const isSuccess = rocket.landed
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="hud-panel p-8 rounded-2xl max-w-md w-full mx-4 text-center">
        {/* Result banner */}
        <div className={`mb-6 ${isSuccess ? 'text-rocket-green' : 'text-red-500'}`}>
          <div className="text-6xl mb-2">
            {isSuccess ? '🚀' : '💥'}
          </div>
          <h1 className="text-4xl font-display font-black">
            {isSuccess ? 'LANDED!' : 'CRASHED'}
          </h1>
          <p className="text-sm opacity-80 mt-2">
            {isSuccess 
              ? 'The falcon has landed!' 
              : 'Better luck next time, astronaut'}
          </p>
        </div>
        
        {/* Score */}
        <div className="mb-6 py-4 border-y border-gray-700">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
            Final Score
          </div>
          <div className="text-5xl font-display font-black text-white">
            {score.toLocaleString()}
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-left">
          <div className="hud-panel p-3 rounded-lg">
            <div className="text-xs text-gray-400">Flight Time</div>
            <div className="text-lg font-mono text-white">{time.toFixed(1)}s</div>
          </div>
          <div className="hud-panel p-3 rounded-lg">
            <div className="text-xs text-gray-400">Fuel Remaining</div>
            <div className="text-lg font-mono text-white">
              {((rocket.fuel / 30000) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="hud-panel p-3 rounded-lg">
            <div className="text-xs text-gray-400">Final Position</div>
            <div className="text-sm font-mono text-white">
              X: {rocket.position[0].toFixed(1)}m
            </div>
          </div>
          <div className="hud-panel p-3 rounded-lg">
            <div className="text-xs text-gray-400">Final Speed</div>
            <div className="text-lg font-mono text-white">
              {rocket.speed.toFixed(1)} m/s
            </div>
          </div>
        </div>
        
        {/* Score breakdown (for successful landing) */}
        {isSuccess && score > 0 && (
          <div className="mb-6 text-left">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
              Score Breakdown
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Landing Accuracy</span>
                <span className="text-white">+{Math.min(3000, score)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Velocity Bonus</span>
                <span className="text-white">+{Math.min(2000, Math.max(0, score - 3000))}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Fuel Efficiency</span>
                <span className="text-white">+{Math.floor((rocket.fuel / 30000) * 2000)}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={resetGame}
            className="w-full py-4 rounded-lg btn-primary font-display font-bold text-lg uppercase tracking-wider"
          >
            Try Again
          </button>
        </div>
        
        {/* Tip */}
        <div className="mt-6 text-[10px] text-gray-600">
          {isSuccess 
            ? 'Pro tip: Start your landing burn earlier for softer touchdowns'
            : 'Tip: Watch your vertical speed and start braking earlier'}
        </div>
      </div>
    </div>
  )
}

export default GameOver

