import { expect, test, type Page } from "@playwright/test";

// Signs up a brand-new user through the UI, uploads samples/edge-cases.csv on
// the import page, checks every rejected row and its reason, then uploads the
// same file again and checks that the valid rows now count as duplicates.

const SAMPLE = "samples/edge-cases.csv";

async function signUp(page: Page) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Create account" }).click();
  const form = page.getByRole("tabpanel", { name: "Create account" });
  await form.getByLabel("Email").fill(`e2e-${crypto.randomUUID()}@example.test`);
  await form.getByLabel("Password").fill("test-password-123");
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/");
}

async function upload(page: Page) {
  await page.locator('input[type="file"]').setInputFiles(SAMPLE);
  await page.getByRole("button", { name: "Import tasks" }).click();
  return page.locator("section[aria-live]"); // the result; the assertions below wait for it
}

/** The number shown above a label on one of the result cards ("Imported", "Rejected"). */
function stat(result: ReturnType<Page["locator"]>, label: string) {
  return result.locator("p", { hasText: new RegExp(`^${label}$`) }).locator("xpath=preceding-sibling::p");
}

test("imports the edge-case CSV and reports every rejected row", async ({ page }) => {
  await signUp(page);
  await page.goto("/import");

  const result = await upload(page);
  await expect(stat(result, "Imported")).toHaveText("3");
  await expect(stat(result, "Rejected")).toHaveText("5");

  const rejected = result.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") });
  await expect(rejected).toHaveCount(5);
  for (const [row, reason] of [
    ["4", "Duplicate: same title and due date as row 2 in this file"],
    ["5", "Row is empty"],
    ["6", 'Priority "high" is not a whole number from 1 to 5'],
    ["7", "Title must be 200 characters or fewer (it has 212)"],
    ["8", 'Due date "2026-02-30" is not a valid YYYY-MM-DD date'],
  ]) {
    await expect(rejected.filter({ hasText: reason }).getByRole("cell").first()).toHaveText(row);
  }

  // The imported tasks are in the list.
  await page.getByRole("link", { name: /All tasks/ }).first().click();
  for (const title of ["Buy groceries", "Call the dentist", "Plan team offsite"]) {
    await expect(page.getByLabel(`Mark "${title}" as done`)).toBeVisible();
  }

  // Uploading the same file again adds nothing.
  await page.goto("/import");
  const again = await upload(page);
  await expect(stat(again, "Imported")).toHaveText("0");
  await expect(stat(again, "Rejected")).toHaveText("8");
  await expect(again.getByText("Duplicate: a task with this title and due date already exists in your account")).toHaveCount(3);
});
