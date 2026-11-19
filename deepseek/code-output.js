import { writeFile } from 'node:fs/promises';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
export function extractCodeBlocks(markdown) {
  if (typeof markdown !== 'string') throw new ArgumentError('Expected response text');
  return [...markdown.matchAll(/```([^\n`]*)\n([\s\S]*?)```/g)].map(match => ({
    language: match[1].trim(), code: match[2].replace(/\n$/, ''),
  }));
}
cli({
  site: 'deepseek-chat', name: 'code-output',
  description: 'Extract fenced code from response text and optionally save one block',
  access: 'write', strategy: Strategy.PUBLIC, browser: false,
  args: [
    { name: 'text', positional: true, required: true, help: 'Assistant response text' },
    { name: 'index', type: 'int', default: 1, help: 'One-based block number to save' },
    { name: 'output', help: 'New local file for the selected block (never overwrites)' },
  ],
  columns: ['language', 'code'],
  func: async (args) => {
    const blocks = extractCodeBlocks(String(args.text ?? ''));
    if (!args.output) return blocks;
    const index = Number(args.index);
    if (!Number.isInteger(index) || index < 1 || index > blocks.length) throw new ArgumentError('index must select an existing code block');
    await writeFile(String(args.output), blocks[index - 1].code, { flag: 'wx' });
    return { saved: String(args.output), language: blocks[index - 1].language };
  },
});
