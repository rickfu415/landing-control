"""
Rocket geometry and physical properties.

Models the rocket as a configurable cylinder with variable mass distribution.
"""

import numpy as np
import math
from dataclasses import dataclass
from typing import Optional

from .constants import (
    ROCKET_HEIGHT,
    ROCKET_DIAMETER,
    ROCKET_DRY_MASS,
    ROCKET_FUEL_MASS,
    ROCKET_COM_HEIGHT,
)


@dataclass
class RocketConfig:
    """Configuration for rocket geometry and engine."""
    height: float = ROCKET_HEIGHT  # meters
    diameter: float = ROCKET_DIAMETER  # meters
    dry_mass: float = ROCKET_DRY_MASS  # kg
    fuel_mass: float = ROCKET_FUEL_MASS  # kg
    com_height: float = ROCKET_COM_HEIGHT  # meters from bottom (dry mass COM)
    fuel_com_height: Optional[float] = None  # meters from bottom (fuel COM, defaults to height/2)
    # Engine parameters
    thrust: float = 845_000  # N (default: Merlin 1D thrust)
    isp: float = 282  # seconds (default: Merlin 1D ISP at sea level)


class RocketGeometry:
    """
    Rocket geometry and physical properties.
    
    Models the rocket as a cylinder with configurable dimensions.
    Calculates mass, center of mass, and geometric properties.
    """
    
    def __init__(self, config: Optional[RocketConfig] = None):
        """
        Initialize rocket geometry.
        
        Args:
            config: Rocket configuration. If None, uses default values from constants.
        """
        self.config = config or RocketConfig()
        
        # Validate inputs
        if self.config.height <= 0:
            raise ValueError("Rocket height must be positive")
        if self.config.diameter <= 0:
            raise ValueError("Rocket diameter must be positive")
        if self.config.dry_mass <= 0:
            raise ValueError("Rocket dry mass must be positive")
        if self.config.fuel_mass < 0:
            raise ValueError("Rocket fuel mass cannot be negative")
        
        # Set default fuel COM if not specified (assume fuel tank at center)
        if self.config.fuel_com_height is None:
            self.config.fuel_com_height = self.config.height / 2.0
    
    @property
    def radius(self) -> float:
        """Get rocket radius in meters."""
        return self.config.diameter / 2.0
    
    @property
    def cross_sectional_area(self) -> float:
        """Get cross-sectional area in m²."""
        return math.pi * self.radius ** 2
    
    @property
    def surface_area(self) -> float:
        """Get total surface area in m² (cylinder lateral + 2 ends)."""
        lateral_area = 2 * math.pi * self.radius * self.config.height
        end_area = 2 * math.pi * self.radius ** 2
        return lateral_area + end_area
    
    def get_mass(self, fuel_remaining: float) -> float:
        """
        Get total mass of rocket at given fuel level.
        
        Args:
            fuel_remaining: Remaining fuel mass in kg
            
        Returns:
            Total mass in kg
        """
        fuel_remaining = max(0.0, min(fuel_remaining, self.config.fuel_mass))
        return self.config.dry_mass + fuel_remaining
    
    def get_com_position(self, fuel_remaining: float) -> np.ndarray:
        """
        Get center of mass position in body frame (from bottom).
        
        Body frame: x=forward (nose), y=right, z=up (vertical)
        Origin: bottom of rocket (engine end)
        
        Args:
            fuel_remaining: Remaining fuel mass in kg
            
        Returns:
            COM position vector [x, y, z] in meters (z is height from bottom)
        """
        fuel_remaining = max(0.0, min(fuel_remaining, self.config.fuel_mass))
        total_mass = self.get_mass(fuel_remaining)
        
        if total_mass == 0:
            return np.array([0.0, 0.0, 0.0])
        
        # Dry mass COM (assume at com_height from bottom)
        dry_com_z = self.config.com_height
        
        # Fuel COM (assume at fuel_com_height from bottom)
        fuel_com_z = self.config.fuel_com_height
        
        # Combined COM using weighted average
        # z_com = (m_dry * z_dry + m_fuel * z_fuel) / m_total
        com_z = (self.config.dry_mass * dry_com_z + fuel_remaining * fuel_com_z) / total_mass
        
        # For symmetric cylinder, COM is on centerline (x=0, y=0)
        return np.array([0.0, 0.0, com_z])
    
    def get_engine_position(self) -> np.ndarray:
        """
        Get engine position in body frame (from bottom).
        
        Returns:
            Engine position vector [x, y, z] in meters (z=0 at bottom)
        """
        return np.array([0.0, 0.0, 0.0])  # Engine at bottom
    
    def get_com_to_engine_vector(self, fuel_remaining: float) -> np.ndarray:
        """
        Get vector from COM to engine in body frame.
        
        Args:
            fuel_remaining: Remaining fuel mass in kg
            
        Returns:
            Vector from COM to engine [x, y, z] in meters
        """
        com = self.get_com_position(fuel_remaining)
        engine = self.get_engine_position()
        return engine - com
    
    def get_inertia_tensor(self, fuel_remaining: float) -> np.ndarray:
        """
        Get 3x3 inertia tensor about center of mass in body frame.
        
        Body frame axes:
        - x: forward (nose direction)
        - y: right (lateral)
        - z: up (vertical)
        
        For a cylinder:
        - Ixx, Izz: moment about x and z axes (pitch/yaw)
        - Iyy: moment about y axis (roll)
        
        Uses parallel axis theorem to combine dry mass and fuel inertias
        about the combined center of mass.
        
        Args:
            fuel_remaining: Remaining fuel mass in kg
            
        Returns:
            3x3 inertia tensor matrix in kg·m²
        """
        fuel_remaining = max(0.0, min(fuel_remaining, self.config.fuel_mass))
        total_mass = self.get_mass(fuel_remaining)
        
        if total_mass == 0:
            return np.zeros((3, 3))
        
        r = self.radius
        h = self.config.height
        com_z = self.get_com_position(fuel_remaining)[2]
        
        # Model each component as a cylinder
        # Inertia of cylinder about its geometric center:
        # Ixx = Izz = (1/12) * m * (3*r² + h²)
        # Iyy = (1/2) * m * r²
        
        # Dry mass inertia about its COM
        dry_mass = self.config.dry_mass
        dry_com_z = self.config.com_height
        
        # Inertia about dry COM (assuming cylinder centered at dry_com_z)
        dry_Ixx_cm = (1/12) * dry_mass * (3*r**2 + h**2)
        dry_Iyy_cm = (1/2) * dry_mass * r**2
        dry_Izz_cm = dry_Ixx_cm
        
        # Shift dry mass inertia to combined COM using parallel axis theorem
        # I' = I_cm + m * d² (where d is distance along z-axis)
        dry_offset = com_z - dry_com_z
        dry_Ixx = dry_Ixx_cm + dry_mass * dry_offset**2
        dry_Iyy = dry_Iyy_cm  # No change for rotation about y-axis
        dry_Izz = dry_Ixx  # Symmetric
        
        # Fuel inertia about its COM
        if fuel_remaining > 0:
            fuel_com_z = self.config.fuel_com_height
            
            # Inertia about fuel COM
            fuel_Ixx_cm = (1/12) * fuel_remaining * (3*r**2 + h**2)
            fuel_Iyy_cm = (1/2) * fuel_remaining * r**2
            fuel_Izz_cm = fuel_Ixx_cm
            
            # Shift fuel inertia to combined COM
            fuel_offset = com_z - fuel_com_z
            fuel_Ixx = fuel_Ixx_cm + fuel_remaining * fuel_offset**2
            fuel_Iyy = fuel_Iyy_cm
            fuel_Izz = fuel_Ixx
        else:
            fuel_Ixx = 0.0
            fuel_Iyy = 0.0
            fuel_Izz = 0.0
        
        # Total inertia is sum of components
        Ixx = dry_Ixx + fuel_Ixx
        Iyy = dry_Iyy + fuel_Iyy
        Izz = dry_Izz + fuel_Izz
        
        # Build inertia tensor matrix
        # For symmetric cylinder, off-diagonal terms are zero
        I = np.array([
            [Ixx, 0.0, 0.0],
            [0.0, Iyy, 0.0],
            [0.0, 0.0, Izz]
        ])
        
        return I


