// ============================================================
// LILA Tic-Tac-Toe  -  Nakama TypeScript Server Module
// All game logic is server-authoritative.
// ============================================================

// --- Op Codes (client <-> server message types) ---------------
const OP_MOVE = 1;          // client -> server: player makes a move
const OP_STATE = 2;         // server -> client: full game state update
const OP_GAME_OVER = 3;     // server -> client: game ended
const OP_TIMER_TICK = 4;    // server -> client: turn timer countdown
const OP_OPPONENT_LEFT = 5; // server -> client: opponent disconnected

// --- Win combos ---------------------------------------------
const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

// --- Leaderboard IDs ----------------------------------------
const LEADERBOARD_ID = "tictactoe_wins";

// --- Types --------------------------------------------------
interface MatchState {
  board: string[];        // 9 cells: "" | "X" | "O"
  players: string[];      // [presenceSessionId0, presenceSessionId1]
  playerSymbols: Record<string, string>;  // sessionId -> "X"|"O"
  playerUserIds: Record<string, string>;  // sessionId -> userId
  playerUsernames: Record<string, string>; // sessionId -> username
  currentTurn: string;    // sessionId of whose turn it is
  turnTimeLeft: number;   // seconds remaining for this turn
  turnTimeLimit: number;  // 0 = no timer (classic), 30 = timed mode
  gameOver: boolean;
  winner: string | null;  // sessionId of winner, null = draw
  winLine: number[] | null;
  moveCount: number;
  mode: string;           // "classic" | "timed"
}

interface MoveMessage {
  position: number; // 0-8
}

// --- Helpers ------------------------------------------------
function checkWinner(board: string[]): { winner: string | null; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

function isDraw(board: string[]): boolean {
  return board.every((cell) => cell !== "") && checkWinner(board).winner === null;
}

function buildStatePayload(state: MatchState) {
  return JSON.stringify({
    board: state.board,
    currentTurn: state.currentTurn,
    playerSymbols: state.playerSymbols,
    playerUsernames: state.playerUsernames,
    turnTimeLeft: state.turnTimeLeft,
    turnTimeLimit: state.turnTimeLimit,
    moveCount: state.moveCount,
    gameOver: state.gameOver,
    winner: state.winner,
    winLine: state.winLine,
    mode: state.mode,
  });
}

// --- Match Handler ------------------------------------------
const matchInit: nkruntime.MatchInitFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string }
): { state: MatchState; tickRate: number; label: string } {

  const mode = params && params["mode"] === "timed" ? "timed" : "classic";
  const turnTimeLimit = mode === "timed" ? 30 : 0;

  const state: MatchState = {
    board: ["", "", "", "", "", "", "", "", ""],
    players: [],
    playerSymbols: {},
    playerUserIds: {},
    playerUsernames: {},
    currentTurn: "",
    turnTimeLeft: turnTimeLimit,
    turnTimeLimit,
    gameOver: false,
    winner: null,
    winLine: null,
    moveCount: 0,
    mode,
  };

  logger.info("Match initialised  -  mode: %s", mode);

  return {
    state,
    tickRate: 1, // 1 tick/second  -  drives the timer and keeps label fresh
    label: JSON.stringify({ open: true, mode }),
  };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
): { state: MatchState; accept: boolean; rejectMessage?: string } {

  if (state.gameOver) {
    return { state, accept: false, rejectMessage: "Game already finished" };
  }
  if (state.players.length >= 2) {
    return { state, accept: false, rejectMessage: "Match is full" };
  }
  if (state.players.includes(presence.sessionId)) {
    return { state, accept: false, rejectMessage: "Already in match" };
  }

  return { state, accept: true };
};

const matchJoin: nkruntime.MatchJoinFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presences: nkruntime.Presence[]
): { state: MatchState } | null {

  for (const p of presences) {
    state.players.push(p.sessionId);
    state.playerUserIds[p.sessionId] = p.userId;
    state.playerUsernames[p.sessionId] = p.username;
  }

  // Assign symbols once both players are present
  if (state.players.length === 2) {
    state.playerSymbols[state.players[0]] = "X";
    state.playerSymbols[state.players[1]] = "O";
    state.currentTurn = state.players[0]; // X always goes first
    state.turnTimeLeft = state.turnTimeLimit;

    // Update label: match is now full
    dispatcher.matchLabelUpdate(JSON.stringify({ open: false, mode: state.mode }));

    // Broadcast initial full state to both players
    dispatcher.broadcastMessage(OP_STATE, buildStatePayload(state), null, null, true);
    logger.info("Match started  -  X: %s vs O: %s", state.playerUsernames[state.players[0]], state.playerUsernames[state.players[1]]);
  }

  return { state };
};

