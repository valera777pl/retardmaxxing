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

  // Use refs for callbacks to avoid recreating engine when they change
  const onStateUpdateRef = useRef(onStateUpdate);
  const onKillRef = useRef(onKill);

  // Keep refs in sync
  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate;
  }, [onStateUpdate]);

  useEffect(() => {
    onKillRef.current = onKill;
  }, [onKill]);

  // Create engine ONCE on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize engine with wrapper callbacks that use refs
    engineRef.current = new GameEngine(
      canvasRef.current,
      (state) => onStateUpdateRef.current(state),
      () => onKillRef.current?.()
    );

    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []); // Empty deps - only run on mount!

  // Handle play/pause
  useEffect(() => {
    if (!engineRef.current) return;

    if (isPlaying) {
      engineRef.current.start();
    } else {
      engineRef.current.stop();
    }
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="border-2 border-purple-500 rounded-lg shadow-2xl shadow-purple-500/20"
    />
  );
}
