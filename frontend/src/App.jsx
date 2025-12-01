import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import useGameStore from './stores/gameStore'
import Scene from './three/Scene'
import HUD from './components/HUD'
import Controls from './components/Controls'
import Menu from './components/Menu'
import GameOver from './components/GameOver'

function App() {
  const { connect, connected, gameState, showMenu } = useGameStore()
  
  useEffect(() => {
    connect()
  }, [])
  
  const isGameOver = gameState.rocket.landed || gameState.rocket.crashed
  
  return (
    <div className="w-full h-full relative">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 100, 200], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
      
      {/* HUD Overlay */}
      <HUD />
      
      {/* Control Panel */}
      <Controls />
      
      {/* Connection Status */}
      {!connected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/80 px-4 py-2 rounded-lg border border-red-500">
          <span className="text-red-300 font-mono text-sm">
            ⚠ Connecting to server...
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

