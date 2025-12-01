import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../stores/gameStore'

function EngineFlame({ throttle }) {
  const flameRef = useRef()
  const innerFlameRef = useRef()
  
  useFrame((state) => {
    if (flameRef.current && throttle > 0) {
      // Animate flame
      const scale = 0.8 + Math.sin(state.clock.elapsedTime * 30) * 0.2
      const length = throttle * 15 * scale
      flameRef.current.scale.set(1, length, 1)
      flameRef.current.position.y = -length / 2 - 2
      
      if (innerFlameRef.current) {
        innerFlameRef.current.scale.set(0.6, length * 0.8, 0.6)
        innerFlameRef.current.position.y = -length * 0.4 - 2
      }
    }
  })
  
  if (throttle <= 0) return null
  
  return (
    <group>
      {/* Outer flame (orange) */}
      <mesh ref={flameRef}>
        <coneGeometry args={[1.5, 1, 16]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.8} />
      </mesh>
      
      {/* Inner flame (bright yellow) */}
      <mesh ref={innerFlameRef}>
        <coneGeometry args={[0.8, 1, 16]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.9} />
      </mesh>
      
      {/* Point light for illumination */}
      <pointLight 
        position={[0, -5, 0]} 
        intensity={throttle * 50} 
        color="#ff6b35" 
        distance={100}
      />
    </group>
  )
}

function VelocityStreaks({ velocity, altitude }) {
  const streaksRef = useRef()
  const speed = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2)
  
  // Create streak positions
  const streakCount = 30
  const streaks = useMemo(() => {
    const positions = []
    for (let i = 0; i < streakCount; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 60 - 10,
        z: (Math.random() - 0.5) * 40,
        speed: 0.5 + Math.random() * 0.5
      })
    }
    return positions
  }, [])
  
  useFrame((state, delta) => {
    if (streaksRef.current && speed > 30) {
      streaksRef.current.children.forEach((streak, i) => {
        // Move streaks based on velocity
        streak.position.y += velocity[1] * delta * streaks[i].speed * 0.05
        streak.position.x += velocity[0] * delta * streaks[i].speed * 0.05
        streak.position.z += velocity[2] * delta * streaks[i].speed * 0.05
        
        // Reset position when out of view
        if (streak.position.y > 80) {
          streak.position.y = -20
          streak.position.x = (Math.random() - 0.5) * 40
          streak.position.z = (Math.random() - 0.5) * 40
        }
        if (streak.position.y < -30) {
          streak.position.y = 60
          streak.position.x = (Math.random() - 0.5) * 40
          streak.position.z = (Math.random() - 0.5) * 40
        }
      })
    }
  })
  
  // Only show streaks at high speed
  if (speed < 30 || altitude < 50) return null
  
  // Streak length based on speed
  const streakLength = Math.min(speed * 0.15, 20)
  const opacity = Math.min((speed - 30) / 100, 0.6)
  
  return (
    <group ref={streaksRef}>
      {streaks.map((streak, i) => (
        <mesh key={i} position={[streak.x, streak.y, streak.z]}>
          <boxGeometry args={[0.1, streakLength, 0.1]} />
          <meshBasicMaterial 
            color="#88ccff" 
            transparent 
            opacity={opacity * streak.speed} 
          />
        </mesh>
      ))}
    </group>
  )
}

