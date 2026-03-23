/**
 * Pure game logic — no Nakama runtime dependencies.
 *
 * These functions mirror the inline logic inside main.ts. They are extracted
 * here so unit tests can import them without touching the Nakama script-
 * concatenation build (which uses outFile and cannot import modules).
 *
 * IMPORTANT: If you change checkWinner / isDraw / WIN_LINES in main.ts,
 * update this file to match so the tests continue to describe production behavior.
 */

export const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

export function checkWinner(board: string[]): { winner: string | null; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

export function isDraw(board: string[]): boolean {
  return board.every((cell) => cell !== "") && checkWinner(board).winner === null;
}

/**
 * Returns true if `position` is within bounds and the cell is unoccupied.
 * Mirrors the inline validation in matchLoop inside main.ts.
 */
export function isValidMove(board: string[], position: number): boolean {
  return position >= 0 && position <= 8 && board[position] === "";
}
