import { Client, Session, Socket } from "@heroiclabs/nakama-js";

const NAKAMA_HOST = process.env.NEXT_PUBLIC_NAKAMA_HOST || "localhost";
const NAKAMA_PORT = process.env.NEXT_PUBLIC_NAKAMA_PORT || "7350";
const NAKAMA_USE_SSL = process.env.NEXT_PUBLIC_NAKAMA_USE_SSL === "true";
const NAKAMA_KEY = process.env.NEXT_PUBLIC_NAKAMA_KEY || "defaultkey";

export const nakamaClient = new Client(
  NAKAMA_KEY,
  NAKAMA_HOST,
  NAKAMA_PORT,
  NAKAMA_USE_SSL
);

// ─── Auth ─────────────────────────────────────────────────────

const SESSION_KEY = "nakama_session";

export async function authenticateDevice(deviceId: string): Promise<Session> {
  const session = await nakamaClient.authenticateDevice(deviceId, true, deviceId);
  persistSession(session);
  return session;
}

export async function authenticateEmail(
  email: string,
  password: string,
  username?: string
): Promise<Session> {
  const session = await nakamaClient.authenticateEmail(email, password, false, username);
  persistSession(session);
  return session;
}

export async function registerEmail(
  email: string,
  password: string,
  username: string
): Promise<Session> {
  const session = await nakamaClient.authenticateEmail(email, password, true, username);
  persistSession(session);
  return session;
}

function persistSession(session: Session) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: session.token,
      refresh_token: session.refresh_token,
    }));
  }
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const { token, refresh_token } = JSON.parse(raw);
    return new Session(token, refresh_token, false);
  } catch {
    return null;
  }
}

export async function refreshSession(session: Session): Promise<Session | null> {
  try {
    const refreshed = await nakamaClient.sessionRefresh(session);
    persistSession(refreshed);
    return refreshed;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ─── Socket ────────────────────────────────────────────────────

export async function createSocket(session: Session): Promise<Socket> {
  const socket = nakamaClient.createSocket(NAKAMA_USE_SSL, false);
  await socket.connect(session, true);
  return socket;
}

// ─── RPC Helpers ───────────────────────────────────────────────

export async function rpcFindMatch(
  session: Session,
  mode: "classic" | "timed"
): Promise<{ ticket: string; mode: string }> {
  const result = await nakamaClient.rpc(session, "rpc_find_match", { mode });
  return result.payload as unknown as { ticket: string; mode: string };
}

export async function rpcLeaveMatchmaker(
  session: Session,
  ticket: string
): Promise<void> {
  await nakamaClient.rpc(session, "rpc_leave_matchmaker", { ticket });
}

export async function rpcCreatePrivateRoom(
  session: Session,
  mode: "classic" | "timed"
): Promise<{ matchId: string; mode: string }> {
  const result = await nakamaClient.rpc(session, "rpc_create_private_room", { mode });
  return result.payload as unknown as { matchId: string; mode: string };
}

export async function rpcGetLeaderboard(
  session: Session
): Promise<{ records: Array<{ rank: number; username: string; wins: number; userId: string }> }> {
  const result = await nakamaClient.rpc(session, "rpc_get_leaderboard", {});
  return result.payload as unknown as { records: Array<{ rank: number; username: string; wins: number; userId: string }> };
}

export async function rpcGetMyStats(
  session: Session
): Promise<{ wins: number; losses: number; streak: number; bestStreak: number }> {
  const result = await nakamaClient.rpc(session, "rpc_get_my_stats", {});
  return result.payload as unknown as { wins: number; losses: number; streak: number; bestStreak: number };
}

export async function getAccount(session: Session) {
  return nakamaClient.getAccount(session);
}
