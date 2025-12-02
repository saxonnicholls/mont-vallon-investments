import React, { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import './App.css'

// Fly around the mountain 

function setMountainFavicon() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const sky = ctx.createLinearGradient(0, 0, 0, size)
  sky.addColorStop(0, '#0b1020')
  sky.addColorStop(1, '#1a2740')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, size, size)

  const sunX = size * 0.76
  const sunY = size * 0.26
  const halo = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, size * 0.22)
  halo.addColorStop(0, '#f7d9a0')
  halo.addColorStop(1, 'rgba(247, 217, 160, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(sunX, sunY, size * 0.18, 0, Math.PI * 2)
  ctx.fill()

  const drawMountain = (peakX, peakY, leftBase, rightBase, color, snowWidth = 0) => {
    ctx.beginPath()
    ctx.moveTo(peakX, peakY)
    ctx.lineTo(leftBase, size)
    ctx.lineTo(rightBase, size)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()

    if (!snowWidth) return
    ctx.beginPath()
    ctx.moveTo(peakX, peakY + size * 0.02)
    ctx.lineTo(peakX - snowWidth, peakY + size * 0.12)
    ctx.lineTo(peakX, peakY + size * 0.09)
    ctx.lineTo(peakX + snowWidth * 1.1, peakY + size * 0.14)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fill()
  }

  drawMountain(size * 0.34, size * 0.36, size * 0.08, size * 0.64, '#162033', size * 0.08)
  drawMountain(size * 0.62, size * 0.42, size * 0.34, size * 0.92, '#10182b')

  const link =
    document.querySelector("link[rel~='icon']") || document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = canvas.toDataURL('image/png')
  if (!link.parentNode) document.head.appendChild(link)
}

/**
 * Mont Vallon terrain model.
 * Export as public/models/mont-vallon.glb
 */
function MontVallonModel({ onBounds, ...props }) {
  const { scene } = useGLTF('/models/mont-vallon.glb')
  const ref = useRef()

  useLayoutEffect(() => {
    if (!ref.current) return
    const box = new Box3().setFromObject(ref.current)
    const center = box.getCenter(new Vector3())
    onBounds?.([center.x, center.y, center.z])
  }, [onBounds])

  return <primitive ref={ref} object={scene} {...props} />
}

useGLTF.preload('/models/mont-vallon.glb')

/**
 * Cinematic fly-over camera:
 * - Orbits around the origin
 * - Slowly zooms in
 * - Slight vertical drift for “drone” feel
 */
function FlyCamera({ target = [0, 0.5, 0], speed = 0.15, fov = 55 }) {
  const { camera } = useThree()
  const t = useRef(0)

  useEffect(() => {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }, [camera, fov])

  useFrame((_, delta) => {
    t.current += delta * speed // interactive speed

    const orbitAngle = t.current * 0.3
    const zoomFactor = Math.min(t.current * 1.2, 6)
    const radius = Math.max(20, 26 - zoomFactor * 1.5)
    const height = 12 + Math.sin(t.current * 0.4) * 3

    camera.position.set(
      target[0] + Math.cos(orbitAngle) * radius,
      target[1] + height,
      target[2] + Math.sin(orbitAngle) * radius
    )
    camera.lookAt(target[0], target[1], target[2])
  })

  return null
}

function Scene({ flySpeed, perspective }) {
  const [target, setTarget] = useState([0, 0.5, 0])

  return (
    <>
      {/* Background & distant haze */}
      <color attach="background" args={['#040712']} />
      <fog attach="fog" args={['#040712', 10, 60]} />

      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Distant ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2.6, 0]}
        receiveShadow
      >
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color="#050915"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Mont Vallon */}
      <Suspense fallback={null}>
        <MontVallonModel
          position={[0, -2.5, 0]}
          rotation={[0, Math.PI * 0.25, 0]}
          scale={3.5}
          onBounds={setTarget}
        />
      </Suspense>

      {/* Subtle HDRI environment */}
      <Environment preset="sunset" />

      {/* Animated camera */}
      <FlyCamera target={target} speed={flySpeed} fov={perspective} />
    </>
  )
}

