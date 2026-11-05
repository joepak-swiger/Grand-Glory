import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const evidence = 'artifacts/evidence/milestone-010';

test('hero selection loads the corresponding character and starter weapon', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  await page.addInitScript(() => localStorage.removeItem('grand-glory-hero'));
  await page.setViewportSize({ width: 1440, height: 900 });
  const failedAssets: string[] = [];
  page.on('requestfailed', request => { if (request.url().includes('/assets/')) failedAssets.push(request.url()); });
  await page.goto('/?test=1');
  await expect(page.getByRole('button', { name: /PLAY NOW · ENDLESS RUN/i })).toBeVisible();
  await expect(page.locator('[data-hero]')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /Blue Pinwheel/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hero-portrait')).toHaveJSProperty('complete', true);
  await page.screenshot({ path: `${evidence}/hero-selection.png` });

  for (const hero of [
    { id: 'blue-pinwheel', hp: 160, speed: 210, weapon: 'pinwheel' },
    { id: 'bok-goo', hp: 225, speed: 180, weapon: 'clubSweep' },
    { id: 'da-ri', hp: 145, speed: 225, weapon: 'spearThrust' },
  ] as const) {
    await page.locator(`[data-hero="${hero.id}"]`).click();
    await page.getByRole('button', { name: /PLAY NOW · ENDLESS RUN/i }).click();
    const actual = await page.evaluate(() => {
      const state = window.__GG_TEST__?.getState();
      return state && { heroId: state.player.heroId, hp: state.player.maxHealth, speed: state.player.speed, ranks: state.player.weaponRanks };
    });
    expect(actual?.heroId).toBe(hero.id);
    expect(actual?.hp).toBe(hero.hp);
    expect(actual?.speed).toBe(hero.speed);
    expect(actual?.ranks[hero.weapon]).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().playerTextureLoaded ?? false)).toBe(true);
    await page.screenshot({ path: `${evidence}/${hero.id}-gameplay.png` });
    if (hero.id !== 'da-ri') await page.goto('/?test=1');
  }
  expect(failedAssets).toEqual([]);
});

test('the endless run advances from Gang Boss to Dr. Smile and can be retired', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  await page.addInitScript(() => localStorage.removeItem('grand-glory-hero'));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=normal');
  await page.getByRole('button', { name: /PLAY NOW · ENDLESS RUN/i }).click();
  await page.evaluate(() => window.__GG_TEST__?.startBoss());
  let encounter = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    return state && { boss: state.enemies.find(enemy => enemy.kind === 'boss')?.bossId, endless: state.endless, status: state.status };
  });
  expect(encounter).toEqual({ boss: 'gang-boss', endless: true, status: 'playing' });
  await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    const boss = state?.enemies.find(enemy => enemy.kind === 'boss');
    if (boss) { boss.attackState = 'chain-telegraph'; boss.phase = 0.2; }
    window.__GG_TEST__?.refresh();
  });
  await page.screenshot({ path: `${evidence}/gang-boss-telegraph.png` });
  await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    const boss = state?.enemies.find(enemy => enemy.kind === 'boss');
    if (state && boss) window.__GG_TEST__?.defeatEnemy(boss.id);
  });
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.bossesDefeated ?? 0)).toBe(1);
  await expect(page.getByText(/STREET GANG \+ DR\. SMILE FACTION/)).toBeVisible();
  await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    if (state) state.elapsed = state.nextBossAt - 0.03;
    window.__GG_TEST__?.advance(0.05);
  });
  encounter = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    return state && { boss: state.enemies.find(enemy => enemy.kind === 'boss')?.bossId, endless: state.endless, status: state.status };
  });
  expect(encounter).toEqual({ boss: 'dr-smile', endless: true, status: 'playing' });
  await page.screenshot({ path: `${evidence}/dr-smile-encounter.png` });
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-action="pause"]')?.click());
  await page.getByRole('button', { name: 'Retire Run' }).click();
  await expect(page.getByRole('heading', { name: 'RUN COMPLETE' })).toBeVisible();
  await expect(page.getByText('ENDLESS · NORMAL')).toBeVisible();
  await page.screenshot({ path: `${evidence}/endless-retirement-results.png` });
});
