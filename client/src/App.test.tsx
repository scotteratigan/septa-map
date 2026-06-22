import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { mockVehicles } from "./testFixtures";

const useLiveDataMock = vi.fn(() => mockVehicles);

vi.mock("@deck.gl/react", () => ({
  DeckGL: ({
    layers,
    children,
  }: {
    layers?: Array<{ props: { onHover?: (info: unknown) => void } }>;
    children?: ReactNode;
  }) => {
    const onHover = layers?.[0]?.props.onHover;

    return (
      <div data-testid="deck-gl">
        <button
          type="button"
          data-testid="simulate-hover"
          onClick={() =>
            onHover?.({
              object: mockVehicles[0],
              x: 120,
              y: 240,
            })
          }
        >
          Hover vehicle
        </button>
        {children}
      </div>
    );
  },
}));

vi.mock("react-map-gl", () => ({
  default: () => <div data-testid="map" />,
}));

vi.mock("./useLiveData", () => ({
  default: () => useLiveDataMock(),
}));

describe("App", () => {
  beforeEach(() => {
    useLiveDataMock.mockReturnValue(mockVehicles);
  });

  it("renders the page header and vehicle count", () => {
    render(<App />);

    expect(screen.getByText("SEPTA Live Feed")).toBeInTheDocument();
    expect(
      screen.getByText(
        `Showing ${mockVehicles.length} of ${mockVehicles.length} vehicles`,
      ),
    ).toBeInTheDocument();
  });

  it("filters vehicles by type and resets the route filter", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Vehicle type"), {
      target: { value: "bus" },
    });

    expect(screen.getByText("Showing 1 of 4 vehicles")).toBeInTheDocument();
    expect(screen.getByLabelText("Route")).toHaveValue("all");
    expect(screen.getByRole("option", { name: "14" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "T1 (10)" }),
    ).not.toBeInTheDocument();
  });

  it("filters vehicles by route", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Route"), {
      target: { value: "T1" },
    });

    expect(screen.getByText("Showing 1 of 4 vehicles")).toBeInTheDocument();
  });

  it("filters vehicles by on-time status", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "onTime" },
    });

    expect(screen.getByText("Showing 1 of 4 vehicles")).toBeInTheDocument();
  });

  it("shows legacy trolley labels in the route dropdown", () => {
    render(<App />);

    expect(screen.getByRole("option", { name: "T1 (10)" })).toBeInTheDocument();
  });

  it("shows vehicle details in the hover tooltip", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("simulate-hover"));

    expect(screen.getByText(/Bus .* Route 14/)).toBeInTheDocument();
    expect(screen.getByText("Vehicle bus-late")).toBeInTheDocument();
    expect(screen.getByText("Heading EastBound")).toBeInTheDocument();
    expect(screen.getByText("To Center City")).toBeInTheDocument();
    expect(screen.getByText("5 min late")).toBeInTheDocument();
  });
});
