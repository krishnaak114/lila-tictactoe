import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Board } from "@/components/Board";
import type { CellValue } from "@/types/game";

// ── Helpers ──────────────────────────────────────────────────

const EMPTY_BOARD: CellValue[] = Array(9).fill("") as CellValue[];
const MY_SID = "session-me";

function renderBoard(overrides: Partial<Parameters<typeof Board>[0]> = {}) {
  const onCellClick = jest.fn();
  const props = {
    board: EMPTY_BOARD,
    winLine: null as number[] | null,
    mySymbol: "X" as string | null,
    currentTurn: MY_SID,
    mySessionId: MY_SID,
    onCellClick,
    disabled: false,
    ...overrides,
  };
  render(<Board {...props} />);
  return { onCellClick: props.onCellClick as jest.Mock };
}

// ── Tests ─────────────────────────────────────────────────────

describe("Board", () => {
  it("renders exactly 9 cell buttons", () => {
    renderBoard();
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("calls onCellClick with the correct 0-based index", async () => {
    const { onCellClick } = renderBoard();
    // Click the 5th button (index 4)
    await userEvent.click(screen.getAllByRole("button")[4]);
    expect(onCellClick).toHaveBeenCalledWith(4);
  });

  it("does not fire onCellClick when the board is disabled", async () => {
    const { onCellClick } = renderBoard({ disabled: true });
    await userEvent.click(screen.getAllByRole("button")[4]);
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("does not fire onCellClick when it is not the player's turn", async () => {
    const { onCellClick } = renderBoard({ currentTurn: "other-session" });
    await userEvent.click(screen.getAllByRole("button")[4]);
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("does not fire onCellClick for an already-occupied cell", async () => {
    const board = [...EMPTY_BOARD];
    board[4] = "X";
    const { onCellClick } = renderBoard({ board });
    // Occupied cells are rendered with disabled={true}
    await userEvent.click(screen.getAllByRole("button")[4]);
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("displays the correct symbol in a filled cell", () => {
    const board = [...EMPTY_BOARD];
    board[0] = "X";
    board[2] = "O";
    renderBoard({ board });
    expect(screen.getAllByRole("button")[0]).toHaveTextContent("X");
    expect(screen.getAllByRole("button")[2]).toHaveTextContent("O");
  });

  it("applies win-line styling to cells in the winning line", () => {
    const board: CellValue[] = ["X", "X", "X", "", "", "", "", "", ""];
    renderBoard({ board, winLine: [0, 1, 2] });
    const buttons = screen.getAllByRole("button");
    // Winning cells get the animate-bounce-once class via clsx
    expect(buttons[0].className).toContain("animate-bounce-once");
    expect(buttons[1].className).toContain("animate-bounce-once");
    expect(buttons[2].className).toContain("animate-bounce-once");
    // Non-winning cells should not have that class
    expect(buttons[3].className).not.toContain("animate-bounce-once");
  });

  it("does not apply win-line styling when winLine is null", () => {
    const board: CellValue[] = ["X", "X", "X", "", "", "", "", "", ""];
    renderBoard({ board, winLine: null });
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn.className).not.toContain("animate-bounce-once");
    });
  });
});
