const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://demowebshop.tricentis.com';
const VALID_EMAIL = 'test12355@mail.com';
const VALID_PASSWORD = '12345678';

test.describe('API тесты аутентификации', () => {

  // ============================================================
  // 1. Проверка параметров запроса (с учётом URL-кодирования)
  // ============================================================
  test('1. POST /login: запрос отправляется с правильными параметрами', async ({ page }) => {
    let requestBody = null;
    
    const requestPromise = page.waitForRequest(request => 
      request.method() === 'POST' && request.url().includes('/login')
    );
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    const capturedRequest = await requestPromise;
    requestBody = capturedRequest.postData();
    
    expect(requestBody).toBeDefined();
    // Проверяем наличие email (учитывая URL-кодирование: @ -> %40)
    const encodedEmail = VALID_EMAIL.replace('@', '%40');
    expect(requestBody).toContain(encodedEmail);
    expect(requestBody).toContain(VALID_PASSWORD);
    console.log('✅ API запрос логина отправлен корректно');
  });

  // ============================================================
  // 2. Успешный логин — проверяем, что произошёл редирект (через URL)
  // ============================================================
  test('2. POST /login: успешный логин перенаправляет на главную', async ({ page }) => {
    // Ждём завершения навигации после клика
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    
    // Кликаем и ждём перехода на другую страницу
    await Promise.all([
      page.waitForNavigation(), // Ждём навигации (редирект)
      page.click('input[value="Log in"]')
    ]);
    
    // После логина должны быть не на странице логина
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    console.log('✅ Успешный логин перенаправляет с /login');
  });

  // ============================================================
  // 3. Неудачный логин — остаёмся на странице логина
  // ============================================================
  test('3. POST /login: неудачный логин остаётся на странице логина', async ({ page }) => {
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/login')
    );
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', 'wrong@mail.com');
    await page.fill('#Password', 'wrongpassword');
    await page.click('input[value="Log in"]');
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(page.url()).toContain('/login');
    console.log('✅ Неудачный логин остаётся на странице логина');
  });

  // ============================================================
  // 4. Logout — проверяем, что произошёл выход
  // ============================================================
  test('4. GET /logout: выход из системы разлогинивает пользователя', async ({ page }) => {
    // Сначала логинимся
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation(),
      page.click('input[value="Log in"]')
    ]);
    
    // Проверяем, что залогинены
    await expect(page.locator('a[href="/logout"]')).toBeVisible();
    
    // Выходим
    await Promise.all([
      page.waitForNavigation(),
      page.click('a[href="/logout"]')
    ]);
    
    // Проверяем, что разлогинены
    await expect(page.locator('a[href="/login"]')).toBeVisible();
    console.log('✅ Выход из системы выполнен успешно');
  });
});