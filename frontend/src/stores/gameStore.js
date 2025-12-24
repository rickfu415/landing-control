import { create } from 'zustand'

// Realistic Falcon 9 parameters (must match backend)
const INITIAL_FUEL = 3000  // kg - very limited!
const INITIAL_ALTITUDE = 5000  // m
const INITIAL_VELOCITY = -180  // m/s
const DRY_MASS = 22200  // kg

const useGameStore = create((set, get) => ({
  // Connection state
  connected: false,
  sessionId: null,
  ws: null,
  
  // Previous velocity for acceleration calculation
  prevVelocity: [0, INITIAL_VELOCITY, 0],
  
  // Game state from server
  gameState: {
    running: false,
    paused: false,
    time: 0,
    score: 0,
    mode: 'manual',
    flight_review: null,  // Flight review data (populated on game over)
    rocket: {
      position: [0, INITIAL_ALTITUDE, 0],
      velocity: [0, INITIAL_VELOCITY, 0],
      orientation: [1, 0, 0, 0],
      fuel: INITIAL_FUEL,
      throttle: 0,
      gimbal: [0, 0],
      altitude: INITIAL_ALTITUDE,
      speed: Math.abs(INITIAL_VELOCITY),
      vertical_speed: INITIAL_VELOCITY,
      horizontal_speed: 0,
      mass: DRY_MASS + INITIAL_FUEL,  // Total mass = dry + fuel
      phase: 'descent',
      landed: false,
      crashed: false,
      legs_deployed: false,
      touchdown_velocity: 0,
      geometry: {
        height: 47.7,
        diameter: 3.66,
        radius: 1.83,
        cross_sectional_area: 10.52,
      },
    }
  },
  
  // Local control inputs
  throttle: 0,
  gimbal: [0, 0],
  
  // Thrust profile planner
  thrustProfile: [
    { time: 0, throttle: 0 },
    { time: 10, throttle: 50 },
    { time: 20, throttle: 100 },
  ],
  thrustProfileActive: false,
  
  // UI state
  showMenu: true,
  gameMode: 'manual',
  rocketPreset: 'falcon9_block5_landing',
  
  // Actions
  setConnected: (connected) => set({ connected }),
  setSessionId: (sessionId) => set({ sessionId }),
  setWs: (ws) => set({ ws }),
  
  setGameState: (gameState) => {
    const currentState = get().gameState
    set({ 
      gameState,
      prevVelocity: currentState.rocket.velocity 
    })
  },
  
  setThrottle: (throttle) => {
    set({ throttle })
    const { ws, connected } = get()
    if (ws && connected) {
      ws.send(JSON.stringify({
        type: 'input',
        throttle,
        gimbal: get().gimbal
      }))
    }
  },
  
  setGimbal: (gimbal) => {
    set({ gimbal })
    const { ws, connected } = get()
    if (ws && connected) {
      ws.send(JSON.stringify({
        type: 'input',
        throttle: get().throttle,
        gimbal
      }))
    }
  },
  
  setShowMenu: (showMenu) => set({ showMenu }),
  setGameMode: (gameMode) => set({ gameMode }),
  setRocketPreset: (rocketPreset) => set({ rocketPreset }),
  
  setThrustProfile: (thrustProfile) => set({ thrustProfile }),
  setThrustProfileActive: (thrustProfileActive) => set({ thrustProfileActive }),
  
  // Game control actions
  startGame: () => {
    const { ws, connected, gameMode, rocketPreset } = get()
    if (ws && connected) {
      ws.send(JSON.stringify({ type: 'config', mode: gameMode, rocket_preset: rocketPreset }))
      ws.send(JSON.stringify({ type: 'start' }))
      set({ showMenu: false })
    }
  },
  
  pauseGame: () => {
    const { ws, connected } = get()
    if (ws && connected) {
      ws.send(JSON.stringify({ type: 'pause' }))
    }
  },
  
  resumeGame: () => {
    const { ws, connected } = get()
    if (ws && connected) {
      ws.send(JSON.stringify({ type: 'resume' }))
    }
  },
  
  resetGame: () => {
    const { ws, connected } = get()
    if (ws && connected) {
      ws.send(JSON.stringify({ type: 'reset' }))
      set({ 
        throttle: 0, 
        gimbal: [0, 0], 
        showMenu: true, 
        prevVelocity: [0, INITIAL_VELOCITY, 0] 
      })
    }
  },
  
  // Connect to WebSocket
  connect: () => {
    const sessionId = Math.random().toString(36).substring(2, 10)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/${sessionId}`
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('Connected to game server')
      set({ connected: true, sessionId, ws })
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'state' || message.type === 'connected' || 
          message.type === 'started' || message.type === 'reset') {
        if (message.data) {
          const currentState = get().gameState
          set({ 
            gameState: message.data,
            prevVelocity: currentState.rocket.velocity
          })
        }
      }
    }
    
    ws.onclose = () => {
      console.log('Disconnected from game server')
      set({ connected: false, ws: null })
      // Attempt to reconnect after 2 seconds
      setTimeout(() => get().connect(), 2000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  },
  
  disconnect: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
      set({ connected: false, ws: null, sessionId: null })
    }
  }
}))

export default useGameStore
