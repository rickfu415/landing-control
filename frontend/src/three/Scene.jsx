import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars, Sky, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../stores/gameStore'
import Rocket from './Rocket'
import LandingPad from './LandingPad'
import Ground from './Ground'

// Flying stars that move with velocity
function FlyingStars({ velocity, altitude }) {
  const pointsRef = useRef()
  const starCount = 500
  
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(starCount * 3)
    const spd = new Float32Array(starCount)
    
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 100 + Math.random() * 400
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)
      
      spd[i] = 0.5 + Math.random() * 1.5
    }
    
    return [pos, spd]
  }, [])
  
  useFrame((state, delta) => {
    if (!pointsRef.current) return
    
    const posArray = pointsRef.current.geometry.attributes.position.array
    const speed = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2)
    
    if (speed > 10) {
      for (let i = 0; i < starCount; i++) {
        posArray[i * 3] += velocity[0] * delta * speeds[i] * 0.3
        posArray[i * 3 + 1] += velocity[1] * delta * speeds[i] * 0.3
        posArray[i * 3 + 2] += velocity[2] * delta * speeds[i] * 0.3
        
        const x = posArray[i * 3]
        const y = posArray[i * 3 + 1]
        const z = posArray[i * 3 + 2]
        const dist = Math.sqrt(x*x + y*y + z*z)
        
        if (dist < 50 || dist > 600) {
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          const radius = 300 + Math.random() * 200
          
          const vMag = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2) + 0.001
          posArray[i * 3] = (velocity[0] / vMag) * radius + (Math.random() - 0.5) * 200
          posArray[i * 3 + 1] = (velocity[1] / vMag) * radius + (Math.random() - 0.5) * 200
          posArray[i * 3 + 2] = (velocity[2] / vMag) * radius + (Math.random() - 0.5) * 200
        }
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  const speed = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2)
  const starSize = Math.min(2 + speed * 0.01, 4)
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={starSize}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

// Distant background stars (static in world space)
function BackgroundStars() {
  const starsRef = useRef()
  
  const positions = useMemo(() => {
    const pos = new Float32Array(2000 * 3)
    
    for (let i = 0; i < 2000; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 2000 + Math.random() * 3000
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)
    }
    
    return pos
  }, [])
  
  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2000}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={2}
        transparent
        opacity={0.7}
        sizeAttenuation={false}
      />
    </points>
  )
}

// Colored nebula-like stars
function ColoredStars() {
  const positions = useMemo(() => {
    const pos = new Float32Array(500 * 3)
    
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 1500 + Math.random() * 2000
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)
    }
    
    return pos
  }, [])
  
  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={positions.slice(0, 600)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#88ccff"
          size={3}
          transparent
          opacity={0.5}
          sizeAttenuation={false}
        />
      </points>
      
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={150}
            array={positions.slice(600, 1050)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ffaa66"
          size={2.5}
          transparent
          opacity={0.4}
          sizeAttenuation={false}
        />
      </points>
      
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={150}
            array={positions.slice(1050, 1500)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#cc88ff"
          size={2}
          transparent
          opacity={0.3}
          sizeAttenuation={false}
        />
      </points>
    </>
  )
}

// Camera controller that follows rocket center
function CameraController() {
  const { camera } = useThree()
  const { gameState } = useGameStore()
  const controlsRef = useRef()
  const prevRocketPos = useRef(new THREE.Vector3(0, 5000, 0))
  const initialized = useRef(false)
  
  // Rocket center is at approximately 12m from bottom (half of 47.7m height, adjusted)
  const ROCKET_CENTER_OFFSET = 12  // meters from position (which is at engine)
  
  // Initialize camera position on mount
  useEffect(() => {
    if (!initialized.current) {
      // Set initial camera position - close to rocket
      camera.position.set(0, 5000 + ROCKET_CENTER_OFFSET + 30, 80)
      camera.lookAt(0, 5000 + ROCKET_CENTER_OFFSET, 0)
      initialized.current = true
    }
  }, [camera])
  
  useFrame(() => {
    if (!controlsRef.current) return
    
    // Rocket visual center (not engine position)
    const rocketCenter = new THREE.Vector3(
      gameState.rocket.position[0],
      gameState.rocket.position[1] + ROCKET_CENTER_OFFSET,
      gameState.rocket.position[2]
    )
    
    // Calculate how much the rocket moved
    const rocketDelta = rocketCenter.clone().sub(prevRocketPos.current)
    
    // Move camera with rocket to maintain relative position
    camera.position.add(rocketDelta)
    
    // Always target the rocket center
    controlsRef.current.target.copy(rocketCenter)
    
    // Update previous position
    prevRocketPos.current.copy(rocketCenter)
    
    controlsRef.current.update()
  })
  
  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}          // No panning - rocket stays centered
      enableZoom={true}
      enableRotate={true}
      minDistance={40}           // Can't get too close (rocket is ~48m tall)
      maxDistance={300}          // Can't get too far
      maxPolarAngle={Math.PI * 0.85}
      minPolarAngle={Math.PI * 0.1}
      enableDamping={true}
      dampingFactor={0.05}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
    />
  )
}

function Scene() {
  const { gameState } = useGameStore()
  
  return (
    <>
      {/* Camera controller - follows rocket center, user can only change angle */}
      <CameraController />
      
      {/* Lighting */}
      <ambientLight intensity={0.25} />
      <directionalLight 
        position={[100, 200, 100]} 
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ff6b35" />
      
      {/* Multiple star layers */}
      <BackgroundStars />
      <ColoredStars />
      <FlyingStars 
        velocity={gameState.rocket.velocity} 
        altitude={gameState.rocket.altitude}
      />
      
      {/* Default drei Stars */}
      <Stars 
        radius={400} 
        depth={200} 
        count={3000} 
        factor={6} 
        saturation={0.2} 
        fade 
        speed={0.5}
      />
      
      {/* Sky gradient for atmosphere (only at lower altitudes) */}
      {gameState.rocket.altitude < 3000 && (
        <Sky 
          distance={450000}
          sunPosition={[100, 20, 100]}
          inclination={0.5}
          azimuth={0.25}
        />
      )}
      
      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#0a0a1a', 500, 4000]} />
      
      {/* Ground and environment */}
      <Ground />
      <LandingPad />
      
      {/* The Rocket */}
      <Rocket />
    </>
  )
}

export default Scene
