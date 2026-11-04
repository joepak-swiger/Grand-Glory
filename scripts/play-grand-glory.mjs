import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const firstPort = 5173;
const lastPort = 5199;
let serverProcess;
let stopping = false;

async function getGameUrl(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) });
    if (!response.ok) return null;
    const html = await response.text();
    return html.includes('GRAND GLORY') ? `http://127.0.0.1:${port}/` : null;
  } catch { return null; }
}

async function portIsFree(port) {
  return new Promise((resolveFree, reject) => {
    const probe = createServer();
    probe.once('error', error => error.code === 'EADDRINUSE' ? resolveFree(false) : reject(error));
    probe.listen(port, '127.0.0.1', () => probe.close(error => error ? reject(error) : resolveFree(true)));
  });
}

async function openBrowser(url) {
  if (process.platform !== 'win32') throw new Error('The double-click launcher currently supports Windows only.');
  const opener = spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], { detached: true, stdio: 'ignore', windowsHide: true });
  opener.unref();
}

function stopServer() {
  if (stopping) return;
  stopping = true;
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill('SIGINT');
}

async function startServer(port) {
  const vite = resolve(root, 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'inherit', windowsHide: true });
  serverProcess = child;
  let childExit;
  childExit = new Promise((resolveExit, rejectExit) => {
    child.once('error', rejectExit);
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  });
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return { ready: false, exit: await childExit };
    const url = await getGameUrl(port);
    if (url) return { ready: true, url, childExit };
    await new Promise(resolveDelay => setTimeout(resolveDelay, 200));
  }
  child.kill('SIGINT');
  await Promise.race([childExit, new Promise(resolveDelay => setTimeout(resolveDelay, 2_000))]);
  return { ready: false, exit: { code: null, signal: 'startup-timeout' } };
}

async function main() {
  for (let port = firstPort; port <= lastPort; port++) {
    const existing = await getGameUrl(port);
    if (existing) {
      console.log(`GRAND GLORY is already running at ${existing}; opening the existing game instead of starting a duplicate.`);
      await openBrowser(existing);
      return;
    }
  }

  for (let port = firstPort; port <= lastPort; port++) {
    if (!(await portIsFree(port))) continue;
    const attempt = await startServer(port);
    if (!attempt.ready) {
      if (attempt.exit?.code === 1 && port < lastPort && !(await portIsFree(port))) continue;
      const detail = attempt.exit?.signal === 'startup-timeout' ? 'Vite did not become ready within 20 seconds.' : `Vite stopped during startup (exit ${attempt.exit?.code ?? attempt.exit?.signal ?? 'unknown'}).`;
      throw new Error(`${detail} Review the Vite output above.`);
    }
    await openBrowser(attempt.url);
    console.log('\nGRAND GLORY is running! Close this window or press Ctrl+C to stop the server.');
    const childExit = await attempt.childExit;
    if (!stopping && childExit.code !== 0) throw new Error(`Vite exited unexpectedly (${childExit.code ?? childExit.signal}).`);
    return;
  }
  throw new Error(`No available localhost port was found from ${firstPort} to ${lastPort}. Close an unused local server and try again.`);
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);
main().catch(error => {
  console.error(`\nGRAND GLORY launcher error: ${error.message}`);
  process.exitCode = 1;
  stopServer();
});
