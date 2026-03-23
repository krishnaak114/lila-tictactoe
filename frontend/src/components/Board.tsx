"use client";

import { CellValue } from "@/types/game";
import clsx from "clsx";

interface BoardProps {
  board: CellValue[];
  winLine: number[] | null;
  mySymbol: string | null;
  currentTurn: string;    // sessionId
  mySessionId: string | null;
  onCellClick: (index: number) => void;
  disabled: boolean;
}

export function Board({
  board,
  winLine,
  currentTurn,
  mySessionId,
  onCellClick,
  disabled,
}: BoardProps) {
  const isMyTurn = currentTurn === mySessionId;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i) ?? false;
          const isEmpty = cell === "";
          const isClickable = !disabled && isEmpty && isMyTurn;

          return (
            <button
              key={i}
              onClick={() => isClickable && onCellClick(i)}
              disabled={!isClickable}
              aria-label={`Cell ${i + 1}${cell ? ` — ${cell}` : ""}`}
              className={clsx(
                "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl text-4xl sm:text-5xl font-extrabold",
                "transition-all duration-200 select-none",
                "border-2",
                isWinCell
                  ? "border-yellow-400 bg-yellow-50 scale-105 animate-bounce-once"
                  : "border-slate-200 bg-white",
                isEmpty && isMyTurn && !disabled
                  ? "hover:bg-brand-50 hover:border-brand-500 cursor-pointer hover:scale-105"
                  : "cursor-default",
                cell === "X" ? "text-brand-600" : "text-rose-500"
              )}
            >
              {cell || (isClickable ? (
                <span className="text-slate-200 text-3xl">·</span>
              ) : null)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
