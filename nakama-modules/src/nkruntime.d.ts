/**
 * Ambient type declarations for the Nakama TypeScript runtime.
 * Based on nakama-runtime v1.3.x — covers all types used in main.ts.
 * This file removes the need for `npm install` to get a clean compile.
 */

declare namespace nkruntime {

  // ─── Primitives ──────────────────────────────────────────────

  interface Context {
    env: Record<string, string>;
    executionMode: string;
    headers: Record<string, string[]>;
    ip?: string;
    matchId?: string;
    matchLabel?: string;
    matchNode?: string;
    matchTickRate?: number;
    node: string;
    queryParams: Record<string, string[]>;
    sessionExpiry?: number;
    userId?: string;
    username?: string;
    vars: Record<string, string>;
    clientIp?: string;
    clientPort?: string;
    lang?: string;
  }

  interface Logger {
    debug(format: string, ...params: any[]): void;
    info(format: string, ...params: any[]): void;
    warn(format: string, ...params: any[]): void;
    error(format: string, ...params: any[]): void;
    withField(key: string, value: string): Logger;
    withFields(fields: Record<string, string>): Logger;
    fields: Record<string, string>;
  }

  interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    status?: string;
  }

  // ─── Match ───────────────────────────────────────────────────

  interface MatchDispatcher {
    broadcastMessage(
      opCode: number,
      data: string,
      presences?: Presence[] | null,
      sender?: Presence | null,
      reliable?: boolean
    ): void;
    broadcastMessageDeferred(
      opCode: number,
      data: string,
      presences?: Presence[] | null,
      sender?: Presence | null,
      reliable?: boolean
    ): void;
    matchKick(presences: Presence[]): void;
    matchLabelUpdate(label: string): void;
  }

  interface MatchMessage {
    sender: Presence;
    persistence: boolean;
    status: string;
    opCode: number;
    data: Uint8Array;
    reliable: boolean;
    receiveTime: number;
  }

  interface Match {
    matchId: string;
    authoritative: boolean;
    label: string;
    size: number;
  }

  type MatchInitFunction<State> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    params: Record<string, string>
  ) => { state: State; tickRate: number; label: string };

  type MatchJoinAttemptFunction<State> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: State,
    presence: Presence,
    metadata: Record<string, any>
  ) => { state: State; accept: boolean; rejectMessage?: string } | null;

  type MatchJoinFunction<State> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: State,
    presences: Presence[]
  ) => { state: State } | null;

  type MatchLeaveFunction<State> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: State,
    presences: Presence[]
  ) => { state: State } | null;

  type MatchLoopFunction<State> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: State,
    messages: MatchMessage[]
  ) => { state: State } | null;

  type MatchTerminateFunction<State> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: State,
    graceSeconds: number
  ) => { state: State } | null;

  type MatchSignalFunction<State> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: State,
    data: string
  ) => { state: State; data: string } | null;

  // ─── Matchmaker ─────────────────────────────────────────────

  interface MatchmakerPresence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    sessionExpiry: number;
  }

  interface MatchmakerResult {
    presences: MatchmakerPresence[];
    ticket: string;
    token: string;
    matchId?: string;
    numericProperties: Record<string, number>;
    stringProperties: Record<string, string>;
  }

  // ─── Storage ─────────────────────────────────────────────────

  interface StorageReadRequest {
    collection: string;
    key: string;
    userId: string;
  }

  interface StorageWriteRequest {
    collection: string;
    key: string;
    userId: string;
    value: Record<string, any>;
    version?: string;
    permissionRead?: number;
    permissionWrite?: number;
  }

  interface StorageDeleteRequest {
    collection: string;
    key: string;
    userId: string;
  }

  interface StorageObject {
    collection: string;
    key: string;
    userId: string;
    value: Record<string, any>;
    version: string;
    permissionRead: number;
    permissionWrite: number;
    createTime: number;
    updateTime: number;
  }

  interface StorageWriteAck {
    collection: string;
    key: string;
    userId: string;
    version: string;
  }

  // ─── Leaderboard ─────────────────────────────────────────────

  const enum SortOrder {
    ASCENDING = 0,
    DESCENDING = 1,
  }

  const enum Operator {
    BEST = 0,
    SET = 1,
    INCREMENT = 2,
    DECREMENT = 3,
  }

  interface LeaderboardRecord {
    leaderboardId: string;
    ownerId: string;
    username: string;
    score: number;
    subscore: number;
    numScore: number;
    maxNumScore: number;
    metadata: Record<string, any>;
    createTime: number;
    updateTime: number;
    expiryTime: number;
    rank: number;
  }

  interface LeaderboardRecordList {
    records: LeaderboardRecord[];
    ownerRecords: LeaderboardRecord[];
    nextCursor: string;
    prevCursor: string;
  }

  // ─── User ────────────────────────────────────────────────────

  interface User {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    lang: string;
    location: string;
    timezone: string;
    metadata: Record<string, any>;
    facebookId: string;
    googleId: string;
    gameCenterId: string;
    steamId: string;
    online: boolean;
    edgeCount: number;
    createTime: number;
    updateTime: number;
  }

  // ─── Nakama (server API) ──────────────────────────────────────

  interface Nakama {
    // Match
    matchCreate(module: string, params?: Record<string, string>): string;
    matchGet(matchId: string): Match | null;
    matchList(
      limit: number,
      isAuthoritative: boolean,
      label: string,
      minSize?: number,
      maxSize?: number,
      query?: string
    ): Match[];
    matchSignal(matchId: string, data: string): string;

    // Matchmaker
    matchmakerAdd(
      ctx: Context,
      minCount: number,
      maxCount: number,
      query: string,
      stringProperties?: Record<string, string>,
      numericProperties?: Record<string, number>,
      countMultiple?: Record<string, string>
    ): string;
    matchmakerRemove(ctx: Context, ticket: string): void;

    // Storage
    storageRead(reads: StorageReadRequest[]): StorageObject[];
    storageWrite(writes: StorageWriteRequest[]): StorageWriteAck[];
    storageDelete(deletes: StorageDeleteRequest[]): void;

    // Leaderboard
    leaderboardCreate(
      id: string,
      authoritative: boolean,
      sortOrder: SortOrder,
      operator: Operator,
      resetSchedule: string,
      metadata: Record<string, any>
    ): void;
    leaderboardDelete(id: string): void;
    leaderboardRecordWrite(
      id: string,
      owner: string,
      username: string,
      score: number,
      subscore: number,
      metadata: Record<string, any>,
      override?: boolean
    ): LeaderboardRecord;
    leaderboardRecordDelete(id: string, owner: string): void;
    leaderboardRecordsList(
      id: string,
      ownerIds: string[],
      limit: number,
      cursor?: string,
      expiry?: number
    ): LeaderboardRecordList;

    // Account
    getUsers(userIds: string[]): User[];
    getAccount(ctx: Context): any;

    // Utility
    binaryToString(data: Uint8Array): string;
    stringToBinary(str: string): Uint8Array;
    uuidV4(): string;
    time(): number;

    // RPC
    rpcGet(ctx: Context, id: string, payload: string): any;

    // Events
    event(ctx: Context, evt: any): void;
  }

  // ─── Initializer ─────────────────────────────────────────────

  interface Initializer {
    registerRpc(
      id: string,
      func: (ctx: Context, logger: Logger, nk: Nakama, payload: string) => string
    ): void;
    registerBeforeRt(id: string, func: Function): void;
    registerAfterRt(id: string, func: Function): void;
    registerMatch(
      name: string,
      handlers: {
        matchInit: MatchInitFunction<any>;
        matchJoinAttempt: MatchJoinAttemptFunction<any>;
        matchJoin: MatchJoinFunction<any>;
        matchLeave: MatchLeaveFunction<any>;
        matchLoop: MatchLoopFunction<any>;
        matchTerminate: MatchTerminateFunction<any>;
        matchSignal: MatchSignalFunction<any>;
      }
    ): void;
    registerMatchmakerMatched(
      func: (
        ctx: Context,
        logger: Logger,
        nk: Nakama,
        matches: MatchmakerResult[]
      ) => string | void
    ): void;
    registerTournamentEnd(func: Function): void;
    registerTournamentReset(func: Function): void;
    registerLeaderboardReset(func: Function): void;
    registerShutdown(func: Function): void;
  }
}
