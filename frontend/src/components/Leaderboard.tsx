"use client";

import { LeaderboardEntry, PlayerStats } from "@/types/game";
import clsx from "clsx";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  myStats: PlayerStats | null;
  myUserId: string | null;
}

export function Leaderboard({ entries, myStats, myUserId }: LeaderboardProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      {myStats && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: "Wins", value: myStats.wins, color: "text-green-600" },
            { label: "Losses", value: myStats.losses, color: "text-rose-500" },
            { label: "Streak", value: myStats.streak, color: "text-brand-600" },
            { label: "Best", value: myStats.bestStreak, color: "text-yellow-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-slate-100">
              <div className={clsx("text-2xl font-extrabold", s.color)}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <span className="text-lg font-bold text-slate-800">🏆 Global Leaderboard</span>
        </div>

        {/* Column header */}
        {entries.length > 0 && (
          <div className="grid grid-cols-12 text-[10px] text-slate-400 uppercase tracking-wider px-4 py-2 border-b border-slate-100">
            <span className="col-span-1">#</span>
            <span className="col-span-5">Player</span>
            <span className="col-span-3 text-center">W / L / D</span>
            <span className="col-span-2 text-center">Streak</span>
            <span className="col-span-1 text-right">Wins</span>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No games played yet. Be the first!</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {entries.map((entry) => {
              const isMe = entry.userId === myUserId;
              const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
              return (
                <div
                  key={entry.userId}
                  className={clsx(
                    "grid grid-cols-12 items-center px-4 py-3",
                    isMe ? "bg-brand-50" : "hover:bg-slate-50"
                  )}
                >
                  <span className="col-span-1 text-lg text-center">
                    {medals[entry.rank] || `#${entry.rank}`}
                  </span>
                  <span className={clsx("col-span-5 font-medium text-sm", isMe ? "text-brand-700" : "text-slate-700")}>
                    {entry.username}
                    {isMe && <span className="ml-1 text-xs text-brand-500">(you)</span>}
                  </span>
                  <span className="col-span-3 text-xs text-center">
                    <span className="text-green-600 font-semibold">{entry.wins}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-500">{entry.losses ?? 0}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-400">{entry.draws ?? 0}</span>
                  </span>
                  <span className="col-span-2 text-xs text-center text-yellow-600 font-medium">{entry.streak ?? 0}</span>
                  <span className="col-span-1 text-right text-green-600 font-bold text-sm">{entry.wins}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
