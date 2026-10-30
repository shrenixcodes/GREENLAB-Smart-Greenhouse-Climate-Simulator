import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Group } from 'three'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { ActuatorId, CropId, Simulation } from '../sim/types'

type Props = { sim: Simulation; selected: string | null; onSelect: (id: string) => void }
type ItemProps = { id: string; selected: boolean; onSelect: (id: string) => void; children: ReactNode }

function Interactive({ id, selected, onSelect, children }: ItemProps) {
  return <group onClick={(event) => { event.stopPropagation(); onSelect(id) }}>
    {children}
    {selected && <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.48, 0.58, 32]} /><meshBasicMaterial color="#e8cb71" /></mesh>}
  </group>
}

function Fan({ active, selected, onSelect }: { active: boolean } & Omit<ItemProps, 'id' | 'children'>) {
  const hub = useRef<Group>(null)
  useFrame((_, delta) => { if (hub.current && active) hub.current.rotation.z += delta * 11 })
  return <Interactive id="fan" selected={selected} onSelect={onSelect}>
    <group position={[3.9, 2.2, -1.35]} rotation={[0, Math.PI / 2, 0]}>
      <mesh><cylinderGeometry args={[0.58, 0.58, 0.12, 32]} /><meshStandardMaterial color="#263430" metalness={0.7} /></mesh>
      <group ref={hub}>{[0, 1, 2, 3].map(index => <mesh key={index} rotation={[0, 0, index * Math.PI / 2]} position={[0.33 * Math.cos(index * Math.PI / 2), 0.33 * Math.sin(index * Math.PI / 2), 0.08]}><boxGeometry args={[0.48, 0.12, 0.05]} /><meshStandardMaterial color={active ? '#8eb28b' : '#65746d'} /></mesh>)}</group>
    </group>
  </Interactive>
}

function Plant({ position, scale, crop, unhealthy, selected, onSelect, id }: { position: [number, number, number]; scale: number; crop: CropId; unhealthy: boolean; selected: boolean; onSelect: (id: string) => void; id: string }) {
  const leaf = unhealthy ? '#83965b' : crop === 'tomato' ? '#3d8b52' : crop === 'lettuce' ? '#74ad55' : '#4b9a5a'
  return <Interactive id={id} selected={selected} onSelect={onSelect}><group position={position} scale={scale}>
    <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.035, 0.05, 0.68, 7]} /><meshStandardMaterial color="#49723d" /></mesh>
    {[0, 1, 2, 3, 4].map(index => <mesh key={index} position={[Math.cos(index * 1.256) * .15, .34 + (index % 2) * .16, Math.sin(index * 1.256) * .15]} rotation={[0.55, index * 1.256, 0.22]}><sphereGeometry args={[.16, 10, 8]} /><meshStandardMaterial color={leaf} roughness={.8} /></mesh>)}
    {crop === 'tomato' && scale > .75 && <mesh position={[.1, .32, -.05]}><sphereGeometry args={[.07, 8, 8]} /><meshStandardMaterial color="#da644e" /></mesh>}
  </group></Interactive>
}

