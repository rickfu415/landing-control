import { useMemo } from 'react'
import * as THREE from 'three'

function Ocean() {
  return (
    <mesh 
      receiveShadow 
      position={[0, -1, 0]} 
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[10000, 10000]} />
      <meshStandardMaterial 
        color="#0a3d62"
        metalness={0.2}
        roughness={0.6}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

function Horizon() {
  // Distant terrain/horizon
  return (
    <group>
      {/* Distant mountains/terrain silhouette */}
      <mesh position={[0, 50, -2000]} rotation={[0, 0, 0]}>
        <planeGeometry args={[10000, 200]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function Ground() {
  return (
    <group>
      <Ocean />
      <Horizon />
      
      {/* Subtle grid on ocean for depth perception */}
      <gridHelper 
        args={[2000, 100, '#0a4d72', '#0a3d62']} 
        position={[0, 0, 0]}
      />
    </group>
  )
}

export default Ground

