"""
6-DOF Rigid Body Dynamics Solver.

Implements Euler's equations for translational and rotational motion.
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional

from .geometry import RocketGeometry
from .transformations import (
    body_to_world,
    world_to_body,
    integrate_quaternion,
)


@dataclass
class RigidBodyState:
    """State of a rigid body in 6-DOF."""
    # Position in world frame (meters)
    position: np.ndarray  # [x, y, z]
    
    # Velocity in world frame (m/s)
    velocity: np.ndarray  # [vx, vy, vz]
    
    # Orientation quaternion [w, x, y, z]
    orientation: np.ndarray
    
    # Angular velocity in body frame (rad/s)
    angular_velocity: np.ndarray  # [ωx, ωy, ωz]
    
    def copy(self) -> 'RigidBodyState':
        """Create a copy of this state."""
        return RigidBodyState(
            position=self.position.copy(),
            velocity=self.velocity.copy(),
            orientation=self.orientation.copy(),
            angular_velocity=self.angular_velocity.copy(),
        )


class RigidBodyDynamics:
    """
    6-DOF Rigid Body Dynamics Solver.
    
    Solves Euler's equations for translational and rotational motion.
    """
    
    def __init__(self, geometry: RocketGeometry):
        """
        Initialize rigid body dynamics solver.
        
        Args:
            geometry: Rocket geometry object
        """
        self.geometry = geometry
    
    def compute_translational_acceleration(
        self,
        forces_world: np.ndarray,
        mass: float
    ) -> np.ndarray:
        """
        Compute translational acceleration from forces.
        
        Newton's 2nd Law: F = m * a
        a = F / m
        
        Args:
            forces_world: Total force vector in world frame [Fx, Fy, Fz] (N)
            mass: Total mass (kg)
            
        Returns:
            Acceleration vector in world frame [ax, ay, az] (m/s²)
        """
        if mass <= 0:
            return np.zeros(3)
        return forces_world / mass
    
    def compute_angular_acceleration(
        self,
        torques_body: np.ndarray,
        inertia_tensor: np.ndarray,
        angular_velocity_body: np.ndarray
    ) -> np.ndarray:
        """
        Compute angular acceleration from torques (Euler's equations).
        
        Euler's equations: I * ω_dot = τ - ω × (I * ω)
        ω_dot = I⁻¹ * (τ - ω × (I * ω))
        
        Args:
            torques_body: Total torque vector in body frame [τx, τy, τz] (N·m)
            inertia_tensor: 3x3 inertia tensor about COM (kg·m²)
            angular_velocity_body: Angular velocity in body frame [ωx, ωy, ωz] (rad/s)
            
        Returns:
            Angular acceleration in body frame [αx, αy, αz] (rad/s²)
        """
        # Compute I * ω
        I_omega = inertia_tensor @ angular_velocity_body
        
        # Compute ω × (I * ω) - gyroscopic term
        omega_cross_I_omega = np.cross(angular_velocity_body, I_omega)
        
        # Euler's equation: I * ω_dot = τ - ω × (I * ω)
        # ω_dot = I⁻¹ * (τ - ω × (I * ω))
        I_inv = np.linalg.inv(inertia_tensor)
        angular_acceleration = I_inv @ (torques_body - omega_cross_I_omega)
        
        return angular_acceleration
    
    def integrate(
        self,
        state: RigidBodyState,
        forces_world: np.ndarray,
        torques_body: np.ndarray,
        fuel_remaining: float,
        dt: float
    ) -> RigidBodyState:
        """
        Integrate rigid body state by one time step.
        
        Uses semi-implicit Euler integration:
        - v_new = v_old + a * dt
        - r_new = r_old + v_new * dt
        - ω_new = ω_old + α * dt
        - q_new = integrate_quaternion(q_old, ω_new, dt)
        
        Args:
            state: Current rigid body state
            forces_world: Total forces in world frame [Fx, Fy, Fz] (N)
            torques_body: Total torques in body frame [τx, τy, τz] (N·m)
            fuel_remaining: Remaining fuel mass (kg)
            dt: Time step (seconds)
            
        Returns:
            Updated rigid body state
        """
        # Get current mass and inertia based on fuel level
        mass = self.geometry.get_mass(fuel_remaining)
        inertia = self.geometry.get_inertia_tensor(fuel_remaining)
        
        # Compute accelerations
        accel_world = self.compute_translational_acceleration(forces_world, mass)
        angular_accel_body = self.compute_angular_acceleration(
            torques_body,
            inertia,
            state.angular_velocity
        )
        
        # Integrate translational motion (semi-implicit Euler)
        new_velocity = state.velocity + accel_world * dt
        new_position = state.position + new_velocity * dt
        
        # Integrate rotational motion
        new_angular_velocity = state.angular_velocity + angular_accel_body * dt
        
        # Limit angular velocity to prevent excessive rotation
        # Max angular velocity: ~30 deg/s (0.52 rad/s) for stability
        max_angular_velocity = 0.52  # rad/s
        angular_velocity_mag = np.linalg.norm(new_angular_velocity)
        if angular_velocity_mag > max_angular_velocity:
            new_angular_velocity = new_angular_velocity * (max_angular_velocity / angular_velocity_mag)
        
        new_orientation = integrate_quaternion(
            state.orientation,
            new_angular_velocity,
            dt
        )
        
        # Ensure quaternion is valid (normalized and finite)
        if not np.all(np.isfinite(new_orientation)):
            # Fallback to previous orientation if invalid
            new_orientation = state.orientation.copy()
        
        # Ensure quaternion magnitude is reasonable
        q_mag = np.linalg.norm(new_orientation)
        if q_mag < 0.5 or q_mag > 2.0:
            # Renormalize if magnitude is way off
            new_orientation = new_orientation / q_mag if q_mag > 0 else np.array([1.0, 0.0, 0.0, 0.0])
        
        # Create new state
        return RigidBodyState(
            position=new_position,
            velocity=new_velocity,
            orientation=new_orientation,
            angular_velocity=new_angular_velocity,
        )

