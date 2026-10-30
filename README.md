# GREENLAB

**Smart Greenhouse Climate Decision and Monitoring Simulator**

GREENLAB is a polished browser simulation for learning how a greenhouse responds to weather, sensor readings, automation decisions, and manual control. It combines an interactive 3D greenhouse with transparent IoT-style monitoring—without requiring a backend, an API key, or physical hardware.

## Contents

- [Problem and objectives](#problem-and-objectives)
- [Features](#features)
- [Quick start](#quick-start)
- [Using the simulator](#using-the-simulator)
- [Simulation model](#simulation-model)
- [Virtual sensors and controller](#virtual-sensors-and-controller)
- [Automation methodology](#automation-methodology)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Technology stack](#technology-stack)
- [Validation](#validation)
- [Screenshots](#screenshots)
- [Limitations and future scope](#limitations-and-future-scope)

## Problem and objectives

Growing conditions in a greenhouse are tightly linked: solar energy raises temperature, ventilation exchanges heat and humidity, irrigation changes soil moisture, and light availability affects plant development. Raw sensor values alone do not explain those relationships or show why a controller acts.

GREENLAB makes the system understandable and interactive. Its objectives are to:

1. Visualize a greenhouse as a living environment rather than a static dashboard.
2. Model explainable climate relationships using stable, frame-rate-independent simulation steps.
3. Derive virtual sensor readings from the actual simulated environment.
4. Show how automation decisions safely control fans, irrigation, and grow lights.
5. Let users learn through plant health, resource use, and transparent operational feedback.

## Features

### Interactive greenhouse

- Procedural 3D glasshouse with crop beds, pathways, irrigation equipment, water tank, sensor station, ESP32-style controller, fans, grow lights, and a dashboard terminal.
- Orbit camera controls for zooming and exploring the environment.
- Clickable plant beds, devices, tank, sensor unit, controller, grow lights, and dashboard terminal; the selected object exposes live status information.
- Animation tied to the simulation: fan blades rotate when active, pump illumination signals irrigation, grow lights change the scene, and plant geometry changes with growth and health.

### Climate and crop simulation

- Adjustable outside temperature, humidity, sunlight, cloud cover, wind, and rainfall.
- Simulated internal temperature, humidity, soil moisture, light availability, evaporation, irrigation, ventilation, and solar heating.
- Tomato, lettuce, and cucumber crop profiles with individual target ranges.
- Gradual crop health recovery/decline, suitability scoring, growth progression, water use, and growth stages from Seed through Harvest-ready.

### Monitoring, automation, and gameplay

- Virtual DHT22 climate sensor, capacitive soil probe, and BH1750 light meter.
- Sensor disconnection and fault testing, connection status, measurement noise, and live previous/current values.
- Automated fan, pump, and grow-light control with hysteresis, manual override, irrigation duration protection, and safe sensor-fault messaging.
- Historical charts, bounded activity log, water and energy tracking, and browser persistence.
- An animated operations dashboard with a responsive telemetry view, climate chart, actuator controls, ESP32 pins, and serial-monitor-style event output.

## Quick start

### Requirements

- Node.js 20 or later
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the local URL displayed by Vite. The application runs entirely in the browser after dependencies have been installed.

### Production build

```bash
npm run build
npm run preview
```

The output is static and can be deployed to Vercel or any compatible static host.

## Using the simulator

### Main navigation

| Area | What it does |
| --- | --- |
| Overview | Shows the current operating situation and quick routes to live trends and the dashboard. |
| Greenhouse | Explains asset inspection mode and provides direct dashboard and selection controls. |
| Climate Control | Provides complete external weather controls, including wind and rainfall. |
| Sensors | Displays each virtual sensor, live reading, status, reconnection control, and fault test. |
| Automation | Explains active decisions, controls device modes, and returns all devices to automatic mode. |
| Analytics | Displays temperature and soil-moisture history from the bounded simulation buffer. |
| Settings | Resets, saves, and restores browser-local simulation state. |

### Simulation controls

- **Pause/Resume:** stops or restarts model advancement without clearing the current state.
- **1× / 2× / 5×:** changes simulated time speed.
- **Crop selector:** switches the crop profile used by the decision and growth engines.
- **Save/Restore:** stores and restores a JSON simulation snapshot in `localStorage`.
- **Reset greenhouse:** starts a new baseline simulation.

Every simulator action has a visible state change or confirmation. Manual actuator actions change the actual model; automatic control will not immediately overwrite a device in manual mode.

### Operations dashboard and controller

Click the dashboard terminal inside the 3D greenhouse, or use **Open dashboard**. The dashboard opens as a full-screen control surface with actual live readings, temperature/humidity trends, automation controls, controller data flow, and recent events. Use the close button, click the backdrop, or press <kbd>Esc</kbd> to return to the greenhouse.

The 3D ESP32-style board can also be selected. Its live control panel is available from the dashboard and is explicitly labelled as simulated.

## Simulation model

The model is implemented in `src/sim/engine.ts` and advances using elapsed time rather than render-frame counts. This keeps the simulation predictable across different rendering speeds.

| Relationship | Simplified behavior |
| --- | --- |
| Solar load | Natural light is reduced by cloud cover and raises the internal temperature target. |
| Ventilation | Fan operation and wind increase exchange between internal and outside temperature/humidity. |
| Irrigation | An active pump gradually increases soil moisture and water usage. |
| Evaporation | Soil moisture declines over time; higher temperature and ventilation accelerate the decline. |
| Grow lights | Artificial light is added to available natural illumination when the actuator is active. |
| Plant response | Suitability is calculated from crop-specific temperature, humidity, soil, and light conditions; health and growth change gradually. |

The model is intentionally explainable, not a calibrated agronomic digital twin.

## Virtual sensors and controller

All hardware is virtual. Sensor values are derived from the greenhouse climate state, with configurable noise and fault/disconnection behavior.

| Virtual device | Hardware equivalent | Reading source | Simulated connection |
| --- | --- | --- | --- |
| Climate sensor | DHT22 | Internal temperature and humidity | GPIO 4 |
| Soil probe | Capacitive soil moisture sensor | Internal soil moisture | ADC 34 |
| Light meter | BH1750 | Natural and artificial greenhouse light | I²C SDA 21 / SCL 22 |
| Ventilation fan | Relay/driver output | Automation or manual command | GPIO 25 |
| Irrigation pump | Relay/driver output | Automation or manual command | GPIO 26 |
| Grow lights | Relay/driver output | Automation or manual command | GPIO 27 |

The ESP32 control panel shows these pin assignments, live input/output states, a connected/offline indicator, and a serial-monitor-style view of simulation events. It is designed as a UI boundary that could later be connected to a real device adapter, but no physical Arduino, ESP32, or serial integration is present in this version.

## Automation methodology

The control system is separate from rendering and follows this sequence:

```text
Weather and actuator effects
          ↓
Climate simulation state
          ↓
Virtual sensor readings
          ↓
Crop threshold evaluation
          ↓
Actuator command and device state
          ↓
Updated climate, plants, charts, and events
```

For the selected crop profile, automation evaluates the following rules:

- Temperature above the upper target enables ventilation.
- Soil moisture below the lower target enables irrigation.
- Available light below the crop target enables grow lights.
- Hysteresis keeps a running device active until the condition has safely moved beyond its off threshold, which avoids rapid switching.
- Pump runtime is limited to a maximum irrigation cycle.
- A disconnected or malfunctioning sensor produces safe-fallback messaging rather than pretending a reading is reliable.
- A manually operated device remains in manual mode until the user returns it to automatic mode.

Decision text is shown in the main dashboard, the automation workspace, the operations dashboard, and the activity log.

## Architecture

```text
Weather controls
             ↓
       Climate engine ───────→ Plant health and growth
             ↓                         ↓
       Virtual sensors              Metrics/history
             ↓                         ↓
       Decision engine ← Manual device controls
             ↓
       Actuator state and event log
             ↓
3D greenhouse · dashboard · telemetry console · charts
```

The React interface renders a single simulation state. The Three.js scene reflects that state; it does not invent independent animations or sensor values. This keeps the fan, pump, lights, controller, dashboards, charts, and event history consistent.

## Project structure

```text
src/
  App.tsx                         Application shell, controls, panels, operations dashboard
  components/
    GreenhouseScene.tsx            Procedural Three.js greenhouse and object selection
  sim/
    engine.ts                      Time-step climate, sensors, automation, and growth logic
    types.ts                       Shared simulation types and crop profiles
  styles.css                       Responsive visual system and motion preferences
```

## Technology stack

- React 19 and TypeScript
- Vite
- Three.js and React Three Fiber
- Recharts
- Lucide React icons
- Browser `localStorage` persistence
- CSS animations and responsive layout

## Validation

Run the production validation command before deployment:

```bash
npm run build
```

The production build includes TypeScript checking and Vite bundling. The simulation is intentionally local-only, so there is no backend or API configuration to supply.

## Screenshots

Capture the following views after running the app locally and add them here when preparing a public project page:

1. The 3D greenhouse with active equipment.
2. The operations dashboard.
3. Climate Control with modified weather inputs.
4. The Analytics and ESP32 control views.

## Accessibility and responsive behavior

- The dashboard can be opened with an ordinary HTML button, not only through a 3D click target.
- Dashboard close actions support mouse, touch, and <kbd>Esc</kbd>.
- Controls use labels or accessible names where interaction requires them.
- Mobile navigation collapses into a sidebar and the dashboard uses a bottom-sheet layout.
- `prefers-reduced-motion` reduces transition and animation duration.

## Limitations and future scope

### Current limitations

- The climate equations are simplified for transparency and playability.
- One greenhouse climate zone and one crop profile are simulated at a time.
- Rainfall is an adjustable scenario input but the current enclosed glasshouse does not route it directly into soil moisture.
- There is no user account, cloud sync, physical device connection, or multi-user mode.
- Charts use bounded browser-memory history rather than long-term data storage.

### Future scope

- Multiple beds and environmental zones.
- Weather schedules, disease/pest models, and crop-specific nutrient systems.
- Calibration tools and exportable growing reports.
- An optional ESP32/Arduino adapter using a clearly separated hardware transport layer.
- Advanced alert rules, calibration views, and shared greenhouse missions.

## License

No license has been specified for this repository.
