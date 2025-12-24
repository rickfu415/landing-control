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
      <Horizon />
    </group>
  )
}

export default Ground

