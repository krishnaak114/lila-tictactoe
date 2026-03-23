"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Session, Socket } from "@heroiclabs/nakama-js";
import {
  createSocket,
  rpcCreatePrivateRoom,
} from "@/lib/nakama";
import {
  CellValue,
  GameMode,
  GameOverPayload,
  GameState,
  GameStatus,
  OP_GAME_OVER,
  OP_MOVE,
  OP_OPPONENT_LEFT,
  OP_STATE,
  OP_TIMER_TICK,
  TimerTickPayload,
} from "@/types/game";

const EMPTY_BOARD: CellValue[] = ["", "", "", "", "", "", "", "", ""];

export function useGame(session: Session | null) {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  // Derived — not stored as state to avoid setState-in-effect lint errors
  // mySessionId is set below via useMemo
  const [matchmakerTicket, setMatchmakerTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privateRoomId, setPrivateRoomId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  // Latest-value refs so the long-lived socket callback can read current state
  // without adding gameState/mySessionId to the socket useEffect deps.
  const latestGameStateRef = useRef<GameState | null>(null);
  const latestMySessionIdRef = useRef<string | null>(null);
  useEffect(() => { latestGameStateRef.current = gameState; }, [gameState]);
  // Derive own session ID from game state: find the session whose username matches ours
  const mySessionId = useMemo(() => {
    if (!gameState || !session) return null;
    const entries = Object.entries(gameState.playerUsernames);
    for (const [sid, uname] of entries) {
      if (uname === session.username) return sid;
    }
    return null;
  }, [gameState, session]);

  useEffect(() => { latestMySessionIdRef.current = mySessionId; }, [mySessionId]);

  // ── Setup socket ────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    let mounted = true;

    (async () => {
      try {
        const sock = await createSocket(session);
        if (!mounted) { sock.disconnect(true); return; }

        socketRef.current = sock;

        // ── Wire Nakama socket events ──────────────────────────

        // Matchmaker found a match → join it
        sock.onmatchmakermatched = async (matched) => {
          console.log("Matchmaker matched:", matched.match_id);
          setStatus("playing");
          setMatchId(matched.match_id || null);
          setMatchmakerTicket(null);
          await sock.joinMatch(matched.match_id);
        };

        // Match presence updates (join/leave)
        sock.onmatchpresence = (presence) => {
          console.log("Presence update:", presence);
        };

        // Match state (game events)
        sock.onmatchdata = (data) => {
          const payload = new TextDecoder().decode(data.data);

          switch (data.op_code) {
            case OP_STATE: {
              const state: GameState = JSON.parse(payload);
              setGameState(state);
              // Transition from waiting_for_opponent → playing once both players are present
              setStatus((prev) =>
                prev === "waiting_for_opponent" || prev === "matchmaking" ? "playing" : prev
              );
              break;
            }
            case OP_GAME_OVER: {
              const over: GameOverPayload = JSON.parse(payload);
              setGameOver(over);
              setStatus("game_over");
              break;
            }
            case OP_TIMER_TICK: {
              const tick: TimerTickPayload = JSON.parse(payload);
              setGameState((prev) =>
                prev ? { ...prev, turnTimeLeft: tick.timeLeft, currentTurn: tick.currentTurn } : prev
              );
              break;
            }
            case OP_OPPONENT_LEFT: {
              const gs = latestGameStateRef.current;
              const sid = latestMySessionIdRef.current;
              setGameOver({
                board: gs?.board || EMPTY_BOARD,
                gameOver: true,
                draw: false,
                winner: sid,
                winnerUsername: "You",
                winLine: null,
                playerSymbols: gs?.playerSymbols || {},
                playerUsernames: gs?.playerUsernames || {},
                mode: gs?.mode || "classic",
              });
              setStatus("game_over");
              break;
            }
          }
        };

        // After socket connects, capture the session ID via account info
        sock.onheartbeattimeout = () => {
          setError("Connection lost. Please refresh.");
        };

      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : "Connection error");
      }
    })();

    return () => {
      mounted = false;
      socketRef.current?.disconnect(true);
      socketRef.current = null;
    };
  }, [session]);

  // ── Actions ─────────────────────────────────────────────────

  const findMatch = useCallback(async (mode: GameMode) => {
    if (!session || !socketRef.current) return;
    setError(null);
    setStatus("matchmaking");
    setGameOver(null);
    setGameState(null);

    try {
      // Use the Nakama socket matchmaker directly — nk.matchmakerAdd is
      // not available in the JS server runtime; the server-side
      // matchmakerMatched hook will auto-create the authoritative match.
      const result = await socketRef.current.addMatchmaker(
        `+properties.mode:${mode}`,
        2,
        2,
        { mode },
        {}
      );
      setMatchmakerTicket(result.ticket);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Matchmaking error");
      setStatus("idle");
    }
  }, [session]);

  const cancelMatchmaking = useCallback(async () => {
    if (!socketRef.current || !matchmakerTicket) return;
    try {
      await socketRef.current.removeMatchmaker(matchmakerTicket);
    } catch { /* ignore — best effort cancel */ }
    setMatchmakerTicket(null);
    setStatus("idle");
  }, [matchmakerTicket]);

  const createPrivateRoom = useCallback(async (mode: GameMode) => {
    if (!session || !socketRef.current) return;
    setError(null);
    setGameOver(null);
    setGameState(null);

    try {
      const result = await rpcCreatePrivateRoom(session, mode);
      setPrivateRoomId(result.matchId);
      setMatchId(result.matchId);
      setStatus("waiting_for_opponent");
      await socketRef.current.joinMatch(result.matchId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create room error");
      setStatus("idle");
    }
  }, [session]);

  const joinPrivateRoom = useCallback(async (roomId: string) => {
    if (!session || !socketRef.current) return;
    setError(null);
    setGameOver(null);
    setGameState(null);

    try {
      setMatchId(roomId);
      setStatus("playing");
      await socketRef.current.joinMatch(roomId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Join room error");
      setStatus("idle");
    }
  }, [session]);

  const makeMove = useCallback(async (position: number) => {
    if (!socketRef.current || !matchId || !gameState) return;
    if (gameState.gameOver) return;
    if (gameState.currentTurn !== mySessionId) return;
    if (gameState.board[position] !== "") return;

    const data = new TextEncoder().encode(JSON.stringify({ position }));
    await socketRef.current.sendMatchState(matchId, OP_MOVE, data);
  }, [socketRef, matchId, gameState, mySessionId]);

  const resetGame = useCallback(() => {
    setStatus("idle");
    setGameState(null);
    setGameOver(null);
    setMatchId(null);
    setMatchmakerTicket(null);
    setPrivateRoomId(null);
    setError(null);
  }, []);

  return {
    status,
    gameState,
    gameOver,
    matchId,
    mySessionId,
    privateRoomId,
    error,
    findMatch,
    cancelMatchmaking,
    createPrivateRoom,
    joinPrivateRoom,
    makeMove,
    resetGame,
  };
}
