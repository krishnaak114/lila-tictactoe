import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameOverModal } from "@/components/GameOverModal";
import { GameOverPayload } from "@/types/game";

// ── Helpers ───────────────────────────────────────────────────

const EMPTY_BOARD = Array(9).fill("") as GameOverPayload["board"];

function makeResult(overrides: Partial<GameOverPayload> = {}): GameOverPayload {
  return {
    board: EMPTY_BOARD,
    gameOver: true,
    draw: false,
    winner: null,
    winnerUsername: null,
    winLine: null,
    playerSymbols: {},
    playerUsernames: {},
    mode: "classic",
    ...overrides,
  };
}

function renderModal(
  result: GameOverPayload,
  opts: { mySessionId?: string; onPlayAgain?: jest.Mock; onHome?: jest.Mock } = {}
) {
  const onPlayAgain = opts.onPlayAgain ?? jest.fn();
  const onHome = opts.onHome ?? jest.fn();
  render(
    <GameOverModal
      result={result}
      mySessionId={opts.mySessionId ?? "me"}
      onPlayAgain={onPlayAgain}
      onHome={onHome}
    />
  );
  return { onPlayAgain, onHome };
}

// ── Tests ─────────────────────────────────────────────────────

describe("GameOverModal", () => {
  describe("result messaging", () => {
    it("shows 'It's a Draw!' for a draw result", () => {
      renderModal(makeResult({ draw: true }));
      expect(screen.getByText("It's a Draw!")).toBeInTheDocument();
    });

    it("shows 'You Win!' when the current player is the winner", () => {
      renderModal(makeResult({ winner: "me" }));
      expect(screen.getByText("You Win!")).toBeInTheDocument();
    });

    it("shows 'You Lose' when the opponent is the winner", () => {
      renderModal(makeResult({ winner: "opponent-sid", winnerUsername: "Alice" }));
      expect(screen.getByText("You Lose")).toBeInTheDocument();
    });

    it("shows the opponent's username in the lose message", () => {
      renderModal(makeResult({ winner: "opponent-sid", winnerUsername: "Alice" }));
      expect(screen.getByText("Alice wins this round.")).toBeInTheDocument();
    });

    it("shows the generic lose message when winnerUsername is null", () => {
      renderModal(makeResult({ winner: "opponent-sid", winnerUsername: null }));
      expect(screen.getByText("Better luck next time!")).toBeInTheDocument();
    });
  });

  describe("correct emoji per outcome", () => {
    it("shows 🏆 for a win", () => {
      renderModal(makeResult({ winner: "me" }));
      expect(screen.getByText("🏆")).toBeInTheDocument();
    });

    it("shows 😔 for a loss", () => {
      renderModal(makeResult({ winner: "opponent-sid" }));
      expect(screen.getByText("😔")).toBeInTheDocument();
    });

    it("shows 🤝 for a draw", () => {
      renderModal(makeResult({ draw: true }));
      expect(screen.getByText("🤝")).toBeInTheDocument();
    });
  });

  describe("board replay", () => {
    it("renders all 9 board cells", () => {
      renderModal(makeResult());
      // Each cell is a div with a board value (or empty)
      // The mini board has 9 children; query by the board container
      // There are 9 cells + the rest of the modal — count divs within the replay grid
      const cells = document.querySelectorAll(".grid.grid-cols-3 > div");
      expect(cells).toHaveLength(9);
    });
  });

  describe("action buttons", () => {
    it("calls onPlayAgain when 'Play Again' is clicked", async () => {
      const { onPlayAgain } = renderModal(makeResult({ winner: "me" }));
      await userEvent.click(screen.getByText("Play Again"));
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });

    it("calls onHome when 'Home' is clicked", async () => {
      const { onHome } = renderModal(makeResult({ winner: "me" }));
      await userEvent.click(screen.getByText("Home"));
      expect(onHome).toHaveBeenCalledTimes(1);
    });

    it("renders both action buttons", () => {
      renderModal(makeResult({ draw: true }));
      expect(screen.getByText("Play Again")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
    });
  });
});
