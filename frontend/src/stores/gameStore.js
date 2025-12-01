import { create } from 'zustand'

const useGameStore = create((set, get) => ({
  // Connection state
  connected: false,
  sessionId: null,
  ws: null,
  
  // Game state from server
  gameState: {
    running: false,
    paused: false,
    time: 0,
    score: 0,
    mode: 'manual',
    rocket: {
      position: [0, 5000, 0],
      velocity: [0, -200, 0],
      orientation: [1, 0, 0, 0],
      fuel: 30000,
      throttle: 0,
      gimbal: [0, 0],
      altitude: 5000,
      speed: 200,
      vertical_speed: -200,
      horizontal_speed: 0,
      mass: 52200,
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
  
  setGameState: (gameState) => set({ gameState }),
  
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
      set({ throttle: 0, gimbal: [0, 0], showMenu: true })
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
          set({ gameState: message.data })
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

