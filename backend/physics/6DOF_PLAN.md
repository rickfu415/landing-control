# 6-DOF Rigid Body Motion Solver - Implementation Plan

## Overview
This document outlines the plan for implementing a proper 6-degree-of-freedom (6-DOF) rigid body motion solver for the rocket landing simulation. The rocket will be modeled as a configurable cylinder with realistic physics.

## Current State Analysis

### What Exists:
- ✅ Basic quaternion-based orientation representation
- ✅ Simplified angular velocity tracking
- ✅ Basic thrust vector calculation with gimbal
- ✅ Atmospheric model (ISA)
- ✅ Simple drag force calculation
- ✅ Fuel consumption model

### Limitations:
- ❌ Only pitch moment of inertia (Iyy) - missing Ixx, Izz, and cross-coupling terms
- ❌ Simplified torque calculations (gimbal only, no aerodynamic moments)
- ❌ Fixed rocket dimensions (hardcoded in constants)
- ❌ Drag only considers axial direction
- ❌ No proper body-frame vs world-frame force resolution
- ❌ Angular dynamics don't follow Euler's equations

## Architecture Design

### 1. RocketGeometry Class
**Purpose**: Encapsulate rocket physical properties as a configurable cylinder

**Properties**:
- `height` (m) - cylinder length
- `diameter` (m) - cylinder diameter  
- `dry_mass` (kg) - structural mass
- `fuel_mass` (kg) - initial fuel mass
- `com_height` (m) - center of mass from bottom
- `fuel_com_height` (m) - fuel center of mass (varies with fuel level)

**Methods**:
- `get_cross_sectional_area()` - π * (diameter/2)²
- `get_surface_area()` - total surface area
- `get_mass(fuel_remaining)` - total mass at given fuel level
- `get_com_position(fuel_remaining)` - center of mass position vector
- `get_inertia_tensor(fuel_remaining)` - full 3x3 inertia matrix

**Inertia Tensor Calculation**:
For a cylinder with mass m, height h, radius r:
- Ixx = Izz = (1/12) * m * (3*r² + h²)  [about center]
- Iyy = (1/2) * m * r²  [about center]
- Cross terms (Ixy, Ixz, Iyz) = 0 for symmetric cylinder

When COM is offset, use parallel axis theorem:
- I' = I_cm + m * d² (where d is distance from COM)

### 2. RigidBodyDynamics Class
**Purpose**: Solve 6-DOF equations of motion

**State Variables**:
- Position: r = [x, y, z] (world frame)
- Velocity: v = [vx, vy, vz] (world frame)
- Orientation: q = [w, x, y, z] (quaternion)
- Angular velocity: ω = [ωx, ωy, ωz] (body frame)

**Equations**:

