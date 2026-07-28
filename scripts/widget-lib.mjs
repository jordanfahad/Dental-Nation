/**
 * Shared widget-locating logic for the check and the discovery run.
 *
 * The first live run failed at "waiting for label 'Select Time'" even though the
 * widget demonstrably loaded — GA4 recorded booking_widget_viewed and the Zavis
 * APIs (appointment.zavis.ai) all returned 200. Two things the original lookup
 * got wrong:
 *
 *   1. It searched only the main frame. page.locator() does not descend into
 *      iframes, so an embedded widget is invisible to it.
 *   2. It waited without scrolling. The widget sits below the fold and the site
 *      renders it lazily, so a headless visitor that never scrolls may never
 *      trigger it.
 *
 * So: poll every frame, scrolling as we go, until the label appears.
 */

/** Every frame on the page, main frame first. */
export const framesOf = (page) => page.frames();

/**
 * Find the frame containing the booking widget, scrolling to trigger lazy
 * rendering. Returns { frame, label } or null if it never appears.
 */
export async function findWidget(page, { timeoutMs = 45000, labelText = 'Select Time' } = {}) {
  const deadline = Date.now() + timeoutMs;
  let scrolled = 0;
  while (Date.now() < deadline) {
    for (const frame of framesOf(page)) {
      try {
        const label = frame.locator('label', { hasText: labelText }).first();
        if ((await label.count()) > 0) return { frame, label };
      } catch {
        // Frame detached mid-poll (navigation) — just try the next one.
      }
    }
    // Nudge lazy content into view, then return to the top so the widget (which
    // sits high on the page) stays reachable.
    await page.mouse.wheel(0, 900).catch(() => {});
    scrolled += 900;
    if (scrolled > 6000) {
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      scrolled = 0;
    }
    await page.waitForTimeout(1000);
  }
  return null;
}

/**
 * Open the custom dropdown whose <label> reads `labelText` and choose an option.
 *
 * The widget reveals itself progressively: on a fresh visit ONLY "Select
 * Condition" and "Select Treatment" exist. Visit Type, Select a Date and Select
 * Time are not rendered until those two are answered — which is why waiting for
 * "Select Time" on page load could never succeed.
 *
 * The options are custom divs with no role="option", so we match on TEXT and
 * prefer the catch-all choice ("I don't know / Other"), which is always present
 * and commits the check to no particular treatment.
 */
export async function pickOption(page, frame, labelText, preferRe = /i don'?t know|other/i) {
  const field = frame.locator('label', { hasText: labelText }).first().locator('xpath=..');
  if (!(await field.count())) return false;
  await field.scrollIntoViewIfNeeded().catch(() => {});
  await field.click({ timeout: 8000 });
  await page.waitForTimeout(1200);

  // The field's value element — the div right after the label. Read this, never
  // the whole field, which also contains the open option list.
  const valueEl = frame.locator('label', { hasText: labelText }).first().locator('xpath=following-sibling::div[1]');
  const readValue = async () =>
    ((await valueEl.innerText().catch(() => null)) ?? (await valueEl.textContent().catch(() => '')) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  const before = await readValue();
  const registered = async () => {
    const after = await readValue();
    return Boolean(after) && after !== before;
  };

  // Find the option by GEOMETRY, not markup. Four attempts at class-based
  // selectors all failed: the fields themselves carry `cursor-pointer`, the
  // options carry the same utility classes as the value divs, and nothing has a
  // role, id or data-* to grab. What IS reliable is that an open dropdown
  // renders BELOW its field. So: take every element whose text matches an
  // option, keep those positioned under the field, and click the topmost.
  const fieldBox = await field.boundingBox().catch(() => null);
  const clickOptionBelow = async (re) => {
    const matches = frame.locator('div, li, button, span, p').filter({ hasText: re });
    const n = Math.min(await matches.count().catch(() => 0), 40);
    let best = null;
    for (let i = 0; i < n; i++) {
      const el = matches.nth(i);
      const box = await el.boundingBox().catch(() => null);
      if (!box || box.height < 10 || box.height > 120) continue; // skip wrappers
      if (fieldBox && box.y <= fieldBox.y + fieldBox.height - 4) continue; // must be below
      if (!best || box.y < best.box.y) best = { el, box };
    }
    if (!best) return false;
    await best.el.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1500);
    return registered();
  };

  if (await clickOptionBelow(preferRe)) return true;
  // Any option will do — the check commits to no particular treatment.
  if (await clickOptionBelow(/\S/)) return true;

  // Last resort: keyboard. Some custom dropdowns are navigable even when their
  // options are unclickable by selector.
  await field.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  for (const key of ['ArrowDown', 'Enter']) {
    await page.keyboard.press(key).catch(() => {});
    await page.waitForTimeout(600);
  }
  return registered();
}

/** Dismiss cookie/consent overlays that can sit over the widget. */
export async function dismissOverlays(page) {
  const labels = [/accept/i, /agree/i, /got it/i, /allow all/i, /continue/i, /close/i];
  for (const re of labels) {
    try {
      const btn = page.getByRole('button', { name: re }).first();
      if (await btn.count()) {
        await btn.click({ timeout: 2000 });
        await page.waitForTimeout(500);
      }
    } catch {
      // Nothing to dismiss, or it vanished on its own.
    }
  }
}
