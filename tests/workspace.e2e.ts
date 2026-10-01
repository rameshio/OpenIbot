import { test, expect } from "@playwright/test";
import type { Agent, RunEventPayload, RunRequest } from "../src/types";
import { createTask, advanceTask, stopTask } from "../src/lib/mock/task-engine";

test("unconfigured live tasks preserve the prompt and disable unavailable capabilities", async ({
  page,
}) => {
  let paidRequests = 0;
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: { unlocked: false, connections: [], environment: [] },
    }),
  );
  await page.route("**/api/runs", (route) => {
    paidRequests++;
    return route.fulfill({
      status: 400,
      json: { error: "Unexpected request" },
    });
  });
  await page.goto("/");
  const prompt = page.getByRole("textbox", { name: "Describe your task" });
  await prompt.fill("Keep my unsubmitted task");
  await page.getByRole("button", { name: "Send task", exact: true }).click();
  await expect(prompt).toHaveValue("Keep my unsubmitted task");
  await expect(page).toHaveURL("/");
  expect(paidRequests).toBe(0);
  await page.getByRole("button", { name: "Task tools" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Browser control" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("menuitem", { name: "Terminal execution" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByLabel("Choose attachments").setInputFiles({
    name: "private.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Contents must remain local"),
  });
  await expect(
    page.getByText(
      "Only the filename is shown here. The model will not receive the file or its contents.",
    ),
  ).toBeVisible();
});

test("live manual teams preserve exact models and failed retries use new attempt IDs", async ({
  page,
}) => {
  const connections = [
    {
      provider: "gemini",
      modelId: "fixture-planner",
      status: "connected",
      source: "session",
    },
    {
      provider: "openai",
      modelId: "fixture-writer",
      status: "connected",
      source: "session",
    },
  ];
  await page.addInitScript(() =>
    localStorage.setItem(
      "ibot-workspace-v1",
      JSON.stringify({
        defaultModel: "gemini:fixture-planner",
        executionMode: "live",
      }),
    ),
  );
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { unlocked: true, connections, environment: [] } }),
  );
  const requests: RunRequest[] = [];
  await page.route("**/api/runs", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ json: { stopped: true } });
      return;
    }
    requests.push(route.request().postDataJSON() as RunRequest);
    await route.fulfill({
      status: 429,
      json: { error: "Fixture rate limit. Wait, then retry." },
    });
  });
  await page.goto("/agents");
  await page.getByRole("button", { name: "Build a team", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Planner model", { exact: true })).toHaveValue(
    "",
  );
  await dialog.getByRole("button", { name: "Remove Researcher" }).click();
  await dialog.getByRole("button", { name: "Remove Reviewer" }).click();
  await dialog.getByLabel("Agent 1 name").fill("Strategy");
  await dialog
    .getByLabel("Strategy model")
    .selectOption("gemini:fixture-planner");
  await dialog.getByLabel("Coder model").selectOption("openai:fixture-writer");
  await dialog
    .getByLabel("What should your team work on?")
    .fill("Write an implementation proposal");
  await dialog.getByRole("button", { name: "Start team" }).click();
  await expect(
    page.getByText("Fixture rate limit. Wait, then retry.", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].mode).toBe("manual");
  expect(
    requests[0].team?.map((member) => [member.name, member.role, member.model]),
  ).toEqual([
    ["Strategy", "Planner", "gemini:fixture-planner"],
    ["Coder", "Developer", "openai:fixture-writer"],
  ]);
  const firstUrl = page.url();
  await page.getByRole("button", { name: "Retry task" }).click();
  await expect(page).not.toHaveURL(firstUrl);
  await expect(
    page.getByText("Fixture rate limit. Wait, then retry.", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1].runId).not.toBe(requests[0].runId);
  expect(requests[1].team).toEqual(requests[0].team);
  expect(requests[1].lead).toEqual(requests[0].lead);
});