# =============================================================================
# TERMINAL VELOCITY AND FUEL CALCULATION HELPERS
# =============================================================================

def calculate_terminal_velocity(total_mass: float, diameter: float, altitude: float = 5000.0) -> float:
    """
    Calculate terminal velocity for a rocket at given altitude.
    
    Terminal velocity: v_term = sqrt(2 * m * g / (ρ * A * Cd))
    
    Args:
        total_mass: Total rocket mass (dry + fuel) in kg
        diameter: Rocket diameter in meters
        altitude: Altitude in meters (default 5000m for initial conditions)
        
    Returns:
        Terminal velocity in m/s (negative for downward)
    """
    GRAVITY = 9.80665  # m/s²
    SEA_LEVEL_DENSITY = 1.225  # kg/m³
    SEA_LEVEL_TEMP = 288.15  # K
    TEMP_LAPSE = 0.0065  # K/m
    Cd = 0.6  # Drag coefficient (axial, subsonic, cylindrical body)
    
    # Atmospheric density at altitude (simplified ISA model)
    temp_at_alt = SEA_LEVEL_TEMP - TEMP_LAPSE * altitude
    density = SEA_LEVEL_DENSITY * (temp_at_alt / SEA_LEVEL_TEMP) ** 4.256
    
    # Cross-sectional area
    area = math.pi * (diameter / 2) ** 2
    
    # Terminal velocity formula
    v_term = math.sqrt(2 * total_mass * GRAVITY / (density * area * Cd))
    
    return v_term


