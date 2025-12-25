"""
Rocket Landing Simulator - Backend Server
FastAPI application with WebSocket support for real-time game simulation.
"""

import asyncio
import uuid
import logging
from typing import Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from game.session import GameSession, GameConfig, GameMode

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Store active game sessions
sessions: Dict[str, GameSession] = {}
# Store WebSocket connections
connections: Dict[str, WebSocket] = {}
# Game loop task
game_loop_task = None


class CreateGameRequest(BaseModel):
    mode: str = "manual"
    initial_altitude: float = 5000.0
    # initial_velocity is now calculated from terminal velocity (not a user input)
    wind_level: int = 0  # Beaufort scale level (1-9), 0 = no wind (default)
    rocket_preset: str = "falcon9_block5_landing"  # Rocket configuration preset


class GameInputRequest(BaseModel):
    throttle: float = None
    gimbal: list = None


async def game_loop():
    """Main game loop running at 30Hz."""
    while True:
        # Only process sessions that are actually running
        active_sessions = [
            (sid, session) for sid, session in sessions.items()
            if session.running and not session.paused and sid in connections
        ]
        
        # Skip sleep if no active sessions (reduces CPU when idle)
        if not active_sessions:
            await asyncio.sleep(0.1)  # Check every 100ms when idle
            continue
        
        for session_id, session in active_sessions:
            state = session.tick()
            
            # Broadcast state to connected client
            try:
                await connections[session_id].send_json({
                    "type": "state",
                    "data": state
                })
            except Exception:
                # Connection closed, will be cleaned up
                pass
        
        # 30 Hz tick rate (balanced performance and responsiveness)
        await asyncio.sleep(1/30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    global game_loop_task
    # Start game loop on startup
    game_loop_task = asyncio.create_task(game_loop())
    yield
    # Cancel game loop on shutdown
    if game_loop_task:
        game_loop_task.cancel()


app = FastAPI(
    title="Rocket Landing Simulator",
    description="Real-time rocket landing simulation game",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Rocket Landing Simulator API"}


@app.post("/api/game/create")
async def create_game(request: CreateGameRequest):
    """Create a new game session."""
    session_id = str(uuid.uuid4())[:8]
    
    mode_map = {
        "manual": GameMode.MANUAL,
        "autonomous": GameMode.AUTONOMOUS,
        "assisted": GameMode.ASSISTED,
    }
    
    # Validate wind level
    wind_level = request.wind_level
    if wind_level < 0 or wind_level > 9:
        wind_level = 0  # Default to no wind if invalid
    
    config = GameConfig(
        mode=mode_map.get(request.mode, GameMode.MANUAL),
        initial_altitude=request.initial_altitude,
        # initial_velocity removed - calculated from terminal velocity
        wind_level=wind_level,
        rocket_preset=request.rocket_preset,
    )
    
    session = GameSession(session_id, config)
    sessions[session_id] = session
    
    return {
        "session_id": session_id,
        "config": {
            "mode": request.mode,
            "initial_altitude": request.initial_altitude,
            # initial_velocity is now calculated per rocket
            "wind_level": wind_level,
            "rocket_preset": request.rocket_preset,
        }
    }


@app.get("/api/game/{session_id}")
async def get_game(session_id: str):
    """Get current game state."""
    if session_id not in sessions:
        return {"error": "Session not found"}
    
    return sessions[session_id].get_state()


@app.post("/api/game/{session_id}/start")
async def start_game(session_id: str):
    """Start the game."""
    if session_id not in sessions:
        return {"error": "Session not found"}
    
    sessions[session_id].start()
    return {"status": "started"}


@app.post("/api/game/{session_id}/pause")
async def pause_game(session_id: str):
    """Pause the game."""
    if session_id not in sessions:
        return {"error": "Session not found"}
    
    sessions[session_id].pause()
    return {"status": "paused"}


@app.post("/api/game/{session_id}/resume")
async def resume_game(session_id: str):
    """Resume the game."""
    if session_id not in sessions:
        return {"error": "Session not found"}
    
    sessions[session_id].resume()
    return {"status": "resumed"}


@app.post("/api/game/{session_id}/reset")
async def reset_game(session_id: str):
    """Reset the game."""
    if session_id not in sessions:
        return {"error": "Session not found"}
    
    sessions[session_id].reset()
    return {"status": "reset"}


@app.post("/api/game/{session_id}/input")
async def game_input(session_id: str, request: GameInputRequest):
    """Send control input to the game."""
    if session_id not in sessions:
        return {"error": "Session not found"}
    
    gimbal = tuple(request.gimbal) if request.gimbal else None
    sessions[session_id].set_input(
        throttle=request.throttle,
        gimbal=gimbal
    )
    return {"status": "ok"}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time game communication."""
    logger.info(f"WebSocket connection attempt for session: {session_id}")
    await websocket.accept()
    logger.info(f"WebSocket accepted for session: {session_id}")
    
    # Create session if it doesn't exist
    if session_id not in sessions:
        config = GameConfig(mode=GameMode.MANUAL)
        sessions[session_id] = GameSession(session_id, config)
        logger.info(f"Created new session: {session_id}")
    
    connections[session_id] = websocket
    
    try:
        # Send initial state
        logger.info(f"Sending initial state to session: {session_id}")
        await websocket.send_json({
            "type": "connected",
            "session_id": session_id,
            "data": sessions[session_id].get_state()
        })
        logger.info(f"Initial state sent to session: {session_id}")
        
        while True:
            # Receive messages from client
            data = await websocket.receive_json()
            
            if data["type"] == "input":
                # Handle control input
                throttle = data.get("throttle")
                gimbal = data.get("gimbal")
                if gimbal:
                    gimbal = tuple(gimbal)
                sessions[session_id].set_input(throttle=throttle, gimbal=gimbal)
            
            elif data["type"] == "start":
                sessions[session_id].start()
                await websocket.send_json({
                    "type": "started",
                    "data": sessions[session_id].get_state()
                })
            
            elif data["type"] == "pause":
                sessions[session_id].pause()
                await websocket.send_json({"type": "paused"})
            
            elif data["type"] == "resume":
                sessions[session_id].resume()
                await websocket.send_json({"type": "resumed"})
            
            elif data["type"] == "reset":
                sessions[session_id].reset()
                await websocket.send_json({
                    "type": "reset",
                    "data": sessions[session_id].get_state()
                })
            
            elif data["type"] == "config":
                # Update game configuration
                mode = data.get("mode", "manual")
                wind_level = data.get("wind_level")
                rocket_preset = data.get("rocket_preset")
                difficulty = data.get("difficulty", "medium")
                
                mode_map = {
                    "manual": GameMode.MANUAL,
                    "autonomous": GameMode.AUTONOMOUS,
                    "assisted": GameMode.ASSISTED,
                }
                sessions[session_id].config.mode = mode_map.get(mode, GameMode.MANUAL)
                sessions[session_id].config.difficulty = difficulty
                
                if wind_level is not None:
                    # Validate and set wind level
                    wind_level = max(0, min(9, int(wind_level)))
                    sessions[session_id].config.wind_level = wind_level
                    # Reinitialize wind model with new config
                    from physics.wind import WindConfig, WindModel
                    wind_config = WindConfig(
                        enabled=(wind_level > 0),
                        wind_level=wind_level if wind_level > 0 else 1,  # Use 1 as placeholder if disabled
                        turbulence_strength=0.3,
                        seed=None
                    )
                    sessions[session_id].physics.wind = WindModel(config=wind_config)
                
                if rocket_preset is not None:
                    # Update rocket configuration
                    from physics.geometry import RocketPresets
                    try:
                        rocket_config = RocketPresets.get_preset(rocket_preset)
                        sessions[session_id].config.rocket_preset = rocket_preset
                        # Reinitialize physics engine with new rocket
                        from physics.wind import WindConfig, WindModel
                        from physics.engine import PhysicsEngine
                        wind_config = WindConfig(
                            enabled=(sessions[session_id].config.wind_level > 0),
                            wind_level=sessions[session_id].config.wind_level if sessions[session_id].config.wind_level > 0 else 1,
                            turbulence_strength=0.3,
                            seed=None
                        )
                        # IMPORTANT: Pass flight_recorder and difficulty to new physics engine!
                        sessions[session_id].physics = PhysicsEngine(
                            rocket_config=rocket_config, 
                            wind_config=wind_config,
                            flight_recorder=sessions[session_id].flight_recorder,
                            difficulty=sessions[session_id].config.difficulty
                        )
                        # Clear cached geometry data since rocket changed
                        sessions[session_id]._cached_geometry_data = None
                        # Reset physics to apply new rocket (velocity will be calculated from terminal velocity)
                        sessions[session_id].physics.reset(
                            altitude=sessions[session_id].config.initial_altitude
                        )
                    except ValueError:
                        pass  # Invalid preset, ignore
                
                await websocket.send_json({
                    "type": "config_updated",
                    "mode": mode,
                    "wind_level": sessions[session_id].config.wind_level,
                    "rocket_preset": sessions[session_id].config.rocket_preset,
                    "difficulty": sessions[session_id].config.difficulty
                })
    
    except WebSocketDisconnect:
        # Clean up on disconnect
        logger.info(f"WebSocket disconnected for session: {session_id}")
        if session_id in connections:
            del connections[session_id]
        # Clean up session after disconnect to free memory
        if session_id in sessions:
            logger.info(f"Cleaning up session: {session_id}")
            del sessions[session_id]
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}", exc_info=True)
        if session_id in connections:
            del connections[session_id]
        # Clean up session on error
        if session_id in sessions:
            logger.info(f"Cleaning up session after error: {session_id}")
            del sessions[session_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

