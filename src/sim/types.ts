export type CropId = 'tomato' | 'lettuce' | 'cucumber'
export type ActuatorId = 'fan' | 'pump' | 'lights'
export type SensorId = 'climate' | 'soil' | 'light'
export type Mode = 'auto' | 'manual'

export interface Weather {
  outsideTemp: number
  outsideHumidity: number
  sunlight: number
  cloudCover: number
  wind: number
  rainfall: number
}

export interface Climate {
  temperature: number
  humidity: number
  soilMoisture: number
  light: number
}

export interface Actuator { id: ActuatorId; label: string; active: boolean; mode: Mode; runtime: number; consumption: number }
export interface Sensor { id: SensorId; label: string; hardware: string; connected: boolean; malfunction: boolean; noise: number; value: number; previous: number; updatedAt: number }
export interface Plant { health: number; growth: number; stage: string; suitability: number; waterUsed: number }
export interface LogEntry { id: number; time: string; type: 'info' | 'warning' | 'success'; message: string }
export interface Point { time: string; temperature: number; humidity: number; soil: number; light: number; water: number; energy: number }
export interface Achievement { id: string; label: string; unlocked: boolean }

export interface Simulation {
  weather: Weather
  climate: Climate
  actuators: Record<ActuatorId, Actuator>
  sensors: Record<SensorId, Sensor>
  plant: Plant
  crop: CropId
  time: number
  running: boolean
  speed: 1 | 2 | 5
  history: Point[]
  logs: LogEntry[]
  decisions: string[]
  achievements: Achievement[]
  scenario: string | null
  eventId: number
}

export const cropProfiles: Record<CropId, { name: string; temp: [number, number]; humidity: [number, number]; soil: [number, number]; light: number; colour: string }> = {
  tomato: { name: 'Tomato', temp: [20, 28], humidity: [55, 75], soil: [45, 70], light: 22000, colour: '#df755d' },
  lettuce: { name: 'Lettuce', temp: [16, 24], humidity: [50, 70], soil: [48, 72], light: 15000, colour: '#8dcc69' },
  cucumber: { name: 'Cucumber', temp: [21, 29], humidity: [60, 80], soil: [50, 75], light: 20000, colour: '#6dbb65' }
}
