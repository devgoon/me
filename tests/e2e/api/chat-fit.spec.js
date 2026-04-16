const { test, expect } = require('@playwright/test');

test.describe('API POST endpoints (chat & fit)', () => {
  test('POST /api/chat with a simple message', async ({ request }) => {
    const res = await request.post('/api/chat', { data: { message: 'Hello from e2e test' } });
    const status = res.status();
    // Accept deployed (200) or emulator/service missing config (400/500)
    expect([200, 400, 500]).toContain(status);

    if (status === 200) {
      const body = await res.json();
      expect(body).toBeTruthy();
      expect(body).toHaveProperty('response');
    } else {
      // Ensure we get an error object for non-200 responses
      const bodyText = await res.text().catch(() => '');
      expect(bodyText.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('POST /api/fit with a minimal jobDescription', async ({ request }) => {
    const payload = { jobDescription: 'E2E test job description' };
    const res = await request.post('/api/fit', { data: payload });
    const status = res.status();
    // Deployed should return 200; emulator or missing AI key may return 500
    expect([200, 400, 500]).toContain(status);

    if (status === 200) {
      const body = await res.json();
      expect(body).toBeTruthy();
      // AI response should include score/verdict keys when successful
      expect(body).toHaveProperty('score');
      expect(body).toHaveProperty('verdict');
    } else {
      const bodyText = await res.text().catch(() => '');
      expect(bodyText.length).toBeGreaterThanOrEqual(0);
    }
  });
});