const matchLeave: nkruntime.MatchLeaveFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presences: nkruntime.Presence[]
): { state: MatchState } | null {

  for (const p of presences) {
    logger.warn("Player left match: %s", p.username);

    if (!state.gameOver) {
      // Award win to the remaining player
      state.gameOver = true;
      const remaining = state.players.find((s) => s !== p.sessionId);
      state.winner = remaining || null;

      if (remaining) {
        dispatcher.broadcastMessage(
          OP_OPPONENT_LEFT,
          JSON.stringify({ message: "Your opponent disconnected. You win!" }),
          [{ sessionId: remaining, userId: state.playerUserIds[remaining], username: state.playerUsernames[remaining], node: "" }],
          null,
          true
        );
        // Record forfeit win/loss
        _recordResult(nk, logger, state, remaining, p.sessionId);
      }
    }

    // Remove from players list
    state.players = state.players.filter((s) => s !== p.sessionId);
  }

  // Terminate match when empty
  if (state.players.length === 0) {
    return null;
  }

  return { state };
};

const matchLoop: nkruntime.MatchLoopFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  messages: nkruntime.MatchMessage[]
): { state: MatchState } | null {

  // -- 1. Process incoming move messages ----------------------
  for (const msg of messages) {
    if (state.gameOver) break;
    if (msg.opCode !== OP_MOVE) continue;

    const senderId = msg.sender.sessionId;

    // Must be sender's turn
    if (senderId !== state.currentTurn) {
      logger.warn("Move rejected  -  not %s's turn", msg.sender.username);
      continue;
    }

    let moveData: MoveMessage;
    try {
      moveData = JSON.parse(nk.binaryToString(msg.data));
    } catch (e) {
      logger.error("Failed to parse move from %s", msg.sender.username);
      continue;
    }

    const pos = moveData.position;

    // Validate position
    if (pos < 0 || pos > 8 || state.board[pos] !== "") {
      logger.warn("Invalid move at position %d from %s", pos, msg.sender.username);
      continue;
    }

    // Apply move
    const symbol = state.playerSymbols[senderId];
    state.board[pos] = symbol;
    state.moveCount++;

    // Check end conditions
    const { winner: winSymbol, line } = checkWinner(state.board);
    if (winSymbol) {
      state.gameOver = true;
      state.winner = senderId;
      state.winLine = line;
      _endGame(nk, logger, dispatcher, state, senderId, false);
      return { state };
    }

    if (isDraw(state.board)) {
      state.gameOver = true;
      state.winner = null;
      _endGame(nk, logger, dispatcher, state, null, true);
      return { state };
    }

    // Switch turns
    state.currentTurn = state.players.find((s) => s !== senderId)!;
    state.turnTimeLeft = state.turnTimeLimit;

    // Broadcast updated state
    dispatcher.broadcastMessage(OP_STATE, buildStatePayload(state), null, null, true);
  }

  if (state.gameOver) {
    // Terminate match after game ends
    return null;
  }

  // -- 2. Timer tick (only when both players present and timed mode) -
  if (state.turnTimeLimit > 0 && state.players.length === 2 && state.currentTurn) {
    state.turnTimeLeft -= 1;

    // Broadcast timer update every tick
    dispatcher.broadcastMessage(
      OP_TIMER_TICK,
      JSON.stringify({ timeLeft: state.turnTimeLeft, currentTurn: state.currentTurn }),
      null,
      null,
      true
    );

    if (state.turnTimeLeft <= 0) {
      // Timeout  -  forfeit current player, award win to opponent
      logger.info("Timeout for player %s", state.playerUsernames[state.currentTurn]);
      const loser = state.currentTurn;
      const winner = state.players.find((s) => s !== loser)!;

      state.gameOver = true;
      state.winner = winner;
      state.winLine = null;

      _endGame(nk, logger, dispatcher, state, winner, false);
      return null;
    }
  }

  return { state };
};

const matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  graceSeconds: number
): { state: MatchState } | null {
  logger.info("Match terminating");
  return null;
};

const matchSignal: nkruntime.MatchSignalFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  data: string
): { state: MatchState; data: string } {
  return { state, data: "" };
};

