import { createSimulation, updateWeather } from './engine'
import type { Simulation } from './types'

export const scenarios = [
  { id: 'heatwave', name: 'Heatwave', icon: '☀', description: 'A scorching day tests your ventilation strategy.', objective: 'Keep plant health above 75%', weather: { outsideTemp: 38, outsideHumidity: 28, sunlight: 97000, cloudCover: 3, wind: 4 } },
  { id: 'drought', name: 'Drought', icon: '◌', description: 'Dry air and thirsty soil demand precise irrigation.', objective: 'Maintain soil moisture above 40%', weather: { outsideTemp: 30, outsideHumidity: 18, sunlight: 76000, cloudCover: 10, wind: 14 } },
  { id: 'cloudy', name: 'Cloudy week', icon: '☁', description: 'Natural light is scarce for your crop.', objective: 'Keep light availability above target', weather: { outsideTemp: 18, outsideHumidity: 72, sunlight: 32000, cloudCover: 82, wind: 8 } }
]

export function loadScenario(id: string): Simulation {
  const scenario = scenarios.find(item => item.id === id)
  if (!scenario) return createSimulation()
  const sim = updateWeather(createSimulation(), scenario.weather)
  const climate = id === 'drought' ? { ...sim.climate, soilMoisture: 38 } : sim.climate
  return { ...sim, climate, scenario: id, logs: [{ id: 1, time: '09:00', type: 'warning', message: `${scenario.name} challenge loaded` }], eventId: 2 }
}
