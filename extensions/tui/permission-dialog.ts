import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, Input, Key, Text, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";
import type { ToolCallEventResult } from "@mariozechner/pi-coding-agent";

type DialogThemeColor = "warning" | "borderMuted" | "muted" | "text" | "dim" | "success" | "error";

type DialogTheme = {
  fg: (color: DialogThemeColor, text: string) => string;
  bg: (color: "selectedBg", text: string) => string;
  bold: (text: string) => string;
};

/**
 * Permission dialog component.
 * Shows tool details, allows user to type a block reason,
 * and navigate between Approve / Block buttons.
 */
export class PermissionDialog {
  container: Container;
  input: Input;
  inputLabel: Text;
  selectedIndex: number = 0; // 0 = Approve (default), 1 = Block
  cachedWidth: number | undefined;
  cachedLines: string[] | undefined;
  onDone: ((result: ToolCallEventResult) => void) | undefined;
  #toolName: string;
  #inputDescription: string;
  #theme: DialogTheme;

  constructor(toolName: string, inputDescription: string, theme: DialogTheme) {
    this.#toolName = toolName;
    this.#inputDescription = inputDescription;
    this.#theme = theme;
    this.container = new Container();

    // Top border
    this.container.addChild(new DynamicBorder((s: string) => this.#theme.fg("warning", s)));

    // Title
    this.container.addChild(
      new Text(this.#theme.fg("warning", this.#theme.bold("Permission Required")), 1, 0),
    );

    // Tool info box
    const infoBox = new Container();
    infoBox.addChild(new DynamicBorder((s: string) => this.#theme.fg("borderMuted", s)));
    infoBox.addChild(new Text(this.#theme.fg("muted", `Tool: ${this.#toolName}`), 1, 0));
    infoBox.addChild(new DynamicBorder((s: string) => this.#theme.fg("borderMuted", s)));
    this.container.addChild(infoBox);

    // Input description
    this.container.addChild(new Text(this.#theme.fg("text", this.#inputDescription), 1, 0));

    // Spacer before buttons
    this.container.addChild(new Text("", 0, 1));

    // Navigation hint
    this.container.addChild(
      new Text(this.#theme.fg("dim", "↑↓ navigate • enter to confirm • esc cancel"), 1, 0),
    );

    // Spacer
    this.container.addChild(new Text("", 0, 1));

    // Block reason input area (always present — rendered as empty when Approve is selected)
    this.inputLabel = new Text(this.#theme.fg("dim", "Block reason (optional):"), 1, 0);
    this.container.addChild(this.inputLabel);
    this.input = new Input();
    this.container.addChild(this.input);

    // Bottom border
    this.container.addChild(new DynamicBorder((s: string) => this.#theme.fg("warning", s)));
  }

  handleInput(data: string, tui: { requestRender: () => void }): void {
    // Handle escape from any selection state
    if (matchesKey(data, Key.escape)) {
      const cancelResult: ToolCallEventResult = {
        block: true,
        reason: "User cancelled the permission request.",
      };
      this.onDone?.(cancelResult);
      return;
    }

    // Navigation
    if (matchesKey(data, Key.up) || matchesKey(data, Key.left)) {
      this.selectedIndex = 0;
      this.invalidate();
      tui.requestRender();
      return;
    }
    if (matchesKey(data, Key.down) || matchesKey(data, Key.right)) {
      this.selectedIndex = 1;
      this.input.focused = true;
      this.invalidate();
      tui.requestRender();
      return;
    }

    // Block is selected — capture input text
    if (this.selectedIndex === 1) {
      if (matchesKey(data, Key.enter)) {
        const toolResult: ToolCallEventResult = {
          block: true,
          reason: this.input.getValue() || "Blocked by user.",
        };
        this.onDone?.(toolResult);
        return;
      }
      this.input.handleInput(data);
      this.invalidate();
      tui.requestRender();
      return;
    }

    // Approve is selected — enter to approve
    if (matchesKey(data, Key.enter)) {
      this.onDone?.({ block: false });
    }
  }

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }

    const renderButtonLine = (
      label: string,
      color: "success" | "error",
      selected: boolean,
    ): string => {
      const line = truncateToWidth(`  ${label}  `, width, "", true);
      const coloredLine = this.#theme.fg(color, line);
      return selected ? this.#theme.bg("selectedBg", coloredLine) : coloredLine;
    };

    const approveLine = renderButtonLine("✓ Approve", "success", this.selectedIndex === 0);
    const blockLine = renderButtonLine("✗ Block", "error", this.selectedIndex === 1);

    // When Approve is selected, we need to blank the input area lines while
    // preserving the total line count for stable layout. To avoid fragile
    // index arithmetic (e.g., lines.length - N), we render the input
    // components separately first to know exactly how many lines they produce,
    // then blank those lines from the bottom of the full render.
    let inputLineCount = 0;
    if (this.selectedIndex === 0) {
      inputLineCount =
        this.inputLabel.render(width).length + this.input.render(width).length;
    }

    // Insert buttons before bottom border (last 2 lines are input + border)
    const lines = this.container.render(width);
    const insertIndex = Math.max(0, lines.length - 2);
    lines.splice(insertIndex, 0, approveLine, blockLine);

    // Blank the input area lines when Approve is selected.
    // They sit right before the buttons, so starting from lines.length - 2
    // (buttons start) and going back by inputLineCount gives us the exact range.
    if (this.selectedIndex === 0 && inputLineCount > 0) {
      const blankStart = Math.max(0, lines.length - 2 - inputLineCount);
      for (let i = blankStart; i < blankStart + inputLineCount; i++) {
        lines[i] = "";
      }
    }

    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}
