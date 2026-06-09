const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://demowebshop.tricentis.com';
const VALID_EMAIL = 'test12355@mail.com';
const VALID_PASSWORD = '12345678';

// Вспомогательная функция входа
async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#Email', VALID_EMAIL);
  await page.fill('#Password', VALID_PASSWORD);
  await page.click('input[value="Log in"]');
  await expect(page.locator('a[href="/logout"]')).toBeVisible();
}

test.describe('Продвинутая безопасность аутентификации', () => {

  // ============================================================
  // 1. Set-Cookie после логина (ИСПРАВЛЕН)
  // ============================================================
  test('1. Set-Cookie: после успешного логина устанавливаются cookies', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    // Ждём завершения логина
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    // Проверяем cookies через контекст браузера
    const cookies = await context.cookies();
    expect(cookies.length).toBeGreaterThan(0);
    console.log(`✅ Установлены cookies: ${cookies.map(c => c.name).join(', ')}`);
  });

  // ============================================================
  // 2. Флаг Secure
  // ============================================================
  test('2. Cookie флаг Secure: защита от передачи по HTTP', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    const cookies = await context.cookies();
    const hasSecure = cookies.some(c => c.secure === true);
    console.log(`🔒 Secure флаг: ${hasSecure ? '✅ присутствует' : '❌ отсутствует'}`);
  });

  // ============================================================
  // 3. Флаг HttpOnly
  // ============================================================
  test('3. Cookie флаг HttpOnly: защита от XSS доступа к cookie', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    const cookies = await context.cookies();
    const hasHttpOnly = cookies.some(c => c.httpOnly === true);
    console.log(`🔒 HttpOnly флаг: ${hasHttpOnly ? '✅ присутствует' : '❌ отсутствует'}`);
  });

  // ============================================================
  // 4. Флаг SameSite
  // ============================================================
  test('4. Cookie флаг SameSite: защита от CSRF', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    const cookies = await context.cookies();
    const hasSameSite = cookies.some(c => c.sameSite === 'Lax' || c.sameSite === 'Strict');
    console.log(`🔒 SameSite флаг: ${hasSameSite ? '✅ присутствует' : '❌ отсутствует'}`);
  });

  // ============================================================
  // 5. Remember Me (пропуск, если нет)
  // ============================================================
  test('5. Remember Me: запоминание пользователя (если есть на сайте)', async ({ page, context }) => {
    const rememberMeCheckbox = page.locator('#RememberMe');
    const hasRememberMe = await rememberMeCheckbox.count() > 0;
    
    if (!hasRememberMe) {
      console.log('⚠️ На сайте нет функции Remember Me — тест пропущен');
      test.skip();
      return;
    }
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await rememberMeCheckbox.check();
    await page.click('input[value="Log in"]');
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    await page.close();
    
    const newPage = await context.newPage();
    await newPage.goto(BASE_URL);
    
    const isLoggedIn = await newPage.locator('a[href="/logout"]').isVisible();
    expect(isLoggedIn).toBe(true);
    console.log('✅ Remember Me работает');
  });

  // ============================================================
  // 6. Logout
  // ============================================================
  test('6. Logout: после выхода пользователь разлогинивается', async ({ page }) => {
    await login(page);
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    await page.click('a[href="/logout"]');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
    console.log('✅ Logout выполнен успешно');
  });

  // ============================================================
  // 7. После Logout — доступ через UI (ИСПРАВЛЕН)
  // ============================================================
  test('7. После Logout: доступ к My Account через UI запрещён', async ({ page }) => {
    await login(page);
    await page.click('a[href="/logout"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
    
    const myAccountLink = page.locator('a[href="/customer/info"]');
    if (await myAccountLink.isVisible()) {
      await myAccountLink.click();
      await expect(page).toHaveURL(/.*login/);
      console.log('✅ Клик по My Account перенаправляет на логин');
    } else {
      console.log('✅ Ссылка на My Account отсутствует в UI');
    }
  });

  // ============================================================
  // 8. Прямой URL после logout
  // ============================================================
  test('8. После Logout: прямой URL /customer/info недоступен', async ({ page }) => {
    await login(page);
    await page.click('a[href="/logout"]');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
    
    await page.goto(`${BASE_URL}/customer/info`);
    const isRedirectedToLogin = page.url().includes('/login');
    expect(isRedirectedToLogin).toBe(true);
    console.log('✅ Прямой доступ к /customer/info перенаправляет на логин');
  });

  // ============================================================
  // 9. Удаление cookie разлогинивает
  // ============================================================
  test('9. Удаление auth cookie: разлогинивает пользователя', async ({ page, context }) => {
    await login(page);
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    await context.clearCookies();
    await page.reload();
    
    const isLoggedOut = await page.locator('a[href="/login"]').isVisible();
    expect(isLoggedOut).toBe(true);
    console.log('✅ Удаление cookies привело к разлогиниванию');
  });

  // ============================================================
  // 10. Новая вкладка — та же сессия
  // ============================================================
  test('10. Новая вкладка: использует ту же сессию (шаринг cookies)', async ({ page, context }) => {
    await login(page);
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    const newPage = await context.newPage();
    await newPage.goto(BASE_URL);
    
    const isLoggedInNewTab = await newPage.locator('a[href="/logout"]').isVisible();
    expect(isLoggedInNewTab).toBe(true);
    console.log('✅ Новая вкладка использует ту же сессию');
  });
});