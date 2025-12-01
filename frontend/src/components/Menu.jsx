import useGameStore from '../stores/gameStore'

function Menu() {
  const { connected, gameMode, setGameMode, startGame } = useGameStore()
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="hud-panel p-8 rounded-2xl max-w-md w-full mx-4">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-black text-white mb-2">
            FALCON<span className="text-rocket-orange">LANDER</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Falcon 9 First Stage Landing Simulator
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
        
        {/* Realistic parameters info */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
            Vehicle Specifications (Falcon 9 Block 5)
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-500">
            <div>Dry Mass: 22,200 kg</div>
            <div className="text-yellow-500">Landing Fuel: 3,000 kg ⚠️</div>
            <div>Engine: Merlin 1D</div>
            <div>Thrust: 845 kN</div>
            <div>ISP: 282s (sea level)</div>
            <div>Throttle: 40-100%</div>
            <div>Gimbal: ±5°</div>
            <div>Gravity: 9.80665 m/s²</div>
          </div>
        </div>
        
        {/* Mission briefing */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
            Mission Briefing
          </h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-rocket-orange">▸</span>
              <span>Initial: 5,000m altitude, -180 m/s descent</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500">▸</span>
              <span className="text-yellow-500">Only 3,000 kg fuel - be efficient!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rocket-orange">▸</span>
              <span>Land with velocity &lt; 2 m/s vertical</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rocket-orange">▸</span>
              <span>Stay within 25m of pad center</span>
            </li>
          </ul>
        </div>
        
        {/* Controls hint */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
            Controls
          </h3>
          <div className="grid grid-cols-2 gap-x-4 text-[10px] text-gray-500">
            <div>W/S - Throttle up/down</div>
            <div>🖱️ Drag - Orbit camera</div>
            <div>A/D/Q/E - Gimbal control</div>
            <div>Scroll - Zoom in/out</div>
            <div>SPACE - Full throttle</div>
            <div>P - Pause game</div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-[10px] text-gray-600">
          Good luck, astronaut! 🚀
        </div>
      </div>
    </div>
  )
}

export default Menu
