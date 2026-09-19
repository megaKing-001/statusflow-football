'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

type MatchEvent = {
  minute: number
  type: 'goal' | 'chance' | 'yellow_card' | 'half_time' | 'full_time'
  team?: 'home' | 'away'
  outcome?: 'saved' | 'missed'
}

type Props = {
  fixtureId: string
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  events: MatchEvent[]
}

const OUTFIELD_CLIPS: Record<string, string> = {
  idle: '/models/xbot/X Bot@Soccer Idle.fbx',
  jog: '/models/xbot/X Bot@Jog Forward.fbx',
  kick: '/models/xbot/X Bot@Kick Soccerball.fbx',
  celebrate: '/models/xbot/X Bot@Soccer Spin.fbx',
  pass: '/models/xbot/X Bot@Soccer Pass.fbx',
  tackle: '/models/xbot/X Bot@Soccer Tackle.fbx',
}

const KEEPER_CLIPS: Record<string, string> = {
  idle: '/models/xbot/X Bot@Goalkeeper Idle.fbx',
  save: '/models/xbot/X Bot@Goalkeeper Diving Save.fbx',
  saveOther: '/models/xbot/X Bot@Goalkeeper Diving Save (1).fbx',
}

// Removes baked-in forward/sideways movement from a clip's root (hip) bone,
// so the animation plays in place instead of dragging the character across
// the pitch. Keeps vertical (bob/crouch) motion intact.
function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  const cloned = clip.clone()
  for (const track of cloned.tracks) {
    if (track.name.toLowerCase().includes('hips') && track instanceof THREE.VectorKeyframeTrack) {
      const values = track.values
      const firstX = values[0]
      const firstZ = values[2]
      for (let i = 0; i < values.length; i += 3) {
        values[i] = firstX // x
        values[i + 2] = firstZ // z
        // leave values[i+1] (y) untouched so vertical motion still plays
      }
    }
  }
  return cloned
}

// Gives a cloned character its own material instances (so recoloring one
// character doesn'''t affect the other, since SkeletonUtils.clone shares
// materials by reference) and applies a simple two-tone team color.
function tintCharacter(model: THREE.Object3D, mainColor: number, accentColor: number) {
  model.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const cloned = mats.map((m) => (m as THREE.Material).clone())
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0]
    for (const m of cloned) {
      const std = m as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial
      if (!('color' in std)) continue
      if (m.name.includes('Joints')) {
        std.color.setHex(accentColor)
      } else {
        std.color.setHex(mainColor)
      }
    }
  })
}

function outfieldClipForEvent(e: MatchEvent): keyof typeof OUTFIELD_CLIPS {
  switch (e.type) {
    case 'goal':
    case 'chance':
      return 'kick'
    case 'yellow_card':
      return 'tackle'
    case 'half_time':
    case 'full_time':
      return 'idle'
    default:
      return 'jog'
  }
}

function ballMovesForEvent(e: MatchEvent): boolean {
  return e.type === 'goal' || e.type === 'chance'
}

function ballTargetForEvent(e: MatchEvent, diveLeft: boolean): THREE.Vector3 {
  if (e.type === 'goal') return new THREE.Vector3(0, 0.12, -7.5)
  if (e.outcome === 'saved') return new THREE.Vector3(diveLeft ? -0.9 : 0.9, 0.12, -6.5)
  return new THREE.Vector3(2.8, 0.12, -4)
}

function eventLabel(e: MatchEvent, homeName: string, awayName: string) {
  const teamName = e.team === 'home' ? homeName : e.team === 'away' ? awayName : ''
  switch (e.type) {
    case 'goal':
      return `⚽ Goal — ${teamName}`
    case 'chance':
      return `${teamName} chance (${e.outcome === 'saved' ? 'saved' : 'missed'})`
    case 'yellow_card':
      return `🟨 Yellow card — ${teamName}`
    case 'half_time':
      return 'Half-time'
    case 'full_time':
      return 'Full-time'
    default:
      return e.type
  }
}

