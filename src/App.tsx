import { useEffect, useMemo, useState } from 'react'
import { Activity, Bot, CloudSun, Droplets, Fan, Gauge, Leaf, Lightbulb, Menu, Pause, Play, RotateCcw, Save, Settings, Sprout, Trophy, Wind, X, Zap } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GreenhouseScene from './components/GreenhouseScene'
import { changeCrop, createSimulation, step, toggleActuator, toggleSensor, updateWeather } from './sim/engine'
import { loadScenario, scenarios } from './sim/scenarios'
import { cropProfiles, type ActuatorId, type CropId, type SensorId, type Simulation, type Weather } from './sim/types'

const nav = [
  ['Overview', Activity], ['Greenhouse', Sprout], ['Climate Control', CloudSun], ['Sensors', Gauge], ['Automation', Bot], ['Analytics', Activity], ['Challenges', Trophy], ['Settings', Settings]
] as const

const format = (number: number, digits = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(number)
const sensorStatus = (sensor: Simulation['sensors'][SensorId], value: number) => !sensor.connected ? 'Offline' : sensor.malfunction ? 'Fault' : value > 0 ? 'Normal' : 'Warning'

function Metric({ icon: Icon, label, value, unit, tone = 'green' }: { icon: typeof Leaf; label: string; value: string; unit: string; tone?: 'green' | 'gold' | 'blue' }) {
  return <div className={`metric ${tone}`}><span className="metric-icon"><Icon size={17} /></span><span><small>{label}</small><strong>{value}<em>{unit}</em></strong></span></div>
}

function WeatherControl({ label, unit, value, min, max, onChange }: { label: string; unit: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="weather-control"><span><small>{label}</small><b>{format(value, unit === '°C' ? 1 : 0)}{unit}</b></span><input aria-label={label} type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.currentTarget.value))} /></label>
}

function DeviceCard({ id, sim, onToggle, onMode }: { id: ActuatorId; sim: Simulation; onToggle: (id: ActuatorId) => void; onMode: (id: ActuatorId) => void }) {
  const device = sim.actuators[id]
  const Icon = id === 'fan' ? Fan : id === 'pump' ? Droplets : Lightbulb
  return <div className={`device-card ${device.active ? 'active' : ''}`}><div className="device-title"><span className="device-icon"><Icon size={17} /></span><span><b>{device.label}</b><small>{device.active ? 'Running' : 'Standing by'} · {Math.round(device.consumption * 10) / 10} kWh</small></span><button className={`switch ${device.active ? 'on' : ''}`} aria-label={`Toggle ${device.label}`} onClick={() => onToggle(id)}><i /></button></div><div className="device-footer"><button className="mode-button" onClick={() => onMode(id)}>{device.mode === 'auto' ? 'AUTOMATIC' : 'MANUAL'}</button><span>{device.active ? `${Math.round(device.runtime)}s runtime` : 'Ready'}</span></div></div>
}

function PanelTitle({ icon: Icon, title, trailing }: { icon: typeof Leaf; title: string; trailing?: React.ReactNode }) {
  return <div className="panel-title"><span><Icon size={16} /> {title}</span>{trailing}</div>
}

