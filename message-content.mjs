import { CommandExecutionError } from '@jackwener/opencli/errors';

export function messageContent(message) {
  if (message.content) return message.content;
  const parts = Array.isArray(message.content_list)
    ? message.content_list.filter((part) => part?.phase === 'answer' && part.status === 'finished' && typeof part.content === 'string' && part.content)
    : [];
  if (parts.length > 1) throw new CommandExecutionError('Qwen returned multiple answer components; cannot verify the complete response');
  return parts[0]?.content ?? message.content;
}
