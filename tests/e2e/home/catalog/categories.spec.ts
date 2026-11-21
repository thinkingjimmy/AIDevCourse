import { expect, test, type Locator } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published homepage catalog.');

test('category links keep the selected tab at the same scroll limit', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1300 });
  await page.goto('/zh');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--home-masthead-height'));
  const tabs = page.getByRole('navigation', { name: '课程', exact: true });
  const beginner = tabs.getByRole('link', { name: '入门', exact: true });
  const intermediate = tabs.getByRole('link', { name: '中级', exact: true });
  const dictionaries = tabs.getByRole('link', { name: '词典', exact: true });
  await expect(beginner).toHaveAttribute('aria-current', 'location');
  await expect(tabs).toHaveCSS('border-bottom-width', '0px');

  const tabGeometry = () => tabs.getByRole('link').evaluateAll(links => links.map(link => {
    const style = getComputedStyle(link);
    const label = link.firstElementChild!.getBoundingClientRect().width;
    const padding = 2 * parseFloat(style.paddingInlineStart);
    const border = parseFloat(style.borderInlineStartWidth) + parseFloat(style.borderInlineEndWidth);
    return { title: link.textContent, selected: link.hasAttribute('aria-current'), width: link.getBoundingClientRect().width,
      minimum: Math.max(44, label + padding + border) };
  }));
  const initial = await tabGeometry();
  for (const tab of initial.filter(tab => !tab.selected)) expect(tab.width).toBeCloseTo(tab.minimum, 1);

  await intermediate.click();
  await expect(page).toHaveURL(/#home-intermediate-title$/);
  await expect.poll(() => page.evaluate(() => {
    const scroller = document.scrollingElement!;
    return scroller.scrollHeight - scroller.clientHeight - window.scrollY;
  })).toBeLessThanOrEqual(1);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(intermediate).toHaveAttribute('aria-current', 'location');
  await expect(dictionaries).not.toHaveAttribute('aria-current');
  const selected = await tabGeometry();
  expect(selected[0].width).toBeCloseTo(selected[0].minimum, 1);
  expect(selected[1].width).toBeGreaterThan(selected[1].minimum);
  await testInfo.attach('Intermediate at the end of the page', { body: await page.screenshot(), contentType: 'image/png' });

  // Keep the same scroll position when clicking the sticky tab in WebKit.
  const dictionaryTab = (await dictionaries.boundingBox())!;
  await page.mouse.click(dictionaryTab.x + dictionaryTab.width / 2, dictionaryTab.y + dictionaryTab.height / 2);
  await expect(dictionaries).toHaveAttribute('aria-current', 'location');
  const artwork = await dictionaries.locator('.course-category-mini-disk').evaluateAll(cards =>
    cards.map(card => getComputedStyle(card).backgroundImage));
  const covers = await page.getByRole('region', { name: '词典', exact: true }).locator('.course-disk').evaluateAll(cards =>
    cards.map(card => getComputedStyle(card).borderImageSource));
  expect(artwork).toHaveLength(3);
  expect(artwork).toEqual(covers);

  await page.goBack();
  await expect(page).toHaveURL(/#home-intermediate-title$/);
  await expect(intermediate).toHaveAttribute('aria-current', 'location');
  await beginner.press('Enter');
  await expect(beginner).toHaveAttribute('aria-current', 'location');
  await expect(page.getByRole('heading', { name: '入门', exact: true })).toBeFocused();
  await testInfo.attach('Category tab widths', { body: JSON.stringify({ initial, selected }, null, 2), contentType: 'application/json' });
});

test('manual scrolling tracks the category on a narrow screen with reduced motion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh');
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--home-masthead-height'));
  const tabs = page.getByRole('navigation', { name: '课程', exact: true });
  const overview = page.getByRole('heading', { name: '中级', exact: true });
  await overview.evaluate(heading => heading.scrollIntoView({ behavior: 'instant' }));
  await expect(tabs.getByRole('link', { name: '中级', exact: true })).toHaveAttribute('aria-current', 'location');
  const [before, heading] = await Promise.all([tabs.boundingBox(), overview.boundingBox()]);
  expect(heading!.y).toBeGreaterThanOrEqual(before!.y + before!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.course-category-flight, [data-collected]')).toHaveCount(0);
  await testInfo.attach('Narrow category tabs', { body: await page.screenshot(), contentType: 'image/png' });

  await tabs.getByRole('link', { name: '词典', exact: true }).click();
  await expect(tabs.getByRole('link', { name: '词典', exact: true })).toHaveAttribute('aria-current', 'location');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(tabs.getByRole('link', { name: '入门', exact: true })).toHaveAttribute('aria-current', 'location');
});