export default function App() {
  const [sim, setSim] = useState<Simulation>(() => {
    try { const stored = localStorage.getItem('greenlab-simulation'); return stored ? JSON.parse(stored) : createSimulation() } catch { return createSimulation() }
  })
  const [activeNav, setActiveNav] = useState('Overview')
  const [selected, setSelected] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const profile = cropProfiles[sim.crop]

  useEffect(() => {
    let previous = performance.now()
    let frame = 0
    const run = (now: number) => { const elapsed = Math.min((now - previous) / 1000, 1); previous = now; setSim(current => step(current, elapsed)); frame = requestAnimationFrame(run) }
    frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => { localStorage.setItem('greenlab-simulation', JSON.stringify(sim)) }, [sim])

  const setWeather = (patch: Partial<Weather>) => setSim(current => updateWeather(current, patch))
  const toggleMode = (id: ActuatorId) => setSim(current => ({ ...current, actuators: { ...current.actuators, [id]: { ...current.actuators[id], mode: current.actuators[id].mode === 'auto' ? 'manual' : 'auto' } } }))
  const selectedInfo = useMemo(() => {
    if (!selected) return null
    if (selected.startsWith('plant')) return { title: `${profile.name} plant`, detail: `${sim.plant.stage} · ${sim.plant.health.toFixed(0)}% health`, action: 'Plant conditions are derived from current climate suitability.' }
    if (selected === 'fan') return { title: 'Ventilation fan', detail: sim.actuators.fan.active ? 'Running · exchanging air' : 'Offline · standing by', action: 'High temperature activates ventilation automatically.' }
    if (selected === 'pump') return { title: 'Irrigation pump', detail: sim.actuators.pump.active ? 'Watering crop beds' : 'Ready for irrigation', action: 'Soil moisture determines water cycles.' }
    if (selected === 'tank') return { title: 'Water storage tank', detail: `${Math.max(12, 100 - sim.plant.waterUsed).toFixed(0)}% reserve`, action: 'Water consumption is recorded in Analytics.' }
    if (selected === 'sensor') return { title: 'Environmental sensor', detail: `DHT22 · ${sim.climate.temperature.toFixed(1)}°C / ${sim.climate.humidity.toFixed(0)}%`, action: 'Live reading feeding the automation engine.' }
    return { title: 'Grow light', detail: sim.actuators.lights.active ? 'Active · supplemental illumination' : 'Off · waiting for low light', action: 'Low daylight triggers this device in auto mode.' }
  }, [selected, profile.name, sim])

  const chartData = sim.history.length ? sim.history : [{ time: 'Now', temperature: sim.climate.temperature, humidity: sim.climate.humidity, soil: sim.climate.soilMoisture, light: sim.climate.light, water: sim.plant.waterUsed, energy: Object.values(sim.actuators).reduce((total, device) => total + device.consumption, 0) }]
  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Leaf size={21} /></div><span>GREEN<b>LAB</b><small>SMART GREENHOUSE</small></span><button className="close-mobile" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} onClick={() => { setActiveNav(label); setMobileOpen(false) }} className={activeNav === label ? 'selected' : ''}><Icon size={18} /><span>{label}</span>{label === 'Challenges' && <i className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="mini-crop"><div className="crop-orb"><Sprout size={20} /></div><span><small>ACTIVE CROP</small><b>{profile.name}</b></span></div><select value={sim.crop} onChange={event => setSim(current => changeCrop(current, event.currentTarget.value as CropId))}>{Object.entries(cropProfiles).map(([key, crop]) => <option key={key} value={key}>{crop.name}</option>)}</select></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><button className="menu-mobile" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div><p>GREENHOUSE 01 <span className="online"><i /> ONLINE</span></p><h1>Good morning, grower.</h1></div><div className="top-actions"><button className="sim-state" onClick={() => setSim(current => ({ ...current, running: !current.running }))}>{sim.running ? <Pause size={15} /> : <Play size={15} />}{sim.running ? 'Pause simulation' : 'Resume simulation'}</button><div className="time"><small>SIMULATION TIME</small><b>{String(Math.floor(sim.time / 3600) % 24).padStart(2, '0')}:{String(Math.floor(sim.time / 60) % 60).padStart(2, '0')}</b></div><select aria-label="Simulation speed" className="speed" value={sim.speed} onChange={event => setSim(current => ({ ...current, speed: Number(event.currentTarget.value) as 1 | 2 | 5 }))}><option value="1">1×</option><option value="2">2×</option><option value="5">5×</option></select></div></header>
      <div className="content">
        <section className="overview-head"><div><span className="eyebrow">LIVE ENVIRONMENT</span><h2>Inside your greenhouse</h2><p>Automation is continually matching the climate to your {profile.name.toLowerCase()} crop profile.</p></div><div className="health-badge"><span><Leaf size={19} /></span><div><small>PLANT HEALTH</small><b>{Math.round(sim.plant.health)}%</b></div><div className="health-bar"><i style={{ width: `${sim.plant.health}%` }} /></div></div></section>
        <section className="metric-grid"><Metric icon={CloudSun} label="Temperature" value={sim.climate.temperature.toFixed(1)} unit="°C" tone="gold" /><Metric icon={Droplets} label="Humidity" value={sim.climate.humidity.toFixed(0)} unit="%" tone="blue" /><Metric icon={Sprout} label="Soil moisture" value={sim.climate.soilMoisture.toFixed(0)} unit="%" /><Metric icon={Lightbulb} label="Light level" value={`${Math.round(sim.climate.light / 1000)}k`} unit=" lux" tone="gold" /></section>
        <section className="main-grid">
          <div className="scene-wrap"><GreenhouseScene sim={sim} selected={selected} onSelect={setSelected} />{selectedInfo && <div className="selection-card"><button onClick={() => setSelected(null)} aria-label="Close selection"><X size={15} /></button><span className="selection-dot" /><b>{selectedInfo.title}</b><small>{selectedInfo.detail}</small><p>{selectedInfo.action}</p></div>}<div className="scene-stats"><span><Wind size={14} /> Wind {sim.weather.wind} km/h</span><span><CloudSun size={14} /> {sim.weather.cloudCover}% cloud cover</span></div></div>
          <aside className="control-column">
            <div className="panel climate-panel"><PanelTitle icon={CloudSun} title="Outside weather" trailing={<span className="live">LIVE</span>} /><WeatherControl label="Outside temperature" unit="°C" value={sim.weather.outsideTemp} min={-5} max={45} onChange={value => setWeather({ outsideTemp: value })} /><WeatherControl label="Outside humidity" unit="%" value={sim.weather.outsideHumidity} min={5} max={100} onChange={value => setWeather({ outsideHumidity: value })} /><WeatherControl label="Sunlight intensity" unit=" lux" value={sim.weather.sunlight} min={0} max={100000} onChange={value => setWeather({ sunlight: value })} /><WeatherControl label="Cloud coverage" unit="%" value={sim.weather.cloudCover} min={0} max={100} onChange={value => setWeather({ cloudCover: value })} /></div>
            <div className="panel decision-panel"><PanelTitle icon={Bot} title="Automation decision" /><span className="auto-dot">AUTO CONTROL ACTIVE</span>{sim.decisions.slice(0, 2).map(decision => <p key={decision}>{decision}</p>)}</div>
          </aside>
        </section>
        <section className="lower-grid">
          <div className="panel devices"><PanelTitle icon={Zap} title="Equipment controls" trailing={<button className="text-button" onClick={() => setActiveNav('Automation')}>View automation</button>} />{(['fan', 'pump', 'lights'] as ActuatorId[]).map(id => <DeviceCard key={id} id={id} sim={sim} onToggle={id => setSim(current => toggleActuator(current, id))} onMode={toggleMode} />)}</div>
          <div className="panel activity"><PanelTitle icon={Activity} title="Live activity" trailing={<span className="activity-count">{sim.logs.length} EVENTS</span>} /><div className="log-list">{sim.logs.slice(0, 4).map(item => <div className="log-item" key={item.id}><i className={item.type} /><span><b>{item.message}</b><small>{item.time}</small></span></div>)}</div></div>
        </section>
        {activeNav === 'Sensors' && <section className="panel focus-panel"><PanelTitle icon={Gauge} title="Virtual sensor network" />{(Object.keys(sim.sensors) as SensorId[]).map(id => { const sensor = sim.sensors[id]; return <article className="sensor-row" key={id}><span className="sensor-hardware"><Gauge size={18} /></span><div><b>{sensor.label}</b><small>{sensor.hardware} · Last update just now</small></div><strong>{id === 'climate' ? `${sensor.value.toFixed(1)}°C` : id === 'soil' ? `${sensor.value.toFixed(0)}%` : `${Math.round(sensor.value / 1000)}k lux`}</strong><span className={`sensor-status ${sensorStatus(sensor, sensor.value).toLowerCase()}`}>{sensorStatus(sensor, sensor.value)}</span><button onClick={() => setSim(current => toggleSensor(current, id, 'connected'))}>{sensor.connected ? 'Disconnect' : 'Reconnect'}</button><button onClick={() => setSim(current => toggleSensor(current, id, 'malfunction'))}>Fault test</button></article>})}</section>}
        {activeNav === 'Analytics' && <section className="panel chart-panel"><PanelTitle icon={Activity} title="Climate history" trailing={<span className="activity-count">LAST 80 READINGS</span>} /><ResponsiveContainer width="100%" height={270}><AreaChart data={chartData}><defs><linearGradient id="temp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dca75d" stopOpacity={.42} /><stop offset="100%" stopColor="#dca75d" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e5e2d8" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#7f887b', fontSize: 11 }} /><YAxis tick={{ fill: '#7f887b', fontSize: 11 }} /><Tooltip /><Legend /><Area type="monotone" dataKey="temperature" name="Temperature °C" stroke="#c9843f" fill="url(#temp)" strokeWidth={2} /><Area type="monotone" dataKey="soil" name="Soil moisture %" stroke="#539372" fill="none" strokeWidth={2} /></AreaChart></ResponsiveContainer></section>}
        {activeNav === 'Challenges' && <section className="panel challenge-panel"><PanelTitle icon={Trophy} title="Climate challenges" /> <div className="challenges">{scenarios.map(item => <article key={item.id}><span>{item.icon}</span><div><b>{item.name}</b><p>{item.description}</p><small>OBJECTIVE · {item.objective}</small></div><button onClick={() => setSim(loadScenario(item.id))}>Start challenge</button></article>)}</div><div className="achievements"><b>Achievements</b>{sim.achievements.map(item => <span className={item.unlocked ? 'earned' : ''} key={item.id}><Trophy size={14} />{item.label}</span>)}</div></section>}
        {activeNav === 'Settings' && <section className="panel focus-panel settings"><PanelTitle icon={Settings} title="Simulation controls" /><div><button onClick={() => setSim(createSimulation())}><RotateCcw size={16} /> Reset greenhouse</button><button onClick={() => localStorage.setItem('greenlab-simulation', JSON.stringify(sim))}><Save size={16} /> Save simulation</button><button onClick={() => { try { const saved = localStorage.getItem('greenlab-simulation'); if (saved) setSim(JSON.parse(saved)) } catch { /* ignore invalid saved state */ } }}><Play size={16} /> Restore saved simulation</button></div></section>}
      </div>
    </section>
  </main>
}
