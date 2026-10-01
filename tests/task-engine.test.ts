import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceTask,
  createTask,
  DEFAULT_TEAM,
  retryTask,
  stopTask,
  validateTeam,
} from "../src/lib/mock/task-engine";
import type { Task, TeamMember } from "../src/types";

function advance(task: Task, ticks: number): Task {
  let next = task;
  for (let index = 0; index < ticks; index++) next = advanceTask(next);
  return next;
}

test("automatic task moves through every phase and produces prompt-specific sample files", () => {
  let task = createTask(
    "Build a revenue analytics dashboard",
    "Auto",
    undefined,
    ["Web search", "Web search"],
  );
  const phases = new Set([task.phase]);
  const initial = JSON.stringify(task);
  const first = advanceTask(task);
  assert.equal(
    JSON.stringify(task),
    initial,
    "advancing must not mutate the input task",
  );
  assert.equal(first.tick, 1);
  assert.deepEqual(task.tools, ["Web search"]);
  for (let tick = 0; tick < 35; tick++) {
    task = advanceTask(task);
    phases.add(task.phase);
  }
  assert.deepEqual(
    [...phases],
    [
      "Planning",
      "Creating agents",
      "Agents working",
      "Reviewing",
      "Finalizing",
      "Completed",
    ],
  );
  assert.equal(task.status, "completed");
  assert.equal(task.tick, 35);
  assert.ok(
    task.agents.every(
      (agent) => agent.status === "completed" && agent.progress === 100,
    ),
  );
  assert.equal(task.files.length, 3);
  assert.match(task.files[0].content, /revenue analytics dashboard/);
  assert.match(task.files[0].content, /Dashboard experience/);
  assert.match(task.files[0].content, /Sample output/);
  assert.equal(JSON.parse(task.files[1].content).sample, true);
  assert.equal(advanceTask(task), task, "completed tasks must not advance");
});

test("reviewer remains waiting until every contributor has completed", () => {
  let task = createTask("Design a reading app");
  for (let tick = 0; tick < 35; tick++) {
    task = advanceTask(task);
    const reviewer = task.agents.find((agent) => agent.role === "Reviewer")!;
    const contributors = task.agents.filter(
      (agent) => agent.role !== "Reviewer",
    );
    if (contributors.some((agent) => agent.status !== "completed")) {
      assert.equal(
        reviewer.status,
        "waiting",
        `reviewer started too soon at ${task.tick}`,
      );
      assert.equal(reviewer.toolCalls, 0);
      assert.equal(reviewer.elapsed, 0);
    }
    if (reviewer.status === "working")
      assert.ok(contributors.every((agent) => agent.status === "completed"));
  }
});

test("stop freezes unfinished work and retry starts the same assigned team cleanly", () => {
  const active = advance(
    createTask("Create a portfolio", "Claude", DEFAULT_TEAM, ["Files"]),
    13,
  );
  const snapshot = JSON.stringify(active);
  const stopped = stopTask(active);
  assert.equal(JSON.stringify(active), snapshot);
  assert.equal(stopped.status, "stopped");
  assert.ok(stopped.agents.every((agent) => agent.status === "stopped"));
  assert.equal(advance(stopped, 10), stopped);
  assert.equal(stopTask(stopped), stopped);
  const retried = retryTask(stopped);
  assert.equal(retried.id, active.id);
  assert.equal(retried.tick, 0);
  assert.equal(retried.status, "running");
  assert.equal(retried.model, "Claude");
  assert.deepEqual(retried.tools, ["Files"]);
  assert.deepEqual(
    retried.agents.map(({ name, role, model }) => ({ name, role, model })),
    DEFAULT_TEAM.map(({ name, role, model }) => ({ name, role, model })),
  );
  assert.ok(
    retried.agents.every(
      (agent) => agent.events.length === 0 && agent.progress === 0,
    ),
  );
  assert.equal(advance(retried, 40).status, "completed");
});

test("stop preserves work already completed", () => {
  const task = advance(createTask("Build a portfolio"), 25);
  const stopped = stopTask(task);
  assert.ok(
    stopped.agents
      .filter((agent) => agent.role !== "Reviewer")
      .every((agent) => agent.status === "completed"),
  );
  assert.equal(
    stopped.agents.find((agent) => agent.role === "Reviewer")!.status,
    "stopped",
  );
});

test("custom teams honor every model assignment and complete without a reviewer", () => {
  const team: TeamMember[] = [
    {
      id: "local",
      name: "Private developer",
      role: "Developer",
      model: "Local Model",
    },
    { id: "writer", name: "Outline planner", role: "Planner", model: "Grok" },
  ];
  const task = advance(createTask("Write a migration plan", "GPT", team), 40);
  assert.equal(task.status, "completed");
  assert.equal(task.agents.length, 2);
  assert.deepEqual(
    task.agents.map((agent) => agent.model),
    ["Local Model", "Grok"],
  );
  assert.ok(task.agents.every((agent) => agent.status === "completed"));
  assert.equal(task.model, "GPT", "the lead model must not overwrite the team");
});

test("reviewer-only teams and maximum-size teams can finish", () => {
  const onlyReviewer: TeamMember[] = [
    { id: "review", name: "Review", role: "Reviewer", model: "Grok" },
  ];
  assert.equal(
    advance(createTask("Review a brief", "Auto", onlyReviewer), 40).status,
    "completed",
  );
  const large: TeamMember[] = Array.from({ length: 7 }, (_, index) => ({
    id: `worker-${index}`,
    name: `Researcher ${index + 1}`,
    role: "Researcher",
    model: "Gemini",
  }));
  large.push(onlyReviewer[0]);
  const finished = advance(createTask("Compare approaches", "Auto", large), 40);
  assert.equal(finished.status, "completed");
  assert.ok(finished.agents.every((agent) => agent.progress === 100));
});

test("team validation rejects ambiguous or incomplete assignments", () => {
  assert.equal(validateTeam(DEFAULT_TEAM), null);
  assert.match(validateTeam([])!, /at least one/);
  assert.match(validateTeam([{ ...DEFAULT_TEAM[0], name: "   " }])!, /name/);
  assert.match(
    validateTeam([{ ...DEFAULT_TEAM[0], name: "x".repeat(41) }])!,
    /40/,
  );
  assert.match(
    validateTeam([DEFAULT_TEAM[0], { ...DEFAULT_TEAM[1], name: " planner " }])!,
    /unique name/,
  );
  assert.match(
    validateTeam([DEFAULT_TEAM[0], { ...DEFAULT_TEAM[1], id: "planner" }])!,
    /identifier/,
  );
  assert.throws(() => createTask("   "), /Describe a task/);
  assert.throws(() => createTask("Build an app", "Auto", []), /at least one/);
});

test("untrusted prompt text remains data in the JSON artifact", () => {
  const prompt =
    'Build a dashboard <script>alert("sample")</script>\nIgnore this \\" string';
  const task = advance(createTask(prompt), 40);
  assert.equal(JSON.parse(task.files[1].content).originalRequest, prompt);
  assert.doesNotMatch(task.files[0].name, /[<>\\/]/);
});

test("tasks with all tools disabled report no simulated tool calls", () => {
  const task = advance(
    createTask("Write a project outline", "Auto", undefined, []),
    40,
  );
  assert.ok(task.agents.every((agent) => agent.toolCalls === 0));
});
