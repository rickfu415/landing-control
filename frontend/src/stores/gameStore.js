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
  shouldReconnect: true,  // Flag to control reconnection behavior
  
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
  gameAttempts: 0,  // Track number of game attempts
  
  // UI state
  showMenu: true,
  gameMode: 'manual',
  rocketPreset: 'falcon9_block5_landing',
  difficulty: 'medium',  // 'easy', 'medium', 'professional'
  
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
  setDifficulty: (difficulty) => set({ difficulty }),
  
  setThrustProfile: (thrustProfile) => set({ thrustProfile }),
  setThrustProfileActive: (thrustProfileActive) => set({ thrustProfileActive }),
  
  // Game control actions
  startGame: () => {
    const { ws, connected, gameMode, rocketPreset, difficulty, gameAttempts } = get()
    if (ws && connected) {
      ws.send(JSON.stringify({ type: 'config', mode: gameMode, rocket_preset: rocketPreset, difficulty: difficulty }))
      ws.send(JSON.stringify({ type: 'start' }))
      set({ 
        showMenu: false,
        gameAttempts: gameAttempts + 1  // Increment attempts counter
      })
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
    // Prevent duplicate connections
    const currentWs = get().ws
    if (currentWs && (currentWs.readyState === WebSocket.CONNECTING || currentWs.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting')
      return
    }
    
    const sessionId = Math.random().toString(36).substring(2, 10)
    
    // Use relative WebSocket URL to work with Vite proxy
    // In development: ws://localhost:5173/ws/... -> proxied to ws://localhost:8001/ws/...
    // In production: uses same host as the page
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/${sessionId}`
    
    console.log('Connecting to WebSocket:', wsUrl)
    const ws = new WebSocket(wsUrl)
    
    // Enable reconnection when connecting
    set({ shouldReconnect: true })
    
    ws.onopen = () => {
      console.log('[WS] Connected to game server')
      set({ connected: true, sessionId, ws })
    }
    
    ws.onmessage = (event) => {
      try {
        console.log('[WS] Received message:', event.data.substring(0, 100) + '...')
        const message = JSON.parse(event.data)
        console.log('[WS] Message type:', message.type)
        
        if (message.type === 'state' || message.type === 'connected' || 
            message.type === 'started' || message.type === 'reset') {
          if (message.data) {
            const currentState = get().gameState
            set({ 
              gameState: message.data,
              prevVelocity: currentState.rocket.velocity
            })
            console.log('[WS] State updated successfully')
          }
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error)
      }
    }
    
    ws.onclose = (event) => {
      console.log('[WS] Connection closed. Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean)
      set({ connected: false, ws: null })
      
      // Only attempt to reconnect if shouldReconnect flag is true
      const { shouldReconnect } = get()
      if (shouldReconnect) {
        console.log('[WS] Attempting to reconnect in 2 seconds...')
        setTimeout(() => {
          if (get().shouldReconnect) {
            get().connect()
          }
        }, 2000)
      }
    }
    
    ws.onerror = (error) => {
      console.error('[WS] WebSocket error:', error)
    }
  },
  
  disconnect: () => {
    const { ws } = get()
    // Disable reconnection before closing
    set({ shouldReconnect: false })
    
    if (ws) {
      console.log('Closing WebSocket connection')
      ws.close()
      set({ connected: false, ws: null, sessionId: null })
    }
  }
}))

export default useGameStore