function AirParticles({ velocity, altitude }) {
  const particlesRef = useRef()
  const speed = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2)
  
  const particleCount = 100
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60
      positions[i * 3 + 1] = Math.random() * 80 - 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60
    }
    return positions
  }, [])
  
  useFrame((state, delta) => {
    if (particlesRef.current && speed > 20) {
      const positions = particlesRef.current.geometry.attributes.position.array
      
      for (let i = 0; i < particleCount; i++) {
        // Move particles opposite to velocity direction
        positions[i * 3] += velocity[0] * delta * 0.08
        positions[i * 3 + 1] += velocity[1] * delta * 0.08
        positions[i * 3 + 2] += velocity[2] * delta * 0.08
        
        // Reset when out of bounds
        if (positions[i * 3 + 1] > 80 || positions[i * 3 + 1] < -30) {
          positions[i * 3] = (Math.random() - 0.5) * 60
          positions[i * 3 + 1] = velocity[1] < 0 ? 60 : -20
          positions[i * 3 + 2] = (Math.random() - 0.5) * 60
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  if (speed < 20 || altitude < 30) return null
  
  const particleSize = Math.min(speed * 0.02, 1.5)
  const opacity = Math.min((speed - 20) / 150, 0.4)
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        color="#aaddff" 
        size={particleSize} 
        transparent 
        opacity={opacity}
        sizeAttenuation
      />
    </points>
  )
}

function ReentryGlow({ velocity, altitude }) {
  const glowRef = useRef()
  const speed = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2)
  
  useFrame(() => {
    if (glowRef.current) {
      // Pulsing glow effect
      const pulse = 0.8 + Math.sin(Date.now() * 0.01) * 0.2
      glowRef.current.material.opacity = Math.min((speed - 100) / 200, 0.5) * pulse
    }
  })
  
  // Only show reentry glow at very high speeds
  if (speed < 100 || altitude < 100) return null
  
  const glowSize = 3 + (speed - 100) * 0.01
  
  return (
    <mesh ref={glowRef} position={[0, -15, 0]}>
      <sphereGeometry args={[glowSize, 16, 16]} />
      <meshBasicMaterial 
        color="#ff4400" 
        transparent 
        opacity={0.3}
        side={THREE.BackSide}
      />
    </mesh>
  )
}

function LandingLeg({ position, rotation, deployed }) {
  const legRef = useRef()
  const targetAngle = deployed ? Math.PI / 6 : 0
  
  useFrame(() => {
    if (legRef.current) {
      legRef.current.rotation.x += (targetAngle - legRef.current.rotation.x) * 0.1
    }
  })
  
  return (
    <group position={position} rotation={rotation}>
      <group ref={legRef}>
        {/* Leg strut */}
        <mesh position={[0, -4, 1]}>
          <boxGeometry args={[0.3, 8, 0.3]} />
          <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Foot pad */}
        <mesh position={[0, -8, 2]}>
          <cylinderGeometry args={[0.8, 1, 0.2, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

function GridFin({ position }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[2, 0.2, 1.5]} />
        <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Grid pattern */}
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[(i - 2) * 0.4, 0, 0]}>
          <boxGeometry args={[0.05, 0.3, 1.5]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
    </group>
  )
}

function Rocket() {
  const rocketRef = useRef()
  const { gameState } = useGameStore()
  
  const { position, velocity, orientation, throttle, legs_deployed, altitude } = gameState.rocket
  
  // Convert quaternion to Euler for Three.js
  const quaternion = useMemo(() => {
    return new THREE.Quaternion(orientation[1], orientation[2], orientation[3], orientation[0])
  }, [orientation])
  
  useFrame(() => {
    if (rocketRef.current) {
      // Update position
      rocketRef.current.position.set(position[0], position[1], position[2])
      
      // Update rotation from quaternion
      rocketRef.current.quaternion.copy(quaternion)
    }
  })
  
  return (
    <group ref={rocketRef}>
      {/* Velocity-based effects */}
      <VelocityStreaks velocity={velocity} altitude={altitude} />
      <AirParticles velocity={velocity} altitude={altitude} />
      <ReentryGlow velocity={velocity} altitude={altitude} />
      
      {/* Main body (first stage) */}
      <mesh position={[0, 12, 0]}>
        <cylinderGeometry args={[1.85, 1.85, 40, 32]} />
        <meshStandardMaterial 
          color="#e8e8e8" 
          metalness={0.6} 
          roughness={0.4}
        />
      </mesh>
      
      {/* Interstage (black band) */}
      <mesh position={[0, 30, 0]}>
        <cylinderGeometry args={[1.9, 1.9, 4, 32]} />
        <meshStandardMaterial color="#222222" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Engine section */}
      <mesh position={[0, -6, 0]}>
        <cylinderGeometry args={[1.85, 2.2, 6, 32]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Engine nozzle */}
      <mesh position={[0, -10, 0]}>
        <cylinderGeometry args={[1, 1.5, 3, 16]} />
        <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* SpaceX-style logo area (black) */}
      <mesh position={[0, 20, 1.9]}>
        <boxGeometry args={[2, 8, 0.1]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      
      {/* Grid fins */}
      <GridFin position={[2.2, 28, 0]} />
      <GridFin position={[-2.2, 28, 0]} />
      <GridFin position={[0, 28, 2.2]} />
      <GridFin position={[0, 28, -2.2]} />
      
      {/* Landing legs (4 legs) */}
      <LandingLeg 
        position={[1.8, -5, 0]} 
        rotation={[0, 0, 0]} 
        deployed={legs_deployed} 
      />
      <LandingLeg 
        position={[-1.8, -5, 0]} 
        rotation={[0, Math.PI, 0]} 
        deployed={legs_deployed} 
      />
      <LandingLeg 
        position={[0, -5, 1.8]} 
        rotation={[0, -Math.PI/2, 0]} 
        deployed={legs_deployed} 
      />
      <LandingLeg 
        position={[0, -5, -1.8]} 
        rotation={[0, Math.PI/2, 0]} 
        deployed={legs_deployed} 
      />
      
      {/* Engine flame */}
      <group position={[0, -11, 0]}>
        <EngineFlame throttle={throttle} />
      </group>
    </group>
  )
}

export default Rocket
