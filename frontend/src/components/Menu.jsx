import useGameStore from '../stores/gameStore'

function Menu() {
  const { connected, gameMode, setGameMode, startGame } = useGameStore()
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="hud-panel p-8 rounded-2xl max-w-md w-full mx-4">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-black text-white mb-2">
            ROCKET<span className="text-rocket-orange">LANDER</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Land the first stage booster on the drone ship
          </p>
        </div>
        
        {/* Game mode selection */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-wider text-gray-400 mb-3 block">
            Game Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'manual', label: 'Manual', desc: 'Full control' },
              { id: 'assisted', label: 'Assisted', desc: 'Auto attitude' },
              { id: 'autonomous', label: 'Auto', desc: 'Watch AI' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setGameMode(mode.id)}
                className={`p-3 rounded-lg border transition-all ${
                  gameMode === mode.id
                    ? 'border-rocket-orange bg-rocket-orange/20 text-white'
                    : 'border-gray-700 bg-space-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-bold text-sm">{mode.label}</div>
                <div className="text-[10px] opacity-70">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Start button */}
        <button
          onClick={startGame}
          disabled={!connected}
          className={`w-full py-4 rounded-lg font-display font-bold text-lg uppercase tracking-wider transition-all ${
            connected
              ? 'btn-primary cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {connected ? 'Launch Mission' : 'Connecting...'}
        </button>
        
        {/* Instructions */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
            Mission Briefing
          </h3>
          <ul className="text-xs text-gray-500 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-rocket-orange">▸</span>
              <span>Starting altitude: 5,000m, descending at 200 m/s</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rocket-orange">▸</span>
              <span>Land on the drone ship with velocity &lt; 2 m/s</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rocket-orange">▸</span>
              <span>Keep the rocket upright (tilt &lt; 5°)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rocket-orange">▸</span>
              <span>Conserve fuel for maximum score</span>
            </li>
          </ul>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-[10px] text-gray-600">
          Press W/S to control throttle • A/D/Q/E for gimbal
        </div>
      </div>
    </div>
  )
}

export default Menu

