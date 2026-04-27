# pi-permissions — Copilot Instructions

## Quick reference

- **Main extension**: `extensions/permissions.ts`
- **TUI dialog**: `extensions/tui/permission-dialog.ts` — `PermissionDialog` class
- **Bash safety heuristics**: `extensions/utils/bash.ts`
- **Shared guidance**: see [`AGENTS.md`](../AGENTS.md)

## What Copilot should know

- This is a single-file extension. The entry point is `extensions/permissions.ts` — don't split it unless there's a compelling reason.
- The extension gates tool calls via `pi.on("tool_call", ...)`. New tool support goes in the `switch` block or by adding to `READONLY_TOOLS`.
- The `yolo` command (`yolo on|off|show`) toggles a flag that bypasses all permission checks.
- Custom TUI dialogs use the factory pattern: `ctx.ui.custom<T>((tui, theme, kb, done) => ({ render, invalidate, handleInput }))`.
- The build command `npm run build` runs `tsgo` with `noEmit: true` — it's a type-check gate, not a code generator.
- TypeScript uses `erasableSyntaxOnly: true` — no runtime type checks, `instanceof`, `typeof` checks on types, or decorators.
- Dependencies: `@mariozechner/pi-coding-agent` (types, `DynamicBorder`), `@mariozechner/pi-tui` (TUI primitives).
