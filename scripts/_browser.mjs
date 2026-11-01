// Shared Playwright launcher for the check scripts.
// By default every page starts with the splash marked as seen, so suites that aren't about the
// splash don't sit through it. Pass { splash: true } to get first-visit behaviour.
import { chromium } from 'playwright';

export async function launch({ splash = false } = {}) {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  if (splash) return browser;

  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
    const context = await newContext(options);
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem('splash-seen', '1');
      } catch {}
    });
    return context;
  };
  // newPage() normally creates its own context; route it through the wrapped one.
  browser.newPage = async (options) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on('close', () => context.close().catch(() => {}));
    return page;
  };
  return browser;
}
