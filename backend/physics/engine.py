"""Core physics engine for rocket simulation."""

import numpy as np
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
    MAX_LANDING_ANGLE,
    LANDING_PAD_RADIUS,
    INITIAL_ALTITUDE,
    INITIAL_VELOCITY_VERTICAL,
    ROCKET_COM_HEIGHT,
    ROCKET_MOI_PITCH,
)
from .atmosphere import Atmosphere


@dataclass
class RocketState:
    """Complete state of the rocket."""
    # Position (meters) - x: horizontal, y: vertical (altitude), z: lateral
    position: np.ndarray = field(default_factory=lambda: np.array([0.0, INITIAL_ALTITUDE, 0.0]))
    
    # Velocity (m/s)
    velocity: np.ndarray = field(default_factory=lambda: np.array([0.0, INITIAL_VELOCITY_VERTICAL, 0.0]))
    
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
    
    def to_dict(self) -> dict:
        """Convert state to dictionary for JSON serialization."""
        return {
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
            "altitude": self.position[1],
            "speed": float(np.linalg.norm(self.velocity)),
            "vertical_speed": self.velocity[1],
            "horizontal_speed": float(np.sqrt(self.velocity[0]**2 + self.velocity[2]**2)),
            "mass": ROCKET_DRY_MASS + self.fuel,
        }


class PhysicsEngine:
    """Main physics simulation engine."""
    
    def __init__(self):
        self.dt = 1.0 / PHYSICS_TICK_RATE
        self.atmosphere = Atmosphere()
        self.state = RocketState()
        self.time = 0.0
    
    def reset(self, altitude: float = INITIAL_ALTITUDE, velocity: float = INITIAL_VELOCITY_VERTICAL):
        """Reset simulation to initial conditions."""
        self.state = RocketState(
            position=np.array([0.0, altitude, 0.0]),
            velocity=np.array([0.0, velocity, 0.0]),
        )
        self.time = 0.0
    
    def get_mass(self) -> float:
        """Get current total mass of rocket."""
        return ROCKET_DRY_MASS + self.state.fuel
    
    def get_thrust_vector(self) -> np.ndarray:
        """Calculate thrust vector based on throttle and gimbal."""
        if self.state.throttle <= 0 or self.state.fuel <= 0:
            return np.array([0.0, 0.0, 0.0])
        
        # Effective throttle (minimum 40% when engine is on)
        effective_throttle = max(self.state.throttle, ENGINE_THROTTLE_MIN)
        thrust_magnitude = ENGINE_THRUST_MAX * effective_throttle
        
        # Apply gimbal angles (convert to radians)
        gimbal_pitch = np.radians(np.clip(self.state.gimbal[0], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE))
        gimbal_yaw = np.radians(np.clip(self.state.gimbal[1], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE))
        
        # Thrust vector in body frame (engine points down, thrust is up)
        thrust_body = np.array([
            thrust_magnitude * np.sin(gimbal_pitch),
            thrust_magnitude * np.cos(gimbal_pitch) * np.cos(gimbal_yaw),
            thrust_magnitude * np.sin(gimbal_yaw),
        ])
        
        # Rotate to world frame using orientation quaternion
        thrust_world = self.rotate_vector_by_quaternion(thrust_body, self.state.orientation)
        
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
        drag_magnitude = q * ROCKET_CROSS_SECTION * DRAG_COEFFICIENT_AXIAL
        drag_direction = -velocity / speed
        
        return drag_magnitude * drag_direction
    
    def get_gravity_force(self) -> np.ndarray:
        """Calculate gravitational force."""
        mass = self.get_mass()
        return np.array([0.0, -GRAVITY * mass, 0.0])
    
    def consume_fuel(self):
        """Consume fuel based on current throttle."""
        if self.state.throttle > 0 and self.state.fuel > 0:
            effective_throttle = max(self.state.throttle, ENGINE_THROTTLE_MIN)
            # Mass flow rate proportional to throttle
            fuel_consumption = ENGINE_MASS_FLOW_MAX * effective_throttle * self.dt
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
            effective_throttle = max(self.state.throttle, ENGINE_THROTTLE_MIN)
            thrust = ENGINE_THRUST_MAX * effective_throttle
            
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
        if self.state.position[1] <= 0:
            vertical_speed = abs(self.state.velocity[1])
            horizontal_speed = np.sqrt(self.state.velocity[0]**2 + self.state.velocity[2]**2)
            horizontal_distance = np.sqrt(self.state.position[0]**2 + self.state.position[2]**2)
            
            # Calculate tilt angle from vertical
            # Up vector in body frame is [0, 1, 0]
            up_world = self.rotate_vector_by_quaternion(np.array([0.0, 1.0, 0.0]), self.state.orientation)
            tilt_angle = np.degrees(np.arccos(np.clip(up_world[1], -1, 1)))
            
            # Check landing conditions
            if (vertical_speed <= MAX_LANDING_VELOCITY_VERTICAL and 
                tilt_angle <= MAX_LANDING_ANGLE and
                horizontal_distance <= LANDING_PAD_RADIUS):
                self.state.landed = True
                self.state.phase = "landed"
            else:
                self.state.crashed = True
                self.state.phase = "crashed"
            
            # Stop the rocket
            self.state.position[1] = 0
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
        
        # Check for landing/crash
        self.check_landing()
        
        self.time += self.dt
        
        return self.state
    
    def set_input(self, throttle: float = None, gimbal: Tuple[float, float] = None, 
                  grid_fins: Tuple[float, float, float, float] = None):
        """Set control inputs."""
        if throttle is not None:
            self.state.throttle = np.clip(throttle, 0.0, 1.0)
        
        if gimbal is not None:
            self.state.gimbal = np.array([
                np.clip(gimbal[0], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE),
                np.clip(gimbal[1], -ENGINE_GIMBAL_RANGE, ENGINE_GIMBAL_RANGE),
            ])
        
        if grid_fins is not None:
            self.state.grid_fins = np.array(grid_fins)
