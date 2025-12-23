# Rocket Landing Control - Backend Documentation

## Overview

Physics-based rocket landing simulation with 6-DOF rigid body dynamics, realistic aerodynamics, and configurable rocket models.

## Architecture

### Core Modules

- **`physics/`** - Physics simulation engine
  - `engine.py` - Main physics loop, integrates all subsystems
  - `rigid_body.py` - 6-DOF dynamics solver (Euler's equations)
  - `geometry.py` - Rocket geometry, mass properties, inertia tensors
  - `aerodynamics.py` - Drag models, Mach effects, angle of attack
  - `wind.py` - Wind model with Beaufort scale (levels 1-9)
  - `torques.py` - Torque calculations (thrust, aerodynamic, damping)
  - `transformations.py` - Quaternion-based coordinate transformations
  - `atmosphere.py` - ISA atmospheric model
  - `constants.py` - Physical constants and rocket parameters

- **`game/`** - Game session management
  - `session.py` - Game state, scoring, mode handling

- **`control/`** - Control systems
  - `guidance.py` - Autonomous landing guidance

- **`main.py`** - FastAPI server, WebSocket communication

## Key Features

### 6-DOF Rigid Body Dynamics
- Full 3D position, velocity, orientation (quaternions), angular velocity
- Euler's equations: `ω̇ = I⁻¹(τ - ω × Iω)`
- Semi-implicit Euler integration
- Quaternion normalization and stability checks

### Realistic Aerodynamics
- **Drag**: Mach-dependent coefficients (subsonic, transonic, supersonic)
- **Wind**: Beaufort scale levels 1-9, time-varying turbulence, altitude decay
- **Angle of Attack**: Pitch and yaw calculations
- **Terminal Velocity**: Altitude-dependent (air density changes)
- **Forces**: Axial, normal, and side forces in body frame

### Coordinate Systems
- **World Frame**: x=horizontal (east), y=vertical (up), z=horizontal (north)
- **Body Frame**: x=forward (nose), y=right, z=up
- Transformations via quaternion rotation matrices

### Predefined Rocket Models
- **SpaceX**: Falcon 9 Block 5, Starship Super Heavy
- **Chinese**: Long March 5/9, Zhuque-2/3
- **Russian**: Soyuz, Proton-M, Angara A5
- Configurable: height, diameter, mass, fuel, COM, inertia

## Physics Pipeline

```
1. Update wind model (time-varying)
2. Calculate forces (world frame):
   - Gravity: F = -mg
   - Thrust: Gimbaled, quaternion-rotated
   - Aerodynamics: Drag, angle of attack effects
3. Calculate torques (body frame):
   - Thrust gimbal torque
   - Aerodynamic torque (CP offset from COM)
   - Damping torque
4. Integrate dynamics:
   - Translational: a = F/m, v += a·dt, r += v·dt
   - Rotational: ω̇ = I⁻¹(τ - ω×Iω), ω += ω̇·dt
   - Orientation: q += 0.5·q·[0,ω]·dt, normalize
5. Update fuel, check landing conditions
```

## API Endpoints

### REST
- `POST /api/game/create` - Create game session
- `GET /api/game/{session_id}` - Get game state
- `POST /api/game/{session_id}/start` - Start simulation
- `POST /api/game/{session_id}/reset` - Reset to initial state

### WebSocket
- `/ws/{session_id}` - Real-time state updates (60 Hz)
- Messages: `input`, `pause`, `resume`, `reset`, `config`

## Configuration

### Game Config
```python
GameConfig(
    mode=GameMode.MANUAL,  # MANUAL, AUTONOMOUS, ASSISTED
    initial_altitude=5000.0,  # meters
    initial_velocity=-180.0,  # m/s (descending)
    wind_level=0  # 0=no wind, 1-9=Beaufort scale
)
```

### Rocket Config
```python
RocketConfig(
    height=47.7,  # meters
    diameter=3.66,  # meters
    dry_mass=22200,  # kg
    fuel_mass=3000,  # kg
    com_height=20.0,  # meters from bottom
    fuel_com_height=23.85  # meters from bottom
)
```

## Landing Criteria

- **Vertical speed**: < 2.0 m/s
- **Horizontal speed**: < 1.0 m/s
- **Tilt angle**: < 5° from vertical
- **Position**: Within landing pad radius

## Development

### Run Server
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Run Tests
```bash
python -m pytest tests/
```

## Technical Notes

### Stability Features
- Angular velocity limiting (30°/s max)
- Quaternion normalization every step
- Numerical error mitigation for vertical motion
- Damping coefficient: 2.0 N·m·s/rad

### Known Behaviors
- Terminal velocity decreases with altitude (air density increases)
- Drag acts through COM when falling straight (no torque)
- Coordinate swap applied after quaternion rotation (body z → world y)

## References

- Euler's equations for rigid body dynamics
- ISA (International Standard Atmosphere)
- Beaufort wind scale
- SpaceX, CASC, Roscosmos official data

