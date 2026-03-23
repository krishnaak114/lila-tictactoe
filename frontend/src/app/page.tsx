"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGame } from "@/hooks/useGame";
import { rpcGetLeaderboard, rpcGetMyStats } from "@/lib/nakama";
import { GameMode, LeaderboardEntry, PlayerStats } from "@/types/game";
import { Board } from "@/components/Board";
import { Timer } from "@/components/Timer";
import { GameOverModal } from "@/components/GameOverModal";
import { Leaderboard } from "@/components/Leaderboard";
import clsx from "clsx";

type Tab = "play" | "leaderboard";

export default function HomePage() {
  const { session, user, loading, login, register, logout } = useAuth();
  const {
    status,
    gameState,
    gameOver,
    mySessionId,
    privateRoomId,
    error,
    findMatch,
    cancelMatchmaking,
    createPrivateRoom,
    joinPrivateRoom,
    makeMove,
    resetGame,
  } = useGame(session);

  // Auth form state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // App tab
  const [tab, setTab] = useState<Tab>("play");

  // Private room input
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Mode selection
  const [selectedMode, setSelectedMode] = useState<GameMode>("classic");

  // Leaderboard
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!session) return;
    try {
      const [lb, stats] = await Promise.all([
        rpcGetLeaderboard(session),
        rpcGetMyStats(session),
      ]);
      setLbEntries(lb.records);
      setMyStats(stats);
    } catch {}
  }, [session]);

  useEffect(() => {
    if (session && tab === "leaderboard") {
      fetchLeaderboard();
    }
  }, [session, tab, fetchLeaderboard]);

  // ── Refresh leaderboard after game ends ──────────────────────
  useEffect(() => {
    if (status === "game_over" && session) {
      fetchLeaderboard();
    }
  }, [status, session, fetchLeaderboard]);

  // ── Auth handlers ─────────────────────────────────────────────
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        await login(email, password);
      } else {
        await register(email, password, username);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  const mySymbol = mySessionId && gameState?.playerSymbols
    ? gameState.playerSymbols[mySessionId]
    : null;

  const isMyTurn = mySessionId === gameState?.currentTurn;
  const opponentSessionId = gameState && mySessionId
    ? Object.keys(gameState.playerUsernames).find((s) => s !== mySessionId)
    : null;
  const opponentUsername = opponentSessionId
    ? gameState?.playerUsernames[opponentSessionId]
    : null;

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Auth wall ─────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-50 to-slate-100">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">❌⭕</div>
            <h1 className="text-3xl font-extrabold text-brand-700">LILA Tic-Tac-Toe</h1>
            <p className="text-slate-500 mt-1 text-sm">Multiplayer · Real-time · Server-authoritative</p>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-5">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setAuthMode(m); setAuthError(null); }}
                  className={clsx(
                    "flex-1 py-2.5 text-sm font-semibold capitalize transition",
                    authMode === m ? "bg-brand-500 text-white" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === "register" && (
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="password"
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />

              {authError && (
                <p className="text-xs text-red-500 px-1">{authError}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition disabled:opacity-60"
              >
                {authLoading ? "..." : authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Main App ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">❌⭕</span>
            <span className="font-extrabold text-brand-700 text-sm">LILA TTT</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              {user?.username}
            </span>
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm mb-6">
          {([
            { key: "play", label: "🎮 Play" },
            { key: "leaderboard", label: "🏆 Rankings" },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex-1 py-3 text-sm font-semibold transition",
                tab === t.key ? "bg-brand-500 text-white" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── LEADERBOARD TAB ────────────────────────────────── */}
        {tab === "leaderboard" && (
          <div className="animate-fade-in">
            <Leaderboard
              entries={lbEntries}
              myStats={myStats}
              myUserId={user?.userId || null}
            />
          </div>
        )}

        {/* ── PLAY TAB ────────────────────────────────────────── */}
        {tab === "play" && (
          <div className="animate-fade-in">

            {/* ── IDLE / HOME ──────────────────────────────────── */}
            {status === "idle" && (
              <div className="space-y-4">
                {/* Mode selector */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Game Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: "classic", label: "Classic", desc: "No time limit", icon: "♟" },
                      { id: "timed", label: "Timed", desc: "30s per move", icon: "⏱" },
                    ] as { id: GameMode; label: string; desc: string; icon: string }[]).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMode(m.id)}
                        className={clsx(
                          "p-3 rounded-xl border-2 text-left transition",
                          selectedMode === m.id
                            ? "border-brand-500 bg-brand-50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="text-2xl mb-1">{m.icon}</div>
                        <div className="text-sm font-bold text-slate-800">{m.label}</div>
                        <div className="text-xs text-slate-500">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick match */}
                <button
                  onClick={() => findMatch(selectedMode)}
                  className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold text-base shadow-lg hover:bg-brand-600 transition active:scale-95"
                >
                  Quick Match
                </button>

                {/* Private room */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Private Room</p>
                  <button
                    onClick={() => createPrivateRoom(selectedMode)}
                    className="w-full py-3 rounded-xl border-2 border-brand-500 text-brand-600 font-semibold text-sm hover:bg-brand-50 transition"
                  >
                    Create Private Room
                  </button>
                  {!showJoinInput ? (
                    <button
                      onClick={() => setShowJoinInput(true)}
                      className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
                    >
                      Join with Room ID
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste Room ID..."
                        value={joinRoomInput}
                        onChange={(e) => setJoinRoomInput(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        onClick={() => {
                          if (joinRoomInput.trim()) joinPrivateRoom(joinRoomInput.trim());
                        }}
                        className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold"
                      >
                        Join
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
              </div>
            )}

            {/* ── MATCHMAKING ──────────────────────────────────── */}
            {status === "matchmaking" && (
              <div className="flex flex-col items-center justify-center py-20 gap-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">Finding Opponent...</p>
                  <p className="text-sm text-slate-500 mt-1">Mode: {selectedMode}</p>
                </div>
                <button
                  onClick={cancelMatchmaking}
                  className="px-6 py-2.5 rounded-xl border-2 border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* ── WAITING FOR OPPONENT (private room) ──────────── */}
            {status === "waiting_for_opponent" && privateRoomId && (
              <div className="flex flex-col items-center justify-center py-16 gap-5 animate-fade-in">
                <div className="text-5xl">🚪</div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">Room Created!</p>
                  <p className="text-sm text-slate-500 mt-1">Share this ID with a friend:</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 px-6 py-3 w-full max-w-sm">
                  <p className="font-mono text-xs text-slate-700 break-all text-center">{privateRoomId}</p>
                </div>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(privateRoomId);
                    } else {
                      // Fallback for non-https contexts
                      const el = document.createElement("textarea");
                      el.value = privateRoomId;
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand("copy");
                      document.body.removeChild(el);
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition"
                >
                  📋 Copy Room ID
                </button>
                <div className="w-8 h-8 rounded-full border-4 border-brand-300 border-t-brand-600 animate-spin" />
                <p className="text-xs text-slate-400">Waiting for opponent to join...</p>
              </div>
            )}

            {/* ── PLAYING ──────────────────────────────────────── */}
            {status === "playing" && gameState && (
              <div className="space-y-4 animate-fade-in">
                {/* Player info bar */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-xl transition",
                      isMyTurn ? "bg-brand-50" : ""
                    )}>
                      <span className="text-lg font-extrabold text-brand-600">
                        {mySymbol}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {user?.username}
                        {isMyTurn && <span className="ml-1 animate-pulse text-brand-500">●</span>}
                      </span>
                    </div>
                    <span className="text-slate-400 font-bold text-sm">VS</span>
                    <div className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-xl transition",
                      !isMyTurn ? "bg-rose-50" : ""
                    )}>
                      <span className="text-sm font-semibold text-slate-800">
                        {opponentUsername || "Opponent"}
                        {!isMyTurn && <span className="ml-1 animate-pulse text-rose-400">●</span>}
                      </span>
                      <span className="text-lg font-extrabold text-rose-500">
                        {mySymbol === "X" ? "O" : "X"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timer (timed mode only) */}
                {gameState.turnTimeLimit > 0 && (
                  <Timer
                    timeLeft={gameState.turnTimeLeft}
                    timeLimit={gameState.turnTimeLimit}
                    isMyTurn={isMyTurn}
                  />
                )}

                {/* Turn indicator */}
                <p className={clsx(
                  "text-center text-sm font-semibold",
                  isMyTurn ? "text-brand-600" : "text-slate-400"
                )}>
                  {isMyTurn ? "🎯 Your move!" : `Waiting for ${opponentUsername || "opponent"}...`}
                </p>

                {/* Board */}
                <div className="flex justify-center">
                  <Board
                    board={gameState.board}
                    winLine={gameState.winLine}
                    mySymbol={mySymbol}
                    currentTurn={gameState.currentTurn}
                    mySessionId={mySessionId}
                    onCellClick={makeMove}
                    disabled={status !== "playing" || gameState.gameOver}
                  />
                </div>

                {/* Move count */}
                <p className="text-center text-xs text-slate-400">
                  Move {gameState.moveCount} · {gameState.mode} mode
                </p>
              </div>
            )}

            {/* ── GAME OVER ──────────────────────────────────────── */}
            {status === "game_over" && gameOver && (
              <GameOverModal
                result={gameOver}
                mySessionId={mySessionId}
                onPlayAgain={() => {
                  resetGame();
                  // Small delay then re-queue
                  setTimeout(() => findMatch(selectedMode), 100);
                }}
                onHome={resetGame}
              />
            )}

          </div>
        )}
      </div>
    </div>
  );
}
