import { test, expect } from '@playwright/test';

test.describe('Neural E-commerce Full E2E Flow', () => {
  const uniqueId = Date.now().toString().slice(-6);
  const email = `testuser-${uniqueId}@research.dev`;
  
  test('Complete simulated purchase flow starting from consent', async ({ page }) => {
    // 1. Landing Page -> Consent
    await page.goto('/');
    await expect(page).toHaveTitle(/Neural Store/);
    
    // Click "Start Shopping" which should lead to consent page
    await page.getByRole('link', { name: 'Start Shopping' }).click();
    await expect(page).toHaveURL(/.*\/consent/);
    
    // Check the agreement checkbox
    await page.getByRole('checkbox').check();
    
    // Click "I Agree" to go to onboarding
    await page.getByRole('button', { name: /I Agree/ }).click();
    await expect(page).toHaveURL(/.*\/onboarding/);

    // 2. Onboarding (Signup)
    // Step 1: Account
    await page.getByPlaceholder('test@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Demographics
    await page.getByPlaceholder('25').fill('28');
    await page.locator('select').first().selectOption('M'); // Gender
    await page.getByPlaceholder('e.g., Istanbul').fill('Istanbul');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Shopping Habits
    await page.getByPlaceholder('e.g., 3').fill('4');
    await page.locator('input[type="date"]').fill('2026-03-01');
    await page.locator('select').nth(1).selectOption('yes'); // Save card
    
    // Submit
    await page.getByRole('button', { name: 'Complete Profile' }).click();
    
    // Should be redirected to shop
    await expect(page).toHaveURL(/.*\/shop/);

    // 3. Browse Products & Add to Cart
    // Wait for products to load
    await expect(page.locator('.grid').first()).toBeVisible();
    
    // Click on the first product's "View Details" or directly on the card
    const firstProduct = page.locator('.card').first();
    await firstProduct.click();
    await expect(page).toHaveURL(/.*\/product\/.*/);
    
    // Click Add to Cart
    await page.getByRole('button', { name: /Add to Cart/i }).first().click();
    
    // Check that button changes to "Added!" briefly
    await expect(page.getByRole('button', { name: /Added!/i })).toBeVisible();

    // 4. Cart & Checkout
    await page.getByRole('link', { name: /Cart/i }).first().click();
    await expect(page).toHaveURL(/.*\/cart/);
    
    // Apply coupon
    await page.getByPlaceholder('Coupon code').fill('WELCOME10');
    await page.getByRole('button', { name: 'Apply' }).click();
    
    // Wait for discount to be applied (text turns green or discount shows up)
    await expect(page.getByText(/Discount/i).first()).toBeVisible();

    // Proceed to Checkout
    await page.getByRole('link', { name: /Proceed to Checkout/i }).click();
    await expect(page).toHaveURL(/.*\/cart\/checkout.*/);

    // Confirm & Pay
    await page.getByRole('button', { name: /Confirm & Pay/i }).click();

    // Success screen
    await expect(page.getByText(/Order Confirmed!/i)).toBeVisible({ timeout: 10000 });
    
    // 5. Verify Profile updates
    await page.getByRole('link', { name: /View Profile/i }).click();
    await expect(page).toHaveURL(/.*\/profile/);
    await expect(page.getByText(email)).toBeVisible();
  });
});
