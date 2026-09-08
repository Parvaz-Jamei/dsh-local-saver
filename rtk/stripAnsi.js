const ANSI_RE = /\x1B\[[0-9;]*[A-Za-z]/g;
const PROGRESS_RE = /[\r\x1B][^\n]*(\d+%|#+|Downloading)/g;

export function stripAnsi(input) {
  return String(input ?? "").replace(ANSI_RE, "").replace(/\r+/g, "\n");
}
