"use client";

import { GameOverPayload, LeaderboardEntry, PlayerStats } from "@/types/game";
import clsx from "clsx";

interface GameOverModalProps {
  result: GameOverPayload;
  mySessionId: string | null;
  myUserId?: string | null;
  lbEntries?: LeaderboardEntry[];
  myStats?: PlayerStats | null;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function GameOverModal({
  result,
  mySessionId,
  lbEntries = [],
  myStats,
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

  const winnerSymbol = result.winner ? result.playerSymbols[result.winner] : null;

  // Build per-player stat rows
  const playerRows = Object.keys(result.playerUsernames).map((sid) => {
    const username = result.playerUsernames[sid];
    const isMe = sid === mySessionId;
    const symbol = result.playerSymbols[sid];
    const entry = lbEntries.find((e) => e.username === username);
    // For the current player prefer myStats (freshest data)
    const wins   = isMe && myStats ? myStats.wins          : (entry?.wins   ?? 0);
    const losses = isMe && myStats ? myStats.losses         : (entry?.losses ?? 0);
    const draws  = isMe && myStats ? (myStats.draws  ?? 0)  : (entry?.draws  ?? 0);
    const streak = isMe && myStats ? myStats.streak          : (entry?.streak ?? 0);
    return { username, isMe, symbol, wins, losses, draws, streak };
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 px-6 animate-fade-in">

      {/* Winner's symbol (large, like sample) */}
      {!isDraw && winnerSymbol && (
        <div className={clsx(
          "text-8xl font-black leading-none mb-1",
          winnerSymbol === "X" ? "text-rose-300" : "text-white"
        )}>
          {winnerSymbol}
        </div>
      )}

      {/* Emoji */}
      <div className="text-4xl mb-1">{emoji}</div>

      {/* Headline */}
      <h2 className={clsx(
        "text-2xl font-extrabold mb-1",
        isDraw ? "text-slate-300" : iWon ? "text-teal-400" : "text-rose-400"
      )}>
        {headline}
      </h2>
      <p className="text-slate-500 text-sm mb-4">{subtext}</p>

      {/* Mini board replay — keep .grid.grid-cols-3 > div structure */}
      <div className="grid grid-cols-3 gap-1 mb-5 w-28 mx-auto">
        {result.board.map((cell, i) => {
          const isWin = result.winLine?.includes(i) ?? false;
          return (
            <div
              key={i}
              className={clsx(
                "w-8 h-8 rounded flex items-center justify-center text-sm font-bold",
                isWin ? "bg-yellow-900/50 border border-yellow-500" : "bg-slate-800",
                cell === "X" ? "text-rose-300" : "text-white"
              )}
            >
              {cell}
            </div>
          );
        })}
      </div>

      {/* Stats table for both players */}
      {playerRows.length > 0 && (
        <div className="w-full max-w-xs mb-5">
          <p className="text-teal-400 text-xs font-semibold mb-2">🏆 Leaderboard</p>
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 text-[10px] text-slate-500 uppercase tracking-wider px-3 py-2 border-b border-slate-700">
              <span>Player</span>
              <span className="text-center">W/L/D</span>
              <span className="text-center">Streak</span>
              <span className="text-right">Score</span>
            </div>
            {playerRows.map(({ username, isMe, symbol, wins, losses, draws, streak }) => (
              <div
                key={username}
                className={clsx("grid grid-cols-4 items-center px-3 py-2.5", isMe && "bg-slate-700/50")}
              >
                <div>
                  <p className={clsx("text-xs font-semibold truncate", isMe ? "text-white" : "text-slate-300")}>
                    {username}
                    {isMe && <span className="text-[10px] text-slate-500 ml-1">(you)</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">{symbol}</p>
                </div>
                <p className="text-xs text-center">
                  <span className="text-green-400">{wins}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-rose-400">{losses}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-400">{draws}</span>
                </p>
                <p className="text-xs text-center text-yellow-400">{streak}</p>
                <p className="text-xs text-right font-bold text-white">{wins}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-3 rounded-xl border-2 border-slate-600 text-white font-semibold text-sm hover:border-teal-400 hover:text-teal-400 transition"
        >
          Play Again
        </button>
        <button
          onClick={onHome}
          className="flex-1 py-3 rounded-xl border-2 border-slate-600 text-slate-400 font-semibold text-sm hover:border-slate-400 transition"
        >
          Home
        </button>
      </div>
    </div>
  );
}
