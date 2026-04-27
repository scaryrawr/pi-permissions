# pi-permissions

A [pi](https://pi.dev) extension that gates tool calls with user confirmation.

## What it does

- **Read-only tools** (`read`, `grep`, `find`, `ls`) pass freely.
- **`edit` / `write`** are allowed only when the target file resolves within the current working directory (checked via `realpath`).
- **Everything else** (writing outside cwd, `bash`, unknown tools) prompts the user via `ctx.ui.select()` to Allow or Block — but only when a UI is available (`ctx.hasUI`). Without a UI (print/JSON mode), these calls are blocked outright.

## Architecture

```
extensions/
  permissions.ts    # Main extension — single file, subscribes to pi.on("tool_call")
  utils/
    bash.ts         # Bash command safety heuristics (safe vs. destructive patterns)
```

The extension subscribes to `pi.on("tool_call", ...)` and returns `ToolCallEventResult` with `block: true | false`.

Key types from `@mariozechner/pi-coding-agent`: `ExtensionAPI`, `ExtensionContext`, `ToolCallEvent`, `ToolCallEventResult`.

## Build

```bash
npm run build   # tsgo type-check only (noEmit: true)
```

The extension is loaded by pi via jiti at runtime, so no build step is required for interactive use. The build command is a type-check gate.

## Conventions

- Use `realpath` to resolve symlinks before cwd containment checks.
- Keep the `READONLY_TOOLS` allowlist minimal — only truly non-mutating tools.
- When adding new tool handlers, check `ctx.hasUI` before calling `ctx.ui.select()`; block if no UI is available.
- TypeScript config uses `erasableSyntaxOnly: true` — no runtime type checks or decorators.
- Bash safety uses two-pattern matching: `DESTRUCTIVE_PATTERNS` (deny) and `SAFE_PATTERNS` (allow). A command is safe only if it matches safe but not destructive.

## Safety

- The `yolo` command (`yolo on|off|show`) disables all permission checks — warn users this bypasses the extension's purpose.
- The `bash.ts` pattern matching is a heuristic, not a guarantee. Err on the side of blocking when in doubt.
- Always validate `ctx.hasUI` before prompting — print/JSON mode has no UI to show prompts.
