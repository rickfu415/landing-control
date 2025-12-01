import { useRef } from 'react'
import * as THREE from 'three'

function LandingPad() {
  // Landing pad dimensions (like the drone ship)
  const padWidth = 50
  const padLength = 90
  
  return (
    <group position={[0, 0.1, 0]}>
      {/* Main deck */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[padWidth, 0.5, padLength]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.8} />
      </mesh>
      
      {/* Landing target - outer circle */}
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[18, 20, 64]} />
        <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Landing target - inner circle */}
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8, 10, 64]} />
        <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Center X mark */}
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, Math.PI/4]}>
        <planeGeometry args={[30, 3]} />
        <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, -Math.PI/4]}>
        <planeGeometry args={[30, 3]} />
        <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Edge barriers */}
      {[
        [padWidth/2, 1, 0],
        [-padWidth/2, 1, 0],
      ].map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[1, 2, padLength]} />
          <meshStandardMaterial color="#ff3333" />
        </mesh>
      ))}
      
      {/* Corner posts with lights */}
      {[
        [padWidth/2 - 2, 0, padLength/2 - 2],
        [-padWidth/2 + 2, 0, padLength/2 - 2],
        [padWidth/2 - 2, 0, -padLength/2 + 2],
        [-padWidth/2 + 2, 0, -padLength/2 + 2],
      ].map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 6, 8]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
          <pointLight 
            position={[0, 6, 0]} 
            intensity={20} 
            color="#00ff88" 
            distance={50}
          />
          <mesh position={[0, 6.5, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#00ff88" />
          </mesh>
        </group>
      ))}
      
      {/* "Of Course I Still Love You" text area (simplified) */}
      <mesh position={[0, 0.35, -35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 5]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

export default LandingPad

