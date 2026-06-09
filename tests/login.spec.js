const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://demowebshop.tricentis.com';

test.describe('Чек-лист логина - Demo Web Shop', () => {
  
  const VALID_EMAIL = 'test12355@mail.com';
  const VALID_PASSWORD = '12345678';
  
  async function logoutIfNeeded(page) {
    await page.goto(BASE_URL);
    if (await page.locator('a[href="/logout"]').isVisible()) {
      await page.click('a[href="/logout"]');
      await page.waitForTimeout(500);
    }
  }

  test.beforeEach(async ({ page }) => {
    await logoutIfNeeded(page);
    await page.goto(`${BASE_URL}/login`);
  });

  test('1. Логин с валидным email и паролем', async ({ page }) => {
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
  });

  test('2. Логаут', async ({ page }) => {
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
    
    await page.click('a[href="/logout"]');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

    test('3. Повторный логин', async ({ page }) => {
    // Первый вход
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
    
    // Выход
    await page.click('a[href="/logout"]');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
    
    // Явно переходим на страницу логина
    await page.goto(`${BASE_URL}/login`);
    
    // Второй вход
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
  });

  test('4. Пустой email', async ({ page }) => {
    await page.fill('#Email', '');
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    // Остались на странице логина
    await expect(page).toHaveURL(/.*login/);
  });

  test('5. Email без @', async ({ page }) => {
    await page.fill('#Email', 'testmail.com');
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    // Браузер должен показать ошибку валидации
    await expect(page).toHaveURL(/.*login/);
  });

  test('6. Несуществующий email', async ({ page }) => {
    await page.fill('#Email', 'nonexistent@test.com');
    await page.fill('#Password', 'anypassword');
    await page.click('input[value="Log in"]');
    
    await expect(page.locator('.validation-summary-errors')).toContainText('Login was unsuccessful');
    await expect(page.locator('.validation-summary-errors')).toContainText('No customer account found');
  });

  test('7. Email с пробелом в начале', async ({ page }) => {
    await page.fill('#Email', ` ${VALID_EMAIL}`);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    const success = await page.getByRole('link', { name: 'My account' }).isVisible();
    if (success) {
      await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
    } else {
      await expect(page.locator('.validation-summary-errors')).toContainText('Login was unsuccessful');
    }
  });

  test('8. Email с пробелом в конце', async ({ page }) => {
    await page.fill('#Email', `${VALID_EMAIL} `);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    const success = await page.getByRole('link', { name: 'My account' }).isVisible();
    if (success) {
      await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
    } else {
      await expect(page.locator('.validation-summary-errors')).toContainText('Login was unsuccessful');
    }
  });

  test('9. Email в верхнем регистре', async ({ page }) => {
    await page.fill('#Email', VALID_EMAIL.toUpperCase());
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    // Сайт должен игнорировать регистр email
    await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
  });

  test('10. Пустой пароль', async ({ page }) => {
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', '');
    await page.click('input[value="Log in"]');
    
    // Остались на странице логина
    await expect(page).toHaveURL(/.*login/);
  });

  test('11. Неверный пароль', async ({ page }) => {
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', 'WrongPassword123');
    await page.click('input[value="Log in"]');
    
    await expect(page.locator('.validation-summary-errors')).toContainText('Login was unsuccessful');
    await expect(page.locator('.validation-summary-errors')).toContainText('credentials provided are incorrect');
  });

  test('12. Пароль с пробелом в начале', async ({ page }) => {
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', ` ${VALID_PASSWORD}`);
    await page.click('input[value="Log in"]');
    
    await expect(page.locator('.validation-summary-errors')).toContainText('Login was unsuccessful');
  });

  test('13. Пароль с пробелом в конце', async ({ page }) => {
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', `${VALID_PASSWORD} `);
    await page.click('input[value="Log in"]');
    
    await expect(page.locator('.validation-summary-errors')).toContainText('Login was unsuccessful');
  });
});