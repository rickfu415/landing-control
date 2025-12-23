"""Core physics engine for rocket simulation."""

import numpy as np
import math
from dataclasses import dataclass, field
from typing import Tuple
from .constants import (
    GRAVITY,
    ROCKET_DRY_MASS,
    ROCKET_FUEL_MASS,
    ROCKET_CROSS_SECTION,
    DRAG_COEFFICIENT_AXIAL,
    ENGINE_THRUST_MAX,
    ENGINE_THROTTLE_MIN,
    ENGINE_GIMBAL_RANGE,
    ENGINE_MASS_FLOW_MAX,
    PHYSICS_TICK_RATE,
    MAX_LANDING_VELOCITY_VERTICAL,
    MAX_LANDING_VELOCITY_HORIZONTAL,
    MAX_LANDING_ANGLE,
    LANDING_PAD_RADIUS,
    INITIAL_ALTITUDE,
    INITIAL_VELOCITY_VERTICAL,
    ROCKET_COM_HEIGHT,
    ROCKET_MOI_PITCH,
)
from .atmosphere import Atmosphere
from .geometry import RocketGeometry, RocketConfig
from .rigid_body import RigidBodyDynamics, RigidBodyState
from .wind import WindModel, WindConfig
from .aerodynamics import AerodynamicsModel
from .torques import TorqueCalculator
from .transformations import world_to_body, body_to_world


@dataclass
class RocketState:
    """Complete state of the rocket."""
    # Position (meters) - x: horizontal, y: vertical (altitude), z: lateral
    position: np.ndarray = field(default_factory=lambda: np.array([0.0, INITIAL_ALTITUDE, 0.0]))
    
    # Velocity (m/s)
    velocity: np.ndarray = field(default_factory=lambda: np.array([0.0, INITIAL_VELOCITY_VERTICAL, 0.0]))
    
    # Acceleration (m/s²) - for recording/debugging
    acceleration: np.ndarray = field(default_factory=lambda: np.array([0.0, 0.0, 0.0]))
    
    # Orientation quaternion (w, x, y, z) - starts upright
    orientation: np.ndarray = field(default_factory=lambda: np.array([1.0, 0.0, 0.0, 0.0]))
    
    # Angular velocity (rad/s) around each axis
    angular_velocity: np.ndarray = field(default_factory=lambda: np.array([0.0, 0.0, 0.0]))
    
    # Fuel remaining (kg)
    fuel: float = ROCKET_FUEL_MASS
    
    # Engine throttle (0.0 to 1.0, but minimum is 0.4 when on)
    throttle: float = 0.0
    
    # Engine gimbal angles (degrees) - pitch and yaw
    gimbal: np.ndarray = field(default_factory=lambda: np.array([0.0, 0.0]))
    
    # Grid fin deflections (degrees) - 4 fins
    grid_fins: np.ndarray = field(default_factory=lambda: np.array([0.0, 0.0, 0.0, 0.0]))
    
    # Landing legs deployed
    legs_deployed: bool = False
    
    # Current phase
    phase: str = "descent"
    
    # Game status
    landed: bool = False
    crashed: bool = False
    
    # Touchdown velocity (saved at moment of landing/crash)
    touchdown_velocity: float = 0.0  # m/s (total speed at touchdown)
    
    def to_dict(self, geometry: RocketGeometry = None, aerodynamics_model = None) -> dict:
        """Convert state to dictionary for JSON serialization."""
        result = {
            "position": self.position.tolist(),
            "velocity": self.velocity.tolist(),
            "orientation": self.orientation.tolist(),
            "angular_velocity": self.angular_velocity.tolist(),
            "fuel": self.fuel,
            "throttle": self.throttle,
            "gimbal": self.gimbal.tolist(),
            "grid_fins": self.grid_fins.tolist(),
            "legs_deployed": self.legs_deployed,
            "phase": self.phase,
            "landed": self.landed,
            "crashed": self.crashed,
            "touchdown_velocity": self.touchdown_velocity,
            "altitude": self.position[1],
            "speed": float(np.linalg.norm(self.velocity)),
            "vertical_speed": self.velocity[1],
            "horizontal_speed": float(np.sqrt(self.velocity[0]**2 + self.velocity[2]**2)),
            "mass": ROCKET_DRY_MASS + self.fuel,
        }
        
        # Add geometry information if available
        if geometry:
            result["geometry"] = {
                "height": geometry.config.height,
                "diameter": geometry.config.diameter,
                "radius": geometry.radius,
                "cross_sectional_area": geometry.cross_sectional_area,
                "initial_fuel_mass": geometry.config.fuel_mass,  # For fuel gauge max value
                "thrust": geometry.config.thrust,  # N
                "isp": geometry.config.isp,  # seconds
                "dry_mass": geometry.config.dry_mass,  # kg
            }
        
        # Add terminal velocity information
        if aerodynamics_model and geometry:
            try:
                mass = geometry.get_mass(self.fuel)
                area = geometry.cross_sectional_area
                altitude = self.position[1]
                v_term_axial, v_term_normal = aerodynamics_model.calculate_terminal_velocity_range(
                    mass, area, altitude
                )
                result["terminal_velocity"] = {
                    "axial": v_term_axial,
                    "normal": v_term_normal,
                }
            except Exception:
                # If calculation fails, skip it
                pass
        
        return result


