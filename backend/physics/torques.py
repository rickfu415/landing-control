"""
Comprehensive torque calculation for 6-DOF dynamics.

Calculates all torques acting on the rocket:
- Thrust gimbal torque
- Aerodynamic torque (from forces at center of pressure)
- Other torques (damping, etc.)
"""

import numpy as np
from typing import Optional

from .geometry import RocketGeometry
from .transformations import world_to_body


class TorqueCalculator:
    """
    Calculates all torques acting on the rocket.
    
    Torques are computed in body frame about the center of mass.
    """
    
    def __init__(self, geometry: RocketGeometry):
        """
        Initialize torque calculator.
        
        Args:
            geometry: Rocket geometry object
        """
        self.geometry = geometry
    
    def compute_thrust_torque(
        self,
        thrust_body: np.ndarray,
        fuel_remaining: float
    ) -> np.ndarray:
        """
        Compute torque from thrust gimbal.
        
        Torque = r_COM_to_engine × F_thrust_body
        
        Args:
            thrust_body: Thrust vector in body frame [Fx, Fy, Fz] (N)
            fuel_remaining: Remaining fuel mass (kg)
            
        Returns:
            Torque vector in body frame [τx, τy, τz] (N·m)
        """
        # Get vector from COM to engine
        r_com_to_engine = self.geometry.get_com_to_engine_vector(fuel_remaining)
        
        # Torque = r × F
        torque = np.cross(r_com_to_engine, thrust_body)
        
        return torque
    
    def compute_aerodynamic_torque(
        self,
        aero_force_body: np.ndarray,
        fuel_remaining: float,
        center_of_pressure_height: Optional[float] = None
    ) -> np.ndarray:
        """
        Compute torque from aerodynamic forces.
        
        Torque = r_COM_to_CP × F_aero_body
        
        Special case: When drag is purely vertical (falling straight down),
        it acts through the COM and creates no torque.
        
        Args:
            aero_force_body: Aerodynamic force vector in body frame [Fx, Fy, Fz] (N)
            fuel_remaining: Remaining fuel mass (kg)
            center_of_pressure_height: Height of CP from bottom (m).
                                      If None, uses default (~0.25 * height)
            
        Returns:
            Torque vector in body frame [τx, τy, τz] (N·m)
        """
        # Get COM position
        com = self.geometry.get_com_position(fuel_remaining)
        
        # Check if force is purely vertical drag (side force only, no axial/normal)
        # When falling straight down, drag is in y-direction (body frame)
        # and should act through COM, not CP, to avoid unwanted torque
        force_mag = np.linalg.norm(aero_force_body)
        if force_mag > 0.1:
            # Check if force is primarily in y-direction (side/vertical drag)
            force_normalized = aero_force_body / force_mag
            if abs(force_normalized[1]) > 0.99 and abs(force_normalized[0]) < 0.01 and abs(force_normalized[2]) < 0.01:
                # Pure side force (vertical drag when upright)
                # This acts through the COM, not the CP, so no torque
                return np.zeros(3)
        
        # Center of pressure position (from bottom)
        if center_of_pressure_height is None:
            # Default: CP closer to COM for stability (~50% of height from bottom)
            # This reduces the moment arm and makes rotation less sensitive
            cp_height = self.geometry.config.height * 0.5
        else:
            cp_height = center_of_pressure_height
        
        # Vector from COM to CP in body frame
        # Body frame: z is up, so CP is at [0, 0, cp_height]
        cp_position = np.array([0.0, 0.0, cp_height])
        r_com_to_cp = cp_position - com
        
        # Torque = r × F
        torque = np.cross(r_com_to_cp, aero_force_body)
        
        return torque
    
    def compute_damping_torque(
        self,
        angular_velocity_body: np.ndarray,
        damping_coefficient: float = 2.0
    ) -> np.ndarray:
        """
        Compute damping torque (simulates air resistance to rotation).
        
        Simple linear damping: τ_damping = -c * ω
        
        Args:
            angular_velocity_body: Angular velocity in body frame [ωx, ωy, ωz] (rad/s)
            damping_coefficient: Damping coefficient (N·m·s/rad) - increased for stability
            
        Returns:
            Damping torque vector in body frame [τx, τy, τz] (N·m)
        """
        return -damping_coefficient * angular_velocity_body
    
    def compute_total_torque(
        self,
        thrust_body: np.ndarray,
        aero_force_body: np.ndarray,
        angular_velocity_body: np.ndarray,
        fuel_remaining: float,
        center_of_pressure_height: Optional[float] = None,
        include_damping: bool = True
    ) -> np.ndarray:
        """
        Compute total torque from all sources.
        
        Args:
            thrust_body: Thrust vector in body frame [Fx, Fy, Fz] (N)
            aero_force_body: Aerodynamic force vector in body frame [Fx, Fy, Fz] (N)
            angular_velocity_body: Angular velocity in body frame [ωx, ωy, ωz] (rad/s)
            fuel_remaining: Remaining fuel mass (kg)
            center_of_pressure_height: Height of CP from bottom (m)
            include_damping: Whether to include damping torque
            
        Returns:
            Total torque vector in body frame [τx, τy, τz] (N·m)
        """
        total_torque = np.zeros(3)
        
        # Thrust torque
        thrust_torque = self.compute_thrust_torque(thrust_body, fuel_remaining)
        total_torque += thrust_torque
        
        # Aerodynamic torque (scaled down for stability)
        aero_torque = self.compute_aerodynamic_torque(
            aero_force_body,
            fuel_remaining,
            center_of_pressure_height
        )
        # Scale down aerodynamic torque to reduce sensitivity
        # Real rockets have active control, so we reduce passive aero effects
        total_torque += aero_torque * 0.1  # Reduce to 10% for stability
        
        # Damping torque (optional)
        if include_damping:
            damping_torque = self.compute_damping_torque(angular_velocity_body)
            total_torque += damping_torque
        
        return total_torque

