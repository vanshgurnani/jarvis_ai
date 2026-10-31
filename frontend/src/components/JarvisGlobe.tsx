import React, { useEffect, useRef } from "react";

export type JarvisState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface JarvisGlobeProps {
  state: JarvisState;
  audioLevel?: number; // 0.0 to 1.0
  onClick?: () => void;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
}

export const JarvisGlobe: React.FC<JarvisGlobeProps> = ({
  state,
  audioLevel = 0,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointsRef = useRef<Point3D[]>([]);
  const animFrameRef = useRef<number>(0);
  const angleRef = useRef<{ rotX: number; rotY: number; rotZ: number }>({
    rotX: 0.2,
    rotY: 0,
    rotZ: 0,
  });

  // Initialize sphere points
  useEffect(() => {
    const pts: Point3D[] = [];
    const count = 380;
    const radius = 110;

    for (let i = 0; i < count; i++) {
      // Golden spiral distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      pts.push({ x, y, z, baseX: x, baseY: y, baseZ: z });
    }
    pointsRef.current = pts;
  }, []);

  // Main rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.016;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Rotation speeds depending on state
      let speedY = 0.007;
      let speedX = 0.002;
      let pulseMod = Math.sin(time * 3) * 0.05;

      if (state === "thinking") {
        speedY = 0.035;
        speedX = 0.012;
        pulseMod = Math.sin(time * 12) * 0.12;
      } else if (state === "listening") {
        speedY = 0.012;
        pulseMod = audioLevel * 0.35 + Math.sin(time * 6) * 0.08;
      } else if (state === "speaking") {
        speedY = 0.016;
        pulseMod = audioLevel * 0.4 + Math.sin(time * 8) * 0.1;
      } else if (state === "error") {
        speedY = 0.003;
        pulseMod = Math.sin(time * 4) * 0.03;
      }

      angleRef.current.rotY += speedY + mouseRef.current.x * 0.0008;
      angleRef.current.rotX += speedX + mouseRef.current.y * 0.0005;

      const cosY = Math.cos(angleRef.current.rotY);
      const sinY = Math.sin(angleRef.current.rotY);
      const cosX = Math.cos(angleRef.current.rotX);
      const sinX = Math.sin(angleRef.current.rotX);

      // Color palette based on state
      let coreColor = "rgba(6, 182, 212, ";
      let ringColor = "rgba(34, 211, 238, ";
      let pointColor = "rgba(103, 232, 249, ";

      if (state === "listening") {
        coreColor = "rgba(56, 189, 248, ";
        ringColor = "rgba(14, 165, 233, ";
        pointColor = "rgba(255, 255, 255, ";
      } else if (state === "thinking") {
        coreColor = "rgba(168, 85, 247, ";
        ringColor = "rgba(192, 132, 252, ";
        pointColor = "rgba(216, 180, 254, ";
      } else if (state === "speaking") {
        coreColor = "rgba(34, 211, 238, ";
        ringColor = "rgba(45, 212, 191, ";
        pointColor = "rgba(204, 251, 241, ";
      } else if (state === "error") {
        coreColor = "rgba(244, 63, 94, ";
        ringColor = "rgba(251, 113, 133, ";
        pointColor = "rgba(254, 205, 211, ";
      }

      // 1. Draw glowing background aura
      const coreRadius = Math.max(30, 65 * (1 + pulseMod));
      const auraGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, coreRadius * 2.5);
      auraGrad.addColorStop(0, `${coreColor}0.4)`);
      auraGrad.addColorStop(0.3, `${coreColor}0.15)`);
      auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Arc Reactor Inner Core
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreRadius);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGrad.addColorStop(0.3, `${coreColor}0.85)`);
      coreGrad.addColorStop(0.7, `${coreColor}0.3)`);
      coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // 3. Draw Concentric Holographic HUD Rings
      ctx.save();
      ctx.translate(cx, cy);

      // Ring A: Horizontal Equator Ring
      ctx.beginPath();
      ctx.ellipse(0, 0, 150 * (1 + pulseMod * 0.5), 35 * (1 + pulseMod * 0.5), angleRef.current.rotX, 0, Math.PI * 2);
      ctx.strokeStyle = `${ringColor}0.45)`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.stroke();

      // Ring B: Tilted Orbital Ring
      ctx.beginPath();
      ctx.ellipse(0, 0, 165 * (1 + pulseMod * 0.8), 50 * (1 + pulseMod * 0.8), -angleRef.current.rotY * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `${ringColor}0.35)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([12, 10]);
      ctx.stroke();

      // Ring C: Fast Segmented Reactor Ring
      ctx.beginPath();
      ctx.arc(0, 0, 135 * (1 + pulseMod * 0.3), time * 1.5, time * 1.5 + Math.PI * 1.2);
      ctx.strokeStyle = `${ringColor}0.7)`;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.stroke();

      // Ring D: Counter-Rotating Arc
      ctx.beginPath();
      ctx.arc(0, 0, 142 * (1 + pulseMod * 0.4), -time * 2.2, -time * 2.2 + Math.PI * 0.7);
      ctx.strokeStyle = `${ringColor}0.5)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ring E: Sound Wave Frequency Ring (Reacts to audioLevel)
      if (audioLevel > 0.05 || state === "speaking" || state === "listening") {
        ctx.beginPath();
        const waveRadius = 175 + pulseMod * 80;
        ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `${ringColor}${Math.min(0.9, pulseMod * 2)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
      }

      ctx.restore();

      // 4. Project and Draw 3D Sphere Points
      const fov = 350;
      const pts = pointsRef.current;
      const projected: { x: number; y: number; z: number; scale: number; alpha: number }[] = [];

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        // Expansion distortion based on pulse / audio
        const rScale = 1 + pulseMod * 0.8;
        const bx = p.baseX * rScale;
        const by = p.baseY * rScale;
        const bz = p.baseZ * rScale;

        // Y-axis rotation
        const x1 = bx * cosY - bz * sinY;
        const z1 = bz * cosY + bx * sinY;

        // X-axis rotation
        const y2 = by * cosX - z1 * sinX;
        const z2 = z1 * cosX + by * sinX;

        // Perspective projection
        const scale = fov / (fov + z2 + 180);
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;
        const alpha = Math.max(0.1, Math.min(1.0, (z2 + 130) / 250));

        projected.push({ x: px, y: py, z: z2, scale, alpha });
      }

      // Sort by depth for correct 3D occluding
      projected.sort((a, b) => a.z - b.z);

      // Draw mesh connections between closest points
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i += 3) {
        const p1 = projected[i];
        if (p1.z < -40) continue; // Skip far back points to prevent clutter

        for (let j = i + 1; j < Math.min(i + 8, projected.length); j++) {
          const p2 = projected[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 32 * p1.scale) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${coreColor}${p1.alpha * 0.25})`;
            ctx.stroke();
          }
        }
      }

      // Draw Points
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const dotRadius = Math.max(1, 2.2 * p.scale);

        ctx.beginPath();
        ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${pointColor}${p.alpha})`;
        ctx.fill();

        // Extra flare on frontmost points
        if (p.z > 80 && Math.random() > 0.96) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotRadius * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `${pointColor}0.6)`;
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      mouseRef.current = { x, y };
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [state, audioLevel]);

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none group"
      title="Click to interact with JARVIS Core"
    >
      <canvas
        ref={canvasRef}
        width={460}
        height={460}
        className="w-[360px] h-[360px] sm:w-[420px] sm:h-[420px] max-w-full aspect-square transition-transform duration-300 group-hover:scale-105"
      />
      {/* Centered touch/click prompt overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[10px] uppercase font-mono tracking-widest text-cyan-300 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.5)]">
          {state === "listening" ? "Listening..." : "Tap to Engage"}
        </div>
      </div>
    </div>
  );
};

