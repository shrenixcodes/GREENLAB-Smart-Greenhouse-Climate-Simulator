# GREENLAB

GREENLAB is a browser-based smart greenhouse climate decision and monitoring simulator. It blends an interactive 3D growing environment with transparent IoT-style sensing, climate automation, and lightweight farming-game challenges.

## Why it exists

Greenhouse control is a balancing act: heat, humidity, soil water, light, ventilation, and crop requirements all affect each other. GREENLAB makes those relationships visible and explorable without requiring physical hardware.

## What is included

- Procedural interactive 3D greenhouse with crop beds, glass structure, tank, pump, sensor unit, grow lights, and a rotating ventilation fan.
- Tomato, lettuce, and cucumber crop profiles with environmental targets and growth stages.
- Stable, time-step-based climate model for heat, humidity, solar load, cloud cover, wind, evaporation, irrigation, ventilation, and supplemental light.
- Virtual DHT22, capacitive soil moisture, and BH1750 sensors that derive their readings from the simulated environment. Sensors can be disconnected or fault-tested.
- A separate automation decision layer with hysteresis, maximum irrigation runtime, manual mode, safety fallback messaging, and decision explanations.
- Health, suitability, crop growth, water usage, energy usage, bounded time-series history, live event log, and browser persistence.
- Heatwave, drought, and cloudy-week scenarios plus connected achievements.
- Responsive controls, keyboard-accessible HTML buttons, reduced-motion handling, and an accessible fallback interaction path through the interface.
- An in-game field phone that opens to a live touch-style dashboard, including climate trends, actuators, sensor status, ESP32 pins, and serial-monitor-style logs.
- A clearly labelled simulated ESP32 controller with DHT22 on GPIO 4, soil moisture on ADC 34, BH1750 on I²C 21/22, and outputs for the fan (25), pump (26), and grow lights (27).

## Architecture

```text
Weather controls → Climate simulation → Virtual sensors → Decision engine
       ↑                    ↓                 ↓               ↓
  Scenario system ← Plant health/growth ← Actuator effects ← Manual controls
                              ↓
                  3D scene, dashboard, charts, event log
```

The simulation lives in `src/sim/engine.ts`. Rendering (`src/components/GreenhouseScene.tsx`) only reflects current simulation state, so fan rotation, irrigation pump light, crop condition, and grow-light illumination stay connected to actual device effects.

## Sensor simulation

| Virtual sensor | Hardware equivalent | Source value |
| --- | --- | --- |
| Climate sensor | DHT22 | Internal temperature and humidity |
| Soil probe | Capacitive moisture sensor | Soil moisture model |
| Light meter | BH1750 | Natural + artificial greenhouse light |

All sensors and ESP32-like device behavior are simulated in the browser. GREENLAB does not claim physical hardware integration.

## Run locally

Requirements: Node.js 20 or later.

```bash
npm install
npm run dev
```

Open the local address Vite displays. For a production check:

```bash
npm run build
npm run preview
```

## Simulation workflow

1. Adjust weather in the right-side weather panel or load a challenge.
2. The climate engine advances in stable time increments at 1×, 2×, or 5× speed.
3. Virtual sensors take readings from that climate state.
4. The decision engine compares readings with crop thresholds and issues actuator commands.
5. Fans, irrigation, and lights feed back into the environment; plant health and growth respond gradually.

## Limitations and future scope

The model is deliberately explainable rather than an agronomic digital twin. Future work could add per-bed zones, richer weather schedules, more crop diseases, real device adapters, multi-user farming missions, and exportable reports.
