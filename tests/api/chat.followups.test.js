/**
 * @fileoverview Tests for chat history sanitizing and follow-up parsing.
 * @module tests/api/chat.followups.test.js
 */
const { _helpers } = require('../../api/chat/index');

describe('parseFollowUps', () => {
  it('splits answer and follow-ups', () => {
    const { answer, followUps } = _helpers.parseFollowUps(
      'Yes, I have.\n\nFOLLOW_UPS: A? | B? | C?'
    );
    expect(answer).toBe('Yes, I have.');
    expect(followUps).toEqual(['A?', 'B?', 'C?']);
  });

  it('returns no follow-ups when marker is absent', () => {
    expect(_helpers.parseFollowUps('Just an answer')).toEqual({
      answer: 'Just an answer',
      followUps: [],
    });
  });
});

describe('sanitizeHistory', () => {
  it('drops invalid entries and leading assistant turns', () => {
    const out = _helpers.sanitizeHistory([
      { role: 'assistant', text: 'hi' },
      { role: 'system', text: 'x' },
      { role: 'user', text: ' q ' },
      { role: 'assistant', text: 'a' },
    ]);
    expect(out).toEqual([
      { role: 'user', text: 'q' },
      { role: 'assistant', text: 'a' },
    ]);
  });

  it('returns [] for non-arrays', () => {
    expect(_helpers.sanitizeHistory(undefined)).toEqual([]);
  });
});
