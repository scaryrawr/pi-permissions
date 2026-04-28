import type {
  ExtensionAPI,
  ExtensionContext,
  ToolCallEvent,
  ToolCallEventResult,
} from "@mariozechner/pi-coding-agent";
import { realpath } from "node:fs/promises";
import { relative } from "node:path";
import { isSafeCommand } from "./utils/bash.js";
import { PermissionDialog } from "./tui/permission-dialog.js";
import { truncateToWidth } from "@mariozechner/pi-tui";

const READONLY_TOOLS = ["read", "grep", "find", "ls"];

/** Format tool input for display */
function formatToolInput(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "edit":
    case "write": {
      const path = input.path as string | undefined;
      return path ? `path: ${path}` : "no path";
    }
    case "bash": {
      const cmd = input.command as string | undefined;
      return cmd ? truncateToWidth(cmd, 60) || "(empty command)" : "(no command)";
    }
    case "read": {
      const path = input.path as string | undefined;
      return path ? `path: ${path}` : "no path";
    }
    case "grep": {
      const pattern = input.pattern as string | undefined;
      const path = input.path as string | undefined;
      return `${pattern || "(no pattern)"}${path ? ` in ${path}` : ""}`;
    }
    case "find": {
      const path = input.path as string | undefined;
      return path ? `path: ${path}` : "no path";
    }
    case "ls": {
      const path = input.path as string | undefined;
      return path ? `path: ${path}` : "(current dir)";
    }
    default:
      return JSON.stringify(input);
  }
}

async function handleToolCall(
  event: ToolCallEvent,
  ctx: ExtensionContext,
): Promise<ToolCallEventResult> {
  if (READONLY_TOOLS.includes(event.toolName)) {
    return { block: false };
  }

  switch (event.toolName) {
    case "edit":
    case "write": {
      const target_path = await realpath(event.input.path as string);
      const cwd = await realpath(ctx.cwd);
      if (!relative(cwd, target_path).startsWith("..")) {
        return { block: false };
      }
      break;
    }
    case "bash": {
      if (isSafeCommand(event.input.command as string)) {
        return { block: false };
      }
      break;
    }
    default:
      // custom tools - allow by default for now
      return { block: false };
  }

  if (!ctx.hasUI) {
    return {
      block: true,
      reason: "This tool requires a user interface, but the current context does not have one.",
    };
  }

  // Build the input description for display
  let inputDescription: string;
  switch (event.toolName) {
    case "edit":
    case "write":
      inputDescription = `⚠️ Writing outside of cwd: ${formatToolInput(event.toolName, event.input)}`;
      break;
    case "bash":
      inputDescription = `⚠️ Potentially destructive bash command:\n   ${formatToolInput(event.toolName, event.input)}`;
      break;
    default:
      inputDescription = `⚠️ Unknown tool call: ${event.toolName}`;
  }

  // Show custom permission dialog using the factory pattern
  return ctx.ui.custom<ToolCallEventResult>(
    (tui, theme, _kb, done) => {
      const dialog = new PermissionDialog(event.toolName, inputDescription, {
        fg: (color, text) => theme.fg(color, text),
        bg: (color, text) => theme.bg(color, text),
        bold: (text) => theme.bold(text),
      });

      dialog.onDone = (toolResult: ToolCallEventResult) => {
        done(toolResult);
      };

      return {
        render: (width: number) => dialog.render(width),
        invalidate: () => dialog.invalidate(),
        handleInput: (data: string) => dialog.handleInput(data, tui),
      };
    },
    { overlay: false, overlayOptions: { anchor: "bottom-center" } },
  );
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
