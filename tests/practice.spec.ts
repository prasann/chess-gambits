import { expect, test, type Page } from '@playwright/test'

const square = (page: Page, name: string) => page.locator(`button.board-square[data-square="${name}"]`)
async function press(page: Page, name: string, touch: boolean) {
  if (touch) await square(page, name).tap()
  else await square(page, name).click()
}

test('ivory and ebony pieces stay distinguishable on both square colors in either theme', async ({ page }) => {
  function luminance(color: string) {
    const channels = color.match(/\d+/g)!.slice(0, 3).map(Number).map((value) => {
      const channel = value / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  function contrast(first: string, second: string) {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
    return (values[0] + 0.05) / (values[1] + 0.05)
  }
  await page.goto('?clawpilotTheme=light')
  await expect(page.getByRole('combobox', { name: 'Piece set' })).toHaveValue('cburnett')
  for (const set of ['cburnett', 'merida']) {
    await page.getByRole('combobox', { name: 'Piece set' }).selectOption(set)
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
      const sample = await page.evaluate(async () => {
        async function tone(img: HTMLImageElement) {
          await img.decode()
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 64
          const context = canvas.getContext('2d')!
          context.drawImage(img, 0, 0, 64, 64)
          const data = context.getImageData(0, 0, 64, 64).data
          let total = 0
          let count = 0
          for (let index = 0; index < data.length; index += 4) {
            if (data[index + 3] > 200) { total += data[index] + data[index + 1] + data[index + 2]; count += 1 }
          }
          return `rgb(${Array(3).fill(Math.round(total / count / 3)).join(',')})`
        }
        const white = document.querySelector<HTMLImageElement>('.chess-piece.w')!
        const black = document.querySelector<HTMLImageElement>('.chess-piece.b')!
        return {
          src: white.src,
          white: await tone(white),
          black: await tone(black),
          halo: getComputedStyle(black).filter,
          squares: ['a8', 'b8'].map((name) =>
            getComputedStyle(document.querySelector(`button[data-square="${name}"]`)!.parentElement!).backgroundColor),
        }
      })
      expect(sample.src).toContain(`/pieces/${set}/wP.svg`)
      expect(contrast(sample.white, sample.black)).toBeGreaterThan(3)
      expect(sample.halo).toContain('drop-shadow')
      expect(Math.max(...sample.squares.map((background) => contrast(sample.white, background)))).toBeGreaterThanOrEqual(3)
      expect(Math.max(...sample.squares.map((background) => contrast(sample.black, background)))).toBeGreaterThanOrEqual(3)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Piece set' })).toHaveValue('merida')
  await expect(page.locator('.chess-piece.w').first()).toHaveAttribute('src', /pieces\/merida\/wP\.svg|pieces\/merida\//)
})

test('library filters, phone-readable ideas, and deployment license/source downloads', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('heading', { name: /Make it worth paying/ })).toBeVisible()
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('.chess-piece.b').first()).toHaveAttribute('src', /pieces\/cburnett\/b[PNBRQK]\.svg/)
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await page.getByRole('button', { name: 'As white' }).click()
  await expect(page.locator('.gambit-card')).toHaveCount(3)
  await page.getByRole('button', { name: 'As black' }).click()
  await expect(page.locator('.gambit-card')).toHaveCount(2)
  await page.getByRole('link', { name: /Albin Countergambit/ }).click()
  await expect(page.getByRole('heading', { name: 'If they decline' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const path of ['LICENSE.txt', 'THIRD-PARTY.txt', 'engine/stockfish-source.tar.gz', 'engine/nn-61e7af4bb97d.nnue', 'engine/app-source.tar.gz']) {
    expect((await page.request.get(path)).ok()).toBe(true)
  }
})

for (const session of [
  { side: 'White', id: 'kings-gambit', from: 'b1', to: 'c3' },
  { side: 'Black', id: 'benko-gambit', from: 'h7', to: 'h6' },
]) {
  test(`complete ${session.side} practice flow with a real WASM reply`, async ({ page, isMobile }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => { Math.random = () => 0 })
    await page.goto(`#/practice/${session.id}`)
    await page.getByRole('button', { name: 'Skip setup' }).click()
    await expect(page.getByTestId('game-status')).toContainText('Your move')
    await expect(page.getByTestId('move-source')).toHaveText('Opening book')
    expect(await page.getByRole('button', { name: 'Undo last turn' }).isDisabled()).toBe(true)
    await press(page, session.from, isMobile)
    await press(page, session.to, isMobile)
    await expect(page.getByTestId('move-source')).toHaveText('Stockfish')
    await expect(page.getByTestId('game-status')).toContainText('Checking your idea')
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.getByTestId('game-status')).toContainText('paused')
    await page.waitForTimeout(1000)
    await expect(page.getByTestId('move-history').locator('li')).toHaveCount(session.side === 'White' ? 5 : 8)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.getByTestId('game-status')).toContainText('Your move', { timeout: 30000 })
    await expect(page.getByTestId('move-history').locator('li')).toHaveCount(session.side === 'White' ? 6 : 9)
    await expect(page.getByTestId('move-history').locator('li').last()).toContainText(/\S/)
    await page.getByLabel('Engine strength').selectOption('club')
    await page.getByRole('button', { name: 'Undo last turn' }).click()
    await expect(page.getByTestId('move-source')).toHaveText('Opening book')
    await expect(square(page, session.from)).toHaveAttribute('aria-label', /white knight|black pawn/)
    await page.getByText('Move history', { exact: false }).first().click()
    await expect(page.getByTestId('move-history')).toBeVisible()
    await page.getByText('The ideas, not the answers', { exact: true }).click()
    await expect(page.getByRole('heading', { name: 'The big idea' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (isMobile) {
      const bounds = await square(page, session.from).boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
    }
    await page.getByRole('button', { name: 'Restart', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Skip setup' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to ideas' }).click()
    await expect(page.getByRole('link', { name: 'Practice this gambit' })).toBeVisible()
    expect(errors).toEqual([])
  })

}

test('engine load failure is visible and retry resumes without losing the position', async ({ page, isMobile }) => {
  await page.addInitScript(() => { Math.random = () => 0 })
  await page.route('**/engine/stockfish-19-lite-single.js', (route) => route.abort())
  await page.goto('#/practice/kings-gambit')
  await page.getByRole('button', { name: 'Skip setup' }).click()
  await expect(page.getByTestId('game-status')).toContainText('Your move')
  await press(page, 'b1', isMobile)
  await press(page, 'c3', isMobile)
  await expect(page.getByRole('alert')).toContainText('could not load')
  await expect(page.getByTestId('move-history').locator('li')).toHaveCount(5)
  await page.unroute('**/engine/stockfish-19-lite-single.js')
  await page.getByRole('button', { name: 'Retry engine' }).click()
  await expect(page.getByTestId('move-history').locator('li')).toHaveCount(6)
  await expect(page.getByTestId('game-status')).toContainText('Your move')
})

test('promotion is touch-friendly and keyboard-operable', async ({ page, isMobile }) => {
  await page.goto('http://127.0.0.1:4174/chess-gambits/tests/board.html')
  if (isMobile) {
    await square(page, 'a7').tap()
    await square(page, 'a8').tap()
    await page.getByRole('button', { name: 'Knight', exact: true }).tap()
  } else {
    await square(page, 'a7').focus()
    await page.keyboard.press('Enter')
    await square(page, 'a8').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Knight', exact: true }).locator('img')).toHaveAttribute('src', /pieces\/cburnett\/wN\.svg/)
    await page.getByRole('button', { name: 'Knight', exact: true }).click()
  }
  await expect(square(page, 'a8')).toHaveAttribute('aria-label', 'a8 white knight')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('portrait, landscape, tablet layouts and hidden-tab suspension', async ({ page }) => {
  await page.goto('#/practice/kings-gambit')
  for (const viewport of [{ width: 360, height: 800 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByTestId('game-status')).toContainText('paused')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByTestId('game-status')).not.toContainText('paused')
})
