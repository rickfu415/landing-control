"""
Wind model for atmospheric wind effects.

Models altitude-dependent wind profiles with Beaufort scale levels (1-9)
and time-varying randomness in magnitude and direction.
"""

import numpy as np
import math
import random
from dataclasses import dataclass
from typing import Optional


# Beaufort Wind Scale (levels 1-9)
# Maps wind level to typical speed range in m/s
BEAUFORT_SCALE = {
    1: (0.5, 1.5),    # Light air
    2: (1.6, 3.3),    # Light breeze
    3: (3.4, 5.4),    # Gentle breeze
    4: (5.5, 7.9),    # Moderate breeze
    5: (8.0, 10.7),   # Fresh breeze
    6: (10.8, 13.8),  # Strong breeze
    7: (13.9, 17.1),  # Near gale
    8: (17.2, 20.7),  # Gale
    9: (20.8, 24.4),  # Strong gale
}


def get_wind_level_speed(wind_level: int) -> float:
    """
    Get typical wind speed for a Beaufort scale level.
    
    Args:
        wind_level: Beaufort scale level (1-9)
        
    Returns:
        Typical wind speed in m/s (midpoint of range)
    """
    if wind_level < 1 or wind_level > 9:
        raise ValueError(f"Wind level must be between 1 and 9, got {wind_level}")
    min_speed, max_speed = BEAUFORT_SCALE[wind_level]
    return (min_speed + max_speed) / 2.0


@dataclass
class WindConfig:
    """Configuration for wind model."""
    enabled: bool = True
    wind_level: int = 0  # Beaufort scale level (1-9), 0 = no wind
    base_direction: float = 0.0  # Base direction in radians (0 = +x direction)
    scale_height: float = 1500.0  # meters (wind decay scale height)
    turbulence_strength: float = 0.3  # Strength of random variations (0-1)
    time_variation_period: float = 30.0  # Period for wind changes in seconds
    direction_variation: float = math.pi / 3  # Max direction variation (±60 degrees)
    seed: Optional[int] = None  # Random seed for reproducibility


