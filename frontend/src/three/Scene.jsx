import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars, Sky } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../stores/gameStore'
import Rocket from './Rocket'
import LandingPad from './LandingPad'
import Ground from './Ground'

function Scene() {
  const { gameState } = useGameStore()
  const cameraRef = useRef()
  
  // Camera follow logic
  useFrame(({ camera }) => {
    const rocketPos = gameState.rocket.position
    const altitude = rocketPos[1]
    
    // Dynamic camera distance based on altitude
    const distance = Math.max(50, Math.min(500, altitude * 0.15 + 50))
    const height = Math.max(30, Math.min(200, altitude * 0.1 + 30))
    
    // Smooth camera follow
    const targetX = rocketPos[0]
    const targetY = rocketPos[1] + height * 0.3
    const targetZ = rocketPos[2] + distance
    
    camera.position.x += (targetX - camera.position.x) * 0.05
    camera.position.y += (targetY - camera.position.y) * 0.05
    camera.position.z += (targetZ - camera.position.z) * 0.05
    
    // Look at rocket
    camera.lookAt(rocketPos[0], rocketPos[1], rocketPos[2])
  })
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[100, 200, 100]} 
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ff6b35" />
      
      {/* Sky and stars */}
      <Sky 
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.5}
        azimuth={0.25}
      />
      <Stars 
        radius={300} 
        depth={100} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
      />
      
      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#1a1a2e', 500, 3000]} />
      
      {/* Ground and environment */}
      <Ground />
      <LandingPad />
      
      {/* The Rocket */}
      <Rocket />
    </>
  )
}

export default Scene

