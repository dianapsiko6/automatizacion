// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Ejecuta los tests de los archivos en paralelo */
  fullyParallel: true,
  /* Falla en CI si se dejó un test.only por error */
  forbidOnly: !!process.env.CI,
  /* Reintentos: 2 en CI, 1 en local (la web real a veces es lenta) */
  retries: process.env.CI ? 2 : 1,
  /* Un solo worker en CI */
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    /* Permite usar page.goto('/aereo') en los tests */
    baseURL: 'https://shalom.com.pe',

    /* Trace al reintentar un test fallido */
    trace: 'on-first-retry',

    /* Captura de pantalla al final de cada test */
    screenshot: 'on',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },

    /* Viewports móviles */
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
});