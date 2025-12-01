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
    }
  },
  
  // Local control inputs
  throttle: 0,
  gimbal: [0, 0],
  
  // UI state
  showMenu: true,
  gameMode: 'manual',
  
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
  
  // Game control actions
  startGame: () => {
    const { ws, connected, gameMode } = get()
    if (ws && connected) {
      ws.send(JSON.stringify({ type: 'config', mode: gameMode }))
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
