const RESET = "\u001b[0m";
const DIM = "\u001b[2m";
const BOLD = "\u001b[1m";

const LETTER_COLORS = [196, 208, 226, 118, 45, 39, 129];
const LETTERS = "CMDFIND".split("");

function plainBannerWord(): string {
  return `  ${LETTERS.join(" ")}`;
}

function coloredBannerWord(): string {
  return `  ${LETTERS.map((ch, idx) => `\u001b[38;5;${LETTER_COLORS[idx % LETTER_COLORS.length]}m${ch}${RESET}`).join(" ")}`;
}

export function printBanner(): void {
  const noColor = process.env.NO_COLOR === "1";
  const plainForDesktop = process.env.CMDFIND_PLAIN_BANNER === "1";

  if (noColor || plainForDesktop) {
    console.log(plainBannerWord());
    console.log("  command finder");
    console.log();
    return;
  }

  console.log(coloredBannerWord());
  console.log(`${DIM}${BOLD}  command finder${RESET}`);
  console.log();
}
