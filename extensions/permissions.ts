import type {
  ExtensionAPI,
  ExtensionContext,
  ToolCallEvent,
  ToolCallEventResult,
} from "@mariozechner/pi-coding-agent";
import { realpath } from "node:fs/promises";
import { relative } from "node:path";
import { isSafeCommand } from "./utils/bash.js";

const READONLY_TOOLS = ["read", "grep", "find", "ls"];

async function handleToolCall(
  event: ToolCallEvent,
  ctx: ExtensionContext,
): Promise<ToolCallEventResult> {
  if (READONLY_TOOLS.includes(event.toolName)) {
    return {
      block: false,
    };
  }

  switch (event.toolName) {
    case "edit":
    case "write":
      {
        const target_path = await realpath(event.input.path as string);
        const cwd = await realpath(ctx.cwd);
        if (!relative(cwd, target_path).startsWith("..")) {
          return {
            block: false,
          };
        }
      }
      break;
    case "bash": {
      if (isSafeCommand(event.input.command as string)) {
        return { block: false };
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
}

export default async function (pi: ExtensionAPI) {
  /** flag for yolo mode */
  let yolo_enabled = false;

  pi.registerCommand("yolo", {
    description: "Toggle yolo mode [on|off]",
    handler: async (args, ctx) => {
      const flag = args.trim();
      if (!flag || flag === "on" || flag === "enable") {
        if (!yolo_enabled) {
          ctx.ui.notify("Yolo enabled", "info");
        }

        yolo_enabled = true;
      }

      if (flag === "off" || flag === "disable") {
        if (yolo_enabled) {
          ctx.ui.notify("Yolo disabled", "info");
        }

        yolo_enabled = false;
      }

      if (flag === "show" || flag === "status") {
        ctx.ui.notify(`Yolo is currently ${yolo_enabled ? "enabled" : "disabled"}`, "info");
      }
    },
  });

  pi.on("tool_call", (event, ctx) => {
    if (yolo_enabled) {
      return {
        block: false,
      };
    }

    return handleToolCall(event, ctx);
  });
}
