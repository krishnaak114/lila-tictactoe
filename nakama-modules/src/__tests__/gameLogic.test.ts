import { checkWinner, isDraw, isValidMove, WIN_LINES } from "../logic";

// ─── WIN_LINES ────────────────────────────────────────────────

describe("WIN_LINES", () => {
  it("defines exactly 8 winning combinations", () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  it("covers 3 rows, 3 columns and 2 diagonals", () => {
    const rows = WIN_LINES.filter(([a, b, c]) => Math.floor(a / 3) === Math.floor(b / 3));
    const cols = WIN_LINES.filter(([a, b]) => a % 3 === b % 3);
    const diags = WIN_LINES.filter(
      (line) => !rows.includes(line) && !cols.includes(line)
    );
    expect(rows).toHaveLength(3);
    expect(cols).toHaveLength(3);
    expect(diags).toHaveLength(2);
  });
});

// ─── checkWinner ─────────────────────────────────────────────

describe("checkWinner", () => {
  const empty = (): string[] => Array(9).fill("");

  it("returns no winner for an empty board", () => {
    expect(checkWinner(empty())).toEqual({ winner: null, line: null });
  });

  it("returns no winner for a partially filled board with no three-in-a-row", () => {
    const board = ["X", "O", "", "", "X", "", "", "", "O"];
    expect(checkWinner(board)).toEqual({ winner: null, line: null });
  });

  // All 8 winning lines
  test.each([
    ["top row",      ["X", "X", "X", "", "", "", "", "", ""],    "X", [0, 1, 2]],
    ["middle row",   ["", "", "", "O", "O", "O", "", "", ""],    "O", [3, 4, 5]],
    ["bottom row",   ["", "", "", "", "", "", "X", "X", "X"],    "X", [6, 7, 8]],
    ["left col",     ["X", "", "", "X", "", "", "X", "", ""],    "X", [0, 3, 6]],
    ["middle col",   ["", "O", "", "", "O", "", "", "O", ""],    "O", [1, 4, 7]],
    ["right col",    ["", "", "X", "", "", "X", "", "", "X"],    "X", [2, 5, 8]],
    ["main diag",    ["O", "", "", "", "O", "", "", "", "O"],    "O", [0, 4, 8]],
    ["anti-diag",    ["", "", "X", "", "X", "", "X", "", ""],    "X", [2, 4, 6]],
  ] as const)(
    "detects a %s win",
    (_, board, expectedWinner, expectedLine) => {
      expect(checkWinner([...board])).toEqual({
        winner: expectedWinner,
        line: expectedLine,
      });
    }
  );

  it("returns the correct winner symbol when both X and O are on the board", () => {
    // O wins the middle column; X is present but hasn't won
    const board = ["X", "O", "", "X", "O", "", "", "O", ""];
    const result = checkWinner(board);
    expect(result.winner).toBe("O");
    expect(result.line).toEqual([1, 4, 7]);
  });

  it("returns no winner for a completely filled board with no three-in-a-row", () => {
    // X O X / O X O / O X O — full board, no winning line
    const board = ["X", "O", "X", "O", "X", "O", "O", "X", "O"];
    expect(checkWinner(board)).toEqual({ winner: null, line: null });
  });
});

// ─── isDraw ──────────────────────────────────────────────────

describe("isDraw", () => {
  it("returns false for an empty board", () => {
    expect(isDraw(Array(9).fill(""))).toBe(false);
  });

  it("returns false for a board that still has empty cells", () => {
    // One cell empty — cannot be a draw yet
    const board = ["X", "O", "X", "X", "O", "O", "O", "X", ""];
    expect(isDraw(board)).toBe(false);
  });

  it("returns false when the full board has a winner", () => {
    // X wins the top row; remaining cells are filled
    const board = ["X", "X", "X", "O", "O", "X", "O", "X", "O"];
    expect(isDraw(board)).toBe(false);
  });

  it("returns true for a full board with no winning line", () => {
    // X O X        (positions 0-2)
    // X O O        (positions 3-5)
    // O X X        (positions 6-8)
    // Verified: no row, column or diagonal has three identical symbols.
    const board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
    expect(isDraw(board)).toBe(true);
  });

  it("returns true for an alternate draw pattern", () => {
    // O X O / X X O / X O X — full board, no three-in-a-row
    const board = ["O", "X", "O", "X", "X", "O", "X", "O", "X"];
    expect(isDraw(board)).toBe(true);
  });
});

// ─── isValidMove ─────────────────────────────────────────────

describe("isValidMove", () => {
  const emptyBoard = (): string[] => Array(9).fill("");

  it("returns true for any empty cell on an empty board", () => {
    for (let i = 0; i < 9; i++) {
      expect(isValidMove(emptyBoard(), i)).toBe(true);
    }
  });

  it("returns false for a negative position", () => {
    expect(isValidMove(emptyBoard(), -1)).toBe(false);
  });

  it("returns false for position 9 (out of bounds)", () => {
    expect(isValidMove(emptyBoard(), 9)).toBe(false);
  });

  it("returns false for an already-occupied cell", () => {
    const board = emptyBoard();
    board[4] = "X";
    expect(isValidMove(board, 4)).toBe(false);
  });

  it("returns true for a valid position on a partially-filled board", () => {
    const board = emptyBoard();
    board[0] = "X";
    board[1] = "O";
    // Position 2 is still empty
    expect(isValidMove(board, 2)).toBe(true);
  });
});
