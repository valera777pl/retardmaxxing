"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/game/engine";
import { LocalGameState } from "@/types";

interface Props {
  onStateUpdate: (state: Partial<LocalGameState>) => void;
  isPlaying: boolean;
  onKill?: () => void;
}

export function GameCanvas({ onStateUpdate, isPlaying, onKill }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize engine with onKill callback for instant transaction on enemy death
    engineRef.current = new GameEngine(canvasRef.current, onStateUpdate, onKill);

    return () => {
      engineRef.current?.stop();
    };
  }, [onStateUpdate, onKill]);

  useEffect(() => {
    if (isPlaying) {
      engineRef.current?.resume();
    } else {
      engineRef.current?.stop();
    }
  }, [isPlaying]);

  // Start game on first render when isPlaying is true
  useEffect(() => {
    if (isPlaying && engineRef.current) {
      engineRef.current.start();
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="border-2 border-purple-500 rounded-lg shadow-2xl shadow-purple-500/20"
    />
  );
}
