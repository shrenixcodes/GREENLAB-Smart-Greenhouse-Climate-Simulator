import { cropProfiles, type ActuatorId, type Climate, type CropId, type LogEntry, type Sensor, type Simulation, type Weather } from './types'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const blend = (current: number, target: number, response: number) => current + (target - current) * response
const clock = (seconds: number) => `${String(Math.floor(seconds / 3600) % 24).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}`
const within = (value: number, [min, max]: [number, number]) => value >= min && value <= max

export function createSimulation(): Simulation {
  const now = Date.now()
  return {
    weather: { outsideTemp: 24, outsideHumidity: 54, sunlight: 76000, cloudCover: 22, wind: 9, rainfall: 0 },
    climate: { temperature: 24.8, humidity: 61, soilMoisture: 58, light: 31000 },
    actuators: {
      fan: { id: 'fan', label: 'Ventilation fan', active: false, mode: 'auto', runtime: 0, consumption: 0 },
      pump: { id: 'pump', label: 'Irrigation pump', active: false, mode: 'auto', runtime: 0, consumption: 0 },
      lights: { id: 'lights', label: 'Grow lights', active: false, mode: 'auto', runtime: 0, consumption: 0 }
    },
    sensors: {
      climate: { id: 'climate', label: 'Climate sensor', hardware: 'DHT22', connected: true, malfunction: false, noise: 0.4, value: 24.8, previous: 24.8, updatedAt: now },
      soil: { id: 'soil', label: 'Soil probe', hardware: 'Capacitive moisture sensor', connected: true, malfunction: false, noise: 0.8, value: 58, previous: 58, updatedAt: now },
      light: { id: 'light', label: 'Light meter', hardware: 'BH1750', connected: true, malfunction: false, noise: 80, value: 31000, previous: 31000, updatedAt: now }
    },
    plant: { health: 92, growth: 42, stage: 'Vegetative', suitability: 91, waterUsed: 0 },
    crop: 'tomato', time: 9 * 3600, running: true, speed: 1, history: [], logs: [{ id: 1, time: '09:00', type: 'info', message: 'GREENLAB simulation started' }], decisions: ['Conditions are stable — monitoring crop requirements.'],
    achievements: [
      { id: 'irrigation', label: 'First successful irrigation', unlocked: false },
      { id: 'stable', label: 'Stable greenhouse', unlocked: false },
      { id: 'efficient', label: 'Efficient water management', unlocked: false },
      { id: 'heatwave', label: 'Heatwave survivor', unlocked: false },
      { id: 'harvest', label: 'Healthy crop harvest', unlocked: false }
    ], scenario: null, eventId: 2
  }
}

function log(sim: Simulation, type: LogEntry['type'], message: string): Simulation {
  const next = { ...sim, eventId: sim.eventId + 1 }
  next.logs = [{ id: next.eventId, time: clock(next.time), type, message }, ...sim.logs].slice(0, 40)
  return next
}

function readSensor(sensor: Sensor, actual: number, now: number): Sensor {
  const randomized = actual + (Math.random() - 0.5) * sensor.noise * 2
  return { ...sensor, previous: sensor.value, value: sensor.connected && !sensor.malfunction ? randomized : sensor.value, updatedAt: now }
}

function decide(sim: Simulation): Simulation {
  const profile = cropProfiles[sim.crop]
  const { climate, sensors } = sim
  const unavailable = Object.values(sensors).some(sensor => !sensor.connected || sensor.malfunction)
  const activate = (id: ActuatorId, active: boolean) => ({ ...sim.actuators[id], active })
  const next = { ...sim, actuators: { ...sim.actuators }, decisions: [] as string[] }
  if (unavailable) next.decisions.push('Sensor fault detected — using safe environmental fallback.')
  const fan = sim.actuators.fan
  if (fan.mode === 'auto') {
    const shouldRun = climate.temperature > profile.temp[1] || (fan.active && climate.temperature > profile.temp[1] - 1.4)
    next.actuators.fan = activate('fan', shouldRun)
    if (shouldRun) next.decisions.push(`Ventilation active: ${climate.temperature.toFixed(1)}°C exceeds ${profile.temp[1]}°C target.`)
  }
  const pump = sim.actuators.pump
  if (pump.mode === 'auto') {
    const shouldRun = climate.soilMoisture < profile.soil[0] || (pump.active && climate.soilMoisture < profile.soil[0] + 6)
    next.actuators.pump = activate('pump', shouldRun && pump.runtime < 180)
    if (next.actuators.pump.active) next.decisions.push(`Irrigation active: soil moisture below ${profile.soil[0]}%.`)
  }
  const lights = sim.actuators.lights
  if (lights.mode === 'auto') {
    const shouldRun = climate.light < profile.light || (lights.active && climate.light < profile.light + 2000)
    next.actuators.lights = activate('lights', shouldRun)
    if (shouldRun) next.decisions.push(`Grow lights active: available light below ${Math.round(profile.light / 1000)}k lux target.`)
  }
  if (!next.decisions.length) next.decisions.push('Conditions are stable — maintaining the current climate.')
  return next
}