class WindModel:
    """
    Wind model for altitude-dependent wind profiles with Beaufort scale levels.
    
    Models horizontal wind that decreases with altitude using exponential decay.
    Includes time-varying randomness in magnitude and direction.
    """
    
    def __init__(self, config: Optional[WindConfig] = None):
        """
        Initialize wind model.
        
        Args:
            config: Wind configuration. If None, uses default values.
        """
        self.config = config or WindConfig()
        self.time = 0.0
        
        # Initialize random number generator
        if self.config.seed is not None:
            self.rng = random.Random(self.config.seed)
            np.random.seed(self.config.seed)
        else:
            self.rng = random.Random()
        
        # Initialize time-varying parameters
        self._init_time_variations()
    
    def _init_time_variations(self):
        """Initialize random parameters for time-varying wind."""
        # Random phase offsets for smooth variations
        self.speed_phase = self.rng.uniform(0, 2 * math.pi)
        self.direction_phase = self.rng.uniform(0, 2 * math.pi)
        
        # Random magnitude variations (0.8 to 1.2 of base speed)
        self.speed_variation_amplitude = self.config.turbulence_strength * 0.2
        
        # Random direction variations
        self.direction_variation_amplitude = self.config.direction_variation * self.config.turbulence_strength
    
    def update_time(self, dt: float):
        """
        Update internal time for time-varying wind calculations.
        Skipped if wind is disabled for CPU optimization.
        
        Args:
            dt: Time step (seconds)
        """
        # Skip time updates if wind is disabled (CPU optimization)
        if not self.config.enabled:
            return
        
        self.time += dt
    
    def reset(self):
        """Reset wind model (reset time and reinitialize variations)."""
        self.time = 0.0
        self._init_time_variations()
    
    def get_wind_velocity(self, altitude: float) -> np.ndarray:
        """
        Get wind velocity vector at given altitude with time-varying randomness.
        
        Wind profile: V_wind(h) = V_surface * exp(-h / h_scale)
        Wind is horizontal only (x-z plane).
        
        Includes:
        - Beaufort scale-based base speed
        - Time-varying magnitude variations
        - Time-varying direction variations
        - Random turbulence
        
        Args:
            altitude: Altitude above sea level (meters)
            
        Returns:
            Wind velocity vector in world frame [vx, vy, vz] (m/s)
            vy (vertical component) is always 0
        """
        if not self.config.enabled:
            return np.array([0.0, 0.0, 0.0])
        
        # Ensure altitude is non-negative
        altitude = max(0.0, altitude)
        
        # Get base wind speed from Beaufort scale level
        # If wind_level is 0, wind is disabled (handled by enabled check above)
        if self.config.wind_level <= 0:
            return np.array([0.0, 0.0, 0.0])
        
        base_speed = get_wind_level_speed(self.config.wind_level)
        
        # Time-varying magnitude (smooth sinusoidal variation)
        time_factor = 2 * math.pi * self.time / self.config.time_variation_period
        magnitude_variation = 1.0 + self.speed_variation_amplitude * math.sin(time_factor + self.speed_phase)
        
        # Add random turbulence (high-frequency noise)
        turbulence = self.rng.uniform(-1, 1) * self.config.turbulence_strength * 0.1
        magnitude_variation += turbulence
        
        # Apply altitude decay
        altitude_factor = math.exp(-altitude / self.config.scale_height)
        current_speed = base_speed * magnitude_variation * altitude_factor
        
        # Ensure speed is non-negative
        current_speed = max(0.0, current_speed)
        
        # Time-varying direction (smooth variation)
        direction_variation = self.direction_variation_amplitude * math.sin(
            time_factor * 0.7 + self.direction_phase  # Different frequency for direction
        )
        
        # Add random direction turbulence
        direction_turbulence = self.rng.uniform(-1, 1) * self.config.turbulence_strength * 0.2
        direction_variation += direction_turbulence
        
        # Current wind direction
        current_direction = self.config.base_direction + direction_variation
        
        # Wind velocity components in horizontal plane
        wind_x = current_speed * math.cos(current_direction)
        wind_z = current_speed * math.sin(current_direction)
        
        return np.array([wind_x, 0.0, wind_z])
    
    def get_relative_velocity(self, rocket_velocity: np.ndarray, altitude: float) -> np.ndarray:
        """
        Get relative velocity (rocket velocity - wind velocity).
        
        Args:
            rocket_velocity: Rocket velocity in world frame [vx, vy, vz] (m/s)
            altitude: Altitude above sea level (meters)
            
        Returns:
            Relative velocity vector [vx, vy, vz] (m/s)
        """
        # Skip wind calculations if disabled (CPU optimization)
        if not self.config.enabled:
            return rocket_velocity
        
        wind_velocity = self.get_wind_velocity(altitude)
        return rocket_velocity - wind_velocity
    
    def get_wind_speed(self, altitude: float) -> float:
        """
        Get wind speed magnitude at given altitude.
        
        Args:
            altitude: Altitude above sea level (meters)
            
        Returns:
            Wind speed magnitude (m/s)
        """
        wind_velocity = self.get_wind_velocity(altitude)
        return np.linalg.norm(wind_velocity)
    
    def get_wind_direction(self, altitude: float = 0.0) -> float:
        """
        Get current wind direction angle (with time variations).
        
        Args:
            altitude: Altitude for calculation (affects time variations)
            
        Returns:
            Wind direction in radians (0 = +x direction)
        """
        if not self.config.enabled:
            return self.config.base_direction
        
        # Calculate time-varying direction (same as in get_wind_velocity)
        time_factor = 2 * math.pi * self.time / self.config.time_variation_period
        direction_variation = self.direction_variation_amplitude * math.sin(
            time_factor * 0.7 + self.direction_phase
        )
        direction_turbulence = self.rng.uniform(-1, 1) * self.config.turbulence_strength * 0.2
        direction_variation += direction_turbulence
        
        return self.config.base_direction + direction_variation
    
    def get_wind_level(self) -> int:
        """
        Get current Beaufort wind scale level.
        
        Returns:
            Wind level (1-9)
        """
        return self.config.wind_level
    
    def get_base_wind_speed(self) -> float:
        """
        Get base wind speed for current level (at sea level).
        
        Returns:
            Base wind speed in m/s
        """
        return get_wind_level_speed(self.config.wind_level)