**Translational Motion** (Newton's 2nd Law):
```
F_total = F_gravity + F_thrust + F_aero + F_other
a_world = F_total / m
v_world = v_world + a_world * dt
r_world = r_world + v_world * dt
```

**Rotational Motion** (Euler's Equations):
```
τ_total = τ_thrust + τ_aero + τ_other
ω_dot = I⁻¹ * (τ_total - ω × (I * ω))  [body frame]
ω_body = ω_body + ω_dot * dt
q_dot = 0.5 * q * [0, ωx, ωy, ωz]  [quaternion derivative]
q = q + q_dot * dt
q = normalize(q)
```

**Key Methods**:
- `compute_forces(state, geometry, controls, atmosphere)` - sum all forces
- `compute_torques(state, geometry, controls, atmosphere)` - sum all torques
- `integrate(state, forces, torques, dt)` - advance state by one timestep
- `body_to_world(vector_body, quaternion)` - transform body→world
- `world_to_body(vector_world, quaternion)` - transform world→body

### 3. Enhanced Aerodynamic Model

#### 3.1 Wind Model
**Purpose**: Model horizontal wind effects on landing

**Wind Profile** (altitude-dependent):
- Surface wind: user-configurable (0-20 m/s typical)
- Wind gradient: decreases with altitude (exponential decay)
- Wind direction: horizontal only (x-z plane)

**Wind Velocity**:
```
V_wind(h) = V_surface * exp(-h / h_scale)
```
Where:
- `h` = altitude (m)
- `h_scale` = wind scale height (~1000-2000 m)
- `V_surface` = wind speed at surface (m/s)

**Relative Velocity**:
```
V_relative = V_rocket - V_wind  [world frame]
V_relative_body = R^T * V_relative  [body frame]
```

#### 3.2 Realistic Drag Model

**Velocity-Dependent Drag Coefficients**:
Drag coefficients vary with:
- **Mach number** (M = v / a_sound)
- **Reynolds number** (Re = ρ * v * L / μ)
- **Angle of attack** (α)

**Drag Coefficient Functions**:

**Axial Drag** (nose/tail-first):
```
Cd_axial(M, Re) = Cd_base + Cd_wave(M) + Cd_friction(Re)
```
Where:
- `Cd_base` = base drag (~0.3-0.5)
- `Cd_wave(M)` = compressibility effects (wave drag)
  - Subsonic (M < 0.8): ~0.0
  - Transonic (0.8 < M < 1.2): increases sharply
  - Supersonic (M > 1.2): decreases ~1/M²
- `Cd_friction(Re)` = skin friction drag
  - Laminar: ~1.328 / √Re
  - Turbulent: ~0.455 / (log10(Re))^2.58

**Normal Drag** (side-on):
```
Cd_normal(α, M) = Cd_normal_0 * (1 + k * α²) * f(M)
```
Where:
- `Cd_normal_0` = base normal drag (~1.8)
- `k` = angle-of-attack factor (~0.1-0.2)
- `f(M)` = Mach number correction

**Simplified Model** (for performance):
```
Cd_axial(M) = {
    0.5 + 0.3*M²          if M < 0.8
    0.692 + 0.5*(M-0.8)   if 0.8 ≤ M < 1.2
    0.892 / M             if M ≥ 1.2
}

Cd_normal(α, M) = 1.8 * (1 + 0.15*α²) * (1 + 0.1*M)
```

#### 3.3 Body-Frame Aerodynamic Forces

**Angle of Attack Calculation**:
```
V_body = [u, v, w]  (body-frame velocity components)
α = atan2(w, u)  (pitch angle of attack)
β = atan2(v, u)  (yaw/sideslip angle)
V_mag = ||V_body||
```

**Force Components**:
- **Axial force**: F_axial = -0.5 * ρ * V_mag² * A_axial * Cd_axial(M) * sign(u)
- **Normal force**: F_normal = -0.5 * ρ * V_mag² * A_normal * Cd_normal(α, M) * sin(α)
- **Side force**: F_side = -0.5 * ρ * V_mag² * A_normal * Cd_normal(β, M) * sin(β)

**Total Aerodynamic Force** (body frame):
```
F_aero_body = [F_axial, F_side, F_normal]
```

**Transform to World Frame**:
```
F_aero_world = R * F_aero_body
```

#### 3.4 Terminal Velocity

**Terminal Velocity Calculation**:
For free fall (no thrust), terminal velocity occurs when:
```
F_drag = F_gravity
0.5 * ρ * v_term² * A * Cd = m * g
```

Solving for terminal velocity:
```
v_term = sqrt(2 * m * g / (ρ * A * Cd))
```

**Terminal Velocity Characteristics**:
- Varies with altitude (density changes)
- Varies with orientation (Cd_axial vs Cd_normal)
- Maximum occurs at sea level, axial orientation
- Minimum occurs at high altitude, normal orientation

**Example** (Falcon 9 first stage):
- Mass: ~25,000 kg
- Area: ~10.5 m²
- Cd_axial: ~0.5-1.5 (varies with speed)
- Sea level terminal velocity: ~200-350 m/s (depending on Cd)

#### 3.5 Aerodynamic Moments

**Center of Pressure (CP)**:
- **Axial CP**: ~0.25 * height from nose (for cylinder)
- **Normal CP**: ~0.5 * height from nose (side-on flow)
- CP varies with Mach number and angle of attack

**Moment Calculation**:
```
r_CP_to_COM = r_CP - r_COM  [body frame]
τ_aero = r_CP_to_COM × F_aero_body
```

**Moment Components**:
- **Pitching moment**: M_pitch = F_normal * (CP_x - COM_x)
- **Yawing moment**: M_yaw = F_side * (CP_x - COM_x)
- **Rolling moment**: M_roll = (from grid fins, asymmetric drag)

**Stability**:
- If CP is ahead of COM → unstable (tends to tumble)
- If CP is behind COM → stable (self-righting)
- For rockets: typically unstable (requires active control)

#### 3.6 Wind Effects on Landing

**Crosswind Effects**:
- Creates sideslip angle (β)
- Generates side force and yaw moment
- Requires gimbal correction to maintain heading

**Headwind/Tailwind Effects**:
- Headwind: increases relative velocity → more drag
- Tailwind: decreases relative velocity → less drag
- Affects landing burn timing and fuel consumption

**Wind Gust Model** (optional):
```
V_wind(t) = V_mean + V_gust * sin(2π * f_gust * t)
```
Where:
- `V_mean` = mean wind speed
- `V_gust` = gust amplitude
- `f_gust` = gust frequency (~0.1-1 Hz)

**Landing Impact**:
- Crosswind requires lateral thrust component
- Headwind increases descent rate → earlier burn
- Tailwind decreases descent rate → later burn
- Wind shear (changing wind with altitude) adds complexity

### 4. Torque Sources

**1. Thrust Gimbal Torque**:
```
τ_gimbal = r_COM_to_engine × F_thrust_body
```
Where r_COM_to_engine is vector from COM to engine in body frame.

**2. Aerodynamic Torque**:
```
τ_aero = r_COM_to_CP × F_aero_body
```

**3. Grid Fin Torque** (if implemented):
- Each fin creates lift/drag → torque about COM

### 5. Coordinate Frame Transformations

**Quaternion to Rotation Matrix**:
```
R = [
  [1-2(y²+z²),  2(xy-wz),     2(xz+wy)    ],
  [2(xy+wz),     1-2(x²+z²),   2(yz-wx)    ],
  [2(xz-wy),     2(yz+wx),     1-2(x²+y²)  ]
]
```

**Body to World**:
```
v_world = R * v_body
```

**World to Body**:
```
v_body = R^T * v_world  (R is orthogonal, so R^T = R⁻¹)
```

### 6. Integration Scheme

**Recommended**: Runge-Kutta 4th Order (RK4) for better accuracy, or:
- **Semi-implicit Euler** (current) - simpler, acceptable for 60Hz
- **Verlet integration** - good for energy conservation

**Quaternion Integration**:
- Use exponential map or quaternion derivative
- Always normalize after integration to prevent drift

## Implementation Steps

### Phase 1: Geometry & Inertia (Tasks 1-2)
1. Create `RocketGeometry` class
2. Implement inertia tensor calculation
3. Add fuel-dependent mass/COM calculations
4. Unit tests for geometry calculations

### Phase 2: Core Dynamics (Tasks 3-4)
1. Create `RigidBodyDynamics` class
2. Implement Euler's equations
3. Implement coordinate transformations
4. Add quaternion integration with normalization

### Phase 3: Forces & Torques (Tasks 5-6)
1. Create `WindModel` class (altitude-dependent wind profiles)
2. Implement velocity-dependent drag coefficients (Mach number effects)
3. Enhance aerodynamic model (body-frame forces with AoA)
4. Calculate aerodynamic moments (CP-based)
5. Implement comprehensive torque calculation
6. Add all torque sources (thrust, aero, etc.)
7. Add terminal velocity calculations and validation

### Phase 4: Integration (Tasks 7-8)
1. Refactor `PhysicsEngine` to use new solver
2. Add configuration interface for rocket dimensions
3. Update API to accept geometry parameters
4. Maintain backward compatibility with defaults

## File Structure

```
backend/physics/
├── constants.py          # Keep existing constants, add defaults
├── geometry.py          # NEW: RocketGeometry class
├── rigid_body.py        # NEW: RigidBodyDynamics class  
├── aerodynamics.py      # NEW: Enhanced aerodynamic model with drag
├── wind.py              # NEW: WindModel class
├── engine.py            # MODIFY: Use new 6-DOF solver
└── atmosphere.py        # Keep as-is (or enhance with wind)
```

## Configuration Interface

**User Configuration** (via API/config):
```python
@dataclass
class RocketConfig:
    height: float = 47.7  # meters
    diameter: float = 3.66  # meters
    dry_mass: float = 22_200  # kg
    fuel_mass: float = 3_000  # kg
    com_height: float = 20.0  # meters from bottom

@dataclass
class WindConfig:
    enabled: bool = True
    surface_speed: float = 5.0  # m/s
    direction: float = 0.0  # radians (0 = +x direction)
    scale_height: float = 1500.0  # meters
    gust_enabled: bool = False
    gust_amplitude: float = 2.0  # m/s
    gust_frequency: float = 0.5  # Hz
```

**Usage**:
```python
geometry = RocketGeometry(config=RocketConfig(...))
wind = WindModel(config=WindConfig(...))
aerodynamics = AerodynamicsModel(geometry=geometry, wind=wind)
dynamics = RigidBodyDynamics(geometry=geometry, aerodynamics=aerodynamics)
```

## Testing Strategy

1. **Unit Tests**:
   - Inertia tensor calculations (compare to analytical solutions)
   - Coordinate transformations (round-trip tests)
   - Quaternion operations

2. **Integration Tests**:
   - Free fall (should match simple physics)
   - Terminal velocity (should converge to theoretical value)
   - Constant thrust (should accelerate correctly)
   - Torque-free rotation (angular momentum conservation)
   - Wind effects (crosswind should create sideslip)
   - Mach number effects (drag should increase in transonic)

3. **Validation**:
   - Compare to known rocket trajectories
   - Energy conservation checks
   - Stability analysis

## Performance Considerations

- 60 Hz update rate (16.67 ms per frame)
- Vectorized numpy operations
- Pre-compute rotation matrices when possible
- Cache frequently used values (density, etc.)

## Future Enhancements

- Grid fin aerodynamics (4 fins) - lift and drag from fins
- Landing leg deployment dynamics - drag increase when deployed
- Fuel slosh effects (optional) - COM movement during maneuvers
- Advanced wind models - turbulence, wind shear profiles
- Compressibility effects - more detailed Mach number corrections
- Reynolds number effects - transition from laminar to turbulent flow
- Base pressure effects - engine exhaust interaction with base drag

## References

- "Spacecraft Dynamics" by Peter C. Hughes
- "Flight Dynamics" by Robert F. Stengel
- "Fundamentals of Astrodynamics" by Bate, Mueller, White
- "Aerodynamics for Engineers" by Bertin & Cummings
- NASA Technical Reports on rocket dynamics
- "Atmospheric Flight Dynamics" by Malcolm J. Abzug
- Hoerner's "Fluid Dynamic Drag" (drag coefficient data)
- Anderson's "Fundamentals of Aerodynamics" (compressibility effects)

## Drag Model Validation

**Expected Terminal Velocities** (Falcon 9 first stage):
- Sea level, axial: ~250-300 m/s
- Sea level, normal: ~150-200 m/s
- 5 km altitude, axial: ~350-400 m/s
- 5 km altitude, normal: ~200-250 m/s

**Mach Number Effects**:
- Subsonic (M < 0.8): Cd relatively constant
- Transonic (0.8 < M < 1.2): Cd increases 2-3x
- Supersonic (M > 1.2): Cd decreases ~1/M²

**Wind Effects**:
- 10 m/s crosswind at landing: ~5-10° sideslip angle
- Requires ~2-5° gimbal correction
- Increases fuel consumption by ~5-10%

