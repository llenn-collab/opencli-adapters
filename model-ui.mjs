import { CommandExecutionError } from '@jackwener/opencli/errors';

const selector = '[aria-label="Select Model"]';
const list = '[role="listbox"][aria-label="Models"]';

export async function discoverModels(page) {
  try {
    await page.wait({ selector, timeout: 30 });
    await page.click(selector);
    await page.wait({ selector: list, timeout: 10 });
    const models = await page.evaluate(() => {
      const listbox = document.querySelector('[role="listbox"][aria-label="Models"]');
      return [...(listbox?.querySelectorAll('[role="option"]') ?? [])].map((option) => ({
        label: option.querySelector('.wms-list__name-text')?.textContent.trim(),
        selected: option.getAttribute('aria-selected') === 'true',
        disabled: option.getAttribute('aria-disabled') === 'true' || option.hasAttribute('disabled'),
      }));
    });
    if (!Array.isArray(models) || !models.length || models.some((model) => !model.label)
      || new Set(models.map((model) => model.label)).size !== models.length
      || models.filter((model) => model.selected).length !== 1) {
      throw new Error('model menu has an unexpected structure');
    }
    return models;
  } catch (error) {
    throw new CommandExecutionError(`Could not discover Qwen models: ${error.message}`);
  }
}

export async function selectModel(page, requested) {
  const models = await discoverModels(page);
  const model = models.find((item) => item.label === requested);
  if (!model || model.disabled) throw new CommandExecutionError(`Qwen model unavailable: ${requested}`);
  if (!model.selected) {
    const clicked = await page.evaluate((label) => {
      const options = [...document.querySelectorAll('[role="listbox"][aria-label="Models"] [role="option"]')];
      const option = options.find((item) => item.querySelector('.wms-list__name-text')?.textContent.trim() === label);
      if (!option || option.getAttribute('aria-disabled') === 'true' || option.hasAttribute('disabled')) return false;
      option.click();
      return true;
    }, requested);
    if (!clicked) throw new CommandExecutionError(`Qwen model unavailable: ${requested}`);
    await page.wait(0.5);
  } else {
    await page.click(selector);
  }
  const selected = await page.evaluate(() => document.querySelector('[aria-label="Select Model"] .wms-trigger__text')?.textContent.trim());
  if (selected !== requested) throw new CommandExecutionError(`Qwen model selection mismatch: requested ${requested}, selected ${selected || 'unknown'}`);
  return selected;
}