export function step(simulation: Simulation, elapsedSeconds: number): Simulation {
  if (!simulation.running) return simulation
  const dt = clamp(elapsedSeconds * simulation.speed, 0, 20)
  let sim = decide(simulation)
  const weather = sim.weather
  const fan = sim.actuators.fan.active
  const pump = sim.actuators.pump.active
  const lights = sim.actuators.lights.active
  const naturalLight = weather.sunlight * (1 - weather.cloudCover / 100) * 0.52
  const targetLight = naturalLight + (lights ? 12500 : 0)
  const solarHeat = naturalLight / 15000
  const ventilation = fan ? 0.095 + weather.wind / 900 : weather.wind / 3600
  const targetTemp = weather.outsideTemp + solarHeat - (fan ? solarHeat * 0.5 : 0)
  const temperature = clamp(blend(sim.climate.temperature, targetTemp, (0.008 + ventilation) * dt), 5, 50)
  const targetHumidity = weather.outsideHumidity + (pump ? 7 : 0) - (temperature - weather.outsideTemp) * 0.8
  const humidity = clamp(blend(sim.climate.humidity, targetHumidity, (0.006 + ventilation) * dt), 10, 100)
  const evaporation = (0.012 + Math.max(0, temperature - 20) * 0.0035 + (fan ? 0.009 : 0)) * dt
  const soilMoisture = clamp(sim.climate.soilMoisture + (pump ? 0.21 * dt : 0) - evaporation, 0, 100)
  const light = clamp(blend(sim.climate.light, targetLight, 0.05 * dt), 0, 100000)
  const climate: Climate = { temperature, humidity, soilMoisture, light }
  const now = Date.now()
  const sensors = {
    climate: readSensor(sim.sensors.climate, temperature, now),
    soil: readSensor(sim.sensors.soil, soilMoisture, now),
    light: readSensor(sim.sensors.light, light, now)
  }
  const profile = cropProfiles[sim.crop]
  const checks = [within(temperature, profile.temp), within(humidity, profile.humidity), within(soilMoisture, profile.soil), light >= profile.light * 0.65]
  const suitability = Math.round(checks.filter(Boolean).length / checks.length * 100)
  const healthChange = (suitability >= 75 ? 0.006 : -0.018) * dt
  const health = clamp(sim.plant.health + healthChange, 0, 100)
  const growth = clamp(sim.plant.growth + (suitability / 100) * 0.003 * dt, 0, 100)
  const stage = growth < 10 ? 'Seed' : growth < 28 ? 'Seedling' : growth < 65 ? 'Vegetative' : growth < 90 ? 'Mature' : 'Harvest-ready'
  const actuators = Object.fromEntries(Object.entries(sim.actuators).map(([id, device]) => [id, { ...device, runtime: device.active ? device.runtime + dt : 0, consumption: device.consumption + (device.active ? (id === 'pump' ? 0.018 : id === 'fan' ? 0.006 : 0.012) * dt : 0) }])) as Simulation['actuators']
  sim = { ...sim, climate, sensors, actuators, plant: { health, growth, stage, suitability, waterUsed: sim.plant.waterUsed + (pump ? 0.05 * dt : 0) }, time: sim.time + dt }
  if (pump && !simulation.actuators.pump.active) sim = log(sim, 'success', 'Irrigation cycle started')
  if (fan && !simulation.actuators.fan.active) sim = log(sim, 'info', 'Ventilation activated')
  if (temperature > profile.temp[1] + 4) sim = log(sim, 'warning', 'Heat stress warning: climate exceeds crop target')
  if (Math.floor(sim.time / 15) !== Math.floor(simulation.time / 15)) {
    const point = { time: clock(sim.time), temperature: Math.round(temperature * 10) / 10, humidity: Math.round(humidity), soil: Math.round(soilMoisture), light: Math.round(light), water: Math.round(sim.plant.waterUsed * 10) / 10, energy: Math.round(Object.values(actuators).reduce((total, device) => total + device.consumption, 0) * 10) / 10 }
    sim.history = [...sim.history, point].slice(-80)
  }
  sim.achievements = sim.achievements.map(item => ({ ...item, unlocked: item.unlocked || (item.id === 'irrigation' && sim.plant.waterUsed > 1) || (item.id === 'stable' && sim.plant.suitability > 90 && sim.time > 9 * 3600 + 240) || (item.id === 'harvest' && sim.plant.growth >= 90 && sim.plant.health >= 80) || (item.id === 'heatwave' && sim.scenario === 'heatwave' && sim.plant.health > 75) }))
  return sim
}

export function updateWeather(sim: Simulation, patch: Partial<Weather>): Simulation { return { ...sim, weather: { ...sim.weather, ...patch } } }
export function changeCrop(sim: Simulation, crop: CropId): Simulation { return log({ ...sim, crop }, 'info', `Crop profile changed to ${cropProfiles[crop].name}`) }
export function toggleActuator(sim: Simulation, id: ActuatorId): Simulation {
  const actuator = sim.actuators[id]
  const next = { ...sim, actuators: { ...sim.actuators, [id]: { ...actuator, active: !actuator.active, mode: 'manual' as const } } }
  return log(next, 'info', `${actuator.label} manually ${!actuator.active ? 'enabled' : 'disabled'}`)
}
export function toggleSensor(sim: Simulation, id: keyof Simulation['sensors'], kind: 'connected' | 'malfunction'): Simulation {
  const sensor = sim.sensors[id]
  const next = { ...sim, sensors: { ...sim.sensors, [id]: { ...sensor, [kind]: !sensor[kind] } } }
  return log(next, 'warning', `${sensor.label} ${!sensor[kind] ? `${kind} enabled` : `${kind} cleared`}`)
}
