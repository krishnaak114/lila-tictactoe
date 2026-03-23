"use client";

import clsx from "clsx";

interface TimerProps {
  timeLeft: number;
  timeLimit: number;
  isMyTurn: boolean;
}

export function Timer({ timeLeft, timeLimit, isMyTurn }: TimerProps) {
  const pct = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100;
  const urgent = timeLeft <= 10;

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-between text-sm mb-1 font-medium">
        <span className={clsx(isMyTurn ? "text-brand-600" : "text-slate-400")}>
          {isMyTurn ? "Your turn" : "Opponent's turn"}
        </span>
        <span className={clsx("font-mono", urgent ? "text-red-500 animate-pulse" : "text-slate-600")}>
          {timeLeft}s
        </span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-1000",
            urgent ? "bg-red-500" : isMyTurn ? "bg-brand-500" : "bg-slate-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
