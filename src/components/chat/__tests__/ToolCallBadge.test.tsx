import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// getToolLabel pure function tests

test("str_replace_editor + create → Creating filename", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/app.jsx" })).toBe("Creating app.jsx");
});

test("str_replace_editor + str_replace → Editing filename", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/src/button.tsx" })).toBe("Editing button.tsx");
});

test("str_replace_editor + view → Reading filename", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/src/index.ts" })).toBe("Reading index.ts");
});

test("str_replace_editor + insert → Editing filename", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/src/styles.css" })).toBe("Editing styles.css");
});

test("str_replace_editor + undo_edit → Reverting filename", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/src/app.tsx" })).toBe("Reverting app.tsx");
});

test("file_manager + rename → Renaming filename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/src/old.tsx" })).toBe("Renaming old.tsx");
});

test("file_manager + delete → Deleting filename", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/src/unused.tsx" })).toBe("Deleting unused.tsx");
});

test("Unknown tool name falls back to raw tool name", () => {
  expect(getToolLabel("some_other_tool", { command: "do_thing", path: "/src/file.ts" })).toBe("some_other_tool");
});

test("Path with no slashes uses filename as-is", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "app.jsx" })).toBe("Creating app.jsx");
});

test("Nested path extracts only the last segment", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/a/b/c/deep.tsx" })).toBe("Creating deep.tsx");
});

// Rendered component tests

test("ToolCallBadge shows spinner when state is not result", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "app.jsx" },
    state: "call",
  };
  const { container } = render(<ToolCallBadge toolInvocation={invocation} />);
  expect(container.querySelector(".animate-spin")).toBeTruthy();
});

test("ToolCallBadge shows green dot when state is result", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "app.jsx" },
    state: "result",
    result: "ok",
  };
  const { container } = render(<ToolCallBadge toolInvocation={invocation} />);
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge renders correct label text", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/src/button.tsx" },
    state: "result",
    result: "ok",
  };
  render(<ToolCallBadge toolInvocation={invocation} />);
  expect(screen.getByText("Creating button.tsx")).toBeDefined();
});
