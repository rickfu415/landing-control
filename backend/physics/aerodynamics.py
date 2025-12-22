"""
Aerodynamic drag model with velocity-dependent coefficients.

Implements Mach number effects, angle of attack, and compressibility corrections.
"""

import numpy as np
import math
from typing import Optional, Tuple

from .atmosphere import Atmosphere
from .constants import (
    DRAG_COEFFICIENT_AXIAL,
    DRAG_COEFFICIENT_NORMAL,
)


class DragModel:
    """
    Velocity-dependent drag coefficient model.
    
    Accounts for Mach number effects and compressibility.
    """
    
    def __init__(self, atmosphere: Optional[Atmosphere] = None):
        """
        Initialize drag model.
        
        Args:
            atmosphere: Atmosphere model for speed of sound calculations.
                       If None, creates a new instance.
        """
        self.atmosphere = atmosphere or Atmosphere()
    
    def get_mach_number(self, velocity_magnitude: float, altitude: float) -> float:
        """
        Calculate Mach number from velocity and altitude.
        
        M = v / a_sound
        
        Args:
            velocity_magnitude: Airspeed magnitude (m/s)
            altitude: Altitude above sea level (meters)
            
        Returns:
            Mach number (dimensionless)
        """
        speed_of_sound = self.atmosphere.get_speed_of_sound(altitude)
        if speed_of_sound <= 0:
            return 0.0
        return velocity_magnitude / speed_of_sound
    
    def get_axial_drag_coefficient(self, mach_number: float) -> float:
        """
        Get axial drag coefficient as function of Mach number.
        
        Simplified model:
        - Subsonic (M < 0.8): Cd = 0.5 + 0.3*M²
        - Transonic (0.8 ≤ M < 1.2): Cd = 0.692 + 0.5*(M-0.8)
        - Supersonic (M ≥ 1.2): Cd = 0.892 / M
        
        Args:
            mach_number: Mach number
            
        Returns:
            Axial drag coefficient
        """
        M = abs(mach_number)
        
        if M < 0.8:
            # Subsonic: gradual increase
            return 0.5 + 0.3 * M * M
        elif M < 1.2:
            # Transonic: sharp increase (wave drag)
            return 0.692 + 0.5 * (M - 0.8)
        else:
            # Supersonic: decreases ~1/M
            return 0.892 / M
    
    def get_normal_drag_coefficient(self, angle_of_attack: float, mach_number: float) -> float:
        """
        Get normal drag coefficient as function of angle of attack and Mach number.
        
        Cd_normal(α, M) = Cd_normal_0 * (1 + k * α²) * (1 + 0.1*M)
        
        Where:
        - Cd_normal_0 = base normal drag (~1.8)
        - k = angle-of-attack factor (~0.15)
        
        Args:
            angle_of_attack: Angle of attack in radians
            mach_number: Mach number
            
        Returns:
            Normal drag coefficient
        """
        alpha = abs(angle_of_attack)
        M = abs(mach_number)
        
        # Base normal drag coefficient
        Cd_base = DRAG_COEFFICIENT_NORMAL
        
        # Angle of attack effect: increases with α²
        alpha_factor = 1.0 + 0.15 * alpha * alpha
        
        # Mach number correction
        mach_factor = 1.0 + 0.1 * M
        
        return Cd_base * alpha_factor * mach_factor
    
    def get_drag_coefficient_axial(self, velocity_magnitude: float, altitude: float) -> float:
        """
        Get axial drag coefficient for given velocity and altitude.
        
        Convenience method that calculates Mach number internally.
        
        Args:
            velocity_magnitude: Airspeed magnitude (m/s)
            altitude: Altitude above sea level (meters)
            
        Returns:
            Axial drag coefficient
        """
        mach = self.get_mach_number(velocity_magnitude, altitude)
        return self.get_axial_drag_coefficient(mach)
    
    def get_drag_coefficient_normal(
        self,
        angle_of_attack: float,
        velocity_magnitude: float,
        altitude: float
    ) -> float:
        """
        Get normal drag coefficient for given angle of attack, velocity, and altitude.
        
        Convenience method that calculates Mach number internally.
        
        Args:
            angle_of_attack: Angle of attack in radians
            velocity_magnitude: Airspeed magnitude (m/s)
            altitude: Altitude above sea level (meters)
            
        Returns:
            Normal drag coefficient
        """
        mach = self.get_mach_number(velocity_magnitude, altitude)
        return self.get_normal_drag_coefficient(angle_of_attack, mach)