def calculate_landing_fuel(dry_mass: float, thrust_kn: float, isp: float, diameter: float, safety_margin: float = 1.10) -> float:
    """
    Calculate optimal landing fuel based on rocket parameters and terminal velocity.
    
    Accounts for:
    - Terminal velocity at starting altitude (5000m)
    - Gravity losses during burn
    - Changing mass during burn
    - Configurable safety margin (default 10% extra)
    
    Args:
        dry_mass: Rocket dry mass in kg
        thrust_kn: Engine thrust in kilonewtons
        isp: Specific impulse in seconds
        diameter: Rocket diameter in meters
        safety_margin: Safety margin multiplier (default 1.10 = 10% extra)
        
    Returns:
        Optimal landing fuel in kg (rounded to nearest 100 kg)
    """
    GRAVITY = 9.80665  # m/s²
    INITIAL_ALTITUDE = 5000.0  # meters
    
    # Convert thrust to Newtons
    thrust_n = thrust_kn * 1000
    
    # Calculate mass flow rate (kg/s)
    mass_flow_rate = thrust_n / (isp * GRAVITY)
    
    # Iteratively calculate fuel needed (converges in ~5-10 iterations)
    # Start with an initial guess
    fuel_needed = 1000  # kg initial guess
    
    for _ in range(15):  # More iterations for convergence
        # Total mass at start (with fuel)
        total_mass = dry_mass + fuel_needed
        
        # Calculate terminal velocity at starting altitude
        terminal_velocity = calculate_terminal_velocity(total_mass, diameter, altitude=INITIAL_ALTITUDE)
        
        # Average mass during burn (starts with fuel, ends with ~0 fuel)
        avg_mass = dry_mass + (fuel_needed / 2)
        
        # Net acceleration (thrust - gravity)
        avg_accel = (thrust_n / avg_mass) - GRAVITY
        
        # Burn time to kill terminal velocity
        burn_time = terminal_velocity / avg_accel
        
        # Fuel consumed
        fuel_needed = mass_flow_rate * burn_time
    
    # Add safety margin and round to nearest 100 kg
    fuel_with_margin = fuel_needed * safety_margin
    return round(fuel_with_margin / 100) * 100


# =============================================================================
# PREDEFINED ROCKET MODELS
# =============================================================================

