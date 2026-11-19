export function parseLoginStatus(payload) {
  if (!payload || payload.success !== true || typeof payload.data !== 'boolean') {
    throw new Error('Qwen returned an unexpected login status response');
  }
  return { logged_in: payload.data, site: 'chat.qwen.ai' };
}

export function parseChats(payload) {
  if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
    throw new Error('Qwen returned an unexpected chat list response');
  }
  return payload.data.map((chat) => {
    if (typeof chat.id !== 'string' || typeof chat.title !== 'string') {
      throw new Error('Qwen returned a chat without an ID or title');
    }
    return { id: chat.id, title: chat.title, created_at: chat.created_at ?? null,
      updated_at: chat.updated_at ?? null, chat_type: chat.chat_type ?? null,
      project_id: chat.project_id ?? null, pinned: Boolean(chat.pinned) };
  });
}

export function buildChatsPath(page = 1) {
  if (!Number.isInteger(page) || page < 1) throw new Error('page must be a positive integer');
  return `/api/v2/chats/?page=${page}&exclude_project=true`;
}

export function parseArrayData(payload, label) {
  if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
    throw new Error(`Qwen returned an unexpected ${label} response`);
  }
  return payload.data;
}

export function parseLibrary(payload) {
  const data = payload?.data;
  if (payload?.success !== true || !data || !Array.isArray(data.items) || typeof data.has_more !== 'boolean') {
    throw new Error('Qwen returned an unexpected library response');
  }
  return {
    ...data,
    items: data.items.map((item) => item && typeof item.url === 'string'
      ? { ...item, url: item.url.replace(/([?&]key=)[^&#]*/g, '$1[redacted]') }
      : item),
  };
}
