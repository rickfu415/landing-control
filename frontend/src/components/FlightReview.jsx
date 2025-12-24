import { useState } from 'react'
import useGameStore from '../stores/gameStore'
import useLanguageStore from '../stores/languageStore'
import { useTranslation } from '../i18n/translations'

function FlightReview({ onClose, onTryAgain }) {
  const { gameState } = useGameStore()
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  const [activeTab, setActiveTab] = useState('charts')  // Start with charts tab
  
  const flightData = gameState.flight_review
  
  if (!flightData) {
    return null
  }
  
  const { statistics, events, data_points } = flightData
  
  // Handle try again - close modal and reset game
  const handleTryAgain = () => {
    if (onTryAgain) {
      onTryAgain()
    }
  }
  
  // Helper to format time
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(0)
    return `${mins}m ${secs}s`
  }
  
  // Helper to format number
  const formatNumber = (num, decimals = 1) => {
    return typeof num === 'number' ? num.toFixed(decimals) : '0.0'
  }
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-50 p-4 overflow-auto">
      <div className="hud-panel rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-black text-white mb-1">
              📊 {t.flightReview?.title || 'Flight Review'}
            </h1>
            <p className="text-sm text-gray-400">
              {t.flightReview?.subtitle || 'Detailed analysis of your landing attempt'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors flex items-center justify-center text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6">
          {['summary', 'charts', 'timeline', 'telemetry'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-all ${
                activeTab === tab
                  ? 'text-rocket-orange border-b-2 border-rocket-orange'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'summary' && `📈 ${t.flightReview?.tabs?.summary || 'Summary'}`}
              {tab === 'charts' && `📊 ${t.flightReview?.tabs?.charts || 'Charts'}`}
              {tab === 'timeline' && `⏱️ ${t.flightReview?.tabs?.timeline || 'Timeline'}`}
              {tab === 'telemetry' && `📡 ${t.flightReview?.tabs?.telemetry || 'Telemetry'}`}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'summary' && (
            <SummaryTab statistics={statistics} formatNumber={formatNumber} formatTime={formatTime} />
          )}
          {activeTab === 'charts' && (
            <ChartsTab dataPoints={data_points} formatNumber={formatNumber} />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab events={events} formatTime={formatTime} />
          )}
          {activeTab === 'telemetry' && (
            <TelemetryTab dataPoints={data_points} formatNumber={formatNumber} />
          )}
        </div>
        
        {/* Footer with Try Again button */}
        <div className="p-6 border-t border-gray-700 flex justify-center gap-4">
          <button
            onClick={handleTryAgain}
            className="px-8 py-4 rounded-lg btn-primary font-display font-bold text-lg uppercase tracking-wider"
          >
            🚀 {t.gameOver?.tryAgain || 'Try Again'}
          </button>
          <button
            onClick={onClose}
            className="px-8 py-4 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white transition-colors font-display font-bold text-lg uppercase tracking-wider"
          >
            ✕ {t.common?.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Charts Tab Component
function ChartsTab({ dataPoints, formatNumber }) {
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  
  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        <p className="text-xl mb-2">{t.flightReview?.noData || 'No data recorded'}</p>
        <p className="text-sm">{t.flightReview?.noDataDesc || 'The flight recorder may not have started or no frames were captured.'}</p>
        <div className="mt-4 text-xs text-left max-w-md mx-auto hud-panel p-4 rounded">
          <p className="text-white font-bold mb-2">Debug Info:</p>
          <p>Data points: {dataPoints ? dataPoints.length : 'null'}</p>
        </div>
      </div>
    )
  }

  // Create simple line chart
  const LineChart = ({ title, dataKey, unit, color, maxValue }) => {
    const width = 800
    const height = 200
    const padding = { top: 20, right: 40, bottom: 40, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Get data values
    const values = dataPoints.map(dp => dp[dataKey])
    const times = dataPoints.map(dp => dp.time)
    
    const minValue = Math.min(...values, 0)
    const maxVal = maxValue || Math.max(...values, 1)
    const minTime = times[0]
    const maxTime = times[times.length - 1]
    
    // Scale functions
    const scaleX = (time) => ((time - minTime) / (maxTime - minTime)) * chartWidth
    const scaleY = (value) => chartHeight - ((value - minValue) / (maxVal - minValue)) * chartHeight
    
    // Create path
    const pathData = dataPoints.map((dp, i) => {
      const x = scaleX(dp.time)
      const y = scaleY(dp[dataKey])
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`
    }).join(' ')
    
    // Y-axis labels
    const yLabels = [0, 0.25, 0.5, 0.75, 1.0].map(ratio => {
      const value = minValue + (maxVal - minValue) * ratio
      const y = chartHeight - ratio * chartHeight
      return { value, y }
    })
    
    // X-axis labels (time)
    const xLabels = [0, 0.25, 0.5, 0.75, 1.0].map(ratio => {
      const time = minTime + (maxTime - minTime) * ratio
      const x = ratio * chartWidth
      return { time, x }
    })

    return (
      <div className="hud-panel p-4 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <div className="bg-gray-900 rounded p-4 overflow-x-auto">
          <svg width={width} height={height} className="mx-auto">
            {/* Grid lines */}
            {yLabels.map((label, i) => (
              <line
                key={`y-grid-${i}`}
                x1={padding.left}
                y1={padding.top + label.y}
                x2={padding.left + chartWidth}
                y2={padding.top + label.y}
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}
            {xLabels.map((label, i) => (
              <line
                key={`x-grid-${i}`}
                x1={padding.left + label.x}
                y1={padding.top}
                x2={padding.left + label.x}
                y2={padding.top + chartHeight}
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}
            
            {/* Y-axis labels */}
            {yLabels.map((label, i) => (
              <text
                key={`y-label-${i}`}
                x={padding.left - 10}
                y={padding.top + label.y + 4}
                textAnchor="end"
                fill="#9CA3AF"
                fontSize="12"
                fontFamily="monospace"
              >
                {formatNumber(label.value, 0)}
              </text>
            ))}
            
            {/* X-axis labels */}
            {xLabels.map((label, i) => (
              <text
                key={`x-label-${i}`}
                x={padding.left + label.x}
                y={padding.top + chartHeight + 25}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="12"
                fontFamily="monospace"
              >
                {formatNumber(label.time, 1)}s
              </text>
            ))}
            
            {/* Axis lines */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + chartHeight}
              stroke="#6B7280"
              strokeWidth="2"
            />
            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight}
              stroke="#6B7280"
              strokeWidth="2"
            />
            
            {/* Data line */}
            <g transform={`translate(${padding.left}, ${padding.top})`}>
              <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
            
            {/* Y-axis label */}
            <text
              x={20}
              y={padding.top + chartHeight / 2}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="14"
              fontWeight="bold"
              transform={`rotate(-90, 20, ${padding.top + chartHeight / 2})`}
            >
              {unit}
            </text>
            
            {/* X-axis label */}
            <text
              x={padding.left + chartWidth / 2}
              y={height - 5}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="14"
              fontWeight="bold"
            >
              Time (seconds)
            </text>
          </svg>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
          <div>
            <span className="text-gray-400">Min:</span>
            <span className="text-white ml-2 font-mono">{formatNumber(minValue, 1)} {unit}</span>
          </div>
          <div>
            <span className="text-gray-400">Max:</span>
            <span className="text-white ml-2 font-mono">{formatNumber(maxVal, 1)} {unit}</span>
          </div>
          <div>
            <span className="text-gray-400">Duration:</span>
            <span className="text-white ml-2 font-mono">{formatNumber(maxTime - minTime, 1)}s</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold text-white mb-4">📊 Flight Data Charts</h2>
      
      {/* Debug info */}
      <div className="hud-panel p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
        <p className="text-sm text-gray-300">
          <span className="font-bold text-white">Data Points:</span> {dataPoints.length} samples recorded
        </p>
        {dataPoints.length > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            <p>First sample: t={formatNumber(dataPoints[0].time, 2)}s</p>
            <p>Last sample: t={formatNumber(dataPoints[dataPoints.length - 1].time, 2)}s</p>
            <p>Throttle range: {formatNumber(Math.min(...dataPoints.map(d => d.throttle)) * 100, 0)}% - {formatNumber(Math.max(...dataPoints.map(d => d.throttle)) * 100, 0)}%</p>
            <p>Velocity range: {formatNumber(Math.min(...dataPoints.map(d => d.vertical_speed)), 1)} to {formatNumber(Math.max(...dataPoints.map(d => d.vertical_speed)), 1)} m/s</p>
          </div>
        )}
      </div>
      
      {/* Chart 1: Throttle Control over Time */}
      <LineChart
        title="Throttle Control vs Time"
        dataKey="throttle"
        unit="Throttle (%)"
        color="#FF6B35"
        maxValue={1.0}
      />
      
      {/* Chart 2: Vertical Velocity over Time */}
      <LineChart
        title="Vertical Velocity vs Time"
        dataKey="vertical_speed"
        unit="Velocity (m/s)"
        color="#10B981"
      />
      
      {/* Chart 3: Total Mass over Time */}
      {dataPoints[0].mass > 0 && (
        <LineChart
          title="Total Mass vs Time (shows fuel consumption)"
          dataKey="mass"
          unit="Mass (kg)"
          color="#8B5CF6"
        />
      )}
      
      {/* Chart 4: Vertical Acceleration over Time */}
      <LineChart
        title="Vertical Acceleration vs Time"
        dataKey="acceleration"
        unit="Acceleration (m/s²)"
        color="#F59E0B"
      />
    </div>
  )
}

// Summary Tab Component
function SummaryTab({ statistics, formatNumber, formatTime }) {
  const StatCard = ({ label, value, unit, icon, color = 'text-white' }) => (
    <div className="hud-panel p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-mono font-bold ${color}`}>
        {value} <span className="text-sm text-gray-400">{unit}</span>
      </div>
    </div>
  )
  
  return (
    <div className="space-y-6">
      {/* Flight Duration & Fuel */}
      <div>
        <h2 className="text-xl font-display font-bold text-white mb-4">⏱️ Flight Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Time"
            value={formatTime(statistics.total_time)}
            unit=""
            icon="⏱️"
          />
          <StatCard
            label="Fuel Used"
            value={formatNumber(statistics.fuel_used, 0)}
            unit="kg"
            icon="⛽"
          />
          <StatCard
            label="Fuel Remaining"
            value={formatNumber(statistics.fuel_efficiency, 1)}
            unit="%"
            icon="📊"
            color={statistics.fuel_efficiency > 20 ? 'text-rocket-green' : 'text-yellow-400'}
          />
          <StatCard
            label="Max Speed"
            value={formatNumber(statistics.max_speed, 1)}
            unit="m/s"
            icon="🚀"
          />
        </div>
      </div>
      
      {/* Engine & Control Usage */}
      <div>
        <h2 className="text-xl font-display font-bold text-white mb-4">🎮 Control Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Engine Usage"
            value={formatNumber(statistics.engine_usage_percent, 1)}
            unit="%"
            icon="🔥"
          />
          <StatCard
            label="Avg Throttle"
            value={formatNumber(statistics.avg_throttle, 0)}
            unit="%"
            icon="🎚️"
          />
          <StatCard
            label="Gimbal Usage"
            value={formatNumber(statistics.gimbal_usage_percent, 1)}
            unit="%"
            icon="🎯"
          />
        </div>
      </div>
      
      {/* Extremes */}
      <div>
        <h2 className="text-xl font-display font-bold text-white mb-4">📊 Extremes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            label="Max Tilt Angle"
            value={formatNumber(statistics.max_tilt_angle, 1)}
            unit="°"
            icon="📐"
            color={statistics.max_tilt_angle > 10 ? 'text-yellow-400' : 'text-rocket-green'}
          />
          <StatCard
            label="Max Throttle"
            value={formatNumber(statistics.max_throttle, 0)}
            unit="%"
            icon="⚡"
          />
        </div>
      </div>
      
      {/* Performance Tips */}
      <div className="hud-panel p-6 rounded-lg bg-gray-900/50">
        <h3 className="text-lg font-bold text-white mb-3">💡 Performance Tips</h3>
        <div className="space-y-2 text-sm">
          {statistics.fuel_efficiency < 10 && (
            <div className="flex items-start gap-2 text-yellow-400">
              <span>⚠️</span>
              <span>Very low fuel remaining! Try using less throttle or starting your burn earlier.</span>
            </div>
          )}
          {statistics.max_tilt_angle > 15 && (
            <div className="flex items-start gap-2 text-yellow-400">
              <span>⚠️</span>
              <span>High tilt angle detected. Use gimbal control to keep the rocket more vertical.</span>
            </div>
          )}
          {statistics.avg_throttle > 80 && (
            <div className="flex items-start gap-2 text-blue-400">
              <span>💡</span>
              <span>High average throttle. Try using lower throttle settings to conserve fuel.</span>
            </div>
          )}
          {statistics.engine_usage_percent < 30 && (
            <div className="flex items-start gap-2 text-rocket-green">
              <span>✅</span>
              <span>Excellent fuel efficiency! You used the engine sparingly.</span>
            </div>
          )}
          {statistics.gimbal_usage_percent > 50 && (
            <div className="flex items-start gap-2 text-blue-400">
              <span>💡</span>
              <span>High gimbal usage. This is good for precise control!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Timeline Tab Component
function TimelineTab({ events, formatTime }) {
  const getEventIcon = (type) => {
    switch (type) {
      case 'engine_start': return '🔥'
      case 'landing_burn': return '🚀'
      case 'legs_deploy': return '🦵'
      case 'touchdown': return '🎯'
      default: return '📍'
    }
  }
  
  const getEventColor = (type) => {
    switch (type) {
      case 'engine_start': return 'border-orange-500'
      case 'landing_burn': return 'border-blue-500'
      case 'legs_deploy': return 'border-purple-500'
      case 'touchdown': return 'border-rocket-green'
      default: return 'border-gray-500'
    }
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-bold text-white mb-4">⏱️ Mission Timeline</h2>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700"></div>
        
        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={index} className="relative flex items-start gap-4 pl-4">
              {/* Event marker */}
              <div className={`relative z-10 w-8 h-8 rounded-full border-2 ${getEventColor(event.type)} bg-gray-900 flex items-center justify-center text-lg flex-shrink-0`}>
                {getEventIcon(event.type)}
              </div>
              
              {/* Event content */}
              <div className="flex-1 hud-panel p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white">{event.description}</h3>
                  <span className="text-xs text-gray-400 font-mono">
                    T+{formatTime(event.time)}
                  </span>
                </div>
                
                {/* Event data */}
                {event.data && Object.keys(event.data).length > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    {Object.entries(event.data).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-white font-mono">
                          {typeof value === 'number' ? value.toFixed(1) : value.toString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Telemetry Tab Component
function TelemetryTab({ dataPoints, formatNumber }) {
  if (!dataPoints || dataPoints.length === 0) {
    return <div className="text-center text-gray-400 py-12">No telemetry data available</div>
  }
  
  // Sample data points to show (show every 10th point to avoid overwhelming)
  const sampledPoints = dataPoints.filter((_, i) => i % 10 === 0 || i === dataPoints.length - 1)
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-bold text-white mb-4">📡 Telemetry Data</h2>
      
      <div className="hud-panel p-4 rounded-lg overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-right py-2 px-2">Alt (m)</th>
              <th className="text-right py-2 px-2">V↓ (m/s)</th>
              <th className="text-right py-2 px-2">V→ (m/s)</th>
              <th className="text-right py-2 px-2">Fuel (kg)</th>
              <th className="text-right py-2 px-2">Throttle</th>
              <th className="text-right py-2 px-2">Tilt (°)</th>
              <th className="text-left py-2 px-2">Phase</th>
            </tr>
          </thead>
          <tbody>
            {sampledPoints.map((point, index) => (
              <tr key={index} className="border-b border-gray-800 hover:bg-gray-900/50">
                <td className="py-2 px-2 text-gray-300">{formatNumber(point.time, 1)}s</td>
                <td className="py-2 px-2 text-right text-white">{formatNumber(point.altitude, 0)}</td>
                <td className={`py-2 px-2 text-right ${Math.abs(point.vertical_speed) > 50 ? 'text-yellow-400' : 'text-white'}`}>
                  {formatNumber(point.vertical_speed, 1)}
                </td>
                <td className="py-2 px-2 text-right text-white">{formatNumber(point.horizontal_speed, 1)}</td>
                <td className={`py-2 px-2 text-right ${point.fuel < 500 ? 'text-red-400' : 'text-white'}`}>
                  {formatNumber(point.fuel, 0)}
                </td>
                <td className={`py-2 px-2 text-right ${point.throttle > 0 ? 'text-rocket-orange' : 'text-gray-600'}`}>
                  {formatNumber(point.throttle * 100, 0)}%
                </td>
                <td className={`py-2 px-2 text-right ${point.tilt_angle > 10 ? 'text-yellow-400' : 'text-rocket-green'}`}>
                  {formatNumber(point.tilt_angle, 1)}
                </td>
                <td className="py-2 px-2 text-gray-400">{point.phase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        Showing {sampledPoints.length} of {dataPoints.length} data points (sampled for display)
      </div>
    </div>
  )
}

export default FlightReview

