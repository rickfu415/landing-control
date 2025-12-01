"""Physical constants for the rocket landing simulation."""

# Gravitational acceleration (m/s²)
GRAVITY = 9.81

# Earth parameters
EARTH_RADIUS = 6_371_000  # meters

# Atmospheric constants
SEA_LEVEL_PRESSURE = 101_325  # Pa
SEA_LEVEL_DENSITY = 1.225  # kg/m³
SEA_LEVEL_TEMPERATURE = 288.15  # K
TEMPERATURE_LAPSE_RATE = 0.0065  # K/m (troposphere)
MOLAR_MASS_AIR = 0.0289644  # kg/mol
GAS_CONSTANT = 8.31447  # J/(mol·K)

# Falcon 9-like rocket parameters
ROCKET_DRY_MASS = 22_200  # kg (first stage dry mass)
ROCKET_FUEL_MASS = 30_000  # kg (landing fuel reserve)
ROCKET_HEIGHT = 47.0  # meters
ROCKET_DIAMETER = 3.7  # meters
ROCKET_CROSS_SECTION = 10.75  # m² (approximate)

# Merlin engine parameters (sea level)
ENGINE_THRUST_MAX = 845_000  # N (single Merlin 1D)
ENGINE_THRUST_MIN = 0.4  # 40% throttle minimum
ENGINE_ISP_SEA_LEVEL = 282  # seconds
ENGINE_ISP_VACUUM = 311  # seconds
ENGINE_GIMBAL_RANGE = 5.0  # degrees
FUEL_FLOW_RATE = 306  # kg/s at full thrust

# Aerodynamic coefficients (approximate)
DRAG_COEFFICIENT_VERTICAL = 1.2  # nose-first or tail-first
DRAG_COEFFICIENT_HORIZONTAL = 2.0  # side-on
GRID_FIN_LIFT_COEFFICIENT = 0.8
GRID_FIN_AREA = 1.5  # m² per fin

# Landing parameters
LANDING_PAD_RADIUS = 25.0  # meters
MAX_LANDING_VELOCITY = 2.0  # m/s for safe landing
MAX_LANDING_ANGLE = 5.0  # degrees from vertical

# Simulation parameters
PHYSICS_TICK_RATE = 60  # Hz

