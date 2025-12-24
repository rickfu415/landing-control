import { useMemo } from 'react'
import * as THREE from 'three'

function Land() {
  // Pure green grass surface
  return (
    <mesh 
      receiveShadow 
      position={[0, -1, 0]} 
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[50000, 50000]} />
      <meshStandardMaterial 
        color="#4A7C59"  // Grass green color
        metalness={0.0}
        roughness={0.95}
      />
    </mesh>
  )
}

function Buildings() {
  // Generate many buildings across the entire ground
  const buildings = useMemo(() => {
    const buildingList = []
    const colors = ["#8B8B8B", "#A0A0A0", "#7A7A7A", "#909090", "#888888", "#9A9A9A", "#7D7D7D", "#858585"]
    
    // Create a grid of buildings with some randomization
    for (let x = -2000; x <= 2000; x += 150) {
      for (let z = -2000; z <= 2000; z += 150) {
        // Skip area near landing pad (within 100m radius)
        const distFromCenter = Math.sqrt(x * x + z * z)
        if (distFromCenter < 100) continue
        
        // Randomly skip some positions for variety (60% density)
        if (Math.random() > 0.6) continue
        
        // Random building parameters
        const width = 15 + Math.random() * 25  // 15-40m
        const height = 15 + Math.random() * 60  // 15-75m
        const depth = 15 + Math.random() * 25  // 15-40m
        const color = colors[Math.floor(Math.random() * colors.length)]
        
        // Add some position variation
        const xOffset = (Math.random() - 0.5) * 50
        const zOffset = (Math.random() - 0.5) * 50
        
        buildingList.push({
          pos: [x + xOffset, height / 2, z + zOffset],
          size: [width, height, depth],
          color: color
        })
      }
    }
    
    return buildingList
  }, [])

  return (
    <group>
      {buildings.map((building, i) => (
        <mesh key={i} position={building.pos} castShadow receiveShadow>
          <boxGeometry args={building.size} />
          <meshStandardMaterial 
            color={building.color} 
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  )
}

function Mountains() {
  // Generate mountains across the terrain
  const mountains = useMemo(() => {
    const mountainList = []
    const colors = ["#5A6B5A", "#4A5B4A", "#6A7B6A", "#4A5A4A", "#5A6A5A", "#556555", "#4F5F4F"]
    
    // Create mountains in various locations
    for (let x = -3000; x <= 3000; x += 400) {
      for (let z = -3000; z <= 3000; z += 400) {
        // Skip area near landing pad and buildings (within 500m radius)
        const distFromCenter = Math.sqrt(x * x + z * z)
        if (distFromCenter < 500) continue
        
        // Randomly skip some positions (40% density)
        if (Math.random() > 0.4) continue
        
        // Random mountain parameters
        const height = 150 + Math.random() * 200  // 150-350m
        const radius = 100 + Math.random() * 150  // 100-250m
        const color = colors[Math.floor(Math.random() * colors.length)]
        
        // Add position variation
        const xOffset = (Math.random() - 0.5) * 200
        const zOffset = (Math.random() - 0.5) * 200
        
        mountainList.push({
          pos: [x + xOffset, 0, z + zOffset],
          height: height,
          radius: radius,
          color: color
        })
      }
    }
    
    return mountainList
  }, [])

  return (
    <group>
      {mountains.map((mountain, i) => (
        <mesh key={i} position={mountain.pos}>
          <coneGeometry args={[mountain.radius, mountain.height, 8]} />
          <meshStandardMaterial 
            color={mountain.color}
            metalness={0.0}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  )
}

function Horizon() {
  // Distant terrain/hills
  return (
    <group>
      {/* Distant hills - green/brown */}
      <mesh position={[0, 30, -2000]} rotation={[0, 0, 0]}>
        <planeGeometry args={[10000, 150]} />
        <meshBasicMaterial color="#6B8E23" transparent opacity={0.6} />
      </mesh>
      
      {/* More distant mountains - blue tint */}
      <mesh position={[0, 80, -3500]} rotation={[0, 0, 0]}>
        <planeGeometry args={[10000, 200]} />
        <meshBasicMaterial color="#4A6FA5" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}

function Ground() {
  return (
    <group>
      <Land />
      <Buildings />
      <Mountains />
      <Horizon />
    </group>
  )
}

export default Ground

