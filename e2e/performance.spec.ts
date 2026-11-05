import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('records real-browser render performance for isolated synthetic crowd sizes', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync('artifacts/evidence/living-city/run/stress', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=stress');
  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  const rows: Array<Record<string, number | null>> = [];
  const browserDetails = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number; UNMASKED_VENDOR_WEBGL: number } | null;
    return { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, gpuRenderer: gl && debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string : 'unavailable', gpuVendor: gl && debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) as string : 'unavailable' };
  });
  for (const count of [25, 50, 100, 150, 200]) {
    await page.evaluate(n => window.__GG_TEST__?.populateStress(n), count);
    await page.waitForTimeout(1_400);
    const result = await page.evaluate(() => {
      const diagnostic = window.__GG_TEST__?.getPerformanceDiagnostics();
      const state = window.__GG_TEST__?.getState();
      const render = window.__GG_TEST__?.getRendererState();
      const performanceWithMemory = performance as Performance & { memory?: { usedJSHeapSize: number } };
      return diagnostic && state && render ? {
        active: diagnostic.activeEnemies,
        visible: diagnostic.visibleEnemies,
        projectiles: diagnostic.projectiles,
        pickups: diagnostic.pickups,
        damageTexts: diagnostic.damageTexts,
        sprites: diagnostic.sprites,
        fps: render.renderFps,
        tickerFrameMs: render.renderFrameMs,
        averageFrameMs: diagnostic.frames.average,
        p95FrameMs: diagnostic.frames.p95,
        worstFrameMs: diagnostic.frames.worst,
        sceneUpdateMs: diagnostic.rendererUpdateMs,
        sceneUpdateP95Ms: diagnostic.rendererP95Ms,
        sceneUpdateWorstMs: diagnostic.rendererWorstMs,
        simulationP95Ms: diagnostic.simulation.p95,
        longFrames: diagnostic.longFrames,
        droppedUpdates: diagnostic.droppedSimulationUpdates,
        memoryMiB: performanceWithMemory.memory ? performanceWithMemory.memory.usedJSHeapSize / 1_048_576 : null,
        enemyKinds: [...new Set(state.enemies.map(enemy => enemy.kind))].length,
      } : null;
    });
    expect(result).not.toBeNull();
    expect(result?.active).toBe(count);
    expect(result?.visible).toBe(count);
    rows.push({ population: count, ...result! });
    await page.screenshot({ path: `artifacts/evidence/living-city/run/stress/stress-${String(count).padStart(3, '0')}.png` });
  }
  console.info(`BROWSER_CROWD_STRESS ${JSON.stringify({ browser: 'Playwright Chromium, headed=false', viewport: '1365x900', rendering: 'WebGL preferred', synthetic: true, browserDetails, rows })}`);
  expect(errors).toEqual([]);
});
