# pi-permissions — Copilot Instructions

## Quick reference

- **Main extension**: `extensions/permissions.ts`
- **Bash safety heuristics**: `extensions/utils/bash.ts`
- **Shared guidance**: see [`AGENTS.md`](../AGENTS.md)

## What Copilot should know

- This is a single-file extension. The entry point is `extensions/permissions.ts` — don't split it unless there's a compelling reason.
- The extension gates tool calls by checking `pi.on("tool_call", ...)`. Any new tool support goes in the `switch` block or by adding to `READONLY_TOOLS`.
- The build command `npm run build` runs `tsgo` with `noEmit: true` — it's a type-check gate, not a code generator.
- TypeScript uses `erasableSyntaxOnly: true` — no runtime type checks, `instanceof`, `typeof` checks on types, or decorators.
