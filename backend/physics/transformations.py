"""
Coordinate frame transformations for 6-DOF rigid body dynamics.

Provides utilities for converting between body frame and world frame
using quaternion-based rotation matrices.
"""

import numpy as np


def quaternion_to_rotation_matrix(q: np.ndarray) -> np.ndarray:
    """
    Convert quaternion to rotation matrix (Direction Cosine Matrix).
    
    Quaternion format: [w, x, y, z]
    Rotation matrix converts from body frame to world frame.
    
    Args:
        q: Quaternion [w, x, y, z]
        
    Returns:
        3x3 rotation matrix R such that v_world = R @ v_body
    """
    w, x, y, z = q
    
    # Normalize quaternion
    norm = np.sqrt(w*w + x*x + y*y + z*z)
    if norm > 0:
        w, x, y, z = w/norm, x/norm, y/norm, z/norm
    
    # Build rotation matrix
    # R = [
    #   [1-2(y²+z²),  2(xy-wz),     2(xz+wy)    ],
    #   [2(xy+wz),     1-2(x²+z²),   2(yz-wx)    ],
    #   [2(xz-wy),     2(yz+wx),     1-2(x²+y²)  ]
    # ]
    R = np.array([
        [1 - 2*(y*y + z*z),  2*(x*y - w*z),      2*(x*z + w*y)    ],
        [2*(x*y + w*z),      1 - 2*(x*x + z*z),  2*(y*z - w*x)    ],
        [2*(x*z - w*y),      2*(y*z + w*x),      1 - 2*(x*x + y*y)]
    ])
    
    return R


def body_to_world(vector_body: np.ndarray, quaternion: np.ndarray) -> np.ndarray:
    """
    Transform vector from body frame to world frame.
    
    Args:
        vector_body: Vector in body frame [x, y, z]
        quaternion: Orientation quaternion [w, x, y, z]
        
    Returns:
        Vector in world frame [x, y, z]
    """
    R = quaternion_to_rotation_matrix(quaternion)
    return R @ vector_body


def world_to_body(vector_world: np.ndarray, quaternion: np.ndarray) -> np.ndarray:
    """
    Transform vector from world frame to body frame.
    
    Args:
        vector_world: Vector in world frame [x, y, z]
        quaternion: Orientation quaternion [w, x, y, z]
        
    Returns:
        Vector in body frame [x, y, z]
    """
    R = quaternion_to_rotation_matrix(quaternion)
    # R is orthogonal, so R^T = R^-1
    return R.T @ vector_world


def quaternion_multiply(q1: np.ndarray, q2: np.ndarray) -> np.ndarray:
    """
    Multiply two quaternions: q_result = q1 * q2
    
    Args:
        q1: First quaternion [w, x, y, z]
        q2: Second quaternion [w, x, y, z]
        
    Returns:
        Product quaternion [w, x, y, z]
    """
    w1, x1, y1, z1 = q1
    w2, x2, y2, z2 = q2
    
    return np.array([
        w1*w2 - x1*x2 - y1*y2 - z1*z2,
        w1*x2 + x1*w2 + y1*z2 - z1*y2,
        w1*y2 - x1*z2 + y1*w2 + z1*x2,
        w1*z2 + x1*y2 - y1*x2 + z1*w2,
    ])


def quaternion_normalize(q: np.ndarray) -> np.ndarray:
    """
    Normalize quaternion to unit length.
    
    Args:
        q: Quaternion [w, x, y, z]
        
    Returns:
        Normalized quaternion [w, x, y, z]
    """
    norm = np.linalg.norm(q)
    if norm > 1e-10:
        return q / norm
    return np.array([1.0, 0.0, 0.0, 0.0])  # Default to identity


def quaternion_from_angular_velocity(omega: np.ndarray, dt: float) -> np.ndarray:
    """
    Compute quaternion derivative from angular velocity.
    
    Quaternion derivative: q_dot = 0.5 * q * [0, ωx, ωy, ωz]
    
    Args:
        omega: Angular velocity in body frame [ωx, ωy, ωz] (rad/s)
        dt: Time step (seconds)
        
    Returns:
        Quaternion increment [w, x, y, z] (not normalized)
    """
    # Create quaternion from angular velocity: [0, ωx, ωy, ωz]
    omega_quat = np.array([0.0, omega[0], omega[1], omega[2]])
    
    # For small angles: q_dot ≈ 0.5 * [0, ωx, ωy, ωz]
    # Integrated over dt: Δq ≈ 0.5 * dt * [0, ωx, ωy, ωz]
    dq = 0.5 * dt * omega_quat
    
    # Convert to proper quaternion format [w, x, y, z]
    # For small rotations: q ≈ [1, 0.5*ωx*dt, 0.5*ωy*dt, 0.5*ωz*dt]
    angle = np.linalg.norm(omega) * dt
    if angle > 1e-10:
        axis = omega / np.linalg.norm(omega)
        half_angle = angle / 2.0
        return np.array([
            np.cos(half_angle),
            axis[0] * np.sin(half_angle),
            axis[1] * np.sin(half_angle),
            axis[2] * np.sin(half_angle),
        ])
    else:
        # Small angle approximation
        return np.array([1.0, dq[1], dq[2], dq[3]])


def integrate_quaternion(q: np.ndarray, omega: np.ndarray, dt: float) -> np.ndarray:
    """
    Integrate quaternion orientation using angular velocity.
    
    Args:
        q: Current quaternion [w, x, y, z]
        omega: Angular velocity in body frame [ωx, ωy, ωz] (rad/s)
        dt: Time step (seconds)
        
    Returns:
        Updated quaternion [w, x, y, z] (normalized)
    """
    # Get quaternion increment
    dq = quaternion_from_angular_velocity(omega, dt)
    
    # Multiply quaternions: q_new = q * dq
    q_new = quaternion_multiply(q, dq)
    
    # Normalize to prevent drift
    return quaternion_normalize(q_new)

