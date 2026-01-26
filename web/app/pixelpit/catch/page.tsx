'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Press_Start_2P } from 'next/font/google'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin']
})

// Pixelpit color palette
const COLORS = {
  BACKGROUND: '#0f0f1a',      // Dark blue from design system
  PADDLE: '#FF1493',           // Dot's signature hot pink
  DOT: '#00FFFF',              // Electric cyan
  TEXT: '#FFD700',             // Gold for text
  GAME_OVER: '#8B5CF6'         // Chip's royal purple
}

interface Dot {
  x: number;
  y: number;
  radius: number;
  speed: number;
  color: string;
}

export default function CatchGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)

  // Game state with more character
  const gameStateRef = useRef({
    paddle: { x: 0, width: 120, height: 30 },
    dots: [] as Dot[],
    lastTime: 0,
    difficulty: 1
  })

  // Touch/mouse controls with smoother movement
  const handleTouch = (e: TouchEvent | MouseEvent) => {
    if (gameOver) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const touchX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
    const relativeX = touchX - rect.left

    const gameState = gameStateRef.current
    gameState.paddle.x = Math.max(
      0,
      Math.min(
        relativeX - gameState.paddle.width / 2,
        canvas.width - gameState.paddle.width
      )
    )
  }

  // More dynamic dot spawning
  const update = (delta: number) => {
    const gameState = gameStateRef.current

    // Increase difficulty over time
    gameState.difficulty += 0.001

    // Spawn dots with varied colors and speeds
    if (Math.random() < 0.02) {
      const dotColors = [
        COLORS.DOT,          // Electric cyan
        '#FF8C00',           // Pit's warm orange
        '#00AA66',           // Bug's fresh green
        COLORS.GAME_OVER     // Chip's royal purple
      ]

      gameState.dots.push({
        x: Math.random() * (canvasRef.current!.width - 20),
        y: 0,
        radius: 15,
        speed: 2 + Math.random() * gameState.difficulty,
        color: dotColors[Math.floor(Math.random() * dotColors.length)]
      })
    }

    // Dot movement and collision logic
    gameState.dots = gameState.dots.filter(dot => {
      dot.y += dot.speed

      // Paddle catch detection
      const paddleCatch =
        dot.y >= canvasRef.current!.height - 40 &&
        dot.x > gameState.paddle.x &&
        dot.x < gameState.paddle.x + gameState.paddle.width

      if (paddleCatch) {
        setScore(prev => prev + 1)
        return false
      }

      // Miss detection with lives
      if (dot.y > canvasRef.current!.height) {
        setLives(prev => {
          const newLives = prev - 1
          if (newLives <= 0) {
            setGameOver(true)
          }
          return newLives
        })
        return false
      }

      return true
    })
  }

  // Enhanced rendering with pixel art feel
  const render = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, COLORS.BACKGROUND)
    gradient.addColorStop(1, '#1a1a2e')  // Darker blue
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw paddle with rounded corners
    const gameState = gameStateRef.current
    ctx.fillStyle = COLORS.PADDLE
    ctx.beginPath()
    const cornerRadius = 10
    ctx.roundRect(
      gameState.paddle.x,
      canvas.height - gameState.paddle.height,
      gameState.paddle.width,
      gameState.paddle.height,
      [cornerRadius]
    )
    ctx.fill()

    // Draw dots with varied colors
    gameState.dots.forEach(dot => {
      ctx.fillStyle = dot.color
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
      ctx.fill()
    })

    // Score and lives with pixel font
    ctx.fillStyle = COLORS.TEXT
    ctx.font = '20px ' + pixelFont.style.fontFamily
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${score}  Lives: ${lives}`, 10, 40)

    // Game over text
    if (gameOver) {
      ctx.fillStyle = COLORS.GAME_OVER
      ctx.font = '40px ' + pixelFont.style.fontFamily
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2)
      ctx.font = '20px ' + pixelFont.style.fontFamily
      ctx.fillText('Tap to restart', canvas.width / 2, canvas.height / 2 + 50)
    }
  }

  // Game loop with effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Responsive canvas sizing
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight * 0.8

    // Reset game state
    gameStateRef.current.paddle.x = canvas.width / 2 - 60
    gameStateRef.current.dots = []
    gameStateRef.current.difficulty = 1
    setScore(0)
    setLives(3)
    setGameOver(false)

    let animationFrameId: number

    const gameLoop = (timestamp: number) => {
      if (!gameOver) {
        update((timestamp - gameStateRef.current.lastTime) || 0)
        render(ctx)
        gameStateRef.current.lastTime = timestamp
        animationFrameId = requestAnimationFrame(gameLoop)
      }
    }

    // Start game loop
    animationFrameId = requestAnimationFrame(gameLoop)

    // Event listeners
    canvas.addEventListener('touchmove', handleTouch as EventListener)
    canvas.addEventListener('mousemove', handleTouch as EventListener)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
      canvas.removeEventListener('touchmove', handleTouch as EventListener)
      canvas.removeEventListener('mousemove', handleTouch as EventListener)
    }
  }, [gameOver])

  // Restart game on game over
  const restartGame = () => {
    if (gameOver) {
      const canvas = canvasRef.current
      if (canvas) {
        const gameState = gameStateRef.current
        gameState.paddle.x = canvas.width / 2 - 60
        gameState.dots = []
        gameState.difficulty = 1
        setScore(0)
        setLives(3)
        setGameOver(false)
      }
    }
  }

  return (
    <div
      onClick={restartGame}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: COLORS.BACKGROUND,
        margin: 0,
        padding: 0
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          touchAction: 'none',
          maxWidth: '100%',
          borderRadius: '15px'  // Softens the game boundary
        }}
      />
    </div>
  )
}