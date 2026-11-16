import { countOf, expect, openFilters, peopleCount, test } from './fixtures.ts';

test.describe('startup', () => {
  test('loads with no failed requests and no console errors', async ({ page }) => {
    const apiCalls: string[] = [];
    const anyFailure: string[] = [];
    page.on('requestfailed', (request) => anyFailure.push(request.url()));
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.match(/^\/api\/(users|facets)$/))
        apiCalls.push(request.url());
    });

    await page.goto('/');
    await expect(peopleCount(page)).toHaveText('2,000 people match');
    await expect(page.getByRole('article').first()).toBeVisible();
    // One list request and one facet request: nothing aborted and retried.
    expect(apiCalls).toHaveLength(2);
    // On a plain page load nothing at all may fail, images included.
    await page.waitForLoadState('networkidle');
    expect(anyFailure).toEqual([]);
  });

  test('reports a healthy API and database', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.ok()).toBe(true);
    expect(await health.json()).toMatchObject({ status: 'ok', db: { status: 'ok', users: 2000 } });
  });
});

test.describe('search', () => {
  test('ignores surrounding and repeated whitespace', async ({ page }) => {
    await page.goto('/');
    await expect(peopleCount(page)).toHaveText('2,000 people match');
    const search = page.getByRole('searchbox');

    const response = page.waitForResponse(
      (r) => r.url().includes('/api/users?') && new URL(r.url()).searchParams.get('q') === 'anna',
    );
    await search.fill('anna');
    const { pagination } = (await (await response).json()) as { pagination: { total: number } };
    expect(pagination.total).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\?q=anna$/);
    await expect.poll(() => countOf(page)).toBe(pagination.total);

    await search.fill('    anna     ');
    await search.press('Enter');
    await expect(page).toHaveURL(/\?q=anna$/);
    await expect.poll(() => countOf(page)).toBe(pagination.total);
  });

  test('treats whitespace-only input as no search', async ({ page }) => {
    await page.goto('/?q=anna');
    await page.getByRole('searchbox').fill('     ');
    await expect(page).toHaveURL(/\/$/);
    await expect(peopleCount(page)).toHaveText('2,000 people match');
  });

  test('canonicalises a hand-edited URL instead of failing', async ({ page }) => {
    await page.goto('/?q=%20%20anna%20%20&ageMin=abc&sort=bogus');
    await expect(page).toHaveURL(/\?q=anna$/);
    await expect(page.getByRole('searchbox')).toHaveValue('anna');
  });

  test('shows a validation message for too many words', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox').fill('a b c d e f g h i j k');
    await expect(page.getByText('Use at most 10 words.')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('filters', () => {
  test('a facet count equals the result count it produces, and survives reload', async ({
    page,
  }) => {
    await page.goto('/');
    const filters = await openFilters(page);
    const firstHobby = filters
      .locator('section', { hasText: 'Hobbies' })
      .getByRole('button')
      .first();
    const expected = Number(
      (await firstHobby.locator('span').last().textContent())!.replace(/\D/g, ''),
    );
    await firstHobby.click();

    await expect(page).toHaveURL(/hobbies=/);
    if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
    await expect.poll(() => countOf(page)).toBe(expected);

    await page.reload();
    await expect.poll(() => countOf(page)).toBe(expected);
  });

  test('validates the age range and only applies a valid one', async ({ page }) => {
    await page.goto('/');
    const filters = await openFilters(page);
    const min = filters.getByLabel('Minimum age');
    const max = filters.getByLabel('Maximum age');

    await min.fill('50');
    await max.fill('20');
    await expect(
      filters.getByText('Maximum age must be greater than or equal to minimum age.'),
    ).toBeVisible();
    await expect(max).toHaveAttribute('aria-invalid', 'true');
    await expect(page).not.toHaveURL(/ageMax/);

    await max.fill('60');
    await expect(page).toHaveURL(/ageMin=50&ageMax=60/);
    await expect(filters.getByRole('alert')).toHaveCount(0);

    await min.fill('abc');
    await expect(filters.getByText('Minimum age must be a whole number.')).toBeVisible();
    await expect(page).toHaveURL(/ageMin=50&ageMax=60/);
  });
});

test.describe('list', () => {
  test('sorts deterministically and keeps sort in the URL', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Sort by').selectOption('age');
    await page.getByRole('button', { name: /Switch to descending/ }).click();
    await expect(page).toHaveURL(/sort=age&order=desc/);
    await page.reload();
    await expect(page.getByLabel('Sort by')).toHaveValue('age');
  });

  test('loads the next page on scroll while keeping the DOM small', async ({ page }) => {
    await page.goto('/');
    const nextPage = page.waitForResponse((response) => response.url().includes('page=2'));
    const list = page.getByLabel('Directory records');
    await list.hover();
    for (let i = 0; i < 12; i += 1) await page.mouse.wheel(0, 2000);
    expect((await nextPage).ok()).toBe(true);
    expect(await page.getByRole('article').count()).toBeLessThan(60);
  });
});

test.describe('errors', () => {
  test.use({ allowFailures: true });

  test('shows a retryable error state when the API fails', async ({ page }) => {
    let fail = true;
    await page.route('**/api/users?*', (route) =>
      fail
        ? route.fulfill({
            status: 500,
            json: { error: 'Internal server error', requestId: 'abcdef123456' },
          })
        : route.continue(),
    );
    await page.goto('/');
    await expect(page.getByText('Could not load the directory')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/reference abcdef12/)).toBeVisible();

    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(peopleCount(page)).toBeVisible();
  });
});
