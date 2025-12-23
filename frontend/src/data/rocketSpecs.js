/**
 * Rocket specifications database
 * Data sourced from backend/physics/geometry.py
 */

// Physics constants
const GRAVITY = 9.80665 // m/s²
const INITIAL_ALTITUDE = 5000 // meters
const SEA_LEVEL_DENSITY = 1.225 // kg/m³
const SEA_LEVEL_TEMP = 288.15 // K
const TEMP_LAPSE = 0.0065 // K/m
const DRAG_COEFFICIENT = 0.6 // Axial drag for cylindrical body
const DEFAULT_SAFETY_MARGIN = 1.10 // 10% extra fuel

/**
 * Calculate terminal velocity for a rocket at given altitude
 * 
 * Formula: v_term = sqrt(2 * m * g / (ρ * A * Cd))
 * 
 * @param {number} totalMass - Total mass (dry + fuel) in kg
 * @param {number} diameter - Rocket diameter in meters
 * @param {number} altitude - Altitude in meters
 * @returns {number} Terminal velocity in m/s
 */
function calculateTerminalVelocity(totalMass, diameter, altitude = INITIAL_ALTITUDE) {
  // Atmospheric density at altitude (ISA model)
  const tempAtAlt = SEA_LEVEL_TEMP - TEMP_LAPSE * altitude
  const density = SEA_LEVEL_DENSITY * Math.pow(tempAtAlt / SEA_LEVEL_TEMP, 4.256)
  
  // Cross-sectional area
  const area = Math.PI * Math.pow(diameter / 2, 2)
  
  // Terminal velocity
  const vTerm = Math.sqrt((2 * totalMass * GRAVITY) / (density * area * DRAG_COEFFICIENT))
  
  return vTerm
}

/**
 * Calculate optimal landing fuel based on rocket parameters and terminal velocity
 * 
 * Formula:
 * 1. Calculate terminal velocity at starting altitude (5000m)
 * 2. Calculate mass flow rate: mdot = Thrust / (ISP * g0)
 * 3. Estimate burn time needed to kill terminal velocity with gravity losses
 * 4. Calculate fuel needed: fuel = mdot * burn_time
 * 5. Add safety margin (default 10%)
 * 
 * @param {number} dryMass - Dry mass in kg
 * @param {number} diameter - Rocket diameter in meters
 * @param {number} thrust - Thrust in kN
 * @param {number} isp - Specific impulse in seconds
 * @param {number} safetyMargin - Safety margin multiplier (default 1.10 = 10% extra)
 * @returns {number} Optimal landing fuel in kg
 */
function calculateLandingFuel(dryMass, diameter, thrust, isp, safetyMargin = DEFAULT_SAFETY_MARGIN) {
  // Convert thrust from kN to N
  const thrustN = thrust * 1000
  
  // Calculate mass flow rate (kg/s)
  const massFlowRate = thrustN / (isp * GRAVITY)
  
  // Iteratively calculate fuel needed (converges in ~10-15 iterations)
  let fuelNeeded = 1000 // Initial guess
  
  for (let i = 0; i < 15; i++) {
    // Total mass at start (with fuel)
    const totalMass = dryMass + fuelNeeded
    
    // Calculate terminal velocity at starting altitude
    const terminalVelocity = calculateTerminalVelocity(totalMass, diameter, INITIAL_ALTITUDE)
    
    // Average mass during burn
    const avgMass = dryMass + (fuelNeeded / 2)
    const avgAccel = (thrustN / avgMass) - GRAVITY
    
    // Burn time to kill terminal velocity
    const burnTime = terminalVelocity / avgAccel
    
    // Fuel consumed
    fuelNeeded = massFlowRate * burnTime
  }
  
  // Add safety margin and round to nearest 100 kg
  const fuelWithMargin = fuelNeeded * safetyMargin
  return Math.round(fuelWithMargin / 100) * 100
}

export const rocketSpecs = {
  falcon9_block5_landing: {
    height: 47.7,
    diameter: 3.66,
    dryMass: 22200,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'Merlin 1D',
    thrust: 845,
    isp: 282,
    throttle: '40-100%',
    gimbal: '±5°'
  },
  starship_super_heavy: {
    height: 69.0,
    diameter: 9.0,
    dryMass: 200000,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp, 1.10) },  // 10% margin
    engine: '3× Raptor',
    thrust: 6900,  // 3 engines for landing (like Falcon 9 uses 1 of 9)
    isp: 330,
    throttle: '40-100%',
    gimbal: '±15°'
  },
  long_march5_core: {
    height: 33.0,
    diameter: 5.0,
    dryMass: 18000,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'YF-77',
    thrust: 700,
    isp: 310,
    throttle: '40-100%',
    gimbal: '±5°'
  },
  long_march9_first_stage: {
    height: 50.0,
    diameter: 10.6,
    dryMass: 150000,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'YF-130',
    thrust: 4800,
    isp: 335,
    throttle: '40-100%',
    gimbal: '±8°'
  },
  soyuz_first_stage: {
    height: 27.8,
    diameter: 2.95,
    dryMass: 6545,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'RD-107A',
    thrust: 838,
    isp: 263,
    throttle: '40-100%',
    gimbal: '±7°'
  },
  soyuz_booster: {
    height: 19.6,
    diameter: 2.68,
    dryMass: 3784,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'RD-107A',
    thrust: 838,
    isp: 263,
    throttle: '40-100%',
    gimbal: '±7°'
  },
  proton_m_first_stage: {
    height: 21.2,
    diameter: 4.15,
    dryMass: 31000,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'RD-276',
    thrust: 1014,
    isp: 285,
    throttle: '40-100%',
    gimbal: '±7°'
  },
  angara_a5_first_stage: {
    height: 25.0,
    diameter: 3.6,
    dryMass: 9500,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'RD-191',
    thrust: 2080,
    isp: 311,
    throttle: '40-100%',
    gimbal: '±8°'
  },
  zhuque2_first_stage: {
    height: 30.0,
    diameter: 3.35,
    dryMass: 8000,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'TQ-12',
    thrust: 670,
    isp: 290,
    throttle: '40-100%',
    gimbal: '±6°'
  },
  zhuque3_first_stage: {
    height: 40.0,
    diameter: 4.5,
    dryMass: 25000,
    get fuelMass() { return calculateLandingFuel(this.dryMass, this.diameter, this.thrust, this.isp) },
    engine: 'TQ-12',
    thrust: 670,
    isp: 290,
    throttle: '40-100%',
    gimbal: '±6°'
  }
}

/**
 * Format mass with appropriate units
 */
export function formatMass(kg) {
  if (kg >= 1000000) {
    return `${(kg / 1000).toLocaleString()} t`
  } else if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString()} t`
  }
  return `${kg.toLocaleString()} kg`
}

/**
 * Get rocket specs by preset name
 */
export function getRocketSpecs(presetName) {
  return rocketSpecs[presetName] || rocketSpecs.falcon9_block5_landing
}

