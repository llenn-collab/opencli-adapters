// Parsers for observed DeepSeek payload shapes. users/current returns a code
// envelope: code 0 with user data when signed in, code 40002 when anonymous.
export function parseLoginStatus(payload) {
  if (!payload || typeof payload.code !== 'number') {
    throw new Error('DeepSeek returned an unexpected login status response');
  }
  if (payload.code === 40002) return { logged_in: false, site: 'chat.deepseek.com' };
  if (payload.code !== 0) throw new Error('DeepSeek returned an unexpected login status response');
  return { logged_in: true, site: 'chat.deepseek.com' };
}
export function parseConversationList(items) {
  if (!Array.isArray(items)) throw new Error('DeepSeek returned an unexpected conversation list');
  return items.map((item) => {
    if (typeof item?.id !== 'string' || typeof item.title !== 'string') {
      throw new Error('DeepSeek returned a conversation without an ID or title');
    }
    return { id: item.id, title: item.title, pinned: Boolean(item.pinned) };
  });
}
export function parseVisibleMessages(rows) {
  if (!Array.isArray(rows)) throw new Error('DeepSeek returned an unexpected conversation response');
  return rows.map((row) => {
    if (typeof row?.role !== 'string' || typeof row.content !== 'string') {
      throw new Error('DeepSeek returned a message without a role or text');
    }
    return { role: row.role, content: row.content };
  });
}
