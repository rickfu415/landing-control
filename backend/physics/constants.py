"""
Physical constants for the Falcon 9 First Stage landing simulation.

All values are based on publicly available SpaceX data and aerospace references.
Sources: SpaceX website, FAA documents, NASA, aerospace engineering references.
"""

import math

# =============================================================================
# FUNDAMENTAL CONSTANTS
# =============================================================================

# Standard gravitational acceleration at sea level (m/s²)
# This is the official standard value used in aerospace
GRAVITY = 9.80665

# Earth parameters
EARTH_RADIUS = 6_371_000  # meters
EARTH_MASS = 5.972e24  # kg

# Universal gas constant (J/(mol·K))
GAS_CONSTANT = 8.31446

# =============================================================================
# ATMOSPHERIC MODEL (International Standard Atmosphere - ISA)
# =============================================================================

# Sea level conditions
SEA_LEVEL_PRESSURE = 101_325  # Pa
SEA_LEVEL_DENSITY = 1.225  # kg/m³
SEA_LEVEL_TEMPERATURE = 288.15  # K (15°C)

# Troposphere (0-11km)
TEMPERATURE_LAPSE_RATE = 0.0065  # K/m
TROPOPAUSE_ALTITUDE = 11_000  # m
TROPOPAUSE_TEMPERATURE = 216.65  # K

# Air properties
MOLAR_MASS_AIR = 0.0289644  # kg/mol
SPECIFIC_HEAT_RATIO = 1.4  # γ for air (cp/cv)

# =============================================================================
# FALCON 9 FIRST STAGE - VEHICLE PARAMETERS
# Based on Falcon 9 Block 5 specifications
# =============================================================================

# Structural properties
ROCKET_DRY_MASS = 22_200  # kg (first stage dry mass without propellant)
ROCKET_HEIGHT = 47.7  # meters (first stage length)
ROCKET_DIAMETER = 3.66  # meters
ROCKET_CROSS_SECTION = math.pi * (ROCKET_DIAMETER / 2) ** 2  # ~10.52 m²

# Mass properties - REDUCED FUEL for challenging gameplay
# Theoretical minimum to stop from 180 m/s: ~1,500 kg
# With gravity losses + margin: ~3,000 kg
ROCKET_FUEL_MASS = 3_000  # kg (very limited landing fuel - challenging!)

# Moment of inertia approximations (for attitude dynamics)
# Modeled as uniform cylinder
ROCKET_MOI_PITCH = (1/12) * ROCKET_DRY_MASS * (ROCKET_HEIGHT ** 2)  # kg·m²
ROCKET_MOI_ROLL = (1/2) * ROCKET_DRY_MASS * (ROCKET_DIAMETER / 2) ** 2  # kg·m²

# Center of mass location (from bottom, approximate)
ROCKET_COM_HEIGHT = 20.0  # meters from engine

# =============================================================================
# MERLIN 1D ENGINE PARAMETERS
# Single engine used for landing (center engine)
# =============================================================================

# Thrust
ENGINE_THRUST_SEA_LEVEL = 845_000  # N (190,000 lbf)
ENGINE_THRUST_VACUUM = 914_000  # N (205,500 lbf)
ENGINE_THRUST_MAX = ENGINE_THRUST_SEA_LEVEL  # Use sea level for landing sim

# Throttle capability
ENGINE_THROTTLE_MIN = 0.40  # 40% minimum (can't go lower)
ENGINE_THROTTLE_MAX = 1.00  # 100%

# Specific impulse (efficiency)
ENGINE_ISP_SEA_LEVEL = 282  # seconds
ENGINE_ISP_VACUUM = 311  # seconds

# Gimbal (thrust vector control)
ENGINE_GIMBAL_RANGE = 5.0  # degrees (±5°)
ENGINE_GIMBAL_RATE = 15.0  # degrees/second (max slew rate)

# Fuel consumption
# Mass flow rate: m_dot = Thrust / (ISP * g0)
ENGINE_MASS_FLOW_MAX = ENGINE_THRUST_SEA_LEVEL / (ENGINE_ISP_SEA_LEVEL * GRAVITY)  # ~305 kg/s

