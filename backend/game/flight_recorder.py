"""Flight data recorder for post-flight analysis."""

from dataclasses import dataclass, field
from typing import List, Dict, Any
import numpy as np


@dataclass
class FlightDataPoint:
    """Single data point in flight recording."""
    time: float
    altitude: float
    vertical_speed: float
    horizontal_speed: float
    total_speed: float
    position_x: float
    position_z: float
    fuel: float
    throttle: float
    gimbal_pitch: float
    gimbal_yaw: float
    tilt_angle: float
    phase: str
    mass: float = 0.0  # Total mass (dry + fuel)
    acceleration: float = 0.0  # Vertical acceleration (m/s²)


@dataclass
class FlightEvent:
    """Significant event during flight."""
    time: float
    event_type: str  # 'engine_start', 'landing_burn', 'legs_deploy', 'touchdown'
    description: str
    data: Dict[str, Any] = field(default_factory=dict)


class FlightRecorder:
    """Records flight data for post-flight analysis."""
    
    def __init__(self, sample_interval: float = 0.05):
        """
        Initialize flight recorder.
        
        Args:
            sample_interval: Time interval between samples in seconds (0.05 = 20 Hz)
                            When there's control input, records every frame regardless
        """
        self.sample_interval = sample_interval  # Target time interval (seconds)
        self.last_sample_time = 0.0  # Last time we recorded a sample
        self.data_points: List[FlightDataPoint] = []
        self.events: List[FlightEvent] = []
        self.recording = False
        
        # Track previous state for event detection
        self.prev_throttle = 0.0
        self.prev_phase = "descent"
        self.prev_legs_deployed = False
        
    def start_recording(self):
        """Start recording flight data."""
        print("[FlightRecorder] Starting recording...")
        self.recording = True
        self.data_points = []
        self.events = []
        self.last_sample_time = 0.0
        self.prev_throttle = 0.0
        self.prev_phase = "descent"
        self.prev_legs_deployed = False
        
    def stop_recording(self):
        """Stop recording flight data."""
        print(f"[FlightRecorder] Stopping recording. Total data points: {len(self.data_points)}, Events: {len(self.events)}")
        self.recording = False
        
    def record_frame(self, state, time: float, geometry=None):
        """
        Record a frame of flight data.
        
        Args:
            state: RocketState object
            time: Current simulation time (seconds)
            geometry: RocketGeometry object (optional, for mass calculation)
        """
        if not self.recording:
            return
        
        # Calculate time since last sample
        time_since_last_sample = time - self.last_sample_time
        
        # Smart sampling: Always record if there's control input OR if interval has passed
        has_control_input = (state.throttle > 0 or 
                            abs(state.gimbal[0]) > 0.1 or 
                            abs(state.gimbal[1]) > 0.1)
        is_time_to_sample = time_since_last_sample >= self.sample_interval
        
        # Record if there's activity OR if it's time for a scheduled sample
        if not (has_control_input or is_time_to_sample):
            return
        
        # Update last sample time
        self.last_sample_time = time
        
        # Debug: Log first few recordings
        if len(self.data_points) < 5:
            print(f"[FlightRecorder] Recording frame at t={time:.2f}s, throttle={state.throttle:.2f}, alt={state.position[1]:.1f}m, fuel={state.fuel:.0f}kg")
            
        # Calculate derived values
        horizontal_speed = float(np.sqrt(state.velocity[0]**2 + state.velocity[2]**2))
        total_speed = float(np.linalg.norm(state.velocity))
        
        # Calculate tilt angle
        # Assuming state has orientation quaternion
        up_body = np.array([0.0, 1.0, 0.0])
        # Simple quaternion rotation for up vector
        q = state.orientation
        w, x, y, z = q[0], q[1], q[2], q[3]
        up_world = np.array([
            2*(x*z + w*y),
            1 - 2*(x*x + z*z),
            2*(y*z - w*x)
        ])
        tilt_angle = float(np.degrees(np.arccos(np.clip(up_world[1], -1, 1))))
        
        # Calculate total mass
        if geometry:
            total_mass = float(geometry.get_mass(state.fuel))
        else:
            total_mass = 0.0  # Unknown if geometry not provided
        
        # Record data point
        data_point = FlightDataPoint(
            time=time,
            altitude=float(state.position[1]),
            vertical_speed=float(state.velocity[1]),
            horizontal_speed=horizontal_speed,
            total_speed=total_speed,
            position_x=float(state.position[0]),
            position_z=float(state.position[2]),
            fuel=float(state.fuel),
            throttle=float(state.throttle),
            gimbal_pitch=float(state.gimbal[0]),
            gimbal_yaw=float(state.gimbal[1]),
            tilt_angle=tilt_angle,
            phase=state.phase,
            mass=total_mass,
            acceleration=float(state.acceleration[1])  # Vertical acceleration
        )
        self.data_points.append(data_point)
        
        # Detect and record events
        self._detect_events(state, time)
        
    def _detect_events(self, state, time: float):
        """Detect and record significant flight events."""
        
        # Engine start (throttle goes from 0 to > 0)
        if self.prev_throttle == 0 and state.throttle > 0:
            self.events.append(FlightEvent(
                time=time,
                event_type='engine_start',
                description='Engine ignition',
                data={'throttle': float(state.throttle), 'altitude': float(state.position[1])}
            ))
            
        # Phase change to landing burn
        if self.prev_phase != 'landing_burn' and state.phase == 'landing_burn':
            self.events.append(FlightEvent(
                time=time,
                event_type='landing_burn',
                description='Landing burn initiated',
                data={'altitude': float(state.position[1]), 'speed': float(np.linalg.norm(state.velocity))}
            ))
            
        # Landing legs deployment
        if not self.prev_legs_deployed and state.legs_deployed:
            self.events.append(FlightEvent(
                time=time,
                event_type='legs_deploy',
                description='Landing legs deployed',
                data={'altitude': float(state.position[1])}
            ))
            
        # Update previous state
        self.prev_throttle = state.throttle
        self.prev_phase = state.phase
        self.prev_legs_deployed = state.legs_deployed
        
    def add_touchdown_event(self, state, time: float):
        """Add touchdown event with final statistics."""
        touchdown_speed = float(state.touchdown_velocity)
        horizontal_distance = float(np.sqrt(state.position[0]**2 + state.position[2]**2))
        
        self.events.append(FlightEvent(
            time=time,
            event_type='touchdown',
            description='Landed' if state.landed else 'Crashed',
            data={
                'success': state.landed,
                'touchdown_velocity': touchdown_speed,
                'horizontal_distance': horizontal_distance,
                'fuel_remaining': float(state.fuel),
                'tilt_angle': self._calculate_tilt(state)
            }
        ))
        
    def _calculate_tilt(self, state) -> float:
        """Calculate tilt angle from state."""
        q = state.orientation
        w, x, y, z = q[0], q[1], q[2], q[3]
        up_world = np.array([
            2*(x*z + w*y),
            1 - 2*(x*x + z*z),
            2*(y*z - w*x)
        ])
        return float(np.degrees(np.arccos(np.clip(up_world[1], -1, 1))))
        
    def get_statistics(self) -> Dict[str, Any]:
        """Calculate flight statistics from recorded data."""
        if not self.data_points:
            return {}
            
        # Calculate statistics
        throttle_values = [dp.throttle for dp in self.data_points]
        altitude_values = [dp.altitude for dp in self.data_points]
        speed_values = [dp.total_speed for dp in self.data_points]
        
        # Fuel consumption
        initial_fuel = self.data_points[0].fuel if self.data_points else 0
        final_fuel = self.data_points[-1].fuel if self.data_points else 0
        fuel_used = initial_fuel - final_fuel
        
        # Engine usage
        engine_on_frames = sum(1 for dp in self.data_points if dp.throttle > 0)
        total_frames = len(self.data_points)
        engine_usage_percent = (engine_on_frames / total_frames * 100) if total_frames > 0 else 0
        
        # Average throttle when engine is on
        throttle_when_on = [dp.throttle for dp in self.data_points if dp.throttle > 0]
        avg_throttle = np.mean(throttle_when_on) if throttle_when_on else 0
        
        # Max values
        max_speed = max(speed_values) if speed_values else 0
        max_throttle = max(throttle_values) if throttle_values else 0
        max_tilt = max(dp.tilt_angle for dp in self.data_points) if self.data_points else 0
        
        # Gimbal usage
        gimbal_usage = sum(1 for dp in self.data_points if abs(dp.gimbal_pitch) > 0.1 or abs(dp.gimbal_yaw) > 0.1)
        gimbal_usage_percent = (gimbal_usage / total_frames * 100) if total_frames > 0 else 0
        
        return {
            'total_time': self.data_points[-1].time if self.data_points else 0,
            'initial_fuel': initial_fuel,
            'final_fuel': final_fuel,
            'fuel_used': fuel_used,
            'fuel_efficiency': (final_fuel / initial_fuel * 100) if initial_fuel > 0 else 0,
            'engine_usage_percent': engine_usage_percent,
            'avg_throttle': avg_throttle * 100,  # Convert to percentage
            'max_throttle': max_throttle * 100,
            'max_speed': max_speed,
            'max_tilt_angle': max_tilt,
            'gimbal_usage_percent': gimbal_usage_percent,
            'total_data_points': len(self.data_points),
            'events_count': len(self.events)
        }
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert flight recording to dictionary for JSON serialization."""
        return {
            'data_points': [
                {
                    'time': dp.time,
                    'altitude': dp.altitude,
                    'vertical_speed': dp.vertical_speed,
                    'horizontal_speed': dp.horizontal_speed,
                    'total_speed': dp.total_speed,
                    'position_x': dp.position_x,
                    'position_z': dp.position_z,
                    'fuel': dp.fuel,
                    'throttle': dp.throttle,
                    'gimbal_pitch': dp.gimbal_pitch,
                    'gimbal_yaw': dp.gimbal_yaw,
                    'tilt_angle': dp.tilt_angle,
                    'phase': dp.phase,
                    'mass': dp.mass,
                    'acceleration': dp.acceleration
                }
                for dp in self.data_points
            ],
            'events': [
                {
                    'time': event.time,
                    'type': event.event_type,
                    'description': event.description,
                    'data': event.data
                }
                for event in self.events
            ],
            'statistics': self.get_statistics()
        }

