import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../stores/gameStore'

function EngineFlame({ throttle }) {
  const flameRef = useRef()
  const innerFlameRef = useRef()
  
  useFrame((state) => {
    if (flameRef.current) {
      if (throttle > 0.01) {
        // Animate flame with pulsing effect
        const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 30) * 0.2
        
        // Scale both length and width with throttle
        const length = throttle * 15 * pulse
        const width = 0.5 + throttle * 1.0  // Width scales from 0.5 to 1.5
        
        flameRef.current.scale.set(width, length, width)
        flameRef.current.position.y = -length / 2  // Start directly from nozzle
        flameRef.current.visible = true
        
        if (innerFlameRef.current) {
          const innerWidth = width * 0.6
          innerFlameRef.current.scale.set(innerWidth, length * 0.8, innerWidth)
          innerFlameRef.current.position.y = -length * 0.4  // Inner flame follows
          innerFlameRef.current.visible = true
        }
      } else {
        // Hide flames when throttle is zero
        flameRef.current.visible = false
        if (innerFlameRef.current) {
          innerFlameRef.current.visible = false
        }
      }
    }
  })
  
  return (
    <group>
      {/* Outer flame (orange) - cone without base cap */}
      <mesh ref={flameRef}>
        <coneGeometry args={[1.0, 2, 16, 1, true]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.7 + throttle * 0.2} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Inner flame (bright yellow) */}
      <mesh ref={innerFlameRef}>
        <coneGeometry args={[0.6, 2, 16, 1, true]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.8 + throttle * 0.2} side={THREE.DoubleSide} />
      </mesh>
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

function ReentryGlow({ velocity, altitude, throttle }) {
  // Disabled - no reentry glow effect
  return null
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
  
  const { position, velocity, orientation, throttle, legs_deployed, altitude, geometry } = gameState.rocket
  
  // Get rocket dimensions from geometry (with defaults for backward compatibility)
  const rocketHeight = geometry?.height || 47.7
  const rocketRadius = geometry?.radius || 1.83  // diameter/2 = 3.66/2
  const rocketDiameter = geometry?.diameter || 3.66
  
  // Calculate component positions relative to rocket center
  // Rocket position is at engine (bottom), so center is at height/2
  const rocketCenter = rocketHeight / 2
  
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
      {/* Main body (first stage) */}
      <mesh position={[0, rocketCenter, 0]}>
        <cylinderGeometry args={[rocketRadius, rocketRadius, rocketHeight, 32]} />
        <meshStandardMaterial 
          color="#e8e8e8" 
          metalness={0.6} 
          roughness={0.4}
        />
      </mesh>
      
      {/* Interstage (black band) - positioned near top */}
      <mesh position={[0, rocketHeight * 0.63, 0]}>
        <cylinderGeometry args={[rocketRadius * 1.03, rocketRadius * 1.03, rocketHeight * 0.084, 32]} />
        <meshStandardMaterial color="#222222" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Engine section - wider at bottom, connects to main body */}
      <mesh position={[0, rocketHeight * -0.063, 0]}>
        <cylinderGeometry args={[rocketRadius, rocketRadius * 1.2, rocketHeight * 0.126, 32]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Engine nozzle - positioned to connect with engine section */}
      <mesh position={[0, rocketHeight * -0.1575, 0]}>
        <cylinderGeometry args={[rocketRadius * 0.55, rocketRadius * 0.82, rocketHeight * 0.063, 16]} />
        <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* SpaceX-style logo area (black) */}
      <mesh position={[0, rocketHeight * 0.42, rocketRadius * 1.04]}>
        <boxGeometry args={[rocketDiameter * 0.55, rocketHeight * 0.168, 0.1]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      
      {/* Grid fins - positioned near top */}
      <GridFin position={[rocketRadius * 1.2, rocketHeight * 0.587, 0]} />
      <GridFin position={[-rocketRadius * 1.2, rocketHeight * 0.587, 0]} />
      <GridFin position={[0, rocketHeight * 0.587, rocketRadius * 1.2]} />
      <GridFin position={[0, rocketHeight * 0.587, -rocketRadius * 1.2]} />
      
      {/* Landing legs (4 legs) - positioned at bottom */}
      <LandingLeg 
        position={[rocketRadius * 0.98, rocketHeight * -0.105, 0]} 
        rotation={[0, 0, 0]} 
        deployed={legs_deployed} 
      />
      <LandingLeg 
        position={[-rocketRadius * 0.98, rocketHeight * -0.105, 0]} 
        rotation={[0, Math.PI, 0]} 
        deployed={legs_deployed} 
      />
      <LandingLeg 
        position={[0, rocketHeight * -0.105, rocketRadius * 0.98]} 
        rotation={[0, -Math.PI/2, 0]} 
        deployed={legs_deployed} 
      />
      <LandingLeg 
        position={[0, rocketHeight * -0.105, -rocketRadius * 0.98]} 
        rotation={[0, Math.PI/2, 0]} 
        deployed={legs_deployed} 
      />
      
      {/* Engine flame - positioned at bottom of nozzle */}
      <group position={[0, rocketHeight * -0.189, 0]}>
        <EngineFlame throttle={throttle} />
      </group>
    </group>
  )
}

export default Rocket
