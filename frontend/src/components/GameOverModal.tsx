"use client";

import { GameOverPayload } from "@/types/game";
import clsx from "clsx";

interface GameOverModalProps {
  result: GameOverPayload;
  mySessionId: string | null;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function GameOverModal({
  result,
  mySessionId,
  onPlayAgain,
  onHome,
}: GameOverModalProps) {
  const iWon = !result.draw && result.winner === mySessionId;
  const isDraw = result.draw;

  let headline: string;
  let subtext: string;
  let emoji: string;

  if (isDraw) {
    headline = "It's a Draw!";
    subtext = "A perfectly balanced game!";
    emoji = "🤝";
  } else if (iWon) {
    headline = "You Win!";
    subtext = "Excellent move sequence!";
    emoji = "🏆";
  } else {
    headline = "You Lose";
    subtext = result.winnerUsername
      ? `${result.winnerUsername} wins this round.`
      : "Better luck next time!";
    emoji = "😔";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl p-8 mx-4 w-full max-w-sm text-center animate-slide-up">
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className={clsx(
          "text-3xl font-extrabold mb-2",
          isDraw ? "text-slate-700" : iWon ? "text-brand-600" : "text-rose-500"
        )}>
          {headline}
        </h2>
        <p className="text-slate-500 mb-6">{subtext}</p>

        {/* Mini board replay */}
        <div className="grid grid-cols-3 gap-1 mb-6 w-36 mx-auto">
          {result.board.map((cell, i) => {
            const isWin = result.winLine?.includes(i) ?? false;
            return (
              <div
                key={i}
                className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold",
                  isWin ? "bg-yellow-100 border border-yellow-400" : "bg-slate-100",
                  cell === "X" ? "text-brand-600" : "text-rose-500"
                )}
              >
                {cell}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition"
          >
            Play Again
          </button>
          <button
            onClick={onHome}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
