import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { qwenApiJson } from './qwen-api.mjs';

export function parseChatDetail(payload) {
  const messages = payload?.data?.chat?.history?.messages;
  if (payload?.success !== true || !messages || typeof messages !== 'object' || Array.isArray(messages)) {
    throw new CommandExecutionError('Qwen returned an unexpected conversation response');
  }
  return Object.values(messages).map((message) => {
    if (typeof message?.id !== 'string' || typeof message.role !== 'string' || typeof message.content !== 'string') {
      throw new CommandExecutionError('Qwen returned a message without an ID, role, or text');
    }
    return { id: message.id, role: message.role, content: message.content, timestamp: message.timestamp ?? null };
  }).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}

cli({
  site: 'qwen-studio', name: 'chat-detail', description: 'Read messages from a Qwen conversation',
  domain: 'chat.qwen.ai', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  args: [{ name: 'id', positional: true, required: true, help: 'Qwen conversation ID' }],
  columns: ['role', 'content'],
  func: async (page, args) => {
    const id = String(args.id ?? '');
    if (!/^[\w-]{1,80}$/.test(id)) throw new CommandExecutionError('Conversation ID contains unsupported characters');
    const payload = await qwenApiJson(page, `/api/v2/chats/${encodeURIComponent(id)}?direction=up&limit=10`);
    return parseChatDetail(payload);
  },
});