export default function App() {
  const [flySpeed, setFlySpeed] = useState(0.15)
  const [perspective, setPerspective] = useState(75)

  useEffect(() => {
    setMountainFavicon()
  }, [])

  return (
    <div className="mv-root">
      <Canvas
        className="mv-canvas"
        shadows
        camera={{ position: [0, 50, 150], fov: perspective, near: 0.1, far: 200 }}
      >
        <Scene flySpeed={flySpeed} perspective={perspective} />
      </Canvas>

      {/* Glassy overlay UI */}
      <div className="mv-overlay">
        <div className="mv-card">
          <div className="mv-badge">Mont Vallon Investments</div>
          <h1>Elevated perspectives on global markets.</h1>
          <p>
            Inspired by the alpine summit above Méribel, we help clients look
            beyond the next ridge line and navigate long‑term opportunity.
          </p>
          <div className="mv-controls">
            <div className="mv-control-row">
              <label htmlFor="mv-speed">Flyover speed</label>
              <input
                id="mv-speed"
                type="range"
                min="0.05"
                max="0.35"
                step="0.01"
                value={flySpeed}
                onChange={(e) => setFlySpeed(parseFloat(e.target.value))}
              />
              <span className="mv-control-value">{flySpeed.toFixed(2)}x</span>
            </div>
            <div className="mv-control-row">
              <label htmlFor="mv-perspective">Perspective</label>
              <input
                id="mv-perspective"
                type="range"
                min="50"
                max="100"
                step="1"
                value={perspective}
                onChange={(e) => setPerspective(parseFloat(e.target.value))}
              />
              <span className="mv-control-value">
                {Math.round(perspective)}°
              </span>
            </div>
          </div>
          {/* <div className="mv-actions">
            <button className="mv-primary">Enter site</button>
            <button className="mv-secondary">Request a call</button>
          </div> */}
        </div>
      </div>
    </div>
  )
}




// import React, { Suspense, useRef } from 'react'
// import { Canvas, useFrame, useThree } from '@react-three/fiber'
// import { Environment, useGLTF } from '@react-three/drei'
// import './App.css'

// /**
//  * Mont Vallon terrain model.
//  * Make sure you have public/models/mont-vallon.glb
//  * exported from Blender / your 3D tool.
//  */
// function MontVallonModel(props) {
//   const { scene } = useGLTF('/models/mont-vallon.glb')
//   // You can tweak scale/rotation/position here once you see your model.
//   return <primitive object={scene} {...props} />
// }

// useGLTF.preload('/models/mont-vallon.glb')

// /**
//  * Simple cinematic camera fly-over.
//  * Orbits around the origin and slowly zooms in.
//  */
// function FlyCamera({ target = [0, 0.5, 0] }) {
//   const { camera } = useThree()
//   const t = useRef(0)

//   useFrame((state, delta) => {
//     t.current += delta * 0.15 // overall speed

//     const orbitAngle = t.current * 0.3
//     const zoomFactor = Math.min(t.current * 2, 8)
//     const radius = 18 - zoomFactor // zoom in over time
//     const height = 10 + Math.sin(t.current * 0.4) * 2.5

//     camera.position.set(
//       Math.cos(orbitAngle) * radius,
//       height,
//       Math.sin(orbitAngle) * radius
//     )
//     camera.lookAt(target[0], target[1], target[2])
//   })

//   return null
// }

// function Scene() {
//   return (
//     <>
//       {/* Background & atmosphere */}
//       <color attach="background" args={['#040712']} />
//       <fog attach="fog" args={['#040712', 10, 60]} />

//       {/* Lights */}
//       <ambientLight intensity={0.55} />
//       <directionalLight
//         position={[15, 25, 10]}
//         intensity={1.6}
//         castShadow
//         shadow-mapSize-width={2048}
//         shadow-mapSize-height={2048}
//       />

//       {/* Ground / shadow catcher */}
//       <mesh
//         rotation={[-Math.PI / 2, 0, 0]}
//         position={[0, -2.6, 0]}
//         receiveShadow
//       >
//         <planeGeometry args={[120, 120]} />
//         <meshStandardMaterial
//           color="#050915"
//           roughness={0.9}
//           metalness={0.1}
//         />
//       </mesh>

//       {/* Mont Vallon model */}
//       <Suspense fallback={null}>
//         <MontVallonModel
//           position={[0, -2.5, 0]}
//           rotation={[0, Math.PI * 0.25, 0]}
//           scale={3.5}
//         />
//       </Suspense>

//       {/* Subtle HDRI-style environment lighting */}
//       <Environment preset="sunset" />

//       {/* Camera animation */}
//       <FlyCamera />
//     </>
//   )
// }

// export default function App() {
//   return (
//     <div className="mv-root">
//       <Canvas
//         className="mv-canvas"
//         shadows
//         camera={{ position: [0, 10, 30], fov: 45, near: 0.1, far: 200 }}
//       >
//         <Scene />
//       </Canvas>

//       {/* Overlay UI */}
//       <div className="mv-overlay">
//         <div className="mv-card">
//           <div className="mv-badge">Mont Vallon Investments</div>
//           <h1>Elevated perspectives on global markets.</h1>
//           <p>
//             Inspired by the alpine summit above Méribel, we help clients look
//             beyond the next ridge line and navigate long‑term opportunity.
//           </p>
//           <div className="mv-actions">
//             <button className="mv-primary">Enter site</button>
//             <button className="mv-secondary">Request a call</button>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }



// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App