test.beforeEach(async ({ page }, info) => {
  if (/^task lifecycle|^manual team,|^workflow drafts/.test(info.title))
    await page.addInitScript(() =>
      localStorage.setItem(
        "ibot-workspace-v1",
        JSON.stringify({ executionMode: "demo" }),
      ),
    );
});

test("task lifecycle, synchronized views, details, artifacts, and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What are we working on?" }),
  ).toBeVisible();
  await expect(page.locator(".home-content")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await expect(
    page.getByRole("button", { name: "Lead model: Auto" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Describe your task" })
    .fill("Build a minimal analytics dashboard for a small creative studio");
  await page.getByRole("button", { name: "Send task", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\//);
  await expect(
    page.getByRole("button", { name: /Research Agent/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Research Agent/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Assigned goal", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Graph" }).click();
  await expect(
    page.getByText("Orchestrator", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Agents/ }).click();
  await page.waitForTimeout(7000);
  await page.screenshot({
    path: "artifacts/agents-desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "Run again", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await page.getByRole("tab", { name: /Files/ }).click();
  await page
    .getByRole("button", { name: /delivery-plan.json.*Sample json/ })
    .click();
  await expect(
    page.getByRole("dialog").getByText(/"sample": true/),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download sample" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("delivery-plan.json");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Graph" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/graph-mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: /View Research Agent details/ })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: "artifacts/agent-details-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole("link", { name: "Chats", exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: /Build a minimal analytics dashboard.*completed/,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("manual team, failure and retry", async ({ page }) => {
  await page.goto("/agents");
  await page.getByRole("button", { name: "Build a team", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "artifacts/team-builder.png", fullPage: true });
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox")
    .last()
    .fill("Plan a launch for an independent design studio");
  await dialog.getByRole("button", { name: /Start team/i }).click();
  await expect(page).toHaveURL(/\/tasks\//);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(
    page.getByText("This task has been stopped.", { exact: true }),
  ).toBeVisible();
  const stoppedUrl = page.url();
  await page.getByRole("button", { name: "Retry task" }).click();
  await expect(page).not.toHaveURL(stoppedUrl);
  await expect(
    page.getByRole("button", { name: "Stop", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Task options" }).click();
  await page.getByRole("menuitem", { name: "Simulate a failed run" }).click();
  await expect(
    page.getByText("This demo run encountered a simulated error."),
  ).toBeVisible();
  const failedUrl = page.url();
  await page.getByRole("button", { name: "Retry task" }).click();
  await expect(page).not.toHaveURL(failedUrl);
  await expect(
    page.getByRole("button", { name: "Stop", exact: true }),
  ).toBeVisible();
});

test("live connection settings, synchronized output and credential exclusion", async ({
  page,
}) => {
  let unlocked = false;
  let connected = false;
  const modelId = "fixture-text-model";
  const fakeKey = "fixture-secret-never-persist";
  let requestBody: RunRequest | undefined;
  const metadata = () => ({
    unlocked,
    connections: connected
      ? [
          {
            provider: "gemini",
            modelId,
            status: "connected",
            source: "session",
          },
        ]
      : [],
    environment: [],
  });
  await page.route("**/api/session", async (route) => {
    if (route.request().method() === "POST") {
      const action = route.request().postDataJSON().action;
      if (action === "unlock") unlocked = true;
      if (action === "refresh" || action === "lock") connected = false;
      if (action === "lock") unlocked = false;
    }
    await route.fulfill({ json: metadata() });
  });
  await page.route("**/api/connections", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.apiKey).toBe(fakeKey);
    expect(body.modelId).toBe(modelId);
    connected = true;
    await route.fulfill({ json: metadata() });
  });
  await page.route("**/api/runs", async (route) => {
    requestBody = route.request().postDataJSON() as RunRequest;
    expect(requestBody.lead).toEqual({ provider: "gemini", modelId });
    expect(JSON.stringify(requestBody)).not.toContain(fakeKey);
    const agent: Agent = {
      id: "writer",
      name: "Writer",
      role: "Developer",
      model: `gemini:${modelId}`,
      dependsOn: [],
      goal: "Prepare the requested document",
      status: "working",
      activity: "Generating a document",
      progress: 0,
      toolCalls: 0,
      modelCalls: 1,
      elapsed: 0,
      tokens: null,
      usage: null,
      mode: "live",
      events: [],
      output: "",
    };
    const result = "Mocked provider response: a practical studio launch plan.";
    const events: RunEventPayload[] = [
      {
        type: "phase",
        phase: "Creating agents",
        summary: "Preparing the selected model.",
      },
      { type: "agents", agents: [agent] },
      {
        type: "phase",
        phase: "Agents working",
        summary: "Generating the requested document.",
      },
      { type: "delta", target: "writer", text: result },
      { type: "delta", target: "result", text: result },
      {
        type: "agent",
        agent: {
          ...agent,
          status: "completed",
          progress: 100,
          activity: "Document received",
          output: result,
        },
      },
      { type: "usage", usage: null, modelCalls: 1 },
      {
        type: "files",
        files: [
          {
            id: "document",
            name: "final-response.md",
            language: "markdown",
            size: "0.1 KB",
            content: result,
          },
        ],
      },
      { type: "phase", phase: "Completed", summary: "The response is ready." },
      { type: "done", status: "completed" },
    ];
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      contentType: "text/event-stream",
      body: events
        .map(
          (event, i) =>
            `data: ${JSON.stringify({ ...event, taskId: requestBody!.taskId, runId: requestBody!.runId, eventId: `${requestBody!.runId}:${i + 1}`, sequence: i + 1, timestamp: Date.now() })}\n\n`,
        )
        .join(""),
    });
  });
  await page.goto("/api-keys");
  await page
    .getByLabel("Local workspace password")
    .fill("fixture-local-password");
  await page.getByRole("button", { name: "Unlock workspace" }).click();
  await page
    .getByRole("button", { name: "Connect Google Gemini", exact: true })
    .click();
  await page.getByLabel("Exact model ID").fill(modelId);
  await page.getByLabel("API key", { exact: true }).fill(fakeKey);
  await expect(page.getByLabel("API key", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByRole("button", { name: "Show API key" }).click();
  await expect(page.getByLabel("API key", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(
    page.getByText(`Connected: ${modelId}`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
  await page
    .getByRole("button", { name: "Use this as my default model" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Manage Google Gemini", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/connections-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Default model", { exact: true })).toHaveValue(
    `gemini:${modelId}`,
  );
  await page.getByRole("switch", { name: "Reduce motion" }).click();
  await page
    .getByRole("link", { name: /New task/i })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Describe your task" })
    .fill("Write a studio launch plan");
  await page.getByRole("button", { name: "Team mode: Auto" }).click();
  await page
    .getByRole("menuitem", { name: "Single agent", exact: true })
    .click();
  await page.getByRole("button", { name: "Send task", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\//);
  const taskUrl = page.url();
  await page.getByRole("link", { name: "Chats", exact: true }).click();
  await page.locator("a.history-card").first().click();
  await expect(page).toHaveURL(taskUrl);
  await expect(
    page.getByText(
      "Mocked provider response: a practical studio launch plan.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(requestBody?.mode).toBe("single");
  await page.getByRole("tab", { name: /Agents/ }).click();
  await page.getByRole("button", { name: /View Writer details/ }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Mocked provider response: a practical studio launch plan.", {
        exact: true,
      }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Graph" }).click();
  await expect(
    page.getByRole("button", { name: /View Writer details/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Files/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download final-response.md", exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe("final-response.md");
  const previousAttempt = requestBody!;
  await page.getByRole("tab", { name: "Chat", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Describe your task" })
    .fill("Expand the first week of that plan");
  await page.getByRole("button", { name: "Send task", exact: true }).click();
  await expect(page).not.toHaveURL(taskUrl);
  await expect(
    page.getByRole("button", { name: "Run again", exact: true }),
  ).toBeVisible();
  expect(requestBody!.runId).not.toBe(previousAttempt.runId);
  expect(requestBody!.context).toContain(
    "Mocked provider response: a practical studio launch plan.",
  );
  await page.locator("summary").filter({ hasText: "Previous result" }).click();
  await expect(page.locator("details .task-output")).toContainText(
    "Mocked provider response",
  );
  await expect(
    page.getByRole("link", { name: "Open previous task" }),
  ).toHaveAttribute("href", new URL(taskUrl).pathname);
  const snapshot = await page.evaluate(() =>
    localStorage.getItem("ibot-workspace-v1"),
  );
  expect(snapshot).not.toContain(fakeKey);
  expect(snapshot).not.toContain("apiKey");
  expect(snapshot).toContain("Mocked provider response");
  expect(snapshot).toContain(`"parentTaskId":"${previousAttempt.taskId}"`);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Run again", exact: true }),
  ).toBeVisible();
  await page.goto("/api-keys");
  await expect(
    page.getByRole("button", { name: "Connect Google Gemini", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Reduce motion" }),
  ).toBeChecked();
});

test("history filters, sidebar search and mobile work inspector use saved tasks", async ({
  page,
}) => {
  let completed = createTask("Draft a product brief");
  for (let tick = 0; tick < 35; tick++) completed = advanceTask(completed);
  const stopped = stopTask(createTask("Compare database options"));
  await page.addInitScript(
    ({ tasks }) =>
      localStorage.setItem(
        "ibot-workspace-v1",
        JSON.stringify({ tasks, executionMode: "demo" }),
      ),
    { tasks: [completed, stopped] },
  );
  await page.goto("/chats");
  await expect(page.locator("a.history-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Needs attention 1", exact: true })
    .click();
  await expect(page.locator("a.history-card")).toHaveCount(1);
  await expect(page.locator("a.history-card")).toContainText(
    "Compare database options",
  );
  await page.getByRole("button", { name: "Completed 1", exact: true }).click();
  await page.getByLabel("Search conversations").fill("unknown topic");
  await expect(
    page.getByRole("heading", { name: "No matching tasks" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("a.history-card")).toHaveCount(2);
  await page.getByLabel("Search recent tasks").fill("database");
  await expect(page.locator(".sidebar-task")).toHaveCount(1);
  await expect(page.locator(".sidebar-task")).toContainText("Compare database");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator("a.history-card")
    .filter({ hasText: "Draft a product brief" })
    .click();
  await page.getByRole("button", { name: "Open work panel" }).click();
  const panel = page.getByRole("dialog");
  await expect(
    panel.getByRole("heading", { name: "Task activity", exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(
    panel.getByText("Reported activity, grouped by agent."),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Files", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: /delivery-plan.json.*Sample json/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("mobile navigation and overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What are we working on?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".home-content")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Models", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your models" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("workflow drafts and selected team survive navigation into the composer", async ({
  page,
}) => {
  await page.goto("/workflows");
  await page
    .getByRole("article")
    .filter({ hasText: "The deeper dive" })
    .getByRole("button", { name: "Use workflow" })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("textbox", { name: "Describe your task" }),
  ).toHaveValue(/Research and compare/);
  await expect(
    page.getByText("Workflow team ready · 3 specialists"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send task", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Agents 3" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /View Analyst details/ }),
  ).toBeVisible();
});

test("invalid browser history is ignored without crashing", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "ibot-workspace-v1",
      JSON.stringify({
        tasks: [
          {
            id: "broken",
            title: "Broken",
            prompt: "test",
            tick: 35,
            agents: [],
            files: [],
            status: "completed",
            phase: "Completed",
          },
        ],
      }),
    ),
  );
  await page.goto("/tasks/broken");
  await expect(
    page.getByRole("heading", { name: "This task isn’t here." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to your workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "What are we working on?" }),
  ).toBeVisible();
});
