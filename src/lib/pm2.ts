import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export function getBotProcessName(): string {
  return process.env.BOT_PM2_NAME || "bot";
}

export async function restartBotProcess(): Promise<{ output: string }> {
  const name = getBotProcessName();
  try {
    const { stdout, stderr } = await execAsync(`pm2 restart ${name}`);
    return { output: (stdout || stderr).trim() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`PM2 restart failed: ${message}`);
  }
}

export function getPm2ErrorLogPath(): string {
  const name = getBotProcessName();
  const home = os.homedir();
  return path.join(home, ".pm2", "logs", `${name}-error.log`);
}

export function getLocalErrorLogPath(): string {
  return path.join(process.cwd(), "logs", "bot-error.log");
}

export function resolveErrorLogPath(): string {
  const pm2Path = getPm2ErrorLogPath();
  if (fs.existsSync(pm2Path)) return pm2Path;
  return getLocalErrorLogPath();
}

export async function readErrorLogTail(maxLines = 50): Promise<string[]> {
  const logPath = resolveErrorLogPath();

  if (!fs.existsSync(logPath)) {
    return [`[system] Log file not found: ${logPath}`];
  }

  const content = await fs.promises.readFile(logPath, "utf-8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines);
}

export function watchErrorLog(
  onLine: (line: string) => void
): () => void {
  const logPath = resolveErrorLogPath();

  if (!fs.existsSync(logPath)) {
    return () => undefined;
  }

  let lastSize = fs.statSync(logPath).size;
  let position = lastSize;

  const interval = setInterval(() => {
    try {
      const stats = fs.statSync(logPath);
      if (stats.size < position) {
        position = 0;
      }
      if (stats.size <= position) return;

      const stream = fs.createReadStream(logPath, {
        start: position,
        end: stats.size - 1,
        encoding: "utf-8",
      });

      let buffer = "";
      stream.on("data", (chunk: string | Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) onLine(line.trim());
        }
      });

      position = stats.size;
      lastSize = stats.size;
    } catch {
      // File may be temporarily unavailable during rotation
    }
  }, 2000);

  return () => clearInterval(interval);
}