async function captureTopCollection(disk: Locator) {
  return disk.evaluate(async link => {
    const bar = document.querySelector('.course-category-tabs')!;
    const cover = link.querySelector('.course-disk')!;
    const title = cover.querySelector('.disk-title')!.textContent;
    const tab = bar.querySelector(`[href="#${link.closest('section')!.getAttribute('aria-labelledby')}"]`)!;
    const remaining = link.getBoundingClientRect().bottom - bar.getBoundingClientRect().bottom;
    window.scrollBy({ top: remaining - 12, behavior: 'instant' });

    const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const deadline = performance.now() + 1500;
    let flight: HTMLElement | undefined;
    while (!flight && performance.now() < deadline) {
      await nextFrame();
      flight = [...document.querySelectorAll<HTMLElement>('.course-category-flight')].find(disk =>
        disk.querySelector('.disk-title')?.textContent === title);
    }
    if (!flight) throw new Error('The disk did not fly into its category tab.');
    const animation = flight.getAnimations()[0];
    const duration = Number(animation.effect!.getTiming().duration);
    animation.pause();
    const sample = async (progress: number) => {
      animation.currentTime = duration * progress;
      await nextFrame();
      const bounds = flight.getBoundingClientRect();
      const target = (tab.hasAttribute('aria-current') ? tab.querySelector('.course-category-fan')! : tab).getBoundingClientRect();
      const distance = Math.hypot(bounds.left + bounds.width / 2 - target.left - target.width / 2,
        bounds.top + bounds.height / 2 - target.top - target.height / 2);
      return { distance, width: bounds.width };
    };
    const start = await sample(0);
    const end = await sample(.98);
    await sample(.2);
    return { start, end, artwork: getComputedStyle(flight).borderImageSource, source: getComputedStyle(cover).borderImageSource };
  });
}

test('disks passing the top of the catalog shrink into their own tab and return on scroll', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/zh');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.course-category-tab[aria-current]')).toHaveText('入门');
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--home-masthead-height'));
  const disk = page.locator('[data-course-disk="llm-101"]');
  const flights = page.locator('.course-category-flight');
  const top = await captureTopCollection(disk);
  expect(top.end.distance).toBeLessThan(top.start.distance / 4);
  expect(top.end.width).toBeLessThan(top.start.width / 4);
  expect(top.artwork).toBe(top.source);
  await testInfo.attach('Disk collecting into its tab', { body: await page.screenshot(), contentType: 'image/png' });
  await testInfo.attach('Disk size and distance from its tab', { body: JSON.stringify(top, null, 2), contentType: 'application/json' });

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(flights).toHaveCount(0);
  await expect(disk).not.toHaveAttribute('data-collected');
  await expect(disk.locator('.course-disk')).toHaveCSS('opacity', '1');

  await captureTopCollection(disk);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(flights).toHaveCount(0);
  await expect(page.locator('[data-collected]')).toHaveCount(0);
});

test('intermediate disks scroll out through the bottom without flying into a tab', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 540 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/zh');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--home-masthead-height'));
  const disk = page.getByRole('region', { name: '中级', exact: true }).locator('[data-course-disk]').first();
  const currentTab = page.locator('.course-category-tab[aria-current]');
  const flights = page.locator('.course-category-flight');
  await disk.evaluate(link => link.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(currentTab).toHaveText('中级');
  await expect(disk).toBeInViewport({ ratio: 1 });
  await expect(flights).toHaveCount(0);

  await disk.evaluate(link => window.scrollBy({
    top: link.getBoundingClientRect().top - document.documentElement.clientHeight + 12, behavior: 'instant',
  }));
  await expect(currentTab).toHaveText('入门');
  const visibleHeight = await disk.evaluate(link => document.documentElement.clientHeight - link.getBoundingClientRect().top);
  expect(Math.abs(visibleHeight - 12)).toBeLessThan(1);
  await expect(disk).not.toHaveAttribute('data-collected');
  await expect(disk.locator('.course-disk')).toHaveCSS('opacity', '1');
  expect(await flights.count()).toBe(0);
  await testInfo.attach('Intermediate disk leaving the bottom of the screen', { body: await page.screenshot(), contentType: 'image/png' });

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(disk).not.toBeInViewport();
  await expect(disk).not.toHaveAttribute('data-collected');
  expect(await flights.count()).toBe(0);
});
