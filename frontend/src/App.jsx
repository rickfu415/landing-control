import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import useGameStore from './stores/gameStore'
import useLanguageStore from './stores/languageStore'
import { useTranslation } from './i18n/translations'
import Scene from './three/Scene'
import HUD from './components/HUD'
import Controls from './components/Controls'
import ThrustProfilePlanner from './components/ThrustProfilePlanner'
import Menu from './components/Menu'
import GameOver from './components/GameOver'
import LanguageSelector from './components/LanguageSelector'

function App() {
  const { connect, disconnect, connected, gameState, showMenu } = useGameStore()
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  const hasConnected = useRef(false)
  
  useEffect(() => {
    // Prevent multiple connections during development HMR
    if (!hasConnected.current) {
      console.log('[App] Initializing WebSocket connection...')
      hasConnected.current = true
      connect()
    }
    
    // Cleanup function to disconnect when component unmounts
    return () => {
      console.log('[App] Component unmounting, disconnecting...')
      disconnect()
      hasConnected.current = false
    }
  }, [])
  
  const isGameOver = gameState.rocket.landed || gameState.rocket.crashed
  
  return (
    <div className="w-full h-full relative">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [60, 160, 0], fov: 60, far: 20000 }}
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
      
      {/* Language Selector */}
      <LanguageSelector />
      
      {/* HUD Overlay */}
      <HUD />
      
      {/* Control Panel */}
      <Controls />
      
      {/* Thrust Profile Planner */}
      <ThrustProfilePlanner />
      
      {/* Connection Status */}
      {!connected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/80 px-4 py-2 rounded-lg border border-red-500">
          <span className="text-red-300 font-mono text-sm">
            {t.connection.connecting}
          </span>
        </div>
      )}
      
      {/* Main Menu */}
      {showMenu && !isGameOver && <Menu />}
      
      {/* Game Over Screen */}
      {isGameOver && <GameOver />}
    </div>
  )
}

export default App

