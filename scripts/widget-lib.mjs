/**
 * Shared widget-driving logic for the check and the discovery run.
 *
 * Hard-won from repeated failures against the live site:
 *
 *  1. page.locator() does not descend into iframes, and the widget renders
 *     lazily below the fold — so finding it means polling EVERY frame while
 *     scrolling.
 *  2. The widget reveals itself progressively. On a fresh visit only "Select
 *     Condition" and "Select Treatment" exist; Visit Type, Select a Date and
 *     Select Time do not render until those are answered.
 *  3. Its dropdown options cannot be identified by markup. The fields carry
 *     `cursor-pointer` themselves, the options reuse the same utility classes as
 *     the value divs, and nothing has a role, id or data-*. Four selector-based
 *     attempts each failed differently.
 *
 * So options are located by GEOMETRY: an open dropdown renders BELOW its field.
 * That is a property of how dropdowns work rather than of this site's CSS, so it
 * survives a restyle.
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
 * Options of an open dropdown, found by GEOMETRY: elements matching `re` that
 * sit BELOW the field. Deduped by position, because a wrapper and its inner
 * element both match the same row and would otherwise double the count.
 *
 * Deliberately ONE shared function. The time step used to keep its own
 * class-based copy, which matched nothing and reported "0 slots offered" as a
 * real outage while the widget was plainly serving times.
 */
export async function optionsBelow(frame, anchor, re, max = 60) {
  // Anchor on the VALUE row, not the field container: an open dropdown makes the
  // container's box grow to enclose its own options, so "below the field" then
  // excludes every option and reports zero.
  const fieldBox = await anchor.boundingBox().catch(() => null);
  const matches = frame.locator('div, li, button, span, p').filter({ hasText: re });
  const n = Math.min(await matches.count().catch(() => 0), max);
  const seen = new Set();
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = matches.nth(i);
    const box = await el.boundingBox().catch(() => null);
    if (!box || box.height < 10 || box.height > 120) continue; // skip wrappers
    if (fieldBox && box.y < fieldBox.y + fieldBox.height - 2) continue; // must sit below the value row
    const key = `${Math.round(box.y)}:${Math.round(box.x)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ el, box });
  }
  out.sort((a, b) => a.box.y - b.box.y);
  return out;
}

/** The value element of a field — the div immediately after its label. */
export function valueOf(frame, labelText) {
  return frame.locator('label', { hasText: labelText }).first().locator('xpath=following-sibling::div[1]');
}

/**
 * Open the dropdown whose <label> reads `labelText` and choose an option,
 * preferring the catch-all ("I don't know / Other") so the check commits to no
 * particular treatment.
 *
 * Returns true ONLY if the field's value actually CHANGED. Returning true just
 * because a click landed made a later "the date/time step never appeared" look
 * like a clinic outage, when the form had simply never been filled in.
 */
export async function pickOption(page, frame, labelText, preferRe = /i don'?t know|other/i) {
  const field = frame.locator('label', { hasText: labelText }).first().locator('xpath=..');
  if (!(await field.count())) return false;
  await field.scrollIntoViewIfNeeded().catch(() => {});
  await field.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const valueEl = valueOf(frame, labelText);
  const readValue = async () =>
    ((await valueEl.innerText().catch(() => null)) ?? (await valueEl.textContent().catch(() => '')) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  const before = await readValue();
  const registered = async () => {
    const after = await readValue();
    return Boolean(after) && after !== before;
  };

  const clickBelow = async (re) => {
    const opts = await optionsBelow(frame, valueEl, re);
    if (!opts.length) return false;
    await opts[0].el.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1500);
    return registered();
  };

  if (await clickBelow(preferRe)) return true;
  if (await clickBelow(/\S/)) return true; // any option will do

  // Last resort: keyboard. Some custom dropdowns are navigable even when their
  // options resist clicking.
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
