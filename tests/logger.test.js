const logger = require('../api/_shared/logger');

describe('api/_shared/logger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('calls context.log[level] when available and formats meta object', () => {
    const infoFn = jest.fn();
    const context = { log: { info: infoFn } };

    logger.info(context, 'hello', { a: 1 });

    expect(infoFn).toHaveBeenCalledTimes(1);
    expect(infoFn).toHaveBeenCalledWith('hello {"a":1}');
  });

  test('calls context.log as function when context.log is callable', () => {
    const logFn = jest.fn();
    const context = { log: logFn };

    logger.warn(context, 'something');

    expect(logFn).toHaveBeenCalledTimes(1);
    expect(logFn).toHaveBeenCalledWith('something');
  });

  test('falls back to console methods when no context provided', () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.info(null, 'info-msg', { x: 2 });
    logger.warn(null, 'warn-msg');
    logger.error(null, 'err-msg', { ok: false });

    expect(spyLog).toHaveBeenCalledWith('info-msg {"x":2}');
    expect(spyWarn).toHaveBeenCalledWith('warn-msg');
    expect(spyError).toHaveBeenCalledWith('err-msg {"ok":false}');
  });

  test('debug logs with info level and debug prefix', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    logger.debug(null, 'dmsg');

    expect(spy).toHaveBeenCalledWith('[debug] dmsg');
  });
});