class RocketPresets:
    """
    Predefined real-world rocket configurations.
    
    Contains specifications for famous rockets from SpaceX, China, and Russia.
    All dimensions are for first stage only (for landing simulation).
    """
    
    @staticmethod
    def falcon9_block5_landing() -> RocketConfig:
        """
        SpaceX Falcon 9 Block 5 First Stage (Landing Configuration).
        
        Fuel calculated for optimal landing from 5000m @ terminal velocity + 10% margin.
        """
        dry_mass = 22_200
        diameter = 3.66
        thrust_kn = 845
        isp = 282
        return RocketConfig(
            height=47.7,
            diameter=diameter,
            dry_mass=dry_mass,
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp, diameter),
            com_height=20.0,
            fuel_com_height=23.85,
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def starship_super_heavy() -> RocketConfig:
        """
        SpaceX Starship Super Heavy Booster (First Stage).
        
        Sources: SpaceX official data
        Fuel calculated for landing scenario from terminal velocity + 10% margin.
        Uses 3 Raptor engines for landing (similar to Falcon 9 using 1 of 9).
        """
        dry_mass = 200_000
        diameter = 9.0
        thrust_kn = 6900  # 3× Raptor engines (2,300 kN each)
        isp = 330
        return RocketConfig(
            height=69.0,  # Super Heavy booster height
            diameter=diameter,
            dry_mass=dry_mass,  # kg (estimated dry mass)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp, diameter, safety_margin=1.10),  # 10% margin
            com_height=30.0,  # meters from bottom (estimated)
            fuel_com_height=34.5,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def long_march5_core() -> RocketConfig:
        """
        Chinese Long March 5 Core Stage (First Stage).
        
        Sources: CASC official data, Wikipedia
        Fuel calculated for landing scenario from terminal velocity + 10% margin.
        """
        dry_mass = 18_000
        diameter = 5.0
        thrust_kn = 700
        isp = 310
        return RocketConfig(
            height=33.0,  # Core stage height
            diameter=diameter,
            dry_mass=dry_mass,  # kg (estimated dry mass)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp, diameter),  # Landing fuel
            com_height=15.0,  # meters from bottom (estimated)
            fuel_com_height=16.5,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def long_march9_first_stage() -> RocketConfig:
        """
        Chinese Long March 9 First Stage (in development).
        
        Sources: CASC official data, Wikipedia
        Fuel calculated for landing scenario from terminal velocity + 10% margin.
        """
        dry_mass = 150_000
        diameter = 10.6
        thrust_kn = 4800
        isp = 335
        return RocketConfig(
            height=50.0,  # First stage height (estimated)
            diameter=diameter,
            dry_mass=dry_mass,  # kg (estimated)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp, diameter),  # Landing fuel
            com_height=22.0,  # meters from bottom (estimated)
            fuel_com_height=25.0,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def soyuz_first_stage() -> RocketConfig:
        """
        Russian Soyuz-2 First Stage (Core + 4 Boosters, modeled as single core).
        
        Sources: Roscosmos data, Wikipedia
        Note: Soyuz uses 4 strap-on boosters + core, modeled here as equivalent single stage
        Fuel calculated for landing scenario from terminal velocity + 10% margin.
        """
        dry_mass = 6_545
        diameter = 2.95
        thrust_kn = 838
        isp = 263
        return RocketConfig(
            height=27.8,  # Core stage height
            diameter=diameter,
            dry_mass=dry_mass,  # kg (core dry mass)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp, diameter),  # Landing fuel
            com_height=12.0,  # meters from bottom (estimated)
            fuel_com_height=13.9,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def soyuz_booster() -> RocketConfig:
        """
        Russian Soyuz-2 Strap-on Booster (First Stage).
        
        Sources: Roscosmos data
        Fuel calculated for landing scenario from terminal velocity + 10% margin.
        """
        dry_mass = 3_784
        diameter = 2.68
        thrust_kn = 838
        isp = 263
        return RocketConfig(
            height=19.6,  # Booster height
            diameter=diameter,
            dry_mass=dry_mass,  # kg (booster dry mass)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp, diameter),  # Landing fuel
            com_height=8.0,  # meters from bottom (estimated)
            fuel_com_height=9.8,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def proton_m_first_stage() -> RocketConfig:
        """
        Russian Proton-M First Stage.
        
        Sources: Roscosmos data, Wikipedia
        Fuel calculated for landing scenario from terminal velocity + 10% margin.
        """
        dry_mass = 31_000
        diameter = 4.15
        thrust_kn = 1014
        isp = 285
        return RocketConfig(
            height=21.2,  # First stage height
            diameter=diameter,
            dry_mass=dry_mass,  # kg (dry mass)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp, diameter),  # Landing fuel
            com_height=9.0,  # meters from bottom (estimated)
            fuel_com_height=10.6,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def angara_a5_first_stage() -> RocketConfig:
        """
        Russian Angara A5 First Stage (URM-1 Core).
        
        Sources: Roscosmos data
        Fuel calculated for landing scenario from terminal velocity + 10% margin.
        """
        dry_mass = 9_500
        diameter = 3.6
        thrust_kn = 2080
        isp = 311
        return RocketConfig(
            height=25.0,  # URM-1 height
            diameter=diameter,
            dry_mass=dry_mass,  # kg (dry mass)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp, diameter),  # Landing fuel
            com_height=11.0,  # meters from bottom (estimated)
            fuel_com_height=12.5,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def zhuque2_first_stage() -> RocketConfig:
        """
        Chinese Zhuque-2 First Stage (LandSpace).
        
        Sources: LandSpace official data
        Fuel calculated for landing scenario.
        """
        dry_mass = 8_000
        thrust_kn = 670
        isp = 290
        return RocketConfig(
            height=30.0,  # First stage height (estimated)
            diameter=3.35,  # meters
            dry_mass=dry_mass,  # kg (estimated dry mass)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp),  # Landing fuel
            com_height=13.0,  # meters from bottom (estimated)
            fuel_com_height=15.0,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def zhuque3_first_stage() -> RocketConfig:
        """
        Chinese Zhuque-3 First Stage (LandSpace, reusable).
        
        Sources: LandSpace official data
        Fuel calculated for landing scenario.
        """
        dry_mass = 25_000
        thrust_kn = 670
        isp = 290
        return RocketConfig(
            height=40.0,  # First stage height (estimated)
            diameter=4.5,  # meters
            dry_mass=dry_mass,  # kg (estimated dry mass)
            fuel_mass=calculate_landing_fuel(dry_mass, thrust_kn, isp),  # Landing fuel
            com_height=18.0,  # meters from bottom (estimated)
            fuel_com_height=20.0,  # meters (center)
            thrust=thrust_kn * 1000,  # Convert kN to N
            isp=isp,
        )
    
    @staticmethod
    def get_preset(name: str) -> RocketConfig:
        """
        Get a predefined rocket configuration by name.
        
        Args:
            name: Rocket preset name (e.g., "falcon9_block5", "soyuz_first_stage")
            
        Returns:
            RocketConfig instance
            
        Raises:
            ValueError: If preset name is not found
        """
        presets = {
            "falcon9_block5_landing": RocketPresets.falcon9_block5_landing,
            "starship_super_heavy": RocketPresets.starship_super_heavy,
            "long_march5_core": RocketPresets.long_march5_core,
            "long_march9_first_stage": RocketPresets.long_march9_first_stage,
            "soyuz_first_stage": RocketPresets.soyuz_first_stage,
            "soyuz_booster": RocketPresets.soyuz_booster,
            "proton_m_first_stage": RocketPresets.proton_m_first_stage,
            "angara_a5_first_stage": RocketPresets.angara_a5_first_stage,
            "zhuque2_first_stage": RocketPresets.zhuque2_first_stage,
            "zhuque3_first_stage": RocketPresets.zhuque3_first_stage,
        }
        
        if name not in presets:
            available = ", ".join(presets.keys())
            raise ValueError(
                f"Unknown rocket preset '{name}'. "
                f"Available presets: {available}"
            )
        
        return presets[name]()
    
    @staticmethod
    def list_presets() -> list:
        """
        Get list of all available rocket preset names.
        
        Returns:
            List of preset names
        """
        return [
            "falcon9_block5_landing",
            "starship_super_heavy",
            "long_march5_core",
            "long_march9_first_stage",
            "soyuz_first_stage",
            "soyuz_booster",
            "proton_m_first_stage",
            "angara_a5_first_stage",
            "zhuque2_first_stage",
            "zhuque3_first_stage",
        ]


def create_rocket_from_preset(preset_name: str) -> RocketGeometry:
    """
    Convenience function to create a RocketGeometry from a preset name.
    
    Args:
        preset_name: Name of the rocket preset (e.g., "falcon9_block5")
        
    Returns:
        RocketGeometry instance configured with the preset
        
    Example:
        >>> geom = create_rocket_from_preset("falcon9_block5")
        >>> print(geom.config.height)
        47.7
    """
    config = RocketPresets.get_preset(preset_name)
    return RocketGeometry(config=config)
