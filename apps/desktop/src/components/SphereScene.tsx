import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

const CONFIG = {
  particleCount: 1500,
  sphereRadius: 2.0,
  rotSpeed: 0.08,       // multiplied by rotationSpeed setting
  pulseSpeed: 0.8,      // multiplied by pulseSpeed setting
  starCount: 5000,
  starFieldRadius: 50,
  connectionDistance: 1.0,
  maxConnections: 4,
}

interface SphereSceneProps {
  audioLevel?: number
  intensity?: number
  particleCount?: number
  glowColor?: string
  /** Secondary (background starfield) color, hex string */
  bgColor?: string
  /** Rotation speed multiplier, 0-3 (default 1) */
  rotationSpeed?: number
  /** Breathing pulse speed multiplier, 0-3 (default 1) */
  pulseSpeedMult?: number
}

function normalizeHex(hex: string, fallback: number): number {
  const c = hex?.replace('#', '')
  return /^([0-9a-f]{6})$/i.test(c) ? parseInt(c, 16) : fallback
}

export default function SphereScene({
  audioLevel = 0,
  intensity = 1,
  particleCount = 1500,
  glowColor = '#2763d1',
  bgColor = '#1e4a8a',
  rotationSpeed = 1,
  pulseSpeedMult = 1,
}: SphereSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioLevelRef = useRef(audioLevel)
  const smoothAudioRef = useRef(0)
  const [hasError, setHasError] = useState(false)

  useEffect(() => { audioLevelRef.current = audioLevel }, [audioLevel])
  const intensityRef = useRef(intensity)
  const particleCountRef = useRef(particleCount)
  const glowColorRef = useRef(glowColor)
  const bgColorRef = useRef(bgColor)
  const rotationSpeedRef = useRef(rotationSpeed)
  const pulseSpeedMultRef = useRef(pulseSpeedMult)
  useEffect(() => { intensityRef.current = intensity }, [intensity])
  useEffect(() => { particleCountRef.current = particleCount }, [particleCount])
  useEffect(() => { glowColorRef.current = glowColor }, [glowColor])
  useEffect(() => { bgColorRef.current = bgColor }, [bgColor])
  useEffect(() => { rotationSpeedRef.current = rotationSpeed }, [rotationSpeed])
  useEffect(() => { pulseSpeedMultRef.current = pulseSpeedMult }, [pulseSpeedMult])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer | null = null
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      setHasError(true)
      return
    }

    // Scene
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x050810, 0.0025)

    const aspect = container.clientWidth / container.clientHeight
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100)
    camera.position.set(0, 1.2, 6.5)
    camera.lookAt(0, 0, 0)

    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // Background sphere
    function createBackgroundSphere() {
      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(CONFIG.starCount * 3)
      for (let i = 0; i < CONFIG.starCount; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const r = CONFIG.starFieldRadius
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = r * Math.cos(phi)
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.PointsMaterial({
        color: normalizeHex(bgColorRef.current, 0x1e4a8a), size: 0.20, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      })
      const mesh = new THREE.Points(geo, mat)
      scene.add(mesh)
      return mesh
    }

    // Center sphere
    function createSphere(count: number, radius: number, size: number) {
      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(count * 3)
      const directions = new Float32Array(count * 3)
      const goldenRatio = (1 + Math.sqrt(5)) / 2
      for (let i = 0; i < count; i++) {
        const inc = Math.acos(1 - 2 * (i + 0.5) / count)
        const az = 2 * Math.PI * i / goldenRatio
        const x = Math.sin(inc) * Math.cos(az)
        const y = Math.sin(inc) * Math.sin(az)
        const z = Math.cos(inc)
        directions[i * 3] = x; directions[i * 3 + 1] = y; directions[i * 3 + 2] = z
        positions[i * 3] = x * radius; positions[i * 3 + 1] = y * radius; positions[i * 3 + 2] = z * radius
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.PointsMaterial({
        color: normalizeHex(glowColorRef.current, 0x2763d1), size, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      })
      const mesh = new THREE.Points(geo, mat)
      scene.add(mesh)
      return { mesh, geo, mat, directions }
    }

    // Connections
    function computeNeighbors(directions: Float32Array, count: number, angleThreshold: number, maxPer: number) {
      const thresholdSq = angleThreshold * angleThreshold
      const pairs: number[] = []
      const counts = new Uint8Array(count)
      for (let i = 0; i < count; i++) {
        const ix = directions[i * 3], iy = directions[i * 3 + 1], iz = directions[i * 3 + 2]
        for (let j = i + 1; j < count; j++) {
          if (counts[i] >= maxPer) break
          if (counts[j] >= maxPer) continue
          const dx = ix - directions[j * 3], dy = iy - directions[j * 3 + 1], dz = iz - directions[j * 3 + 2]
          if (dx * dx + dy * dy + dz * dz < thresholdSq) {
            pairs.push(i, j); counts[i]++; counts[j]++
          }
        }
      }
      return new Uint16Array(pairs)
    }

    function buildLineSegments(pairs: Uint16Array, directions: Float32Array, baseRadius: number, colorHex: number, baseOpacity: number) {
      const numLines = pairs.length / 2
      if (numLines === 0) {
        const emptyGeo = new THREE.BufferGeometry()
        emptyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3))
        return new THREE.LineSegments(emptyGeo, new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: baseOpacity }))
      }
      const positions = new Float32Array(numLines * 6)
      for (let k = 0; k < numLines; k++) {
        const i = pairs[k * 2], j = pairs[k * 2 + 1], off = k * 6
        positions[off] = directions[i * 3] * baseRadius
        positions[off + 1] = directions[i * 3 + 1] * baseRadius
        positions[off + 2] = directions[i * 3 + 2] * baseRadius
        positions[off + 3] = directions[j * 3] * baseRadius
        positions[off + 4] = directions[j * 3 + 1] * baseRadius
        positions[off + 5] = directions[j * 3 + 2] * baseRadius
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: baseOpacity, blending: THREE.AdditiveBlending, depthWrite: false })
      const lines = new THREE.LineSegments(geo, mat)
      lines.frustumCulled = false
      lines.userData = { pairs, directions, baseRadius, baseOpacity }
      return lines
    }

    function updateLinePositions(lines: THREE.LineSegments, currentRadius: number) {
      const { pairs, directions } = lines.userData
      const posAttr = lines.geometry.attributes.position as THREE.BufferAttribute
      const array = posAttr.array as Float32Array
      const numLines = pairs.length / 2
      for (let k = 0; k < numLines; k++) {
        const i = pairs[k * 2], j = pairs[k * 2 + 1], off = k * 6
        array[off] = directions[i * 3] * currentRadius
        array[off + 1] = directions[i * 3 + 1] * currentRadius
        array[off + 2] = directions[i * 3 + 2] * currentRadius
        array[off + 3] = directions[j * 3] * currentRadius
        array[off + 4] = directions[j * 3 + 1] * currentRadius
        array[off + 5] = directions[j * 3 + 2] * currentRadius
      }
      posAttr.needsUpdate = true
    }

    // Create objects
    const count = Math.max(100, Math.min(10000, particleCountRef.current))
    const baseSphereColor = normalizeHex(glowColorRef.current, 0x2763d1)
    const bgSphere = createBackgroundSphere()
    const sphere = createSphere(count, CONFIG.sphereRadius, 0.05)
    const pairs = computeNeighbors(sphere.directions, count, CONFIG.connectionDistance / CONFIG.sphereRadius, CONFIG.maxConnections)
    const lines = buildLineSegments(pairs, sphere.directions, CONFIG.sphereRadius, baseSphereColor, 0.15)
    scene.add(lines)
    // HUD Rings
    function createRing(radius: number, yScale: number, zScale: number, yOffset: number, color: number, opacity: number) {
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending })
      const segments = 80
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2
        pts.push(new THREE.Vector3(
          radius * Math.cos(theta),
          (yOffset || 0) + (yScale || 1) * radius * Math.sin(theta),
          (zScale || 1) * radius * Math.sin(theta)
        ))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(geo, mat)
      scene.add(line)
      return line
    }

    const ring1 = createRing(CONFIG.sphereRadius + 0.2, 0, 0.8, 0, baseSphereColor, 0.10)
    const ring2 = createRing(CONFIG.sphereRadius + 0.5, 0.3, 0.7, 0, baseSphereColor, 0.10)
    const ring3 = createRing(CONFIG.sphereRadius + 0.8, 0, 1, 0, baseSphereColor, 0.08)
    const ring4 = createRing(CONFIG.sphereRadius + 1.1, 0.3, 0.7, 0, baseSphereColor, 0.06)

    // Resize
    function onResize() {
      if (!container) return
      const w = container.clientWidth, h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer!.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // Live material color updates when settings change
    let lastGlow = glowColorRef.current
    let lastBg = bgColorRef.current
    function applyColors() {
      const g = normalizeHex(glowColorRef.current, 0x2763d1)
      const b = normalizeHex(bgColorRef.current, 0x1e4a8a)
      sphere.mat.color.setHex(g)
      ;(lines.material as THREE.LineBasicMaterial).color.setHex(g)
      ;(ring1.material as THREE.LineBasicMaterial).color.setHex(g)
      ;(ring2.material as THREE.LineBasicMaterial).color.setHex(g)
      ;(ring3.material as THREE.LineBasicMaterial).color.setHex(g)
      ;(ring4.material as THREE.LineBasicMaterial).color.setHex(g)
      ;(bgSphere.material as THREE.PointsMaterial).color.setHex(b)
    }
    applyColors()

    // Animation
    let animId: number
    function animate() {
      animId = requestAnimationFrame(animate)
      if (glowColorRef.current !== lastGlow || bgColorRef.current !== lastBg) {
        lastGlow = glowColorRef.current
        lastBg = bgColorRef.current
        applyColors()
      }
      const time = Date.now() * 0.001
      smoothAudioRef.current += (audioLevelRef.current - smoothAudioRef.current) * 0.10
      const sLvl = smoothAudioRef.current
      const intens = intensityRef.current
      const rotMult = rotationSpeedRef.current
      const pulseMult = pulseSpeedMultRef.current
      const audioBoost = 1 + sLvl * 2.0
      const scale = 1 + 0.06 * intens * Math.sin(time * CONFIG.pulseSpeed * pulseMult) + sLvl * 0.15
      const radius = CONFIG.sphereRadius * scale

      sphere.mesh.rotation.y += CONFIG.rotSpeed * 0.003 * rotMult * audioBoost * intens
      lines.rotation.y += CONFIG.rotSpeed * 0.003 * rotMult * audioBoost * intens

      // Update particle positions
      const pos = sphere.mesh.geometry.attributes.position as THREE.BufferAttribute
      const dir = sphere.directions
      const arr = pos.array as Float32Array
      for (let i = 0; i < pos.count; i++) {
        const i3 = i * 3
        arr[i3] = dir[i3] * radius
        arr[i3 + 1] = dir[i3 + 1] * radius
        arr[i3 + 2] = dir[i3 + 2] * radius
      }
      pos.needsUpdate = true

      updateLinePositions(lines, radius)
      lines.material.opacity = 0.08 + sLvl * 0.2 + 0.02 * Math.sin(time * 0.4 * pulseMult)
      sphere.mat.size = 0.05 * (1 + sLvl * 1.5)

      ring1.rotation.y += 0.003 * rotMult * audioBoost
      ring2.rotation.y += 0.0025 * rotMult * audioBoost
      ring2.rotation.x += 0.001 * rotMult * audioBoost
      ring3.rotation.y += 0.002 * rotMult * audioBoost
      ring4.rotation.y += 0.0015 * rotMult * audioBoost
      ring4.rotation.x += 0.0008 * rotMult * audioBoost

      bgSphere.rotation.y += 0.0002 * rotMult
      bgSphere.rotation.x += 0.0001 * rotMult

      camera.position.x = Math.sin(time * 0.1) * 0.08
      camera.position.y = 1.2 + Math.cos(time * 0.12) * 0.05
      camera.lookAt(0, 0, 0)

      renderer!.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer!.dispose()
      if (renderer!.domElement.parentElement) renderer!.domElement.parentElement.removeChild(renderer!.domElement)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Points || obj instanceof THREE.Line) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
    }
  }, [])

  if (hasError) {
    return (
      <div className="fixed inset-0 z-0" style={{
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(10,20,40,0.8) 0%, transparent 70%)',
      }} />
    )
  }

  return <div ref={containerRef} className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }} />
}

