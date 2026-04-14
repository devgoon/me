/** @jest-environment jsdom */
/* Tests for frontend/assets/js/loading-messages.js */

describe('loading-messages', function () {
  const modPath = '../frontend/assets/js/loading-messages.js';
  let origMathRandom;

  beforeEach(function () {
    // isolate module execution
    jest.resetModules();
    origMathRandom = Math.random;
  });

  afterEach(function () {
    Math.random = origMathRandom;
    // cleanup globals the module sets
    try {
      delete window.getLoadingMessage;
      delete window.loadingMessages;
    } catch (e) {}
  });

  test('exposes getLoadingMessage and loadingMessages.all', function () {
    Math.random = jest.fn(() => 0);
    require(modPath);
    expect(typeof window.getLoadingMessage).toBe('function');
    expect(window.loadingMessages).toBeDefined();
    expect(Array.isArray(window.loadingMessages.all)).toBe(true);
    // deterministic with Math.random() === 0 -> first message
    const first = window.loadingMessages.all[0];
    expect(window.getLoadingMessage()).toBe(first);
  });
});