# Engine response time
ENGINE_THROTTLE_RATE = 10.0  # % per second (throttle change rate)
ENGINE_IGNITION_DELAY = 0.5  # seconds (startup time)

# =============================================================================
# AERODYNAMIC PARAMETERS
# =============================================================================

# Drag coefficients (empirical estimates for cylindrical body)
DRAG_COEFFICIENT_AXIAL = 1.15  # Nose/tail-first (base drag dominant)
DRAG_COEFFICIENT_NORMAL = 1.80  # Side-on (much higher)
DRAG_COEFFICIENT_BASE = 0.30  # Base drag contribution

# Grid fin parameters (4 fins total)
GRID_FIN_COUNT = 4
GRID_FIN_AREA = 1.5  # m² per fin
GRID_FIN_LIFT_COEFFICIENT = 0.8  # Cl at moderate angles
GRID_FIN_DRAG_COEFFICIENT = 1.2  # High drag due to grid structure
GRID_FIN_MAX_DEFLECTION = 20.0  # degrees

# Landing leg parameters
LANDING_LEG_COUNT = 4
LANDING_LEG_SPAN = 18.0  # meters (deployed diameter)
LANDING_LEG_DEPLOY_TIME = 3.0  # seconds to fully deploy

# =============================================================================
# LANDING PARAMETERS
# =============================================================================

# Drone ship "Of Course I Still Love You" / "Just Read the Instructions"
LANDING_PAD_LENGTH = 91.0  # meters (300 ft)
LANDING_PAD_WIDTH = 52.0  # meters (170 ft)
LANDING_PAD_RADIUS = 25.0  # meters (effective target radius)

# Landing success criteria
MAX_LANDING_VELOCITY_VERTICAL = 2.0  # m/s (must be slower for safe landing)
MAX_LANDING_VELOCITY_HORIZONTAL = 1.0  # m/s
MAX_LANDING_ANGLE = 5.0  # degrees from vertical (tilt limit)

# Landing abort thresholds
ABORT_ALTITUDE = 50.0  # meters (below this, committed to landing)
ABORT_VELOCITY = 100.0  # m/s (above this at low altitude = abort)

# =============================================================================
# SIMULATION PARAMETERS
# =============================================================================

# Physics update rate
PHYSICS_TICK_RATE = 60  # Hz (updates per second)
PHYSICS_DT = 1.0 / PHYSICS_TICK_RATE  # seconds per tick

# Initial conditions (realistic entry scenario)
INITIAL_ALTITUDE = 5000.0  # meters (after entry burn)
INITIAL_VELOCITY_VERTICAL = -180.0  # m/s (descending)
INITIAL_VELOCITY_HORIZONTAL = 0.0  # m/s (entry burn killed horizontal velocity)

# =============================================================================
# DERIVED VALUES (for reference)
# =============================================================================
# Total initial mass: 22,200 + 3,000 = 25,200 kg
# TWR at full throttle: 845,000 / (25,200 * 9.81) = 3.42
# TWR at min throttle (40%): 338,000 / (25,200 * 9.81) = 1.37
# Max deceleration: (845,000/25,200) - 9.81 = 23.7 m/s² (~2.4 G net)
# Burn time to kill 180 m/s at full thrust: ~7.5 seconds
# Fuel consumed in 7.5s at full: 305 * 7.5 = 2,287 kg
# Remaining fuel margin: ~700 kg

# =============================================================================
# GUIDANCE CONSTANTS
# =============================================================================

# Suicide burn (hoverslam) parameters
SUICIDE_BURN_MARGIN = 1.15  # 15% safety margin on burn altitude
TERMINAL_VELOCITY_TARGET = 1.5  # m/s at touchdown

# PID controller gains (tuned for Falcon 9-like dynamics)
ATTITUDE_KP = 2.0  # Proportional gain for attitude control
ATTITUDE_KI = 0.1  # Integral gain
ATTITUDE_KD = 1.5  # Derivative gain

THROTTLE_KP = 0.5  # Proportional gain for throttle control
THROTTLE_KI = 0.05
THROTTLE_KD = 0.2
