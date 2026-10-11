import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

const CONFIG = {
  particleCount: 1500,
  sphereRadius: 2.0,
  rotSpeed: 0.08,
  pulseSpeed: 0.8,
  starCount: 5000,
  starFieldRadius: 50,
  connectionDistance: 1.0,
  maxConnections: 4,
  // Fluid blob: how far the silhouette may distort from a perfect sphere
  blobAmp: 0.22,
  blobFreq: 0.7,
}

export type SphereStyle = 'classic' | 'fluid' | 'geodesic' | 'swarm'

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
  /** Visual style of the animated sphere */
  style?: SphereStyle
  /** Fluid style: gradient start color (one end of the blob) */
  fluidColorA?: string
  /** Fluid style: gradient end color (other end of the blob) */
  fluidColorB?: string
  /** Show the background starfield */
  showStarfield?: boolean
  /** Show the HUD rings */
  showRings?: boolean
}

function normalizeHex(hex: string, fallback: number): number {
  const c = hex?.replace('#', '')
  return /^([0-9a-f]{6})$/i.test(c) ? parseInt(c, 16) : fallback
}

/** Deterministic pseudo-random in [0,1) from an integer seed — stable blob shape */
function hash01(seed: number): number {
  let t = seed + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export default function SphereScene({
  audioLevel = 0,
  intensity = 1,
  particleCount = 1500,
  glowColor = '#2763d1',
  bgColor = '#1e4a8a',
  rotationSpeed = 1,
  pulseSpeedMult = 1,
  style = 'classic',
  fluidColorA = '#0a2540',
  fluidColorB = '#4a9eff',
  showStarfield = true,
  showRings = true,
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
  const styleRef = useRef<SphereStyle>(style)
  const fluidColorARef = useRef(fluidColorA)
  const fluidColorBRef = useRef(fluidColorB)
  const showStarfieldRef = useRef(showStarfield)
  const showRingsRef = useRef(showRings)
  useEffect(() => { intensityRef.current = intensity }, [intensity])
  useEffect(() => { particleCountRef.current = particleCount }, [particleCount])
  useEffect(() => { glowColorRef.current = glowColor }, [glowColor])
  useEffect(() => { bgColorRef.current = bgColor }, [bgColor])
  useEffect(() => { rotationSpeedRef.current = rotationSpeed }, [rotationSpeed])
  useEffect(() => { pulseSpeedMultRef.current = pulseSpeedMult }, [pulseSpeedMult])
  useEffect(() => { styleRef.current = style }, [style])
  useEffect(() => { fluidColorARef.current = fluidColorA }, [fluidColorA])
  useEffect(() => { fluidColorBRef.current = fluidColorB }, [fluidColorB])
  useEffect(() => { showStarfieldRef.current = showStarfield }, [showStarfield])
  useEffect(() => { showRingsRef.current = showRings }, [showRings])

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

    // ── Background starfield (toggleable) ──
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
      mesh.visible = showStarfieldRef.current
      scene.add(mesh)
      return mesh
    }

    // ── Shared sphere particle build (used by classic + geodesic) ──
    function createSphere(count: number, radius: number, size: number, mc: number) {
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
      // Per-point color attribute so Fluid gets its warm gradient
      const colors = new Float32Array(count * 3)
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      const mat = new THREE.PointsMaterial({
        color: mc, size, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
        vertexColors: true,
      })
      // When vertexColors is on, color attribute multiplies `mat.color`.
      // Classic/Geodesic keep uniform white in the attribute so `mc` shows as-is;
      // Fluid overwrites the attribute with a gradient and uses white base.
      for (let i = 0; i < count; i++) { colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1 }
      const mesh = new THREE.Points(geo, mat)
      scene.add(mesh)
      return { mesh, geo, mat, directions, colors }
    }

    // ── Fluid blob: surface distortion field (stable, deterministic) ──
    // Displaces each direction by a sum of a few low-frequency spherical harmonics-ish
    // waves, giving the organic irregular silhouette from the reference video.
    function blobRadius(dir: Float32Array, i3: number, time: number, seedPhase: number): number {
      const x = dir[i3], y = dir[i3 + 1], z = dir[i3 + 2]
      let d = 0
      d += Math.sin(x * CONFIG.blobFreq * 2.1 + time * 0.35 + seedPhase) * 0.5
      d += Math.sin((y + x) * CONFIG.blobFreq * 1.7 - time * 0.28 + seedPhase * 1.3) * 0.3
      d += Math.sin((z - y) * CONFIG.blobFreq * 2.4 + time * 0.22 + seedPhase * 0.7) * 0.2
      return 1 + CONFIG.blobAmp * d
    }

    // ── Neighbors for wireframe connections (classic + geodesic) ──
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

    function updateLinePositions(lines: THREE.LineSegments, radiusFn: (dir: Float32Array, i3: number) => number) {
      const { pairs, directions } = lines.userData
      const posAttr = lines.geometry.attributes.position as THREE.BufferAttribute
      const array = posAttr.array as Float32Array
      const numLines = pairs.length / 2
      for (let k = 0; k < numLines; k++) {
        const i = pairs[k * 2], j = pairs[k * 2 + 1], off = k * 6
        const ri = radiusFn(directions, i * 3)
        const rj = radiusFn(directions, j * 3)
        array[off] = directions[i * 3] * ri
        array[off + 1] = directions[i * 3 + 1] * ri
        array[off + 2] = directions[i * 3 + 2] * ri
        array[off + 3] = directions[j * 3] * rj
        array[off + 4] = directions[j * 3 + 1] * rj
        array[off + 5] = directions[j * 3 + 2] * rj
      }
      posAttr.needsUpdate = true
    }

    // ── Fluid gradient fill ──
    // Interpolates each vertex between colorA and colorB based on its position,
    // giving the two-color gradient look from the reference video.
    function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
      const c = hex?.replace('#', '')
      if (!/^([0-9a-f]{6})$/i.test(c)) return fallback
      return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255]
    }
    function applyFluidGradient() {
      if (styleRef.current !== 'fluid') return
      const a = hexToRgb(fluidColorARef.current, [0.04, 0.15, 0.25])
      const b = hexToRgb(fluidColorBRef.current, [0.29, 0.62, 1.0])
      const colors = sphere.colors
      const dir = sphere.directions
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        // Gradient axis: 0 at colorA, 1 at colorB — darker on one side, lighter on the other
        const t = (dir[i3] + dir[i3 + 1] + dir[i3 + 2]) / 3 // -1..1 across the blob
        const k = (t + 1) / 2 // 0..1
        colors[i3] = a[0] + (b[0] - a[0]) * k
        colors[i3 + 1] = a[1] + (b[1] - a[1]) * k
        colors[i3 + 2] = a[2] + (b[2] - a[2]) * k
      }
      ;(sphere.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true
    }

    // ── Create objects ──
    const requested = styleRef.current
    const count = Math.max(100, Math.min(10000, particleCountRef.current))
    const baseSphereColor = normalizeHex(glowColorRef.current, 0x2763d1)
    const bgSphere = createBackgroundSphere()

    const sphere = createSphere(count, CONFIG.sphereRadius, 0.05, requested === 'fluid' ? 0xffffff : baseSphereColor)
    // Fluid uses a gradient attribute instead of a uniform color
    if (requested === 'fluid') applyFluidGradient()

    const pairs = requested === 'fluid' || requested === 'swarm'
      ? new Uint16Array(0)
      : computeNeighbors(sphere.directions, count, CONFIG.connectionDistance / CONFIG.sphereRadius, CONFIG.maxConnections)
    // Geodesic uses stronger, denser lines; classic keeps the existing look
    const lineOpacity = requested === 'geodesic' ? 0.35 : 0.15
    const lines = buildLineSegments(pairs, sphere.directions, CONFIG.sphereRadius, baseSphereColor, lineOpacity)
    scene.add(lines)

    // ── Rings (toggleable, classic + geodesic only) ──
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
    const rings = [ring1, ring2, ring3, ring4]

    // ── Swarm: second population orbiting on elliptical paths ──
    const swarmCount = 240
    const swarmSeeds: { a: number; b: number; r: number; speed: number; phase: number; tilt: number }[] = []
    for (let i = 0; i < swarmCount; i++) {
      swarmSeeds.push({
        a: hash01(i * 7 + 1) * Math.PI,          // orbital inclination
        b: hash01(i * 13 + 5) * Math.PI * 2,     // node angle
        r: 2.4 + hash01(i * 29 + 11) * 2.2,      // orbit radius
        speed: 0.05 + hash01(i * 31 + 3) * 0.18, // angular speed
        phase: hash01(i * 17 + 9) * Math.PI * 2,
        tilt: hash01(i * 23 + 2) * 0.6 - 0.3,
      })
    }
    const swarmGeo = new THREE.BufferGeometry()
    swarmGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(swarmCount * 3), 3))
    swarmGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(swarmCount * 3), 3))
    const swarmMat = new THREE.PointsMaterial({
      size: 0.07, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, vertexColors: true,
    })
    const swarm = new THREE.Points(swarmGeo, swarmMat)
    swarm.visible = requested === 'swarm'
    scene.add(swarm)

    // ── Resize ──
    function onResize() {
      if (!container) return
      const w = container.clientWidth, h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer!.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ── Style switching at runtime ──
    let lastStyle = styleRef.current
    function applyStyle(s: SphereStyle) {
      lastStyle = s
      const hasLines = s === 'classic' || s === 'geodesic'
      const hasRings = showRingsRef.current && (s === 'classic' || s === 'geodesic')
      const hasSwarm = s === 'swarm'
      lines.visible = hasLines && pairs.length > 0
      rings.forEach(r => { r.visible = hasRings })
      swarm.visible = hasSwarm
      sphere.mesh.visible = s !== 'swarm' // swarm shows comets + core particles
      if (s === 'geodesic') {
        sphere.mat.size = 0.035
      } else if (s === 'fluid') {
        sphere.mat.size = 0.038 // dense small dots like the reference
      } else {
        sphere.mat.size = 0.05
      }
      // Color behavior: fluid's gradient is baked in vertex colors; white base color
      // must not tint it, so pin base color white and ignore user color there.
      const g = s === 'fluid' ? 0xffffff : normalizeHex(glowColorRef.current, 0x2763d1)
      sphere.mat.color.setHex(s === 'fluid' ? 0xffffff : g)
      ;(lines.material as THREE.LineBasicMaterial).color.setHex(g)
      rings.forEach(r => (r.material as THREE.LineBasicMaterial).color.setHex(g))
    }

    // ── Live material color updates when settings change ──
    let lastGlow = glowColorRef.current
    let lastBg = bgColorRef.current
    let lastFluidA = fluidColorARef.current
    let lastFluidB = fluidColorBRef.current
    function applyColors() {
      const g = normalizeHex(glowColorRef.current, 0x2763d1)
      const b = normalizeHex(bgColorRef.current, 0x1e4a8a)
      if (lastStyle !== 'fluid') sphere.mat.color.setHex(g)
      ;(lines.material as THREE.LineBasicMaterial).color.setHex(g)
      rings.forEach(r => (r.material as THREE.LineBasicMaterial).color.setHex(g))
      ;(bgSphere.material as THREE.PointsMaterial).color.setHex(b)
      ;(swarmMat as THREE.PointsMaterial).color.setHex(0xffffff) // swarm tint stays gradient-driven
      if (lastStyle === 'fluid') applyFluidGradient() // re-tint if gradient colors changed
    }
    applyColors()
    applyStyle(lastStyle)

    // ── Animation ──
    let animId: number
    function animate() {
      animId = requestAnimationFrame(animate)
      // Live refs
      if (glowColorRef.current !== lastGlow || bgColorRef.current !== lastBg || fluidColorARef.current !== lastFluidA || fluidColorBRef.current !== lastFluidB) {
        lastGlow = glowColorRef.current
        lastBg = bgColorRef.current
        lastFluidA = fluidColorARef.current
        lastFluidB = fluidColorBRef.current
        applyColors()
      }
      if (styleRef.current !== lastStyle) { applyStyle(styleRef.current); if (styleRef.current === 'fluid') applyFluidGradient() }
      bgSphere.visible = showStarfieldRef.current
      const wantRings = showRingsRef.current && (lastStyle === 'classic' || lastStyle === 'geodesic')
      rings.forEach(r => { r.visible = wantRings })

      const time = Date.now() * 0.001
      smoothAudioRef.current += (audioLevelRef.current - smoothAudioRef.current) * 0.10
      const sLvl = smoothAudioRef.current
      const intens = intensityRef.current
      const rotMult = rotationSpeedRef.current
      const pulseMult = pulseSpeedMultRef.current
      const audioBoost = 1 + sLvl * 2.0
      const pulsePhase = time * CONFIG.pulseSpeed * pulseMult
      const scale = 1 + 0.06 * intens * Math.sin(pulsePhase) + sLvl * 0.15
      const baseRadius = CONFIG.sphereRadius * scale

      const isFluid = lastStyle === 'fluid'
      const isSwarm = lastStyle === 'swarm'

      // Rotation
      const rotStep = CONFIG.rotSpeed * 0.003 * rotMult * audioBoost * intens
      if (!isSwarm) sphere.mesh.rotation.y += rotStep
      lines.rotation.y += rotStep

      // Particle positions
      const pos = sphere.mesh.geometry.attributes.position as THREE.BufferAttribute
      const dir = sphere.directions
      const arr = pos.array as Float32Array
      const n = pos.count
      if (isFluid) {
        for (let i = 0; i < n; i++) {
          const i3 = i * 3
          const r = CONFIG.sphereRadius * blobRadius(dir, i3, time, 0) * scale
          arr[i3] = dir[i3] * r
          arr[i3 + 1] = dir[i3 + 1] * r
          arr[i3 + 2] = dir[i3 + 2] * r
        }
      } else {
        for (let i = 0; i < n; i++) {
          const i3 = i * 3
          arr[i3] = dir[i3] * baseRadius
          arr[i3 + 1] = dir[i3 + 1] * baseRadius
          arr[i3 + 2] = dir[i3 + 2] * baseRadius
        }
      }
      pos.needsUpdate = true

      // Line opacities and endpoints
      const radiusFn = isFluid
        ? (d: Float32Array, i3: number) => CONFIG.sphereRadius * blobRadius(d, i3, time, 0) * scale
        : () => baseRadius
      if (lines.visible) updateLinePositions(lines, radiusFn)
      ;(lines.material as THREE.LineBasicMaterial).opacity = lines.userData.baseOpacity * (0.5 + 0.5 * Math.min(1, 0.35 + sLvl)) + 0.02 * Math.sin(time * 0.4 * pulseMult)

      if (isFluid) {
        // Breathing size pulse + audio swell for the blob dots
        sphere.mat.size = 0.038 * (1 + 0.25 * Math.sin(pulsePhase) + sLvl * 1.5)
      } else {
        sphere.mat.size = 0.05 * (1 + sLvl * 1.5)
      }

      // Swarm comets
      if (isSwarm) {
        const sp = swarm.geometry.attributes.position as THREE.BufferAttribute
        const sc = swarm.geometry.attributes.color as THREE.BufferAttribute
        const spa = sp.array as Float32Array
        const sca = sc.array as Float32Array
        for (let i = 0; i < swarmCount; i++) {
          const s = swarmSeeds[i]
          const ang = s.phase + time * s.speed * (0.5 + rotMult * 0.5)
          const wobble = Math.sin(time * 1.3 + s.phase * 3) * 0.15
          const r = s.r + wobble
          // tilted orbital plane
          const cx = Math.cos(ang) * r
          const cz = Math.sin(ang) * r
          const cy = Math.sin(ang * 2 + s.a) * r * 0.25 * (1 + s.tilt)
          // rotate around Y by node angle b
          const x = cx * Math.cos(s.b) - cz * Math.sin(s.b)
          const z = cx * Math.sin(s.b) + cz * Math.cos(s.b)
          spa[i * 3] = x; spa[i * 3 + 1] = cy; spa[i * 3 + 2] = z
          // warm gradient like fluid
          const up = (cy / (2.5) + 1) / 2
          sca[i * 3] = up; sca[i * 3 + 1] = 0.15 + up * 0.42; sca[i * 3 + 2] = 0.10 + up * 0.24
        }
        sp.needsUpdate = true
        sc.needsUpdate = true
        swarmMat.size = 0.07 * (1 + sLvl * 1.2)
      }

      // Rings spin
      if (wantRings) {
        ring1.rotation.y += 0.003 * rotMult * audioBoost
        ring2.rotation.y += 0.0025 * rotMult * audioBoost
        ring2.rotation.x += 0.001 * rotMult * audioBoost
        ring3.rotation.y += 0.002 * rotMult * audioBoost
        ring4.rotation.y += 0.0015 * rotMult * audioBoost
        ring4.rotation.x += 0.0008 * rotMult * audioBoost
      }

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
