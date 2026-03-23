import { render, screen } from "@testing-library/react";
import { Timer } from "@/components/Timer";

describe("Timer", () => {
  it("displays the time remaining in seconds", () => {
    render(<Timer timeLeft={15} timeLimit={30} isMyTurn={true} />);
    expect(screen.getByText("15s")).toBeInTheDocument();
  });

  it("shows 'Your turn' label when isMyTurn is true", () => {
    render(<Timer timeLeft={20} timeLimit={30} isMyTurn={true} />);
    expect(screen.getByText("Your turn")).toBeInTheDocument();
  });

  it("shows \"Opponent's turn\" label when isMyTurn is false", () => {
    render(<Timer timeLeft={20} timeLimit={30} isMyTurn={false} />);
    expect(screen.getByText("Opponent's turn")).toBeInTheDocument();
  });

  it("fills the progress bar to 100% when timeLeft equals timeLimit", () => {
    const { container } = render(
      <Timer timeLeft={30} timeLimit={30} isMyTurn={true} />
    );
    const bar = container.querySelector<HTMLElement>("[style]");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("fills the progress bar to 50% when timeLeft is half the limit", () => {
    const { container } = render(
      <Timer timeLeft={15} timeLimit={30} isMyTurn={true} />
    );
    const bar = container.querySelector<HTMLElement>("[style]");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("shows 0% fill when timeLeft is 0", () => {
    const { container } = render(
      <Timer timeLeft={0} timeLimit={30} isMyTurn={true} />
    );
    const bar = container.querySelector<HTMLElement>("[style]");
    expect(bar).toHaveStyle({ width: "0%" });
  });
});