class Character {
  mixer: THREE.AnimationMixer | null = null
  clips: Record<string, THREE.AnimationClip> = {}
  currentAction: THREE.AnimationAction | null = null

  play(key: string) {
    const clip = this.clips[key]
    if (!this.mixer || !clip) return
    const next = this.mixer.clipAction(clip)
    next.reset()
    if (this.currentAction && this.currentAction !== next) {
      next.crossFadeFrom(this.currentAction, 0.3, false)
    }
    next.play()
    this.currentAction = next
  }

  update(delta: number) {
    this.mixer?.update(delta)
  }
}

export function MatchViewer3D({ homeName, awayName, homeScore, awayScore, events }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Initializing...')
  const [eventText, setEventText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  async function goFullscreenLandscape() {
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen()
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>
      }
      if (orientation?.lock) {
        await orientation.lock('landscape')
      }
      setIsFullscreen(true)
    } catch (err) {
      console.error('Fullscreen/landscape request failed:', err)
      // Not fatal - viewer still works in portrait, just not locked
    }
  }

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let cancelled = false
    let frameId: number

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b3d1f)

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    camera.position.set(0, 6, 11)
    camera.lookAt(0, 1, -3.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    function handleResize() {
      const width = mount.clientWidth
      const height = mount.clientHeight
      if (width === 0 || height === 0) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    // Fullscreen/orientation-lock transitions don't always fire a resize
    // event immediately - check again shortly after in case dimensions
    // settle a moment later
    const resizeSettleTimeout = setTimeout(handleResize, 300)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x223322, 1.2))
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5)
    sunLight.position.set(5, 10, 7)
    scene.add(sunLight)

    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 24),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
    )
    pitch.rotation.x = -Math.PI / 2
    pitch.position.z = -4
    scene.add(pitch)

    const BALL_REST = new THREE.Vector3(0.4, 0.12, 0.3)
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    )
    ball.position.copy(BALL_REST)
    scene.add(ball)

    const clock = new THREE.Clock()
    let ballAnim: { start: THREE.Vector3; end: THREE.Vector3; startTime: number; duration: number } | null = null
    function kickBallTo(target: THREE.Vector3, duration = 0.7) {
      ballAnim = { start: ball.position.clone(), end: target.clone(), startTime: clock.getElapsedTime(), duration }
    }

    const outfielder = new Character()
    const keeper = new Character()

    function animate() {
      frameId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      outfielder.update(delta)
      keeper.update(delta)

      if (ballAnim) {
        const t = Math.min((clock.getElapsedTime() - ballAnim.startTime) / ballAnim.duration, 1)
        ball.position.lerpVectors(ballAnim.start, ballAnim.end, t)
        ball.position.y = BALL_REST.y + Math.sin(t * Math.PI) * 0.6
        if (t >= 1) ballAnim = null
      }

      renderer.render(scene, camera)
    }
    animate()

    async function setup() {
      setStatus('Loading base mesh...')
      const loader = new FBXLoader()
      const baseModel = await loader.loadAsync(encodeURI('/models/xbot/X Bot@Soccer Idle (1).fbx'))
      if (cancelled) return

      baseModel.scale.setScalar(0.02)
      const box = new THREE.Box3().setFromObject(baseModel)
      const center = box.getCenter(new THREE.Vector3())
      baseModel.position.x -= center.x
      baseModel.position.z -= center.z

      const outfieldModel = cloneSkeleton(baseModel)
      outfieldModel.position.set(0, 0, 0)
      outfieldModel.rotation.y = Math.PI
      tintCharacter(outfieldModel, 0x1e3a8a, 0xffffff) // navy shirt, white shorts/trim
      scene.add(outfieldModel)
      outfielder.mixer = new THREE.AnimationMixer(outfieldModel)

      const keeperModel = cloneSkeleton(baseModel)
      keeperModel.position.set(0, 0, -7)
      tintCharacter(keeperModel, 0xeab308, 0x1a1a1a) // goalkeeper yellow, dark trim
      scene.add(keeperModel)
      keeper.mixer = new THREE.AnimationMixer(keeperModel)

      const materialNames: string[] = []
      outfieldModel.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const m of mats) {
            materialNames.push((m as THREE.Material).name || '(unnamed)')
          }
        }
      })
      console.log('MATERIALS FOUND:', materialNames)
      setStatus('Materials: ' + materialNames.join(', ') + ' | Loading animation clips...')
      for (const [key, url] of Object.entries(OUTFIELD_CLIPS)) {
        const result = await loader.loadAsync(encodeURI(url))
        if (result.animations.length > 0) {
          outfielder.clips[key] = stripRootMotion(result.animations[0])
        }
      }
      for (const [key, url] of Object.entries(KEEPER_CLIPS)) {
        const result = await loader.loadAsync(encodeURI(url))
        if (result.animations.length > 0) {
          keeper.clips[key] = stripRootMotion(result.animations[0])
        }
      }
      if (cancelled) return

      setStatus('Ready.')
      outfielder.play('idle')
      keeper.play('idle')

      const sorted = [...events].sort((a, b) => a.minute - b.minute)
      let diveLeft = true
      for (const e of sorted) {
        if (cancelled) return
        setEventText(`${e.minute}' — ${eventLabel(e, homeName, awayName)}`)
        outfielder.play(outfieldClipForEvent(e))

        if (e.type === 'chance' && e.outcome === 'saved') {
          keeper.play(diveLeft ? 'save' : 'saveOther')
          diveLeft = !diveLeft
        }

        if (ballMovesForEvent(e)) {
          kickBallTo(ballTargetForEvent(e, diveLeft), 0.7)
        }
        await new Promise((resolve) => setTimeout(resolve, 1200))
        if (cancelled) return

        if (e.type === 'goal') {
          outfielder.play('celebrate')
          await new Promise((resolve) => setTimeout(resolve, 1400))
          if (cancelled) return
        }

        if (ballMovesForEvent(e)) {
          kickBallTo(BALL_REST, 0.7)
        }
        outfielder.play('jog')
        keeper.play('idle')
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      if (!cancelled) {
        setEventText('Match complete.')
        outfielder.play('idle')
        keeper.play('idle')
      }
    }

    setup().catch((err) => {
      setStatus(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      clearTimeout(resizeSettleTimeout)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [events, homeName, awayName])

  const isLoading = status !== 'Ready.' && !status.startsWith('ERROR')
  const isFinished = eventText === 'Match complete.'

  return (
    <main ref={containerRef} className="fixed inset-0 z-50 flex flex-col h-dvh w-screen bg-night">
      {!isFullscreen && (
        <button
          onClick={goFullscreenLandscape}
          className="absolute top-16 right-3 z-10 bg-black/70 text-chalk text-xs
                     px-3 py-2 rounded-full backdrop-blur-sm"
        >
          Watch Fullscreen
        </button>
      )}
      <div className="flex items-center justify-between p-3 bg-surface">
        <span className="text-sm text-chalk">{homeName}</span>
        <span className="font-display text-2xl text-chalk px-3">
          {homeScore} – {awayScore}
        </span>
        <span className="text-sm text-chalk">{awayName}</span>
      </div>

      {isLoading && (
        <div className="p-2 text-xs text-amber-300 bg-black break-words">{status}</div>
      )}
      {status.startsWith('ERROR') && (
        <div className="p-2 text-xs text-red-400 bg-black break-words">{status}</div>
      )}

      <div className="relative flex-1 w-full">
        <div ref={mountRef} className="absolute inset-0" />
        {eventText && (
          <div
            key={eventText}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2
                       bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 animate-in fade-in
                       slide-in-from-bottom-2 duration-300 pointer-events-none"
          >
            {!isFinished && (
              <span className="h-2 w-2 rounded-full bg-alert animate-pulse shrink-0" />
            )}
            <span className="text-sm text-chalk whitespace-nowrap">
              {isFinished ? 'FULL-TIME' : eventText}
            </span>
          </div>
        )}
      </div>
    </main>
  )
}
