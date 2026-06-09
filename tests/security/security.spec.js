const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://demowebshop.tricentis.com';

test.describe('Тесты безопасности - Login (базовая проверка)', () => {
  
  const VALID_EMAIL = 'test12355@mail.com';
  const VALID_PASSWORD = '12345678';
  
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  // ============================================================
  // 1. HTTPS
  // ============================================================
  test('1. HTTPS: сайт использует защищённое соединение', async ({ page }) => {
    const url = page.url();
    expect(url).toMatch(/^https:/);
    console.log('✅ Сайт использует HTTPS');
  });

  // ============================================================
  // 2. POST — проверка реального сетевого запроса (ИСПРАВЛЕН)
  // ============================================================
  test('2. POST: данные отправляются методом POST (проверка Network)', async ({ page }) => {
    // Ожидаем POST-запрос к /login
    const postPromise = page.waitForRequest(request => 
      request.method() === 'POST' && request.url().includes('/login')
    );
    
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    await page.click('input[value="Log in"]');
    
    const postRequest = await postPromise;
    expect(postRequest.method()).toBe('POST');
    console.log('✅ Реальный запрос к /login отправлен методом POST');
  });

  // ============================================================
  // 3. Пароль не передаётся в URL
  // ============================================================
  test('3. Конфиденциальность: пароль не передаётся в URL', async ({ page }) => {
    await page.fill('#Email', VALID_EMAIL);
    await page.fill('#Password', VALID_PASSWORD);
    
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/login')),
      page.click('input[value="Log in"]')
    ]);
    
    const requestUrl = response.request().url();
    expect(requestUrl).not.toContain(VALID_EMAIL);
    expect(requestUrl).not.toContain(VALID_PASSWORD);
    console.log('✅ Пароль и email не видны в URL');
  });

  // ============================================================
  // 4. SQL Injection — проверка базовых векторов
  // ============================================================
  test('4. SQL Injection: базовые векторы не сработали (ограниченная проверка)', async ({ page }) => {
    const sqlVectors = [
      `' OR '1'='1`,
      `' OR 1=1--`,
      `admin'--`,
      `' UNION SELECT NULL--`,
      `' OR 1=1#`,
      `1' AND '1'='1`,
    ];
    
    for (const vector of sqlVectors) {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('#Email', vector);
      await page.fill('#Password', vector);
      await page.click('input[value="Log in"]');
      
      const isLoggedIn = await page.locator('a[href="/logout"]').isVisible();
      expect(isLoggedIn).toBe(false);
      console.log(`   ✅ Вектор "${vector.substring(0, 30)}..." не сработал`);
    }
    
    console.log('⚠️ Проверены 6 базовых SQL-векторов. Уязвимостей не обнаружено.');
    console.log('⚠️ Для полной уверенности требуется профессиональный пентест.');
  });

  // ============================================================
  // 5. XSS — проверка базовых векторов
  // ============================================================
  test('5. XSS: базовые векторы не сработали (ограниченная проверка)', async ({ page }) => {
    const xssVectors = [
      `<script>alert(1)</script>`,
      `<img src=x onerror=alert(1)>`,
      `javascript:alert(1)`,
      `<body onload=alert(1)>`,
      `"><script>alert(1)</script>`,
      `<svg onload=alert(1)>`,
      `';alert(1);//`,
    ];
    
    for (const vector of xssVectors) {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('#Email', vector);
      await page.fill('#Password', VALID_PASSWORD);
      await page.click('input[value="Log in"]');
      
      const pageContent = await page.content();
      expect(pageContent).not.toContain(vector.replace(/'/g, "\\'"));
      console.log(`   ✅ Вектор "${vector.substring(0, 30)}..." не сработал`);
    }
    
    console.log('⚠️ Проверены 7 базовых XSS-векторов. Уязвимостей не обнаружено.');
    console.log('⚠️ Для полной уверенности требуется профессиональный пентест.');
  });

  // ============================================================
  // 6. Информация об ошибках
  // ============================================================
  test('6. Информация об ошибках: не раскрывает существование email', async ({ page }) => {
    await page.fill('#Email', 'nonexistent@test.com');
    await page.fill('#Password', 'anypassword');
    await page.click('input[value="Log in"]');
    
    const errorText = await page.locator('.validation-summary-errors').textContent();
    
    expect(errorText).toContain('Login was unsuccessful');
    expect(errorText).not.toContain('Email not found');
    expect(errorText).not.toContain('пользователь не найден');
    console.log('✅ Сообщения об ошибках не раскрывают информацию о пользователях');
  });

  // ============================================================
  // 7. Длина полей — информационная проверка
  // ============================================================
  test('7. Длина полей: проверка ограничений (информационно)', async ({ page }) => {
    const emailMaxLength = await page.locator('#Email').getAttribute('maxlength');
    const passwordMaxLength = await page.locator('#Password').getAttribute('maxlength');
    
    if (emailMaxLength) {
      console.log(`📧 Email maxlength: ${emailMaxLength}`);
    } else {
      console.log('⚠️ Поле email не имеет maxlength — клиентская валидация отсутствует');
    }
    
    if (passwordMaxLength) {
      console.log(`🔒 Password maxlength: ${passwordMaxLength}`);
    } else {
      console.log('⚠️ Поле password не имеет maxlength — клиентская валидация отсутствует');
    }
    
    console.log('✅ Проверка ограничений полей выполнена');
  });

  // ============================================================
  // 8. CSRF-токен
  // ============================================================
  test('8. CSRF: проверка наличия защитного токена', async ({ page }) => {
    const csrfToken = await page.locator('input[name="__RequestVerificationToken"]');
    const tokenCount = await csrfToken.count();
    
    if (tokenCount > 0) {
      const tokenValue = await csrfToken.getAttribute('value');
      expect(tokenValue).toBeTruthy();
      expect(tokenValue?.length).toBeGreaterThan(10);
      console.log('✅ CSRF-токен присутствует в форме');
    } else {
      console.log('⚠️ CSRF-токен не найден — потенциальная уязвимость');
      console.log('⚠️ Рекомендуется проверить вручную необходимость CSRF-защиты для формы логина');
    }
  });
});