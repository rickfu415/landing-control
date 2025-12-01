"""PID Controller implementation for rocket control loops."""

from dataclasses import dataclass
import numpy as np


@dataclass
class PIDController:
    """
    Proportional-Integral-Derivative controller.
    Used for attitude control and throttle management.
    """
    kp: float  # Proportional gain
    ki: float  # Integral gain
    kd: float  # Derivative gain
    
    output_min: float = -1.0
    output_max: float = 1.0
    integral_max: float = 10.0  # Anti-windup limit
    
    def __post_init__(self):
        self.integral = 0.0
        self.previous_error = 0.0
        self.previous_time = None
    
    def reset(self):
        """Reset controller state."""
        self.integral = 0.0
        self.previous_error = 0.0
        self.previous_time = None
    
    def update(self, setpoint: float, measured: float, dt: float) -> float:
        """
        Calculate control output.
        
        Args:
            setpoint: Desired value
            measured: Current measured value
            dt: Time step in seconds
            
        Returns:
            Control output (clamped to output_min/max)
        """
        error = setpoint - measured
        
        # Proportional term
        p_term = self.kp * error
        
        # Integral term with anti-windup
        self.integral += error * dt
        self.integral = np.clip(self.integral, -self.integral_max, self.integral_max)
        i_term = self.ki * self.integral
        
        # Derivative term (on error)
        if dt > 0:
            derivative = (error - self.previous_error) / dt
        else:
            derivative = 0.0
        d_term = self.kd * derivative
        
        self.previous_error = error
        
        # Total output
        output = p_term + i_term + d_term
        
        return np.clip(output, self.output_min, self.output_max)


class AttitudeController:
    """Controller for rocket attitude (orientation)."""
    
    def __init__(self):
        # PID for pitch control
        self.pitch_pid = PIDController(
            kp=2.0, ki=0.1, kd=1.5,
            output_min=-5.0, output_max=5.0  # gimbal degrees
        )
        
        # PID for yaw control
        self.yaw_pid = PIDController(
            kp=2.0, ki=0.1, kd=1.5,
            output_min=-5.0, output_max=5.0
        )
        
        # PID for roll control (using grid fins)
        self.roll_pid = PIDController(
            kp=1.0, ki=0.05, kd=0.8,
            output_min=-15.0, output_max=15.0
        )
    
    def reset(self):
        """Reset all controllers."""
        self.pitch_pid.reset()
        self.yaw_pid.reset()
        self.roll_pid.reset()
    
    def compute_gimbal(self, target_pitch: float, target_yaw: float,
                       current_pitch: float, current_yaw: float, dt: float) -> tuple:
        """
        Compute gimbal angles to achieve target attitude.
        
        Returns:
            (pitch_gimbal, yaw_gimbal) in degrees
        """
        pitch_gimbal = self.pitch_pid.update(target_pitch, current_pitch, dt)
        yaw_gimbal = self.yaw_pid.update(target_yaw, current_yaw, dt)
        
        return (pitch_gimbal, yaw_gimbal)

