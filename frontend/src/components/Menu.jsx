import useGameStore from '../stores/gameStore'
import useLanguageStore from '../stores/languageStore'
import { useTranslation } from '../i18n/translations'
import { getRocketSpecs, formatMass } from '../data/rocketSpecs'
import ThrustProfilePlanner from './ThrustProfilePlanner'

function Menu() {
  const { connected, rocketPreset, setRocketPreset, startGame } = useGameStore()
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  
  // Get specs for selected rocket
  const specs = getRocketSpecs(rocketPreset)
  
  // Available rockets grouped by origin
  const rocketGroups = [
    {
      name: language === 'zh' ? '美国 SpaceX' : 'SpaceX (USA)',
      rockets: [
        { id: 'falcon9_block5_landing', flag: '🇺🇸' },
        { id: 'starship_super_heavy', flag: '🇺🇸' }
      ]
    },
    {
      name: language === 'zh' ? '中国' : 'China',
      rockets: [
        { id: 'long_march5_core', flag: '🇨🇳' },
        { id: 'long_march9_first_stage', flag: '🇨🇳' },
        { id: 'zhuque2_first_stage', flag: '🇨🇳' },
        { id: 'zhuque3_first_stage', flag: '🇨🇳' }
      ]
    },
    {
      name: language === 'zh' ? '俄罗斯' : 'Russia',
      rockets: [
        { id: 'soyuz_first_stage', flag: '🇷🇺' },
        { id: 'soyuz_booster', flag: '🇷🇺' },
        { id: 'proton_m_first_stage', flag: '🇷🇺' },
        { id: 'angara_a5_first_stage', flag: '🇷🇺' }
      ]
    }
  ]
  
  return (
    <div className="absolute inset-0 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8">
      <div className="hud-panel p-8 rounded-2xl w-full max-w-7xl mx-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-display font-black text-white mb-3">
            {t.menu.title}<span className="text-rocket-orange">{t.menu.titleHighlight}</span>
          </h1>
          <p className="text-gray-400 text-lg">
            {t.menu.subtitle}
          </p>
        </div>
        
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN - Configuration */}
          <div className="space-y-6">
            
            {/* Rocket selection */}
            <div>
              <label className="text-sm uppercase tracking-wider text-gray-400 mb-3 block font-bold">
                {t.menu.rocketSelection}
              </label>
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {rocketGroups.map((group) => (
                  <div key={group.name}>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1 font-bold">
                      {group.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.rockets.map((rocket) => (
                        <button
                          key={rocket.id}
                          onClick={() => setRocketPreset(rocket.id)}
                          className={`p-3 rounded-lg border transition-all text-left ${
                            rocketPreset === rocket.id
                              ? 'border-rocket-orange bg-rocket-orange/20 text-white shadow-lg shadow-rocket-orange/20'
                              : 'border-gray-700 bg-space-800 text-gray-400 hover:border-gray-500 hover:bg-space-700'
                          }`}
                        >
                          <div className="text-sm font-bold flex items-center gap-2">
                            <span className="text-lg">{rocket.flag}</span>
                            <span className="truncate">{t.menu.rockets[rocket.id]}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Start button */}
            <button
              onClick={startGame}
              disabled={!connected}
              className={`w-full py-5 rounded-lg font-display font-bold text-xl uppercase tracking-wider transition-all ${
                connected
                  ? 'btn-primary cursor-pointer'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {connected ? t.menu.launchMission : t.menu.connecting}
            </button>
            
            {/* Controls hint */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-3 font-bold">
                {t.menu.controls}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="text-rocket-orange">▸</span>
                  {t.menu.controlsHints.throttle}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rocket-orange">▸</span>
                  {t.menu.controlsHints.camera}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rocket-orange">▸</span>
                  {t.menu.controlsHints.gimbal}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rocket-orange">▸</span>
                  {t.menu.controlsHints.zoom}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rocket-orange">▸</span>
                  {t.menu.controlsHints.fullThrottle}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rocket-orange">▸</span>
                  {t.menu.controlsHints.pause}
                </div>
              </div>
            </div>
            
          </div>
          
          {/* RIGHT COLUMN - Information */}
          <div className="space-y-6">

            
            {/* Vehicle Specifications */}
            <div className="bg-space-900/50 p-6 rounded-lg border border-gray-700">
              <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4 font-bold flex items-center gap-2">
                <span className="text-rocket-orange">🚀</span>
                {t.menu.vehicleSpecs}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '高度' : 'Height'}:</span>
                  <span className="font-mono text-white">{specs.height} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '直径' : 'Diameter'}:</span>
                  <span className="font-mono text-white">{specs.diameter} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '干质量' : 'Dry Mass'}:</span>
                  <span className="font-mono text-white">{formatMass(specs.dryMass)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '燃料' : 'Fuel'}:</span>
                  <span className={`font-mono ${specs.fuelMass < 10000 ? 'text-yellow-400' : 'text-white'}`}>
                    {formatMass(specs.fuelMass)} {specs.fuelMass < 10000 ? '⚠️' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '发动机' : 'Engine'}:</span>
                  <span className="font-mono text-white">{specs.engine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '推力' : 'Thrust'}:</span>
                  <span className="font-mono text-white">{specs.thrust} kN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '比冲' : 'ISP'}:</span>
                  <span className="font-mono text-white">{specs.isp}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '节流阀' : 'Throttle'}:</span>
                  <span className="font-mono text-white">{specs.throttle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '万向节' : 'Gimbal'}:</span>
                  <span className="font-mono text-white">{specs.gimbal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'zh' ? '重力' : 'Gravity'}:</span>
                  <span className="font-mono text-white">9.81 m/s²</span>
                </div>
              </div>
            </div>
            
            {/* Mission Briefing */}
            <div className="bg-space-900/50 p-6 rounded-lg border border-gray-700">
              <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4 font-bold flex items-center gap-2">
                <span className="text-rocket-orange">📋</span>
                {t.menu.missionBriefing}
              </h3>
              <ul className="text-sm text-gray-400 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-rocket-orange text-lg">▸</span>
                  <span>{t.menu.briefing.initial}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-500 text-lg">▸</span>
                  <span className="text-yellow-400 font-semibold">
                    {language === 'zh' 
                      ? `初始燃料：${formatMass(specs.fuelMass)} - 请高效使用！` 
                      : `Initial fuel: ${formatMass(specs.fuelMass)} - be efficient!`}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rocket-orange text-lg">▸</span>
                  <span>{t.menu.briefing.landingVelocity}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rocket-orange text-lg">▸</span>
                  <span>{t.menu.briefing.padDistance}</span>
                </li>
              </ul>
            </div>
            
            {/* Thrust Profile Planner */}
            <ThrustProfilePlanner inMenu={true} />
            
            {/* Footer */}
            <div className="text-center text-sm text-gray-500 italic">
              {t.menu.footer}
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default Menu
