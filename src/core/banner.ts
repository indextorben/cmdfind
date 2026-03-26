const RESET = "\u001b[0m";
const DIM = "\u001b[2m";
const BOLD = "\u001b[1m";

const RAINBOW = [196, 202, 226, 118, 51, 57, 93, 129, 201];

const BANNER_LINES = [
  "   ____ _ __  __ ____  _____ ___ _   _ ____  ",
  "  / ___| |  \\/  |  _ \\|  ___|_ _| \\ | |  _ \\ ",
  " | |   | | |\\/| | | | | |_   | ||  \\| | | | |",
  " | |___| | |  | | |_| |  _|  | || |\\  | |_| |",
  "  \\____|_|_|  |_|____/|_|   |___|_| \\_|____/ "
];

function colorizeLine(line: string, lineIndex: number): string {
  const chars = line.split("");
  return chars
    .map((ch, i) => {
      if (ch === " ") {
        return ch;
      }
      const color = RAINBOW[(i + lineIndex * 2) % RAINBOW.length];
      return `\u001b[38;5;${color}m${ch}${RESET}`;
    })
    .join("");
}

export function printBanner(): void {
  const noColor = process.env.NO_COLOR === "1";

  if (noColor) {
    console.log(BANNER_LINES.join("\n"));
    console.log("  command finder");
    console.log();
    return;
  }

  const rendered = BANNER_LINES.map((line, idx) => colorizeLine(line, idx)).join("\n");
  console.log(rendered);
  console.log(`${DIM}${BOLD}  command finder${RESET}`);
  console.log();
}
