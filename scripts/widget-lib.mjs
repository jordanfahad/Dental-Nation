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

  // Candidate options: anything clickable with text. Broad, because the markup
  // carries no semantic hooks — but it MUST exclude the field containers, which
  // also carry `cursor-pointer`. Without that exclusion the "option" click lands
  // back on the field and just toggles it shut, so nothing is ever selected.
  // Fields own a <label>; options never do.
  const candidates = frame
    .locator('[role="option"], li, button, div[class*="cursor-pointer"], div[class*="hover:"]')
    .filter({ hasNot: frame.locator('label') });
  const preferred = candidates.filter({ hasText: preferRe }).first();
  const target = (await preferred.count()) ? preferred : candidates.filter({ hasText: /\S/ }).first();
  if (!(await target.count())) return false;

  // What the field showed BEFORE — the value element is the div right after the
  // label, not the whole field (which also contains the open option list).
  const valueEl = frame.locator('label', { hasText: labelText }).first().locator('xpath=following-sibling::div[1]');
  const readValue = async () =>
    ((await valueEl.innerText().catch(() => null)) ?? (await valueEl.textContent().catch(() => '')) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  const before = await readValue();

  await target.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Only report success if the choice actually REGISTERED. Returning true just
  // because a click landed made a later "the date/time step never appeared" look
  // like a clinic outage, when the form had simply never been filled in.
  const after = await readValue();
  return Boolean(after) && after !== before;
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
