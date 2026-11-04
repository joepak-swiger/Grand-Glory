import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const evidence = 'artifacts/evidence';
test('real browser vertical slice and gameplay evidence', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=1');
  await expect(page.getByRole('heading', { name: 'GRAND GLORY' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/01-title.png` });

  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByText('BLUE PINWHEEL')).toBeVisible();
  await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); if (state) window.__GG_TEST__?.spawn('fastThug', state.player.x + 36, state.player.y); });
  const startX = await page.evaluate(() => window.__GG_TEST__?.getState()?.player.x);
  await page.keyboard.down('d'); await page.waitForTimeout(450); await page.keyboard.up('d');
  const movedX = await page.evaluate(() => window.__GG_TEST__?.getState()?.player.x);
  expect(movedX).toBeGreaterThan(startX ?? 0);
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.player.damageDealt ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.player.health ?? 100)).toBeLessThan(100);
  await page.screenshot({ path: `${evidence}/02-active-combat.png` });

  await page.evaluate(() => window.__GG_TEST__?.injectPickup(30));
  await expect(page.getByRole('heading', { name: 'Choose an upgrade' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/03-level-up-choices.png` });
  const chosenId = await page.evaluate(() => window.__GG_TEST__?.getState()?.options[0]);
  const beforeUpgrade = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state ? { speed: state.player.speed, damage: state.player.damageBonus, shots: state.player.extraShots, health: state.player.maxHealth, pickup: state.player.pickupRadius, orbit: state.player.orbit } : null; });
  if (!chosenId) throw new Error('No upgrade was offered');
  await page.locator(`[data-upgrade="${chosenId}"]`).click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.chosen.length ?? 0)).toBeGreaterThan(0);
  const afterUpgrade = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state ? { speed: state.player.speed, damage: state.player.damageBonus, shots: state.player.extraShots, health: state.player.maxHealth, pickup: state.player.pickupRadius, orbit: state.player.orbit } : null; });
  expect(afterUpgrade).not.toEqual(beforeUpgrade);
  await page.evaluate(() => window.__GG_TEST__?.spawn('fastThug'));
  await page.screenshot({ path: `${evidence}/04-upgrade-and-combat.png` });

  await page.keyboard.press('Escape'); await expect(page.getByRole('heading', { name: 'PAUSED' })).toBeVisible();
  const frozen = await page.evaluate(() => window.__GG_TEST__?.getState()?.elapsed);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__GG_TEST__?.getState()?.elapsed)).toBe(frozen);
  await page.screenshot({ path: `${evidence}/05-paused.png` });
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.evaluate(() => window.__GG_TEST__?.startBoss());
  await expect(page.getByText('GANG LEADER · PROTOTYPE')).toBeVisible();
  await page.screenshot({ path: `${evidence}/06-boss-encounter.png` });
  await page.evaluate(() => window.__GG_TEST__?.prepareBossForAttack());
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.bossDefeated ?? false), { timeout: 6000 }).toBe(true);
  await expect(page.getByRole('heading', { name: 'VICTORY' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/07-victory.png` });

  await page.getByRole('button', { name: 'Play Again' }).click();
  await expect(page.getByText('BLUE PINWHEEL')).toBeVisible();
  await page.evaluate(() => window.__GG_TEST__?.damagePlayer(200));
  await expect(page.getByRole('heading', { name: 'DEFEAT' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/08-defeat.png` });
  await page.getByRole('button', { name: 'Play Again' }).click();
  await expect(page.getByText('BLUE PINWHEEL')).toBeVisible();
  await page.keyboard.press('F3');
  await expect(page.locator('.debug-panel')).toContainText('frame');
  await expect(page.locator('.debug-panel')).toContainText('enemies');
  expect(errors).toEqual([]);
});
