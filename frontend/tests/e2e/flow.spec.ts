import { test, expect } from '@playwright/test';

test.describe('Neural E-commerce Full E2E Flow', () => {
  const uniqueId = Date.now().toString().slice(-6);
  const email = `testuser-${uniqueId}@research.dev`;

  // Use a 60-second timeout for this heavy multi-step test
  test.setTimeout(90000);

  test('Complete simulated purchase flow starting from consent', async ({ page }) => {
    // 1. Landing Page -> Consent
    await page.goto('/');
    await expect(page).toHaveTitle(/Neural Store/);

    // Click "Start Shopping" which should lead to consent page
    await page.getByRole('link', { name: 'Start Shopping' }).click();
    await expect(page).toHaveURL(/.*\/consent/);

    // Check the agreement checkbox by clicking the visible label (the real checkbox is sr-only/hidden)
    await page.locator('label:has(input[type="checkbox"])').click();

    // Click "I Agree" to go to onboarding
    await page.getByRole('button', { name: /I Agree/ }).click();
    await expect(page).toHaveURL(/.*\/onboarding/);

    // 2. Onboarding (Signup)
    // Step 1: Account
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Min 6 characters').fill('password123');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Demographics
    await page.locator('input[type="number"]').fill('28');
    await page.locator('select').first().selectOption('M'); // Gender
    await page.locator('select').nth(1).selectOption('Istanbul'); // City
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Shopping Habits
    await page.locator('input[type="number"]').fill('4');
    await page.locator('input[type="date"]').fill('2026-03-01');
    await page.getByRole('button', { name: 'Yes, save it' }).click(); // Save card

    // Submit
    await page.getByRole('button', { name: 'Create Account & Shop →' }).click();

    // Should be redirected to scenario
    await expect(page).toHaveURL(/.*\/scenario/);

    // Wait for 8-second gated button and click
    await expect(page.getByRole('button', { name: /I understand, Start Shopping/i })).toBeEnabled({ timeout: 10000 });
    await page.getByRole('button', { name: /I understand, Start Shopping/i }).click();

    // Should be redirected to shop
    await expect(page).toHaveURL(/.*\/shop/, { timeout: 5000 });

    // 3. Browse Products & Add to Cart
    // Filter to Accessories category and sort price low→high to guarantee affordability
    await page.getByRole('button', { name: 'Accessories' }).click();

    // Sort by price ascending to ensure we pick the cheapest product
    await page.locator('select').last().selectOption('price_asc');

    // Wait for products to load (skeleton loaders disappear)
    await expect(page.locator('.card.animate-pulse')).toHaveCount(0, { timeout: 10000 });

    // Click on the first product link (cheapest in Accessories ~4,399 TL, within any budget)
    const firstProduct = page.locator('a:has(.card)').first();
    await firstProduct.click();
    await expect(page).toHaveURL(/.*\/product\/.*/);

    // Click Add to Cart
    await page.getByRole('button', { name: /Add to Cart/i }).first().click();

    // Check that button changes to "Added to Cart" briefly
    await expect(page.getByRole('button', { name: /Added to Cart/i })).toBeVisible({ timeout: 5000 });

    // 4. Cart & Checkout
    await page.locator('a[href="/cart"]').first().click();
    await expect(page).toHaveURL(/.*\/cart/);

    // Apply coupon
    await page.getByPlaceholder('Coupon code').fill('WELCOME10');
    await page.getByRole('button', { name: 'Apply' }).click();

    // Wait for coupon to be validated - should show the coupon message
    await expect(page.getByText(/Coupon applied! 10% discount/i)).toBeVisible({ timeout: 5000 });

    // Proceed to Checkout
    await page.getByRole('link', { name: /Proceed to Checkout/i }).click();
    await expect(page).toHaveURL(/.*\/cart\/checkout.*/);

    // Confirm & Pay - wait for cart to be loaded first (button will be enabled when cart has items)
    await expect(page.getByRole('button', { name: /Confirm & Pay/i })).toBeEnabled({ timeout: 10000 });
    await page.getByRole('button', { name: /Confirm & Pay/i }).click();

    // Debug: capture any error text visible on the page
    const errorText = await page.locator('[style*="--error"]').allTextContents();
    if (errorText.length > 0) console.log('ERROR SHOWN ON PAGE:', errorText);

    // Success screen
    await expect(page.getByText(/Order Confirmed!/i)).toBeVisible({ timeout: 15000 });

    // 5. Complete Study -> Debrief Survey
    await page.getByRole('button', { name: /Complete Study/i }).click();
    await expect(page).toHaveURL(/.*\/debrief/);

    // Fill in the debrief survey
    // Q1: Did you purchase an item?
    await page.getByRole('radio', { name: /Yes/i }).first().click();

    // Q2: How well did you complete the task?
    await page.locator('select').first().selectOption('Yes'); // "Fully"

    // Q3: Mission recall text
    await page.locator('textarea').first().fill('I needed to buy a tech accessory within my budget.');

    // Q4 & Q5: Realism scores (pick 4 for each)
    await page.locator('input[name="scenario_realism"]').nth(3).click(); // score 4
    await page.locator('input[name="overall_realism"]').nth(3).click();  // score 4

    // Submit survey
    await page.getByRole('button', { name: /Submit Responses/i }).click();

    // Should show Thank You
    await expect(page.getByText(/Thank You!/i)).toBeVisible({ timeout: 10000 });

    // 6. Verify Profile - navigate directly
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*\/profile/);
    await expect(page.getByText(email)).toBeVisible({ timeout: 5000 });
  });
});
