import React, { useRef, useEffect } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  reset: () => void;
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
  connectTo: (other: Particle, ctx: CanvasRenderingContext2D) => void;
}

const ParticlesAuth: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // Allow canvas to be null initially
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Early return if canvas is null

    const ctx = canvas.getContext("2d");
    if (!ctx) return; // Early return if ctx is null

    function resizeCanvas() {
      if (!canvas) return; // Double check canvas isn't null
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    class ParticleClass implements Particle {
      x!: number;
      y!: number;
      size!: number;
      speedX!: number;
      speedY!: number;
      opacity!: number;
      private canvas: HTMLCanvasElement;

      constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.reset();
      }

      reset() {
        if (!this.canvas) return; // Check for null
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 1;
        this.speedY = (Math.random() - 0.5) * 1;
        this.opacity = Math.random() * 0.5 + 0.3;
      }

      update() {
        if (!this.canvas) return; // Check for null
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > this.canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > this.canvas.height) this.speedY *= -1;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
      }

      connectTo(other: Particle, ctx: CanvasRenderingContext2D) {
        const dist = Math.hypot(this.x - other.x, this.y - other.y);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(other.x, other.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / 150) * 0.4})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    function initParticles(count: number) {
      particlesRef.current = [];
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(new ParticleClass(canvas!));
      }
    }

    function animate() {
      if (!ctx || !canvas) return; // Additional check here for ctx and canvas

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          particlesRef.current[i].connectTo(particlesRef.current[j], ctx);
        }
        particlesRef.current[i].update();
        particlesRef.current[i].draw(ctx);
      }

      requestAnimationFrame(animate);
    }

    initParticles(60);
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []); // Empty dependency array ensures this effect runs once

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "transparent",
        zIndex: 2,
        pointerEvents: "none",
      }}
    />
  );
};

export default ParticlesAuth;
