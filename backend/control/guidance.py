"""Guidance system for autonomous landing."""

import numpy as np
from dataclasses import dataclass
from typing import Tuple, Optional

from physics.constants import (
    GRAVITY,
    ENGINE_THRUST_MAX,
    ENGINE_THROTTLE_MIN,
    ROCKET_DRY_MASS,
    SUICIDE_BURN_MARGIN,
    TERMINAL_VELOCITY_TARGET,
)


@dataclass
class GuidanceCommand:
    """Output from guidance system."""
    throttle: float
    gimbal_pitch: float
    gimbal_yaw: float
    phase: str


class GuidanceSystem:
    """
    Autonomous guidance for rocket landing.
    Implements a simplified powered descent guidance algorithm.
    """
    
    def __init__(self):
        self.target_position = np.array([0.0, 0.0, 0.0])  # Landing pad
        self.landing_burn_started = False
        self.landing_burn_altitude = None
    
    def reset(self):
        """Reset guidance state."""
        self.landing_burn_started = False
        self.landing_burn_altitude = None
    
    def compute_suicide_burn_altitude(self, velocity: float, mass: float) -> float:
        """
        Calculate altitude at which to start the landing burn (suicide burn).
        
        This computes the minimum altitude needed to decelerate to zero
        velocity at ground level, assuming constant max thrust.
        """
        # Available thrust at minimum throttle (conservative)
        thrust = ENGINE_THRUST_MAX * ENGINE_THROTTLE_MIN
        
        # Net deceleration (thrust - gravity)
        decel = (thrust / mass) - GRAVITY
        
        if decel <= 0:
            # Can't slow down - rocket too heavy!
            return float('inf')
        
        # Kinematic equation: v² = v₀² + 2as
        # We want v = 0, so: s = v₀² / (2 * decel)
        burn_distance = (velocity ** 2) / (2 * decel)
        
        # Add safety margin
        return burn_distance * SUICIDE_BURN_MARGIN
    
    def compute_command(self, position: np.ndarray, velocity: np.ndarray,
                        orientation: np.ndarray, fuel: float,
                        dt: float) -> GuidanceCommand:
        """
        Compute guidance command based on current state.
        
        Args:
            position: Current position [x, y, z]
            velocity: Current velocity [vx, vy, vz]
            orientation: Current orientation quaternion
            fuel: Remaining fuel mass
            dt: Time step
            
        Returns:
            GuidanceCommand with throttle and gimbal settings
        """
        altitude = position[1]
        vertical_velocity = velocity[1]  # Negative when descending
        horizontal_velocity = np.array([velocity[0], 0, velocity[2]])
        horizontal_speed = np.linalg.norm(horizontal_velocity)
        
        mass = ROCKET_DRY_MASS + fuel
        descent_speed = -vertical_velocity if vertical_velocity < 0 else 0
        
        # Calculate when to start landing burn
        if not self.landing_burn_started:
            burn_altitude = self.compute_suicide_burn_altitude(descent_speed, mass)
            
            if altitude <= burn_altitude:
                self.landing_burn_started = True
                self.landing_burn_altitude = altitude
        
        # Determine phase and compute commands
        if altitude > 3000:
            # Entry phase - no engine, use grid fins (not implemented yet)
            return GuidanceCommand(
                throttle=0.0,
                gimbal_pitch=0.0,
                gimbal_yaw=0.0,
                phase="entry"
            )
        
        elif not self.landing_burn_started:
            # Coasting phase - falling, waiting for burn
            return GuidanceCommand(
                throttle=0.0,
                gimbal_pitch=0.0,
                gimbal_yaw=0.0,
                phase="coast"
            )
        
        else:
            # Landing burn phase
            return self._compute_landing_burn(
                position, velocity, mass, altitude, descent_speed, horizontal_speed
            )
    
    def _compute_landing_burn(self, position: np.ndarray, velocity: np.ndarray,
                               mass: float, altitude: float,
                               descent_speed: float, horizontal_speed: float) -> GuidanceCommand:
        """Compute commands during landing burn."""
        
        # Desired vertical deceleration profile
        if altitude > 10:
            # Target velocity profile: v = -k * sqrt(altitude)
            # This gives approximately constant deceleration
            target_descent_speed = 2.0 * np.sqrt(altitude)
            target_descent_speed = min(target_descent_speed, 100)  # Cap at 100 m/s
        else:
            # Final approach - very slow
            target_descent_speed = TERMINAL_VELOCITY_TARGET
        
        # Velocity error
        velocity_error = target_descent_speed - descent_speed
        
        # Compute required thrust using feedback control
        # F = m * (g + desired_decel)
        desired_decel = -velocity_error * 0.5  # P controller
        required_thrust = mass * (GRAVITY + desired_decel)
        
        # Convert to throttle
        throttle = required_thrust / ENGINE_THRUST_MAX
        throttle = np.clip(throttle, 0.0, 1.0)
        
        # If we need thrust but it's below minimum, use minimum
        if 0 < throttle < ENGINE_THROTTLE_MIN:
            throttle = ENGINE_THROTTLE_MIN
        
        # Horizontal guidance - steer toward landing pad
        horizontal_offset = self.target_position - position
        horizontal_offset[1] = 0  # Only horizontal components
        
        # Compute desired gimbal to cancel horizontal velocity and move toward pad
        if throttle > 0 and altitude > 5:
            # Desired horizontal acceleration
            # a = -k1 * horizontal_velocity - k2 * horizontal_offset
            k1 = 0.3  # Velocity damping
            k2 = 0.05  # Position correction
            
            desired_horizontal_accel = -k1 * velocity[[0, 2]] + k2 * horizontal_offset[[0, 2]]
            
            # Gimbal angles needed (small angle approximation)
            gimbal_pitch = np.degrees(np.arcsin(np.clip(
                desired_horizontal_accel[0] * mass / (ENGINE_THRUST_MAX * throttle + 1),
                -1, 1
            )))
            gimbal_yaw = np.degrees(np.arcsin(np.clip(
                desired_horizontal_accel[1] * mass / (ENGINE_THRUST_MAX * throttle + 1),
                -1, 1
            )))
            
            gimbal_pitch = np.clip(gimbal_pitch, -5, 5)
            gimbal_yaw = np.clip(gimbal_yaw, -5, 5)
        else:
            gimbal_pitch = 0.0
            gimbal_yaw = 0.0
        
        return GuidanceCommand(
            throttle=throttle,
            gimbal_pitch=gimbal_pitch,
            gimbal_yaw=gimbal_yaw,
            phase="landing_burn"
        )
