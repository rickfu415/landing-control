"""
Rocket Landing Simulator - Backend Server
FastAPI application with WebSocket support for real-time game simulation.
"""

import asyncio
import uuid
from typing import Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from game.session import GameSession, GameConfig, GameMode


# Store active game sessions
sessions: Dict[str, GameSession] = {}
# Store WebSocket connections
connections: Dict[str, WebSocket] = {}
# Game loop task
game_loop_task = None


class CreateGameRequest(BaseModel):
    mode: str = "manual"
    initial_altitude: float = 5000.0
    initial_velocity: float = -200.0


class GameInputRequest(BaseModel):
    throttle: float = None
    gimbal: list = None


async def game_loop():
    """Main game loop running at 60Hz."""
    while True:
        for session_id, session in list(sessions.items()):
            if session.running and not session.paused:
                state = session.tick()
                
                # Broadcast state to connected client
                if session_id in connections:
                    try:
                        await connections[session_id].send_json({
                            "type": "state",
                            "data": state
                        })
                    except Exception:
                        # Connection closed
                        pass
        
        # 60 Hz tick rate
        await asyncio.sleep(1/60)


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
    
    config = GameConfig(
        mode=mode_map.get(request.mode, GameMode.MANUAL),
        initial_altitude=request.initial_altitude,
        initial_velocity=request.initial_velocity,
    )
    
    session = GameSession(session_id, config)
    sessions[session_id] = session
    
    return {
        "session_id": session_id,
        "config": {
            "mode": request.mode,
            "initial_altitude": request.initial_altitude,
            "initial_velocity": request.initial_velocity,
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
    await websocket.accept()
    
    # Create session if it doesn't exist
    if session_id not in sessions:
        config = GameConfig(mode=GameMode.MANUAL)
        sessions[session_id] = GameSession(session_id, config)
    
    connections[session_id] = websocket
    
    try:
        # Send initial state
        await websocket.send_json({
            "type": "connected",
            "session_id": session_id,
            "data": sessions[session_id].get_state()
        })
        
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
                mode_map = {
                    "manual": GameMode.MANUAL,
                    "autonomous": GameMode.AUTONOMOUS,
                    "assisted": GameMode.ASSISTED,
                }
                sessions[session_id].config.mode = mode_map.get(mode, GameMode.MANUAL)
                await websocket.send_json({
                    "type": "config_updated",
                    "mode": mode
                })
    
    except WebSocketDisconnect:
        # Clean up on disconnect
        if session_id in connections:
            del connections[session_id]
    except Exception as e:
        print(f"WebSocket error: {e}")
        if session_id in connections:
            del connections[session_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

