const { hideCacheRecords } = require('../../api/admin/index');

describe('admin.hideCacheRecords', () => {
  test('calls client.query to hide cache records', async () => {
    const client = { query: jest.fn().mockResolvedValue({}), end: jest.fn() };
    await hideCacheRecords(client);
    expect(client.query).toHaveBeenCalled();
    expect(client.query.mock.calls[0][0].toLowerCase()).toContain('update ai_response_cache');
  });
});
