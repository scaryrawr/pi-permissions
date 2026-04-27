import type {
  ExtensionAPI,
  ExtensionContext,
  ToolCallEvent,
  ToolCallEventResult,
} from "@mariozechner/pi-coding-agent";
import { realpath } from "node:fs/promises";
import { relative } from "node:path";

const READONLY_TOOLS = ["read", "grep", "find", "ls"];

export default async function (pi: ExtensionAPI) {
  pi.on(
    "tool_call",
    async (event: ToolCallEvent, ctx: ExtensionContext): Promise<ToolCallEventResult> => {
      if (READONLY_TOOLS.includes(event.toolName)) {
        return {
          block: false,
        };
      }

      switch (event.toolName) {
        case "edit":
        case "write": {
          const target_path = await realpath(event.input.path as string);
          const cwd = await realpath(ctx.cwd);
          if (!relative(cwd, target_path).startsWith("..")) {
            return {
              block: false,
            };
          }
        }
      }

      if (!ctx.hasUI) {
        return {
          block: true,
          reason: "This tool requires a user interface, but the current context does not have one.",
        };
      }

      let message: string;
      switch (event.toolName) {
        case "edit":
        case "write":
          message = `⚠️ Writing outside of cwd ${event.input.path}`;
          break;
        case "bash":
          message = `⚠️ Bash tool call: \n\n${event.input.command}`;
          break;
        default:
          message = `⚠️ Unknown Tool call: ${event.toolName}`;
      }

      const result = await ctx.ui.select(message, ["Allow", "Block"]);
      return {
        block: result === "Block",
      };
    },
  );
}
