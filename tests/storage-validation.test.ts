import test from "node:test";
import assert from "node:assert/strict";
import { createTask, advanceTask } from "../src/lib/mock/task-engine";
import { cleanTask, isStoredTask } from "../src/lib/state/validation";

test("running and completed task snapshots survive JSON persistence", () => {
  let task = createTask("Build a dashboard");
  assert.equal(isStoredTask(JSON.parse(JSON.stringify(task))), true);
  for (let index = 0; index < 35; index++) task = advanceTask(task);
  assert.equal(isStoredTask(JSON.parse(JSON.stringify(task))), true);
});
test("incomplete or corrupt browser snapshots are rejected before rendering", () => {
  const task = createTask("Build a dashboard");
  assert.equal(isStoredTask(null), false);
  assert.equal(isStoredTask({ ...task, result: undefined }), false);
  assert.equal(isStoredTask({ ...task, files: [null] }), false);
  assert.equal(
    isStoredTask({ ...task, agents: [{ ...task.agents[0], role: "invalid" }] }),
    false,
  );
  assert.equal(
    isStoredTask({ ...task, agents: [{ ...task.agents[0], tokens: "10" }] }),
    false,
  );
  assert.equal(
    isStoredTask({ ...task, agents: [{ ...task.agents[0], events: [null] }] }),
    false,
  );
  assert.equal(isStoredTask({ ...task, tick: Infinity }), false);
  assert.equal(
    isStoredTask({ ...task, parentTaskId: { key: "invalid" } }),
    false,
  );
});

test("follow-up references survive persistence without embedding the previous task", () => {
  const previous = createTask("Prepare a launch plan");
  const followUp = {
    ...createTask("Expand week one"),
    parentTaskId: previous.id,
  };
  const saved = JSON.parse(JSON.stringify(cleanTask(followUp)));
  assert.equal(isStoredTask(saved), true);
  assert.equal(saved.parentTaskId, previous.id);
  assert.notEqual(saved.id, previous.id);
  assert.equal(saved.previousTask, undefined);
});