function Greenhouse({ sim, selected, onSelect }: Props) {
  const { crop, plant, actuators } = sim
  const growthScale = .38 + plant.growth / 100 * .78
  const rows = [-1.1, 1.1]
  return <group>
    <color attach="background" args={['#0d1814']} />
    <fog attach="fog" args={['#0d1814', 10, 23]} />
    <ambientLight intensity={.75} color="#c7e3c5" />
    <directionalLight position={[-5, 9, 4]} intensity={1.5} color="#ffe6ad" castShadow />
    {actuators.lights.active && <pointLight position={[0, 3.5, 0]} intensity={38} distance={9} color="#ffd47a" />}
    <mesh position={[0, -.08, 0]} receiveShadow><boxGeometry args={[10, .16, 7]} /><meshStandardMaterial color="#5f7651" roughness={1} /></mesh>
    <mesh position={[0, .02, 0]} receiveShadow><boxGeometry args={[1.25, .06, 6.2]} /><meshStandardMaterial color="#a79b7a" roughness={.95} /></mesh>
    {rows.map(z => <group key={z}><mesh position={[0, .14, z]} receiveShadow><boxGeometry args={[8.2, .32, 1.35]} /><meshStandardMaterial color="#594536" /></mesh>{[-3.25, -2.35, -1.45, -.55, .4, 1.35, 2.25, 3.15].map((x, index) => <Plant key={x} id={`plant-${z}-${index}`} position={[x, .31, z]} scale={growthScale * (0.88 + (index % 3) * .06)} crop={crop} unhealthy={plant.health < 55} selected={selected === `plant-${z}-${index}`} onSelect={onSelect} />)}</group>)}
    {[-4.25, 4.25].map(x => <group key={x}>{[-3, -1.5, 0, 1.5, 3].map(z => <mesh key={z} position={[x, 2.3, z]}><boxGeometry args={[.1, 4.6, .1]} /><meshStandardMaterial color="#30443e" metalness={.8} /></mesh>)}</group>)}
    {[-3, -1.5, 0, 1.5, 3].map(z => <mesh key={z} position={[0, 4.5, z]} rotation={[0, 0, 0]}><boxGeometry args={[8.7, .1, .1]} /><meshStandardMaterial color="#30443e" metalness={.8} /></mesh>)}
    <mesh position={[0, 2.3, -3.1]}><boxGeometry args={[8.5, 4.4, .035]} /><meshPhysicalMaterial color="#b5e0d6" transparent opacity={.12} roughness={.08} /></mesh>
    <mesh position={[0, 2.3, 3.1]}><boxGeometry args={[8.5, 4.4, .035]} /><meshPhysicalMaterial color="#b5e0d6" transparent opacity={.12} roughness={.08} /></mesh>
    <mesh position={[0, 4.45, 0]} rotation={[0, 0, .48]}><boxGeometry args={[9.3, .05, 6.7]} /><meshPhysicalMaterial color="#b5e0d6" transparent opacity={.12} roughness={.08} /></mesh>
    <Fan active={actuators.fan.active} selected={selected === 'fan'} onSelect={onSelect} />
    <Interactive id="tank" selected={selected === 'tank'} onSelect={onSelect}><group position={[-3.5, .62, 2.15]}><mesh><cylinderGeometry args={[.55, .55, 1.2, 24]} /><meshStandardMaterial color="#487b89" metalness={.4} /></mesh><mesh position={[0, .67, 0]}><cylinderGeometry args={[.58, .58, .08, 24]} /><meshStandardMaterial color="#283f43" /></mesh></group></Interactive>
    <Interactive id="pump" selected={selected === 'pump'} onSelect={onSelect}><group position={[-2.4, .35, 2.35]}><mesh><boxGeometry args={[.7, .45, .55]} /><meshStandardMaterial color={actuators.pump.active ? '#62a9c6' : '#394a47'} emissive={actuators.pump.active ? '#205a73' : '#000000'} /></mesh>{actuators.pump.active && <pointLight color="#73d8ff" intensity={3} distance={2} />}</group></Interactive>
    <Interactive id="sensor" selected={selected === 'sensor'} onSelect={onSelect}><group position={[2.6, 1.5, 2.35]}><mesh><boxGeometry args={[.35, .42, .16]} /><meshStandardMaterial color="#d9dbcf" /></mesh><mesh position={[0, .05, .1]}><circleGeometry args={[.055, 16]} /><meshBasicMaterial color="#7cec93" /></mesh></group></Interactive>
    {[-1.9, 1.9].map(x => <Interactive id={`light-${x}`} key={x} selected={selected === `light-${x}`} onSelect={onSelect}><group position={[x, 3.8, 0]}><mesh><boxGeometry args={[1.15, .16, .42]} /><meshStandardMaterial color={actuators.lights.active ? '#f6cc70' : '#59605b'} emissive={actuators.lights.active ? '#d98926' : '#000'} /></mesh></group></Interactive>)}
  </group>
}

function CameraControls() {
  const { camera, gl } = useThree()
  const controls = useMemo(() => {
    return new ThreeOrbitControls(camera, gl.domElement)
  }, [camera, gl])
  useEffect(() => {
    controls.enablePan = false
    controls.minDistance = 7
    controls.maxDistance = 17
    controls.maxPolarAngle = Math.PI / 2.05
    controls.target.set(0, 1.6, 0)
    controls.update()
    return () => controls.dispose()
  }, [controls])
  useFrame(() => controls.update())
  return null
}

export default function GreenhouseScene(props: Props) {
  return <div className="scene" aria-label="Interactive 3D greenhouse"><Canvas shadows camera={{ position: [9, 8, 10], fov: 43 }} dpr={[1, 1.5]}><Greenhouse {...props} /><CameraControls /></Canvas><div className="scene-hint">Drag to explore · Click an object to inspect</div></div>
}
