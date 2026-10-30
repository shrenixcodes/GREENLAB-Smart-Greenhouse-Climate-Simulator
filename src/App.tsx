import { useEffect, useMemo, useState } from 'react'
import { Activity, Bot, CloudSun, Cpu, Droplets, Fan, Gauge, Leaf, Lightbulb, Menu, Pause, Play, Radio, RotateCcw, Save, Settings, Smartphone, Sprout, Wind, X, Zap } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GreenhouseScene from './components/GreenhouseScene'
import { changeCrop, createSimulation, step, toggleActuator, toggleSensor, updateWeather } from './sim/engine'
import { cropProfiles, type ActuatorId, type CropId, type SensorId, type Simulation, type Weather } from './sim/types'

const nav = [
  ['Overview', Activity], ['Greenhouse', Sprout], ['Climate Control', CloudSun], ['Sensors', Gauge], ['Automation', Bot], ['Analytics', Activity], ['Settings', Settings]
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

function OperationsDashboard({ sim, chartData, onClose, onToggle, onMode }: { sim: Simulation; chartData: Simulation['history']; onClose: () => void; onToggle: (id: ActuatorId) => void; onMode: (id: ActuatorId) => void }) {
  const sensorOnline = Object.values(sim.sensors).every(sensor => sensor.connected && !sensor.malfunction)
  const pins = [
    ['DHT22 climate', 'GPIO 4', `${sim.climate.temperature.toFixed(1)}°C · ${sim.climate.humidity.toFixed(0)}%`],
    ['Soil moisture', 'ADC 34', `${sim.climate.soilMoisture.toFixed(0)}%`],
    ['BH1750 light', 'I²C 21 / 22', `${Math.round(sim.climate.light / 1000)}k lux`],
    ['Ventilation fan', 'GPIO 25', sim.actuators.fan.active ? 'HIGH · active' : 'LOW · standby'],
    ['Irrigation pump', 'GPIO 26', sim.actuators.pump.active ? 'HIGH · active' : 'LOW · standby'],
    ['Grow lights', 'GPIO 27', sim.actuators.lights.active ? 'HIGH · active' : 'LOW · standby']
  ]
  return <div className="phone-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><article className="phone-dashboard" role="dialog" aria-modal="true" aria-label="GREENLAB operations dashboard">
    <header className="phone-header"><div><span className="phone-notch" /><small>GREENLAB // IOT DASHBOARD</small><b>GH-01 Telemetry Node</b></div><div className="phone-header-status"><span className={sensorOnline ? 'connected' : 'offline'}><Radio size={13} /> {sensorOnline ? 'LIVE' : 'CHECK SENSORS'}</span><button onClick={onClose} aria-label="Close dashboard"><X size={18} /></button></div></header>
    <div className="phone-scroll">
      <section className="phone-hero"><div><span>LIVE CLIMATE TELEMETRY</span><h2>{sim.climate.temperature.toFixed(1)}°<small>C</small></h2><p>Humidity {sim.climate.humidity.toFixed(0)}% · Crop suitability {sim.plant.suitability}%</p></div><div className="phone-hero-leaf"><Activity size={35} /></div></section>
      <section className="phone-readings"><div><CloudSun size={14} /><small>Temperature</small><b>{sim.climate.temperature.toFixed(1)}°C</b></div><div><Droplets size={14} /><small>Humidity</small><b>{sim.climate.humidity.toFixed(0)}%</b></div><div><Sprout size={14} /><small>Soil</small><b>{sim.climate.soilMoisture.toFixed(0)}%</b></div><div><Lightbulb size={14} /><small>Light</small><b>{Math.round(sim.climate.light / 1000)}k</b></div></section>
      <section className="phone-section"><div className="phone-section-title"><b>Temperature & humidity</b><span>LIVE</span></div><ResponsiveContainer width="100%" height={138}><AreaChart data={chartData}><defs><linearGradient id="phoneTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d7a45d" stopOpacity=".45" /><stop offset="1" stopColor="#d7a45d" stopOpacity="0" /></linearGradient></defs><XAxis dataKey="time" hide /><YAxis hide domain={['dataMin - 2', 'dataMax + 2']} /><Tooltip /><Area type="monotone" dataKey="temperature" stroke="#d38d3d" fill="url(#phoneTemp)" strokeWidth={2} /><Area type="monotone" dataKey="humidity" stroke="#5da3a2" fill="none" strokeWidth={2} /></AreaChart></ResponsiveContainer></section>
      <section className="phone-section"><div className="phone-section-title"><b>Automation controls</b><span className="sim-label">SIMULATED</span></div><div className="phone-actuators">{(['fan', 'pump', 'lights'] as ActuatorId[]).map(id => { const device = sim.actuators[id]; const Icon = id === 'fan' ? Fan : id === 'pump' ? Droplets : Lightbulb; return <div key={id}><span><Icon size={15} /><b>{device.label.replace('Ventilation ', '').replace('Irrigation ', '')}</b><small>{device.mode.toUpperCase()}</small></span><button className={device.active ? 'active' : ''} onClick={() => onToggle(id)} aria-label={`Toggle ${device.label}`}>{device.active ? 'ON' : 'OFF'}</button><button className="phone-mode" onClick={() => onMode(id)}>{device.mode === 'auto' ? 'AUTO' : 'MAN'}</button></div> })}</div><p className="phone-decision"><Bot size={14} /> {sim.decisions[0]}</p></section>
      <section className="phone-section controller-section"><div className="phone-section-title"><b><Cpu size={15} /> ESP32 control panel</b><span className={sensorOnline ? 'connected' : 'offline'}>{sensorOnline ? 'CONNECTED' : 'OFFLINE'}</span></div><p className="simulation-note">Simulated controller · physical hardware adapter ready</p><div className="pin-grid">{pins.map(([name, pin, value]) => <div key={name}><span><b>{name}</b><small>{pin}</small></span><em className={value.includes('HIGH') ? 'pin-high' : ''}>{value}</em></div>)}</div></section>
      <section className="phone-section serial-section"><div className="phone-section-title"><b>Serial monitor</b><span>115200 BAUD</span></div>{sim.logs.slice(0, 5).map(log => <p key={log.id}><time>{log.time}</time> <span>{log.type.toUpperCase()}</span> {log.message}</p>)}</section>
    </div>
  </article></div>
}

export default function App() {
  const [sim, setSim] = useState<Simulation>(() => {
    try { const stored = localStorage.getItem('greenlab-simulation'); return stored ? JSON.parse(stored) : createSimulation() } catch { return createSimulation() }
  })
  const [activeNav, setActiveNav] = useState('Overview')
  const [selected, setSelected] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const profile = cropProfiles[sim.crop]

  useEffect(() => {
    let previous = performance.now()
    let frame = 0
    const run = (now: number) => { const elapsed = Math.min((now - previous) / 1000, 1); previous = now; setSim(current => step(current, elapsed)); frame = requestAnimationFrame(run) }
    frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => { localStorage.setItem('greenlab-simulation', JSON.stringify(sim)) }, [sim])
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPhoneOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const setWeather = (patch: Partial<Weather>) => setSim(current => updateWeather(current, patch))
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(current => current === message ? '' : current), 2600) }
  const toggleMode = (id: ActuatorId) => setSim(current => ({ ...current, actuators: { ...current.actuators, [id]: { ...current.actuators[id], mode: current.actuators[id].mode === 'auto' ? 'manual' : 'auto' } } }))
  const returnToAutomatic = () => { setSim(current => ({ ...current, actuators: Object.fromEntries(Object.entries(current.actuators).map(([id, actuator]) => [id, { ...actuator, mode: 'auto' }])) as Simulation['actuators'] })); notify('All devices returned to automatic control') }
  const resetWeather = () => { setSim(current => updateWeather(current, createSimulation().weather)); notify('Outside weather restored to baseline') }
  const selectedInfo = useMemo(() => {
    if (!selected) return null
    if (selected.startsWith('plant')) return { title: `${profile.name} plant`, detail: `${sim.plant.stage} · ${sim.plant.health.toFixed(0)}% health`, action: 'Plant conditions are derived from current climate suitability.' }
    if (selected === 'fan') return { title: 'Ventilation fan', detail: sim.actuators.fan.active ? 'Running · exchanging air' : 'Offline · standing by', action: 'High temperature activates ventilation automatically.' }
    if (selected === 'pump') return { title: 'Irrigation pump', detail: sim.actuators.pump.active ? 'Watering crop beds' : 'Ready for irrigation', action: 'Soil moisture determines water cycles.' }
    if (selected === 'tank') return { title: 'Water storage tank', detail: `${Math.max(12, 100 - sim.plant.waterUsed).toFixed(0)}% reserve`, action: 'Water consumption is recorded in Analytics.' }
    if (selected === 'sensor') return { title: 'Environmental sensor', detail: `DHT22 · ${sim.climate.temperature.toFixed(1)}°C / ${sim.climate.humidity.toFixed(0)}%`, action: 'Live reading feeding the automation engine.' }
    if (selected === 'phone') return { title: 'GREENLAB dashboard terminal', detail: 'Live telemetry link ready', action: 'Open the dashboard to review and operate the greenhouse.' }
    if (selected === 'controller') return { title: 'ESP32 controller', detail: 'Simulated control board · connected', action: 'Maps sensor inputs to automation outputs and the serial monitor.' }
    return { title: 'Grow light', detail: sim.actuators.lights.active ? 'Active · supplemental illumination' : 'Off · waiting for low light', action: 'Low daylight triggers this device in auto mode.' }
  }, [selected, profile.name, sim])

  const chartData = sim.history.length ? sim.history : [{ time: 'Now', temperature: sim.climate.temperature, humidity: sim.climate.humidity, soil: sim.climate.soilMoisture, light: sim.climate.light, water: sim.plant.waterUsed, energy: Object.values(sim.actuators).reduce((total, device) => total + device.consumption, 0) }]
  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Leaf size={21} /></div><span>GREEN<b>LAB</b><small>GH-01 // IOT CONTROL</small></span><button className="close-mobile" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} onClick={() => { setActiveNav(label); setMobileOpen(false) }} className={activeNav === label ? 'selected' : ''}><Icon size={18} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="mini-crop"><div className="crop-orb"><Sprout size={20} /></div><span><small>ACTIVE CROP</small><b>{profile.name}</b></span></div><select value={sim.crop} onChange={event => setSim(current => changeCrop(current, event.currentTarget.value as CropId))}>{Object.entries(cropProfiles).map(([key, crop]) => <option key={key} value={key}>{crop.name}</option>)}</select></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><button className="menu-mobile" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div><p>GH-01 / ENVIRONMENTAL CONTROL NODE <span className="online"><i /> ONLINE</span></p><h1>Environmental control console</h1></div><div className="top-actions"><button className="sim-state" onClick={() => setSim(current => ({ ...current, running: !current.running }))}>{sim.running ? <Pause size={15} /> : <Play size={15} />}{sim.running ? 'Pause simulation' : 'Resume simulation'}</button><div className="time"><small>SIMULATION TIME</small><b>{String(Math.floor(sim.time / 3600) % 24).padStart(2, '0')}:{String(Math.floor(sim.time / 60) % 60).padStart(2, '0')}</b></div><select aria-label="Simulation speed" className="speed" value={sim.speed} onChange={event => setSim(current => ({ ...current, speed: Number(event.currentTarget.value) as 1 | 2 | 5 }))}><option value="1">1×</option><option value="2">2×</option><option value="5">5×</option></select></div></header>
      <div className="content">
        <section className="overview-head"><div><span className="eyebrow">LIVE ENVIRONMENT</span><h2>Inside your greenhouse</h2><p>Automation is continually matching the climate to your {profile.name.toLowerCase()} crop profile.</p></div><div className="health-badge"><span><Leaf size={19} /></span><div><small>PLANT HEALTH</small><b>{Math.round(sim.plant.health)}%</b></div><div className="health-bar"><i style={{ width: `${sim.plant.health}%` }} /></div></div></section>
        <section className="metric-grid"><Metric icon={CloudSun} label="Temperature" value={sim.climate.temperature.toFixed(1)} unit="°C" tone="gold" /><Metric icon={Droplets} label="Humidity" value={sim.climate.humidity.toFixed(0)} unit="%" tone="blue" /><Metric icon={Sprout} label="Soil moisture" value={sim.climate.soilMoisture.toFixed(0)} unit="%" /><Metric icon={Lightbulb} label="Light level" value={`${Math.round(sim.climate.light / 1000)}k`} unit=" lux" tone="gold" /></section>
        {activeNav === 'Overview' && <section className="active-view overview-tools"><div><span className="eyebrow">SYSTEM STATUS</span><b>{sim.plant.suitability >= 75 ? 'Crop conditions are within the operating envelope.' : 'Crop conditions require a control adjustment.'}</b><p>{sim.decisions[0]}</p></div><div><button onClick={() => setPhoneOpen(true)}><Smartphone size={15} /> Open dashboard</button><button className="secondary-action" onClick={() => setActiveNav('Analytics')}><Activity size={15} /> Review trends</button></div></section>}
        {activeNav === 'Greenhouse' && <section className="active-view greenhouse-tools"><div><span className="eyebrow">ASSET INSPECTION MODE</span><b>Select a greenhouse asset to inspect its live operating state.</b><p>Fans, pump, grow lights, sensor station, ESP32 controller, crop beds, and dashboard terminal are interactive.</p></div><div><button onClick={() => setPhoneOpen(true)}><Smartphone size={15} /> Open dashboard</button><button className="secondary-action" onClick={() => setSelected(null)}><X size={15} /> Clear selection</button></div></section>}
        {activeNav === 'Climate Control' && <section className="panel active-view climate-workbench"><PanelTitle icon={CloudSun} title="Complete climate control" trailing={<button className="text-button" onClick={resetWeather}>Restore baseline weather</button>} /><div className="climate-workbench-grid"><div><WeatherControl label="Outside temperature" unit="°C" value={sim.weather.outsideTemp} min={-5} max={45} onChange={value => setWeather({ outsideTemp: value })} /><WeatherControl label="Outside humidity" unit="%" value={sim.weather.outsideHumidity} min={5} max={100} onChange={value => setWeather({ outsideHumidity: value })} /><WeatherControl label="Sunlight intensity" unit=" lux" value={sim.weather.sunlight} min={0} max={100000} onChange={value => setWeather({ sunlight: value })} /></div><div><WeatherControl label="Cloud coverage" unit="%" value={sim.weather.cloudCover} min={0} max={100} onChange={value => setWeather({ cloudCover: value })} /><WeatherControl label="Wind intensity" unit=" km/h" value={sim.weather.wind} min={0} max={45} onChange={value => setWeather({ wind: value })} /><WeatherControl label="Rainfall" unit=" mm" value={sim.weather.rainfall} min={0} max={50} onChange={value => setWeather({ rainfall: value })} /></div><div className="climate-explainer"><b>Climate feedback</b><p>Solar load raises temperature. Wind and active ventilation move it toward outside air. Heat, wind, and fan runtime increase evaporation.</p><span>Indoor: {sim.climate.temperature.toFixed(1)}°C · {sim.climate.humidity.toFixed(0)}% RH</span></div></div></section>}
        {activeNav === 'Automation' && <section className="panel active-view automation-workbench"><PanelTitle icon={Bot} title="Automation command center" trailing={<button className="text-button" onClick={returnToAutomatic}>Return all devices to auto</button>} /><div className="automation-workbench-grid"><div className="automation-summary"><span className="auto-dot">LIVE DECISION</span>{sim.decisions.map(decision => <p key={decision}>{decision}</p>)}<small>Manual controls persist until you explicitly return the device to automatic mode.</small></div><div className="automation-device-grid">{(['fan', 'pump', 'lights'] as ActuatorId[]).map(id => <DeviceCard key={id} id={id} sim={sim} onToggle={id => setSim(current => toggleActuator(current, id))} onMode={toggleMode} />)}</div></div></section>}
        <section className="main-grid">
          <div className="scene-wrap"><GreenhouseScene sim={sim} selected={selected} onSelect={setSelected} onOpenPhone={() => setPhoneOpen(true)} />{selectedInfo && <div className="selection-card"><button onClick={() => setSelected(null)} aria-label="Close selection"><X size={15} /></button><span className="selection-dot" /><b>{selectedInfo.title}</b><small>{selectedInfo.detail}</small><p>{selectedInfo.action}</p>{(selected === 'controller' || selected === 'phone') && <button className="selection-action" onClick={() => setPhoneOpen(true)}>Open live dashboard</button>}</div>}<div className="scene-stats"><span><Wind size={14} /> Wind {sim.weather.wind} km/h</span><span><CloudSun size={14} /> {sim.weather.cloudCover}% cloud cover</span></div></div>
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
        {activeNav === 'Settings' && <section className="panel focus-panel settings"><PanelTitle icon={Settings} title="Simulation controls" /><div><button onClick={() => { setSim(createSimulation()); notify('Greenhouse reset to a fresh simulation') }}><RotateCcw size={16} /> Reset greenhouse</button><button onClick={() => { localStorage.setItem('greenlab-simulation', JSON.stringify(sim)); notify('Simulation saved on this device') }}><Save size={16} /> Save simulation</button><button onClick={() => { try { const saved = localStorage.getItem('greenlab-simulation'); if (saved) { setSim(JSON.parse(saved)); notify('Saved simulation restored') } else notify('No saved simulation was found') } catch { notify('Saved simulation could not be restored') } }}><Play size={16} /> Restore saved simulation</button></div></section>}
      </div>
    </section>{notice && <div className="app-notice" role="status">{notice}</div>}{phoneOpen && <OperationsDashboard sim={sim} chartData={chartData} onClose={() => setPhoneOpen(false)} onToggle={id => setSim(current => toggleActuator(current, id))} onMode={toggleMode} />}
  </main>
}