class PhysicsEngine:
    """Main physics simulation engine."""
    
    def __init__(self, rocket_config: RocketConfig = None, wind_config: WindConfig = None, use_6dof: bool = True, flight_recorder=None):
        self.dt = 1.0 / PHYSICS_TICK_RATE
        self.atmosphere = Atmosphere()
        self.geometry = RocketGeometry(config=rocket_config)
        self.wind = WindModel(config=wind_config)
        self.aerodynamics = AerodynamicsModel()
        self.dynamics = RigidBodyDynamics(geometry=self.geometry)
        self.torque_calculator = TorqueCalculator(geometry=self.geometry)
        
        # Calculate initial velocity based on terminal velocity at STARTING altitude
        # At terminal velocity, drag = weight, so rocket maintains constant speed
        # As rocket descends into denser air, it will naturally decelerate
        # (because terminal velocity decreases with altitude)
        initial_mass = self.geometry.config.dry_mass + self.geometry.config.fuel_mass
        initial_velocity = self._calculate_terminal_velocity(initial_mass, INITIAL_ALTITUDE)
        
        # Initialize state with fuel from rocket config and terminal velocity
        self.state = RocketState(
            position=np.array([0.0, INITIAL_ALTITUDE, 0.0]),
            velocity=np.array([0.0, -initial_velocity, 0.0]),  # Negative for downward
            fuel=self.geometry.config.fuel_mass
        )
        self.time = 0.0
        self.use_6dof = use_6dof  # Flag to enable/disable 6-DOF solver
        self.flight_recorder = flight_recorder  # Optional flight data recorder
    
    def get_terminal_velocity(self, orientation: str = "axial") -> float:
        """
        Get terminal velocity at current altitude and mass.
        
        Args:
            orientation: "axial" or "normal"
            
        Returns:
            Terminal velocity in m/s
        """
        mass = self.get_mass()
        area = self.geometry.cross_sectional_area
        altitude = self.state.position[1]
        return self.aerodynamics.calculate_terminal_velocity(
            mass, area, altitude, orientation=orientation
        )
    
    def _calculate_terminal_velocity(self, mass: float, altitude: float) -> float:
        """
        Calculate terminal velocity for given mass and altitude.
        
        Formula: v_term = sqrt(2 * m * g / (ρ * A * Cd))
        
        Args:
            mass: Total rocket mass in kg
            altitude: Altitude in meters
            
        Returns:
            Terminal velocity in m/s (positive value)
        """
        from .constants import SEA_LEVEL_DENSITY, SEA_LEVEL_TEMPERATURE, TEMPERATURE_LAPSE_RATE
        
        # Atmospheric density at altitude (ISA model)
        temp_at_alt = SEA_LEVEL_TEMPERATURE - TEMPERATURE_LAPSE_RATE * altitude
        density = SEA_LEVEL_DENSITY * (temp_at_alt / SEA_LEVEL_TEMPERATURE) ** 4.256
        
        # Cross-sectional area
        area = self.geometry.cross_sectional_area
        
        # Drag coefficient (axial, subsonic)
        Cd = 0.6
        
        # Terminal velocity
        v_term = math.sqrt(2 * mass * GRAVITY / (density * area * Cd))
        
        return v_term
    
    def reset(self, altitude: float = INITIAL_ALTITUDE, velocity: float = None):
        """
        Reset simulation to initial conditions.
        
        Args:
            altitude: Initial altitude in meters
            velocity: Initial velocity in m/s (if None, uses terminal velocity at that altitude)
        """
        # Calculate terminal velocity at starting altitude if not provided
        if velocity is None:
            initial_mass = self.geometry.config.dry_mass + self.geometry.config.fuel_mass
            terminal_velocity = self._calculate_terminal_velocity(initial_mass, altitude)
            velocity = -terminal_velocity  # Negative for downward
        
        self.state = RocketState(
            position=np.array([0.0, altitude, 0.0]),
            velocity=np.array([0.0, velocity, 0.0]),
            fuel=self.geometry.config.fuel_mass,  # Use fuel from rocket config
        )
        self.time = 0.0
        self.wind.reset()
    
    def get_mass(self) -> float:
        """Get current total mass of rocket."""
        return self.geometry.get_mass(self.state.fuel)
    
    def get_thrust_vector(self) -> np.ndarray:
        """Calculate thrust vector based on throttle and gimbal."""
        if self.state.throttle <= 0 or self.state.fuel <= 0:
            return np.array([0.0, 0.0, 0.0])
        
        # Use thrust from rocket config (throttle already has minimum enforced)
        thrust_magnitude = self.geometry.config.thrust * self.state.throttle
        
        # Apply gimbal angles (convert to radians)
        gimbal_pitch = np.radians(np.clip(self.state.gimbal[0], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE))
        gimbal_yaw = np.radians(np.clip(self.state.gimbal[1], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE))
        
        # Thrust vector in body frame
        # Body frame: x=forward (nose), y=right, z=up
        # World frame: x=horizontal (east), y=vertical (up), z=horizontal (north)
        # Thrust points upward (+z in body frame) when gimbal is zero
        # Gimbal pitch rotates thrust in x-z plane (forward/backward)
        # Gimbal yaw rotates thrust in y-z plane (left/right)
        thrust_body = np.array([
            thrust_magnitude * np.sin(gimbal_pitch),  # x: forward/backward component
            thrust_magnitude * np.sin(gimbal_yaw),     # y: left/right component
            thrust_magnitude * np.cos(gimbal_pitch) * np.cos(gimbal_yaw),  # z: upward component
        ])
        
        # Transform to world frame using orientation quaternion
        thrust_world = self.rotate_vector_by_quaternion(thrust_body, self.state.orientation)
        
        # Coordinate system fix: Body frame z (up) should map to world frame y (vertical)
        # When upright, quaternion rotation maps body z → world z, but we need body z → world y
        # Swap y and z components AFTER rotation to fix coordinate system mismatch
        thrust_world = np.array([
            thrust_world[0],  # x stays x
            thrust_world[2],  # world z → world y (vertical)
            thrust_world[1],  # world y → world z (horizontal)
        ])
        
        return thrust_world
    
    def get_drag_force(self) -> np.ndarray:
        """Calculate aerodynamic drag force."""
        velocity = self.state.velocity
        speed = np.linalg.norm(velocity)
        
        if speed < 0.1:
            return np.array([0.0, 0.0, 0.0])
        
        altitude = self.state.position[1]
        density = self.atmosphere.get_density(altitude)
        
        # Dynamic pressure: q = 0.5 * ρ * v²
        q = 0.5 * density * speed ** 2
        
        # Drag force (opposite to velocity direction)
        # F_drag = q * A * Cd
        drag_magnitude = q * self.geometry.cross_sectional_area * DRAG_COEFFICIENT_AXIAL
        drag_direction = -velocity / speed
        
        return drag_magnitude * drag_direction
    
    def get_gravity_force(self) -> np.ndarray:
        """Calculate gravitational force."""
        mass = self.get_mass()
        return np.array([0.0, -GRAVITY * mass, 0.0])
    
    def consume_fuel(self):
        """Consume fuel based on current throttle."""
        if self.state.throttle > 0 and self.state.fuel > 0:
            # Calculate mass flow rate from rocket's thrust and ISP
            # Formula: mdot = Thrust / (ISP × g₀)
            mass_flow_rate = self.geometry.config.thrust / (self.geometry.config.isp * GRAVITY)
            # Fuel consumption proportional to throttle (already has minimum enforced)
            fuel_consumption = mass_flow_rate * self.state.throttle * self.dt
            self.state.fuel = max(0, self.state.fuel - fuel_consumption)
    
    def rotate_vector_by_quaternion(self, v: np.ndarray, q: np.ndarray) -> np.ndarray:
        """Rotate a vector by a quaternion."""
        # q = [w, x, y, z]
        w, x, y, z = q
        
        # Quaternion rotation: q * v * q^-1
        # Using the formula for rotating vector v by quaternion q
        t = 2.0 * np.cross(np.array([x, y, z]), v)
        return v + w * t + np.cross(np.array([x, y, z]), t)
    
    def update_orientation(self):
        """Update orientation based on angular velocity."""
        omega = self.state.angular_velocity
        omega_mag = np.linalg.norm(omega)
        
        if omega_mag > 1e-10:
            # Create quaternion from angular velocity
            axis = omega / omega_mag
            angle = omega_mag * self.dt
            
            # Quaternion for this rotation
            half_angle = angle / 2
            dq = np.array([
                np.cos(half_angle),
                axis[0] * np.sin(half_angle),
                axis[1] * np.sin(half_angle),
                axis[2] * np.sin(half_angle),
            ])
            
            # Multiply quaternions
            self.state.orientation = self.quaternion_multiply(self.state.orientation, dq)
            
            # Normalize to prevent drift
            self.state.orientation /= np.linalg.norm(self.state.orientation)
    
    def quaternion_multiply(self, q1: np.ndarray, q2: np.ndarray) -> np.ndarray:
        """Multiply two quaternions."""
        w1, x1, y1, z1 = q1
        w2, x2, y2, z2 = q2
        
        return np.array([
            w1*w2 - x1*x2 - y1*y2 - z1*z2,
            w1*x2 + x1*w2 + y1*z2 - z1*y2,
            w1*y2 - x1*z2 + y1*w2 + z1*x2,
            w1*z2 + x1*y2 - y1*x2 + z1*w2,
        ])
    
    def apply_control_torques(self):
        """Apply torques from gimbal and grid fins for attitude control."""
        # Gimbal creates torque proportional to thrust and gimbal angle
        if self.state.throttle > 0 and self.state.fuel > 0:
            # Use thrust from rocket config (throttle already has minimum enforced)
            thrust = self.geometry.config.thrust * self.state.throttle
            
            # Moment arm (distance from engine to center of mass)
            moment_arm = ROCKET_COM_HEIGHT
            
            # Torque from gimbal: τ = F × r
            gimbal_rad = np.radians(self.state.gimbal)
            torque_from_gimbal = np.array([
                thrust * np.sin(gimbal_rad[0]) * moment_arm * 0.001,  # pitch
                0.0,  # yaw
                thrust * np.sin(gimbal_rad[1]) * moment_arm * 0.001,  # roll
            ])
            
            # Angular acceleration: α = τ / I
            angular_accel = torque_from_gimbal / ROCKET_MOI_PITCH
            self.state.angular_velocity += angular_accel * self.dt
        
        # Damping (simulates natural stability and air resistance to rotation)
        damping = 0.98
        self.state.angular_velocity *= damping
    
    def check_landing(self):
        """Check if rocket has landed or crashed."""
        # Calculate the position of the rocket's bottom (engine end)
        # The rocket's center is at position[1], we need to find the bottom
        # Down vector in body frame is [0, -1, 0] (opposite of up)
        # Distance from center to bottom depends on COM location
        down_body = np.array([0.0, -1.0, 0.0])
        down_world = self.rotate_vector_by_quaternion(down_body, self.state.orientation)
        
        # Distance from COM to bottom of rocket
        com_to_bottom = self.geometry.config.com_height
        
        # Position of the bottom of the rocket
        bottom_position = self.state.position + down_world * com_to_bottom
        bottom_altitude = bottom_position[1]
        
        if bottom_altitude <= 0:
            # Calculate touchdown velocity BEFORE zeroing it
            vertical_speed = abs(self.state.velocity[1])
            horizontal_speed = np.sqrt(self.state.velocity[0]**2 + self.state.velocity[2]**2)
            total_speed = np.linalg.norm(self.state.velocity)  # Total velocity magnitude
            horizontal_distance = np.sqrt(self.state.position[0]**2 + self.state.position[2]**2)
            
            # Save touchdown velocity for stats
            self.state.touchdown_velocity = total_speed
            
            # Calculate tilt angle from vertical
            # Up vector in body frame is [0, 1, 0]
            up_world = self.rotate_vector_by_quaternion(np.array([0.0, 1.0, 0.0]), self.state.orientation)
            tilt_angle = np.degrees(np.arccos(np.clip(up_world[1], -1, 1)))
            
            # Check landing conditions
            if (vertical_speed <= MAX_LANDING_VELOCITY_VERTICAL and 
                horizontal_speed <= MAX_LANDING_VELOCITY_HORIZONTAL and
                tilt_angle <= MAX_LANDING_ANGLE and
                horizontal_distance <= LANDING_PAD_RADIUS):
                self.state.landed = True
                self.state.phase = "landed"
            else:
                self.state.crashed = True
                self.state.phase = "crashed"
            
            # IMPORTANT: Record final frame WITH velocity before zeroing it
            if self.flight_recorder:
                self.flight_recorder.record_frame(self.state, self.time, self.geometry)
                self.flight_recorder.add_touchdown_event(self.state, self.time)
            
            # Stop the rocket at ground level (adjust COM position so bottom is at y=0)
            self.state.position[1] = com_to_bottom  # COM is at height = com_to_bottom when bottom touches ground
            self.state.velocity = np.array([0.0, 0.0, 0.0])
            self.state.angular_velocity = np.array([0.0, 0.0, 0.0])
    
    def update_phase(self):
        """Update the current flight phase."""
        altitude = self.state.position[1]
        
        if self.state.landed or self.state.crashed:
            return
        
        if altitude > 3000:
            self.state.phase = "entry"
        elif altitude > 500:
            self.state.phase = "descent"
        else:
            self.state.phase = "landing_burn"
            # Auto-deploy legs below 200m
            if altitude < 200 and not self.state.legs_deployed:
                self.state.legs_deployed = True
    
    def step(self) -> RocketState:
        """Advance simulation by one time step."""
        if self.use_6dof:
            return self.step_6dof()
        else:
            return self.step_simple()
    
    def step_simple(self) -> RocketState:
        """Simple physics step (original implementation)."""
        if self.state.landed or self.state.crashed:
            return self.state
        
        mass = self.get_mass()
        
        # Calculate forces
        gravity = self.get_gravity_force()
        thrust = self.get_thrust_vector()
        drag = self.get_drag_force()
        
        # Total force and acceleration
        total_force = gravity + thrust + drag
        acceleration = total_force / mass
        
        # Store acceleration in state for recording
        self.state.acceleration = acceleration
        
        # Update velocity and position (semi-implicit Euler)
        self.state.velocity += acceleration * self.dt
        self.state.position += self.state.velocity * self.dt
        
        # Update orientation
        self.apply_control_torques()
        self.update_orientation()
        
        # Consume fuel
        self.consume_fuel()
        
        # Update phase
        self.update_phase()
        
        # Check for landing/crash (this will record final frame with velocity before zeroing)
        self.check_landing()
        
        self.time += self.dt
        
        # Record flight data (skip if just landed/crashed - already recorded in check_landing)
        if self.flight_recorder and not self.state.landed and not self.state.crashed:
            self.flight_recorder.record_frame(self.state, self.time, self.geometry)
        
        return self.state
    
    def step_6dof(self) -> RocketState:
        """6-DOF physics step using RigidBodyDynamics solver."""
        if self.state.landed or self.state.crashed:
            return self.state
        
        # Update wind model time
        self.wind.update_time(self.dt)
        
        # Create rigid body state
        rb_state = RigidBodyState(
            position=self.state.position.copy(),
            velocity=self.state.velocity.copy(),
            orientation=self.state.orientation.copy(),
            angular_velocity=self.state.angular_velocity.copy(),
        )
        
        # Calculate forces in world frame
        gravity = self.get_gravity_force()
        thrust_world = self.get_thrust_vector()
        
        # Calculate aerodynamic forces in body frame
        # Get relative velocity (rocket - wind)
        relative_velocity_world = self.wind.get_relative_velocity(
            self.state.velocity,
            self.state.position[1]
        )
        
        # Transform to body frame
        relative_velocity_body = world_to_body(relative_velocity_world, self.state.orientation)
        
        # Compute aerodynamic forces in body frame
        aero_force_body = self.aerodynamics.compute_aerodynamic_forces(
            relative_velocity_body,
            self.state.position[1],
            self.geometry.cross_sectional_area
        )
        
        # Transform aerodynamic forces to world frame
        aero_force_world = body_to_world(aero_force_body, self.state.orientation)
        
        # When falling straight down with no horizontal velocity, ensure drag is purely vertical
        # to prevent numerical errors from creating horizontal forces
        horizontal_velocity_mag = np.sqrt(self.state.velocity[0]**2 + self.state.velocity[2]**2)
        if horizontal_velocity_mag < 0.1:  # Less than 0.1 m/s horizontal velocity
            # Force drag to be purely vertical (y-direction only)
            aero_force_world = np.array([0.0, aero_force_world[1], 0.0])
        
        # Total forces in world frame
        total_force_world = gravity + thrust_world + aero_force_world
        
        # Calculate and store acceleration for recording
        mass = self.get_mass()
        self.state.acceleration = total_force_world / mass
        
        # Calculate torques in body frame
        # Thrust vector in body frame (for torque calculation)
        if self.state.throttle > 0 and self.state.fuel > 0:
            # Use thrust from rocket config (throttle already has minimum enforced)
            thrust_magnitude = self.geometry.config.thrust * self.state.throttle
            gimbal_pitch = np.radians(np.clip(self.state.gimbal[0], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE))
            gimbal_yaw = np.radians(np.clip(self.state.gimbal[1], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE))
            # Thrust vector in body frame (same as in get_thrust_vector)
            # Body frame: x=forward, y=right, z=up
            thrust_body = np.array([
                thrust_magnitude * np.sin(gimbal_pitch),  # x: forward/backward
                thrust_magnitude * np.sin(gimbal_yaw),     # y: left/right
                thrust_magnitude * np.cos(gimbal_pitch) * np.cos(gimbal_yaw),  # z: upward
            ])
        else:
            thrust_body = np.zeros(3)
        
        # Compute total torque
        total_torque_body = self.torque_calculator.compute_total_torque(
            thrust_body=thrust_body,
            aero_force_body=aero_force_body,
            angular_velocity_body=self.state.angular_velocity,
            fuel_remaining=self.state.fuel,
            include_damping=True
        )
        
        # Integrate using 6-DOF solver
        new_rb_state = self.dynamics.integrate(
            state=rb_state,
            forces_world=total_force_world,
            torques_body=total_torque_body,
            fuel_remaining=self.state.fuel,
            dt=self.dt
        )
        
        # Update rocket state
        self.state.position = new_rb_state.position
        self.state.velocity = new_rb_state.velocity
        self.state.orientation = new_rb_state.orientation
        self.state.angular_velocity = new_rb_state.angular_velocity
        
        # Consume fuel
        self.consume_fuel()
        
        # Update phase
        self.update_phase()
        
        # Check for landing/crash (this will record final frame with velocity before zeroing)
        self.check_landing()
        
        self.time += self.dt
        
        # Record flight data (skip if just landed/crashed - already recorded in check_landing)
        if self.flight_recorder and not self.state.landed and not self.state.crashed:
            self.flight_recorder.record_frame(self.state, self.time, self.geometry)
        
        return self.state
    
    def set_input(self, throttle: float = None, gimbal: Tuple[float, float] = None, 
                  grid_fins: Tuple[float, float, float, float] = None):
        """Set control inputs."""
        if throttle is not None:
            # Enforce minimum throttle: either 0 (off) or >= 40% (on)
            if throttle > 0:
                self.state.throttle = np.clip(max(throttle, ENGINE_THROTTLE_MIN), 0.0, 1.0)
            else:
                self.state.throttle = 0.0
        
        if gimbal is not None:
            self.state.gimbal = np.array([
                np.clip(gimbal[0], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE),
                np.clip(gimbal[1], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE),
            ])
        
        if grid_fins is not None:
            self.state.grid_fins = np.array(grid_fins)
