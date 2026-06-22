import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const mockVehicles = JSON.parse(
  readFileSync(join(process.cwd(), "e2e/fixtures/vehicles.json"), "utf8"),
);

const hoveredVehicle = mockVehicles[0];

test.beforeEach(async ({ page }) => {
  await page.route("**/septa", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockVehicles),
    });
  });
});

test("loads the map page and vehicle feed", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Unofficial SEPTA Live Map" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Scott Ratigan" }),
  ).toHaveAttribute("href", "https://www.linkedin.com/in/scotteratigan/");
  await expect(page.getByText(`Showing 4 of 4 vehicles`)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator("#map-page")).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("filters vehicles by type", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(`Showing 4 of 4 vehicles`)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel("Vehicle type").selectOption("bus");

  await expect(page.getByText("Showing 1 of 4 vehicles")).toBeVisible();
  await expect(page.getByLabel("Route")).toHaveValue("all");
});

test("filters vehicles by route and status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(`Showing 4 of 4 vehicles`)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel("Route").selectOption("T1");
  await expect(page.getByText("Showing 1 of 4 vehicles")).toBeVisible();

  await page.getByLabel("Route").selectOption("all");
  await page.getByLabel("Status").selectOption("late");
  await expect(page.getByText("Showing 1 of 4 vehicles")).toBeVisible();
});

test("shows vehicle details in the hover tooltip", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Showing 4 of 4 vehicles")).toBeVisible({
    timeout: 15_000,
  });

  const hovered = await page.evaluate((vehicleId) => {
    return window.__SEPTA_MAP_TEST__?.hoverVehicle(vehicleId) ?? false;
  }, hoveredVehicle.VehicleID);

  expect(hovered).toBe(true);

  const tooltip = page.locator(".bus-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Bus");
  await expect(tooltip).toContainText("Route 14");
  await expect(tooltip).toContainText("Vehicle bus-late");
  await expect(tooltip).toContainText("Heading EastBound");
  await expect(tooltip).toContainText("To Center City");
  await expect(tooltip).toContainText("5 min late");
});
