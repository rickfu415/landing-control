"""Atmospheric model for density and pressure calculations."""

import numpy as np
from .constants import (
    SEA_LEVEL_PRESSURE,
    SEA_LEVEL_DENSITY,
    SEA_LEVEL_TEMPERATURE,
    TEMPERATURE_LAPSE_RATE,
    MOLAR_MASS_AIR,
    GAS_CONSTANT,
    GRAVITY,
)


class Atmosphere:
    """
    International Standard Atmosphere (ISA) model.
    Valid for altitudes up to ~11km (troposphere).
    """

    @staticmethod
    def get_temperature(altitude: float) -> float:
        """
        Get temperature at a given altitude.
        
        Args:
            altitude: Height above sea level in meters
            
        Returns:
            Temperature in Kelvin
        """
        if altitude < 0:
            altitude = 0
        if altitude > 11000:
            # Tropopause - constant temperature
            return 216.65
        return SEA_LEVEL_TEMPERATURE - TEMPERATURE_LAPSE_RATE * altitude

    @staticmethod
    def get_pressure(altitude: float) -> float:
        """
        Get atmospheric pressure at a given altitude.
        
        Args:
            altitude: Height above sea level in meters
            
        Returns:
            Pressure in Pascals
        """
        if altitude < 0:
            altitude = 0
        if altitude > 11000:
            # Above troposphere - use exponential decay
            p_tropopause = Atmosphere.get_pressure(11000)
            return p_tropopause * np.exp(-GRAVITY * MOLAR_MASS_AIR * (altitude - 11000) / (GAS_CONSTANT * 216.65))
        
        temperature = Atmosphere.get_temperature(altitude)
        exponent = GRAVITY * MOLAR_MASS_AIR / (GAS_CONSTANT * TEMPERATURE_LAPSE_RATE)
        return SEA_LEVEL_PRESSURE * (temperature / SEA_LEVEL_TEMPERATURE) ** exponent

    @staticmethod
    def get_density(altitude: float) -> float:
        """
        Get atmospheric density at a given altitude.
        
        Args:
            altitude: Height above sea level in meters
            
        Returns:
            Density in kg/m³
        """
        if altitude < 0:
            altitude = 0
        if altitude > 80000:
            # Effectively vacuum
            return 0.0
        
        pressure = Atmosphere.get_pressure(altitude)
        temperature = Atmosphere.get_temperature(altitude)
        
        # Ideal gas law: ρ = pM / RT
        return pressure * MOLAR_MASS_AIR / (GAS_CONSTANT * temperature)

    @staticmethod
    def get_speed_of_sound(altitude: float) -> float:
        """
        Get speed of sound at a given altitude.
        
        Args:
            altitude: Height above sea level in meters
            
        Returns:
            Speed of sound in m/s
        """
        temperature = Atmosphere.get_temperature(altitude)
        # a = sqrt(γRT/M) where γ = 1.4 for air
        return np.sqrt(1.4 * GAS_CONSTANT * temperature / MOLAR_MASS_AIR)