class AerodynamicsModel:
    """
    Complete aerodynamic model for body-frame forces and moments.
    
    Calculates aerodynamic forces in body frame based on:
    - Relative velocity (rocket - wind)
    - Angle of attack and sideslip
    - Mach number effects
    """
    
    def __init__(self, drag_model: Optional[DragModel] = None):
        """
        Initialize aerodynamics model.
        
        Args:
            drag_model: Drag model instance. If None, creates a new one.
        """
        self.drag_model = drag_model or DragModel()
    
    def calculate_angle_of_attack(self, velocity_body: np.ndarray) -> Tuple[float, float]:
        """
        Calculate angle of attack and sideslip angle from body-frame velocity.
        
        Body frame: x=forward (nose), y=right, z=up
        - α (alpha) = pitch angle of attack = atan2(w, u)
        - β (beta) = sideslip angle = atan2(v, u)
        
        When u ≈ 0 (no forward velocity), rocket is moving purely vertically/sideways.
        In this case, angle of attack is based on the vertical/lateral components.
        
        Args:
            velocity_body: Velocity vector in body frame [u, v, w] (m/s)
            
        Returns:
            Tuple of (angle_of_attack, sideslip_angle) in radians
        """
        u, v, w = velocity_body
        velocity_mag = math.sqrt(u*u + v*v + w*w)
        
        # If velocity is very small, no angle of attack
        if velocity_mag < 0.1:
            return 0.0, 0.0
        
        # Normalize velocity components
        u_norm = u / velocity_mag
        v_norm = v / velocity_mag
        w_norm = w / velocity_mag
        
        # Angle of attack (pitch) - angle between velocity and x-axis (forward)
        # Use the projection onto x-z plane
        if abs(u_norm) > 1e-3:
            # Standard case: velocity has forward component
            alpha = math.atan2(w_norm, u_norm)
        else:
            # No forward component: rocket moving purely vertically/sideways
            # Angle of attack is based on vertical component relative to forward
            # If moving purely vertically (w dominant), alpha ≈ ±90°
            # But we want to treat this as minimal angle of attack for stability
            if abs(w_norm) > abs(v_norm):
                # Moving primarily vertically
                alpha = math.atan2(w_norm, 1e-3)  # Small forward component for calculation
            else:
                # Moving primarily sideways
                alpha = 0.0  # No pitch angle of attack
        
        # Sideslip angle (yaw) - angle between velocity and x-axis in x-y plane
        if abs(u_norm) > 1e-3:
            # Standard case
            beta = math.atan2(v_norm, u_norm)
        else:
            # No forward component: sideslip based on lateral component
            if abs(v_norm) > abs(w_norm):
                # Moving primarily sideways
                beta = math.atan2(v_norm, 1e-3)  # Small forward component
            else:
                # Moving primarily vertically
                beta = 0.0  # No sideslip
        
        return alpha, beta
    
    def compute_aerodynamic_forces(
        self,
        velocity_body: np.ndarray,
        altitude: float,
        cross_sectional_area: float
    ) -> np.ndarray:
        """
        Compute aerodynamic forces in body frame.
        
        Forces:
        - F_axial: Along rocket axis (x-direction)
        - F_side: Side force (y-direction)
        - F_normal: Normal force (z-direction)
        
        Args:
            velocity_body: Relative velocity in body frame [u, v, w] (m/s)
            altitude: Altitude above sea level (meters)
            cross_sectional_area: Cross-sectional area (m²)
            
        Returns:
            Aerodynamic force vector in body frame [Fx, Fy, Fz] (N)
        """
        velocity_mag = np.linalg.norm(velocity_body)
        
        if velocity_mag < 0.1:
            return np.zeros(3)
        
        # Get air density
        density = self.drag_model.atmosphere.get_density(altitude)
        
        # Dynamic pressure: q = 0.5 * ρ * v²
        q = 0.5 * density * velocity_mag * velocity_mag
        
        # Calculate angles
        alpha, beta = self.calculate_angle_of_attack(velocity_body)
        
        # Get drag coefficients
        mach = self.drag_model.get_mach_number(velocity_mag, altitude)
        Cd_axial = self.drag_model.get_axial_drag_coefficient(mach)
        Cd_normal_alpha = self.drag_model.get_normal_drag_coefficient(alpha, mach)
        Cd_normal_beta = self.drag_model.get_normal_drag_coefficient(beta, mach)
        
        # Calculate drag force components
        u, v, w = velocity_body
        
        # When rocket has forward velocity (u != 0), use standard aerodynamic model
        if abs(u) > 0.01:
            # Axial force (along x-axis, opposite to forward velocity)
            F_axial = -q * cross_sectional_area * Cd_axial * np.sign(u)
            
            # Normal force (z-direction, from pitch angle of attack)
            if abs(alpha) > 0.01:  # ~0.57 degrees
                F_normal = -q * cross_sectional_area * Cd_normal_alpha * math.sin(alpha)
            else:
                F_normal = 0.0
            
            # Side force (y-direction, from sideslip)
            if abs(beta) > 0.01:  # ~0.57 degrees
                F_side = -q * cross_sectional_area * Cd_normal_beta * math.sin(beta)
            else:
                F_side = 0.0
        else:
            # No forward velocity: rocket is moving purely vertically/sideways
            # Apply drag force opposite to velocity direction
            # IMPORTANT: When falling straight down, drag should only be in vertical direction
            # to prevent unwanted torques. Check which body frame component corresponds to vertical motion.
            if velocity_mag > 0.1:
                # For a rocket falling straight down (no horizontal velocity):
                # - World velocity: [0, vy, 0] where vy < 0 (down)
                # - Body velocity: [0, vy, 0] when upright (due to coordinate system)
                # - But drag should oppose motion without creating side forces
                # 
                # The issue: body frame y (right) is aligned with world y (vertical)
                # when upright, but drag in y-direction creates torque.
                # Solution: Only apply drag in the direction that doesn't create torque.
                # For vertical motion, apply drag only in z-direction (up/down in body frame).
                
                # Check if motion is primarily vertical (in world frame, this is y-direction)
                # In body frame when upright: world y → body y, but we want drag in body z
                # Actually, we need to check the actual body frame components
                u, v, w = velocity_body
                
                # If motion is primarily in y-direction (sideways in body frame),
                # but this is actually vertical in world frame when upright,
                # we should apply drag in z-direction (vertical in body frame) instead
                # to avoid creating torque from side forces.
                
                # When falling straight down (no forward velocity u ≈ 0):
                # - World velocity: [0, vy, 0] where vy < 0 (down)
                # - Body velocity: [0, vy, 0] when upright (body y aligns with world y)
                # - Drag should oppose motion: apply in body y-direction (opposite to vy)
                # - Body y → World y, so this creates vertical drag (correct)
                # - But we need to avoid creating torque from side forces
                #
                # Solution: Apply drag in the direction of motion (body y) but ensure
                # it doesn't create torque. Since COM is on the centerline, drag along
                # the centerline (y-axis) shouldn't create torque about the centerline.
                # However, if there's any offset, we need to be careful.
                #
                # Actually, the real issue is coordinate system mismatch:
                # - When upright: body y (right) = world y (vertical)
                # - When upright: body z (up) = world z (horizontal)
                # So drag in body y becomes world y (vertical) ✓
                # But drag in body z becomes world z (horizontal) ✗
                #
                # Apply drag opposite to velocity in body frame, but only in the component
                # that corresponds to vertical motion in world frame.
                F_axial = 0.0
                
                # If motion is in y-direction (body frame), this is vertical in world frame
                # Apply drag in y-direction (body frame) to oppose vertical motion
                if abs(v) > abs(u) and abs(v) > abs(w):
                    # Motion is primarily in y-direction (vertical in world when upright)
                    # Apply drag in y-direction - this is along the centerline, so no torque
                    F_side = -q * cross_sectional_area * Cd_axial * np.sign(v)
                    F_normal = 0.0
                elif abs(w) > abs(u) and abs(w) > abs(v):
                    # Motion is primarily in z-direction (horizontal in world when upright)
                    # This shouldn't happen when falling straight down, but handle it
                    F_normal = -q * cross_sectional_area * Cd_axial * np.sign(w)
                    F_side = 0.0
                else:
                    # Equal components or small velocity - apply drag opposite to largest component
                    if abs(v) > 0.01:
                        F_side = -q * cross_sectional_area * Cd_axial * np.sign(v)
                        F_normal = 0.0
                    else:
                        F_side = 0.0
                        F_normal = 0.0
            else:
                F_axial = 0.0
                F_side = 0.0
                F_normal = 0.0
        
        return np.array([F_axial, F_side, F_normal])
    
    def calculate_terminal_velocity(
        self,
        mass: float,
        cross_sectional_area: float,
        altitude: float,
        orientation: str = "axial",
        angle_of_attack: float = 0.0
    ) -> float:
        """
        Calculate terminal velocity for free fall.
        
        Terminal velocity occurs when drag force equals gravitational force:
        F_drag = F_gravity
        0.5 * ρ * v² * A * Cd = m * g
        v_term = sqrt(2 * m * g / (ρ * A * Cd))
        
        Args:
            mass: Total mass (kg)
            cross_sectional_area: Cross-sectional area (m²)
            altitude: Altitude above sea level (meters)
            orientation: "axial" or "normal" (affects drag coefficient)
            angle_of_attack: Angle of attack in radians (for normal orientation)
            
        Returns:
            Terminal velocity magnitude (m/s)
        """
        from .constants import GRAVITY
        
        # Get air density
        density = self.drag_model.atmosphere.get_density(altitude)
        
        if density <= 0 or cross_sectional_area <= 0:
            return float('inf')  # No drag in vacuum
        
        # Estimate drag coefficient based on orientation
        # For terminal velocity, we need an iterative solution since Cd depends on velocity
        # Use an iterative approach or simplified estimate
        
        # Initial guess: assume subsonic (M < 0.8)
        # Start with a reasonable Cd estimate
        if orientation == "axial":
            # Axial: lower drag, higher terminal velocity
            cd_estimate = 0.6  # Average for subsonic axial flow
        else:
            # Normal: higher drag, lower terminal velocity
            cd_estimate = DRAG_COEFFICIENT_NORMAL * (1.0 + 0.15 * angle_of_attack * angle_of_attack)
        
        # Calculate terminal velocity with initial estimate
        v_term = math.sqrt(2 * mass * GRAVITY / (density * cross_sectional_area * cd_estimate))
        
        # Refine using Mach number correction (iterative)
        # For most cases, one iteration is sufficient
        mach = self.drag_model.get_mach_number(v_term, altitude)
        if orientation == "axial":
            cd_refined = self.drag_model.get_axial_drag_coefficient(mach)
        else:
            cd_refined = self.drag_model.get_normal_drag_coefficient(angle_of_attack, mach)
        
        # Recalculate with refined Cd
        v_term_refined = math.sqrt(2 * mass * GRAVITY / (density * cross_sectional_area * cd_refined))
        
        return v_term_refined
    
    def calculate_terminal_velocity_range(
        self,
        mass: float,
        cross_sectional_area: float,
        altitude: float
    ) -> Tuple[float, float]:
        """
        Calculate terminal velocity range (axial and normal orientations).
        
        Args:
            mass: Total mass (kg)
            cross_sectional_area: Cross-sectional area (m²)
            altitude: Altitude above sea level (meters)
            
        Returns:
            Tuple of (terminal_velocity_axial, terminal_velocity_normal) in m/s
        """
        v_term_axial = self.calculate_terminal_velocity(
            mass, cross_sectional_area, altitude, orientation="axial"
        )
        v_term_normal = self.calculate_terminal_velocity(
            mass, cross_sectional_area, altitude, orientation="normal", angle_of_attack=0.0
        )
        
        return (v_term_axial, v_term_normal)

