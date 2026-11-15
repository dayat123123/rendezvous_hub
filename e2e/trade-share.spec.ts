import { expect, test } from '@playwright/test'

import { SHOW_TRADE_SHARE } from '../src/lib/nav-config'
import { signIn } from './support/staff'

test.skip(!SHOW_TRADE_SHARE, 'Berbagi Trade is hidden')

test('Super Admin membuka Berbagi Trade dan Relay Trade', async ({ page }) => {
  await signIn(page, 'Sinta')

  await page.goto('/compliance/trade-share')
  await expect(page.getByRole('heading', { name: 'Berbagi Trade' })).toBeVisible()
  for (const tab of ['Pengajuan', 'Trader', 'Pemantauan', 'Daftar', 'Pengaturan']) {
    await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible()
  }
  await expect(page.getByText(/Tombol darurat sedang mati/)).toBeVisible()

  await page.getByRole('tab', { name: 'Pengaturan', exact: true }).click()
  await expect(page.getByText('Tombol darurat', { exact: true })).toBeVisible()

  await page.getByRole('tab', { name: 'Pemantauan', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toBeVisible()

  await page.goto('/system?tab=relay')
  await expect(page.getByText('Relay Trade').first()).toBeVisible()
})

test('Staf tanpa izin Berbagi Trade tidak melihat menunya', async ({ page }) => {
  await signIn(page, 'Nadia')
  await expect(page.getByRole('link', { name: 'Berbagi Trade' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Relay Trade' })).toHaveCount(0)
})