// --- Private helpers -----------------------------------------

function _endGame(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  dispatcher: nkruntime.MatchDispatcher,
  state: MatchState,
  winnerSessionId: string | null,
  isDraw: boolean
) {
  const payload = JSON.stringify({
    board: state.board,
    gameOver: true,
    draw: isDraw,
    winner: winnerSessionId,
    winnerUsername: winnerSessionId ? state.playerUsernames[winnerSessionId] : null,
    winLine: state.winLine,
    playerSymbols: state.playerSymbols,
    playerUsernames: state.playerUsernames,
    mode: state.mode,
  });

  dispatcher.broadcastMessage(OP_GAME_OVER, payload, null, null, true);

  if (!isDraw && winnerSessionId) {
    const loserSessionId = state.players.find((s) => s !== winnerSessionId)!;
    _recordResult(nk, logger, state, winnerSessionId, loserSessionId);
  } else if (isDraw && state.players.length === 2) {
    // Record draw as a loss for neither  -  but still persist streak reset for both
    _recordDraw(nk, logger, state);
  }

  logger.info("Game over  -  winner: %s, draw: %s", winnerSessionId, isDraw);
}

function _recordResult(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  state: MatchState,
  winnerSessionId: string,
  loserSessionId: string
) {
  try {
    const winnerId = state.playerUserIds[winnerSessionId];
    const loserId = state.playerUserIds[loserSessionId];

    if (!winnerId || !loserId) return;

    // Write wins leaderboard (higher = better, score = total wins)
    // No override param — use the leaderboard's default INCREMENT operator
    nk.leaderboardRecordWrite(LEADERBOARD_ID, winnerId, state.playerUsernames[winnerSessionId] || "", 1, 0, {});

    // Store per-player stats in storage
    _updatePlayerStats(nk, logger, winnerId, true);
    _updatePlayerStats(nk, logger, loserId, false);
  } catch (e: any) {
    logger.error("Failed to record result: %s", e.message);
  }
}

function _recordDraw(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  state: MatchState
) {
  try {
    for (const sessionId of state.players) {
      const userId = state.playerUserIds[sessionId];
      if (!userId) continue;
      _updatePlayerStats(nk, logger, userId, false, true);
    }
  } catch (e: any) {
    logger.error("Failed to record draw: %s", e.message);
  }
}

function _updatePlayerStats(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  userId: string,
  won: boolean,
  draw: boolean = false
) {
  try {
    // Read existing stats
    const reads: nkruntime.StorageReadRequest[] = [{
      collection: "player_stats",
      key: "stats",
      userId,
    }];

    const existing = nk.storageRead(reads);
    let stats: { wins: number; losses: number; streak: number; bestStreak: number } = {
      wins: 0,
      losses: 0,
      streak: 0,
      bestStreak: 0,
    };

    if (existing.length > 0) {
      stats = existing[0].value as typeof stats;
    }

    if (won) {
      stats.wins += 1;
      stats.streak += 1;
      if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
    } else if (draw) {
      // draws don't break the win streak but don't add to it either
      (stats as any).draws = ((stats as any).draws || 0) + 1;
    } else {
      stats.losses += 1;
      stats.streak = 0;
    }

    const writes: nkruntime.StorageWriteRequest[] = [{
      collection: "player_stats",
      key: "stats",
      userId,
      value: stats,
      permissionRead: 2, // Public read
      permissionWrite: 0, // Server-only write
    }];

    nk.storageWrite(writes);
  } catch (e: any) {
    logger.error("Failed to update player stats for %s: %s", userId, e.message);
  }
}

// --- RPC Functions --------------------------------------------

/**
 * RPC: rpc_find_match
 * DEPRECATED — matchmakerAdd is not available in the Nakama JS runtime.
 * Matchmaking is handled client-side via socket.addMatchmaker().
 * The server-side matchmakerMatched hook creates the authoritative match.
 */
function rpcFindMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  logger.warn("rpc_find_match called but matchmaking must be done via socket.addMatchmaker() on the client");
  return JSON.stringify({ error: "Use socket.addMatchmaker() for matchmaking" });
}

/**
 * RPC: rpc_leave_matchmaker
 * DEPRECATED — matchmakerRemove is not available in the Nakama JS runtime.
 * Use socket.removeMatchmaker() from the client instead.
 */
function rpcLeaveMatchmaker(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  logger.warn("rpc_leave_matchmaker called but cancellation must be done via socket.removeMatchmaker() on the client");
  return JSON.stringify({ success: true });
}

