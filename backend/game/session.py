"""Game session management."""

import asyncio
import time
from dataclasses import dataclass, field
from typing import Optional, Callable
from enum import Enum

from physics.engine import PhysicsEngine, RocketState
from game.scoring import calculate_score
from game.flight_recorder import FlightRecorder


class GameMode(str, Enum):
    MANUAL = "manual"
    AUTONOMOUS = "autonomous"
    ASSISTED = "assisted"


@dataclass
class GameConfig:
    """Configuration for a game session."""
    mode: GameMode = GameMode.MANUAL
    initial_altitude: float = 5000.0
    # initial_velocity is now calculated from terminal velocity (not fixed)
    wind_level: int = 0  # Beaufort scale level (1-9), 0 = no wind (default)
    rocket_preset: str = "falcon9_block5_landing"  # Rocket configuration preset


class GameSession:
    """
    Manages a single game session including physics,
    control, and game state.
    """
    
    def __init__(self, session_id: str, config: GameConfig = None):
        self.session_id = session_id
        self.config = config or GameConfig()
        
        # Initialize wind configuration
        from physics.wind import WindConfig
        # Clamp wind level to 0-9 (0 = disabled, 1-9 = Beaufort scale)
        clamped_wind_level = max(0, min(9, self.config.wind_level))
        wind_config = WindConfig(
            enabled=(clamped_wind_level > 0),
            wind_level=clamped_wind_level if clamped_wind_level > 0 else 1,  # Use 1 as placeholder if disabled
            turbulence_strength=0.3,
            seed=None  # Random seed for each run (different each time)
        )
        
        # Initialize rocket configuration
        from physics.geometry import RocketPresets, RocketConfig
        try:
            rocket_config = RocketPresets.get_preset(self.config.rocket_preset)
        except ValueError:
            # Fall back to default if invalid preset
            rocket_config = RocketPresets.get_preset("falcon9_block5_landing")
        
        # Initialize flight recorder
        self.flight_recorder = FlightRecorder(sample_interval=0.05)  # Record every 0.05 seconds (20 Hz)
        
        # Initialize subsystems
        self.physics = PhysicsEngine(rocket_config=rocket_config, wind_config=wind_config, flight_recorder=self.flight_recorder)
        self.guidance = None  # Lazy load to avoid circular import
        
        # Game state
        self.running = False
        self.paused = False
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.score: int = 0
        
        # Control inputs (for manual mode)
        self.manual_throttle: float = 0.0
        self.manual_gimbal: tuple = (0.0, 0.0)
        
        # State broadcast callback
        self._state_callback: Optional[Callable] = None
        
        # Reset to initial conditions
        self.reset()
    
    def _get_guidance(self):
        """Lazy load guidance system to avoid circular imports."""
        if self.guidance is None:
            from control.guidance import GuidanceSystem
            self.guidance = GuidanceSystem()
        return self.guidance
    
    def reset(self):
        """Reset game to initial state."""
        # Reset physics (velocity will be calculated from terminal velocity)
        self.physics.reset(
            altitude=self.config.initial_altitude
        )
        if self.guidance:
            self.guidance.reset()
        
        self.running = False
        self.paused = False
        self.start_time = None
        self.end_time = None
        self.score = 0
        self.manual_throttle = 0.0
        self.manual_gimbal = (0.0, 0.0)
    
    def start(self):
        """Start the game."""
        if not self.running:
            self.running = True
            self.paused = False
            self.start_time = time.time()
            self.flight_recorder.start_recording()
    
    def pause(self):
        """Pause the game."""
        self.paused = True
    
    def resume(self):
        """Resume the game."""
        self.paused = False
    
    def set_input(self, throttle: float = None, gimbal: tuple = None):
        """Set manual control inputs."""
        if throttle is not None:
            self.manual_throttle = throttle
        if gimbal is not None:
            self.manual_gimbal = gimbal
    
    def tick(self) -> dict:
        """
        Process one game tick.
        
        Returns:
            Current game state as dictionary
        """
        if not self.running or self.paused:
            return self.get_state()
        
        state = self.physics.state
        
        # Check if game is over
        if state.landed or state.crashed:
            if self.end_time is None:
                self.end_time = time.time()
                self.score = calculate_score(state, self.physics.time)
            return self.get_state()
        
        # Apply control based on game mode
        if self.config.mode == GameMode.MANUAL:
            # Use manual inputs directly
            self.physics.set_input(
                throttle=self.manual_throttle,
                gimbal=self.manual_gimbal
            )
        
        elif self.config.mode == GameMode.AUTONOMOUS:
            # Use guidance system
            guidance = self._get_guidance()
            command = guidance.compute_command(
                position=state.position,
                velocity=state.velocity,
                orientation=state.orientation,
                fuel=state.fuel,
                dt=self.physics.dt
            )
            self.physics.set_input(
                throttle=command.throttle,
                gimbal=(command.gimbal_pitch, command.gimbal_yaw)
            )
        
        elif self.config.mode == GameMode.ASSISTED:
            # Manual throttle, auto attitude
            guidance = self._get_guidance()
            command = guidance.compute_command(
                position=state.position,
                velocity=state.velocity,
                orientation=state.orientation,
                fuel=state.fuel,
                dt=self.physics.dt
            )
            self.physics.set_input(
                throttle=self.manual_throttle,
                gimbal=(command.gimbal_pitch, command.gimbal_yaw)
            )
        
        # Step physics
        self.physics.step()
        
        return self.get_state()
    
    def get_state(self) -> dict:
        """Get current game state as dictionary."""
        rocket_state = self.physics.state.to_dict(
            geometry=self.physics.geometry,
            aerodynamics_model=self.physics.aerodynamics
        )
        
        state = {
            "session_id": self.session_id,
            "mode": self.config.mode.value,
            "running": self.running,
            "paused": self.paused,
            "time": self.physics.time,
            "score": self.score,
            "rocket": rocket_state,
        }
        
        # Include flight review data if game is over
        is_game_over = rocket_state.get("landed", False) or rocket_state.get("crashed", False)
        if is_game_over:
            self.flight_recorder.stop_recording()
            flight_data = self.flight_recorder.to_dict()
            # Debug: Print data points count
            print(f"[FlightRecorder] Game over. Data points: {len(flight_data.get('data_points', []))}")
            print(f"[FlightRecorder] Events: {len(flight_data.get('events', []))}")
            state["flight_review"] = flight_data
        
        return state
