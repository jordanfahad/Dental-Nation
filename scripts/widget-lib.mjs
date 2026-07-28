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
