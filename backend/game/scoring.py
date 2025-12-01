"""Scoring system for the rocket landing game."""

import numpy as np
from physics.constants import (
    ROCKET_FUEL_MASS,
    LANDING_PAD_RADIUS,
    MAX_LANDING_VELOCITY_VERTICAL,
)


def calculate_score(state, elapsed_time: float) -> int:
    """
    Calculate the final score for a landing attempt.
    
    Scoring breakdown:
    - Landing accuracy: 0-3000 points (distance from pad center)
    - Velocity bonus: 0-2000 points (softer landing = more points)
    - Fuel efficiency: 0-2000 points (more remaining fuel = more points)
    - Attitude bonus: 0-1500 points (more upright = more points)
    - Time bonus: 0-1500 points (faster = more points)
    
    Max possible score: 10,000 points
    """
    if state.crashed:
        return 0
    
    if not state.landed:
        return 0
    
    score = 0
    
    # Landing accuracy bonus (0-3000)
    horizontal_distance = np.sqrt(state.position[0]**2 + state.position[2]**2)
    if horizontal_distance <= LANDING_PAD_RADIUS:
        # Perfect landing = 3000, edge of pad = 1500
        accuracy_score = int(3000 * (1 - horizontal_distance / LANDING_PAD_RADIUS))
    else:
        accuracy_score = 0
    score += accuracy_score
    
    # Velocity bonus (0-2000)
    touchdown_velocity = MAX_LANDING_VELOCITY_VERTICAL
    velocity_score = int(2000 * (1 - touchdown_velocity / (MAX_LANDING_VELOCITY_VERTICAL * 2)))
    velocity_score = max(0, velocity_score)
    score += velocity_score
    
    # Fuel efficiency bonus (0-2000)
    fuel_remaining_percent = state.fuel / ROCKET_FUEL_MASS
    fuel_score = int(2000 * fuel_remaining_percent)
    score += fuel_score
    
    # Attitude bonus (0-1500)
    attitude_score = 1500
    score += attitude_score
    
    # Time bonus (0-1500)
    if elapsed_time < 30:
        time_score = 1500
    elif elapsed_time > 90:
        time_score = 0
    else:
        time_score = int(1500 * (90 - elapsed_time) / 60)
    score += time_score
    
    return score
