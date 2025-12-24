import * as THREE from 'three'

function LandingPad() {
  // SpaceX-style landing pad dimensions
  const padSize = 52  // meters square
  
  return (
    <group position={[0, 0, 0]}>
      {/* Concrete pad base */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[padSize, 0.3, padSize]} />
        <meshStandardMaterial color="#707070" metalness={0.0} roughness={0.95} />
      </mesh>
      
      {/* Yellow markings - elevated to avoid z-fighting */}
      <group position={[0, 0.2, 0]}>
        {/* Outer circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[18, 19, 64]} />
          <meshBasicMaterial color="#FFD700" side={THREE.DoubleSide} />
        </mesh>
        
        {/* Inner circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8, 9, 64]} />
          <meshBasicMaterial color="#FFD700" side={THREE.DoubleSide} />
        </mesh>
        
        {/* X mark - first line */}
        <mesh rotation={[-Math.PI / 2, 0, Math.PI/4]}>
          <planeGeometry args={[28, 1.5]} />
          <meshBasicMaterial color="#FFD700" side={THREE.DoubleSide} />
        </mesh>
        
        {/* X mark - second line */}
        <mesh rotation={[-Math.PI / 2, 0, -Math.PI/4]}>
          <planeGeometry args={[28, 1.5]} />
          <meshBasicMaterial color="#FFD700" side={THREE.DoubleSide} />
        </mesh>
      </group>
      
      {/* Corner markers */}
      {[
        [padSize/2 - 3, 0.3, padSize/2 - 3],
        [-padSize/2 + 3, 0.3, padSize/2 - 3],
        [padSize/2 - 3, 0.3, -padSize/2 + 3],
        [-padSize/2 + 3, 0.3, -padSize/2 + 3],
      ].map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.8, 0.8, 0.4, 16]} />
          <meshStandardMaterial color="#FFFFFF" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

export default LandingPad

