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
    <div className="bg-teal-400 rounded-3xl shadow-2xl overflow-hidden">
      <div className="grid grid-cols-3">
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i) ?? false;
          const isEmpty = cell === "";
          const isClickable = !disabled && isEmpty && isMyTurn;
          const hasBorderRight = (i + 1) % 3 !== 0;
          const hasBorderBottom = i < 6;

          return (
            <button
              key={i}
              onClick={() => isClickable && onCellClick(i)}
              disabled={!isClickable}
              aria-label={`Cell ${i + 1}${cell ? ` — ${cell}` : ""}`}
              className={clsx(
                "w-[108px] h-[108px] sm:w-32 sm:h-32 text-5xl sm:text-6xl font-black",
                "transition-all duration-150 select-none flex items-center justify-center",
                hasBorderRight && "border-r-2 border-teal-300/60",
                hasBorderBottom && "border-b-2 border-teal-300/60",
                isWinCell
                  ? "bg-white/25 scale-95 animate-bounce-once"
                  : isClickable
                  ? "hover:bg-white/15 cursor-pointer"
                  : "cursor-default bg-transparent",
                cell === "X" ? "text-rose-200" : "text-white"
              )}
            >
              {cell || null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
