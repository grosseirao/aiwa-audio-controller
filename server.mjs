import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = join(import.meta.dirname, "public");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function safePath(urlPath) {
  const requested = decodeURIComponent(urlPath.split("?")[0]);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const resolved = normalize(join(PUBLIC_DIR, relative));
  return resolved.startsWith(PUBLIC_DIR) ? resolved : null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  if (request.url === "/api/health") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: true, app: "AIWA Audio Controller" }));
    return;
  }

  let filePath = safePath(request.url || "/");
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, "index.html");
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Arquivo não encontrado");
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`AIWA Audio Controller disponível em ${url}`);

  if (process.argv.includes("--open")) {
    const opener = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
    spawn(opener, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