/**
 * RPC: rpc_create_private_room
 * Creates an open match that another player can join by ID.
 * Payload: { mode: "classic" | "timed" }
 */
function rpcCreatePrivateRoom(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let mode = "classic";
  try {
    const data = JSON.parse(payload || "{}");
    if (data.mode === "timed") mode = "timed";
  } catch (_) {}

  const matchId = nk.matchCreate("tictactoe", { mode });
  logger.info("Private room created by %s  -  matchId: %s", ctx.username, matchId);
  return JSON.stringify({ matchId, mode });
}

/**
 * RPC: rpc_get_leaderboard
 * Returns top-10 players by wins.
 * Payload: {}
 */
function rpcGetLeaderboard(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const result = nk.leaderboardRecordsList(LEADERBOARD_ID, [], 10);

    // Batch-read per-player stats (losses, draws, streak) in a single call
    const statsMap: Record<string, any> = {};
    if (result.records.length > 0) {
      const reads: nkruntime.StorageReadRequest[] = result.records.map((r) => ({
        collection: "player_stats",
        key: "stats",
        userId: r.ownerId,
      }));
      const statsResults = nk.storageRead(reads);
      for (const s of statsResults) {
        statsMap[s.userId] = s.value;
      }
    }

    const records = result.records.map((r) => {
      const stats = statsMap[r.ownerId] || {};
      return {
        rank: r.rank,
        username: r.username,
        wins: r.score,
        losses: stats.losses || 0,
        draws: stats.draws || 0,
        streak: stats.streak || 0,
        userId: r.ownerId,
      };
    });
    return JSON.stringify({ records });
  } catch (e: any) {
    logger.error("Leaderboard fetch error: %s", e.message);
    return JSON.stringify({ records: [] });
  }
}

/**
 * RPC: rpc_get_my_stats
 * Returns the calling player's win/loss/streak stats.
 */
function rpcGetMyStats(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const reads: nkruntime.StorageReadRequest[] = [{
      collection: "player_stats",
      key: "stats",
      userId: ctx.userId!,
    }];
    const result = nk.storageRead(reads);
    if (result.length > 0) {
      return JSON.stringify(result[0].value);
    }
    return JSON.stringify({ wins: 0, losses: 0, streak: 0, bestStreak: 0 });
  } catch (e: any) {
    return JSON.stringify({ wins: 0, losses: 0, streak: 0, bestStreak: 0 });
  }
}

// --- Matchmaker Matched Hook ----------------------------------
// Called by Nakama when matchmaker finds 2 compatible players.
// We create an authoritative match and return its ID to both players.

function matchmakerMatched(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  matches: nkruntime.MatchmakerResult[]
): string | void {

  const mode = (matches[0].stringProperties && matches[0].stringProperties["mode"]) || "classic";
  const matchId = nk.matchCreate("tictactoe", { mode });
  logger.info("Matchmaker created match %s for %d players  -  mode: %s", matchId, matches.length, mode);
  return matchId;
}

// --- InitModule (entry point) ---------------------------------

function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
): Error | void {

  // Register the authoritative match handler
  initializer.registerMatch("tictactoe", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal,
  });

  // Register RPC endpoints
  initializer.registerRpc("rpc_find_match", rpcFindMatch);
  initializer.registerRpc("rpc_leave_matchmaker", rpcLeaveMatchmaker);
  initializer.registerRpc("rpc_create_private_room", rpcCreatePrivateRoom);
  initializer.registerRpc("rpc_get_leaderboard", rpcGetLeaderboard);
  initializer.registerRpc("rpc_get_my_stats", rpcGetMyStats);

  // Register matchmaker hook
  initializer.registerMatchmakerMatched(matchmakerMatched);

  // Create leaderboard (idempotent)
  try {
    nk.leaderboardCreate(
      LEADERBOARD_ID,
      false,        // not authoritative  -  anyone can write via server
      nkruntime.SortOrder.DESCENDING,
      nkruntime.Operator.INCREMENT,
      "",           // reset schedule (never auto-reset)
      {}
    );
    logger.info("Leaderboard '%s' created", LEADERBOARD_ID);
  } catch (e: any) {
    // Ignore 'already exists'; log anything else
    if (!e.message || !e.message.includes("already exists")) {
      logger.warn("leaderboardCreate: %s", e.message);
    }
  }

  logger.info("LILA Tic-Tac-Toe module initialised");
}
