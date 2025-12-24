import useLanguageStore from '../stores/languageStore'
import useGameStore from '../stores/gameStore'

function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore()
  const { showMenu, gameState } = useGameStore()
  
  // Only show on menu screen (not during game or game over)
  const isGameOver = gameState.rocket.landed || gameState.rocket.crashed
  if (!showMenu || isGameOver) return null
  
  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-auto">
      <div className="hud-panel rounded-lg overflow-hidden flex">
        <button
          onClick={() => setLanguage('en')}
          className={`px-4 py-2 text-sm font-bold transition-all ${
            language === 'en'
              ? 'bg-rocket-orange text-white'
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
        >
          English
        </button>
        <div className="w-px bg-gray-700" />
        <button
          onClick={() => setLanguage('zh')}
          className={`px-4 py-2 text-sm font-bold transition-all ${
            language === 'zh'
              ? 'bg-rocket-orange text-white'
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
        >
          中文
        </button>
      </div>
    </div>
  )
}

export default LanguageSelector

