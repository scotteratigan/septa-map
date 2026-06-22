import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@deck.gl/react", () => ({
  DeckGL: ({ children }: { children?: ReactNode }) => (
    <div data-testid="deck-gl">{children}</div>
  ),
}));

vi.mock("react-map-gl", () => ({
  default: () => <div data-testid="map" />,
}));

vi.mock("./useLiveData", () => ({
  default: () => [],
}));

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("SEPTA Live Feed")).toBeInTheDocument();
  });
});
