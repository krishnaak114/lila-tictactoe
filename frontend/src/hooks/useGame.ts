"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Session, Socket } from "@heroiclabs/nakama-js";
import {
  createSocket,
  rpcFindMatch,
  rpcLeaveMatchmaker,
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
  const [mySessionId, setMySessionId] = useState<string | null>(null);
  const [matchmakerTicket, setMatchmakerTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privateRoomId, setPrivateRoomId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

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
              setGameOver({
                board: gameState?.board || EMPTY_BOARD,
                gameOver: true,
                draw: false,
                winner: mySessionId,
                winnerUsername: "You",
                winLine: null,
                playerSymbols: gameState?.playerSymbols || {},
                playerUsernames: gameState?.playerUsernames || {},
                mode: gameState?.mode || "classic",
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

      } catch (e: any) {
        if (mounted) setError(e.message);
      }
    })();

    return () => {
      mounted = false;
      socketRef.current?.disconnect(true);
      socketRef.current = null;
    };
  }, [session]);

  // Capture own session ID from match state when we recognize our username
  useEffect(() => {
    if (!gameState || !session || mySessionId) return;
    const entries = Object.entries(gameState.playerUsernames);
    for (const [sid, uname] of entries) {
      if (uname === session.username) {
        setMySessionId(sid);
        break;
      }
    }
  }, [gameState, session, mySessionId]);

  // ── Actions ─────────────────────────────────────────────────

  const findMatch = useCallback(async (mode: GameMode) => {
    if (!session || !socketRef.current) return;
    setError(null);
    setStatus("matchmaking");
    setGameOver(null);
    setGameState(null);

    try {
      const result = await rpcFindMatch(session, mode);
      setMatchmakerTicket(result.ticket);
    } catch (e: any) {
      setError(e.message);
      setStatus("idle");
    }
  }, [session]);

  const cancelMatchmaking = useCallback(async () => {
    if (!session || !matchmakerTicket) return;
    try {
      await rpcLeaveMatchmaker(session, matchmakerTicket);
    } catch (_) {}
    setMatchmakerTicket(null);
    setStatus("idle");
  }, [session, matchmakerTicket]);

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
    } catch (e: any) {
      setError(e.message);
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
    } catch (e: any) {
      setError(e.message);
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
    setMySessionId(null);
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
