import { useRef } from 'react'
import * as THREE from 'three'

function LandingPad() {
  // Landing pad dimensions - concrete pad on land
  const padWidth = 50
  const padLength = 90
  
  return (
    <group position={[0, 0.1, 0]}>
      {/* Concrete landing pad */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[padWidth, 0.5, padLength]} />
        <meshStandardMaterial color="#808080" metalness={0.0} roughness={0.9} />
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
      
      {/* Edge markings - painted lines instead of barriers */}
      {[
        [padWidth/2 - 1, 0.3, 0],
        [-padWidth/2 + 1, 0.3, 0],
      ].map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[2, 0.1, padLength]} />
          <meshStandardMaterial color="#ff3333" />
        </mesh>
      ))}
      
      {/* Corner markers - low profile for daytime landing */}
      {[
        [padWidth/2 - 2, 0, padLength/2 - 2],
        [-padWidth/2 + 2, 0, padLength/2 - 2],
        [padWidth/2 - 2, 0, -padLength/2 + 2],
        [-padWidth/2 + 2, 0, -padLength/2 + 2],
      ].map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
            <meshStandardMaterial color="#ff6600" />
          </mesh>
        </group>
      ))}
      
      {/* Landing zone text area */}
      <mesh position={[0, 0.35, -35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 5]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

export default LandingPad

