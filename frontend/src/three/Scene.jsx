import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../stores/gameStore'
import Rocket from './Rocket'
import LandingPad from './LandingPad'
import Ground from './Ground'

// Moving clouds to show falling motion
function MovingClouds({ velocity, altitude }) {
  const cloudsRef = useRef()
  const cloudCount = 30
  
  const cloudData = useMemo(() => {
    const clouds = []
    for (let i = 0; i < cloudCount; i++) {
      clouds.push({
        x: (Math.random() - 0.5) * 2000,
        y: 500 + Math.random() * 3000,  // Clouds between 500m and 3500m
        z: (Math.random() - 0.5) * 2000,
        size: 30 + Math.random() * 50,
        opacity: 0.3 + Math.random() * 0.4,
        driftSpeed: 0.5 + Math.random() * 1.5
      })
    }
    return clouds
  }, [])
  
  useFrame((state, delta) => {
    if (!cloudsRef.current) return
    
    cloudsRef.current.children.forEach((cloud, i) => {
      const data = cloudData[i]
      
      // Move clouds relative to rocket velocity (parallax effect)
      cloud.position.y += velocity[1] * delta * 0.15
      cloud.position.x += velocity[0] * delta * 0.15
      cloud.position.z += velocity[2] * delta * 0.15
      
      // Add natural drift
      cloud.position.x += data.driftSpeed * delta
      
      // Reset clouds that go too far
      if (cloud.position.y > altitude + 4000) {
        cloud.position.y = altitude - 500
        cloud.position.x = (Math.random() - 0.5) * 2000
        cloud.position.z = (Math.random() - 0.5) * 2000
      }
      if (cloud.position.y < altitude - 1000) {
        cloud.position.y = altitude + 3500
        cloud.position.x = (Math.random() - 0.5) * 2000
        cloud.position.z = (Math.random() - 0.5) * 2000
      }
      
      // Animate cloud opacity
      const baseMaterial = cloud.children[0]?.material
      if (baseMaterial) {
        baseMaterial.opacity = data.opacity + Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.1
      }
    })
  })
  
  return (
    <group ref={cloudsRef}>
      {cloudData.map((cloud, i) => (
        <group key={i} position={[cloud.x, cloud.y, cloud.z]}>
          {/* Main cloud body - multiple spheres for fluffy look */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[cloud.size, 8, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent 
              opacity={cloud.opacity}
              roughness={1}
              metalness={0}
            />
          </mesh>
          <mesh position={[cloud.size * 0.5, cloud.size * 0.2, 0]}>
            <sphereGeometry args={[cloud.size * 0.7, 8, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent 
              opacity={cloud.opacity * 0.8}
              roughness={1}
              metalness={0}
            />
          </mesh>
          <mesh position={[-cloud.size * 0.4, -cloud.size * 0.1, 0]}>
            <sphereGeometry args={[cloud.size * 0.6, 8, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent 
              opacity={cloud.opacity * 0.9}
              roughness={1}
              metalness={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Camera controller that follows rocket center
function CameraController() {
  const { camera } = useThree()
  const { gameState } = useGameStore()
  const controlsRef = useRef()
  const prevRocketPos = useRef(new THREE.Vector3(0, 5000, 0))
  const initialized = useRef(false)
  
  // Rocket center is at half height from bottom (position is at engine)
  const rocketHeight = gameState.rocket.geometry?.height || 47.7
  const ROCKET_CENTER_OFFSET = rocketHeight / 2  // meters from position (which is at engine)
  
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
      
      {/* Daytime Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[100, 200, 100]} 
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {/* Sun light */}
      <directionalLight 
        position={[-50, 150, -50]} 
        intensity={1.0}
        color="#FFF8DC"
      />
      
      {/* Daytime Sky */}
      <Sky 
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.6}
        azimuth={0.25}
        turbidity={2}
        rayleigh={0.5}
      />
      
      {/* Moving Clouds */}
      <MovingClouds 
        velocity={gameState.rocket.velocity}
        altitude={gameState.rocket.altitude}
      />
      
      {/* Daytime fog for depth */}
      <fog attach="fog" args={['#87CEEB', 1000, 5000]} />
      
      {/* Ground and environment */}
      <Ground />
      <LandingPad />
      
      {/* The Rocket */}
      <Rocket />
    </>
  )
}

export default Scene
