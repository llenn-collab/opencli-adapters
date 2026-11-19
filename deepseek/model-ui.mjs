import { CommandExecutionError } from '@jackwener/opencli/errors';

// Observed model picker: div[role="radio"] in fixed positional order. Visible
// labels are localized per build, so the adapter uses the observed positional
// aliases only.
export const modelLabels = ['instant', 'expert', 'vision'];

export async function discoverModels(page) {
  try {
    await page.wait({ selector: 'div[role="radio"]', timeout: 30 });
    const models = await page.evaluate((labels) => {
      const radios = [...document.querySelectorAll('div[role="radio"]')];
      return radios.map((radio, index) => ({
        label: labels[index],
        selected: radio.getAttribute('aria-checked') === 'true',
        disabled: radio.getAttribute('aria-disabled') === 'true' || radio.hasAttribute('disabled'),
      }));
    }, modelLabels);
    if (!Array.isArray(models) || models.length !== modelLabels.length
      || models.some((model) => !model.label)
      || models.filter((model) => model.selected).length !== 1) {
      throw new Error('model controls have an unexpected structure');
    }
    return models;
  } catch (error) {
    throw new CommandExecutionError(`Could not discover DeepSeek models: ${error.message}`);
  }
}

export async function selectModel(page, requested) {
  const models = await discoverModels(page);
  const model = models.find((item) => item.label === requested);
  if (!model || model.disabled) throw new CommandExecutionError(`DeepSeek model unavailable: ${requested}`);
  const index = modelLabels.indexOf(requested);
  if (!model.selected) {
    const clicked = await page.evaluate((index) => {
      const radio = document.querySelectorAll('div[role="radio"]')[index];
      if (!radio || radio.getAttribute('aria-disabled') === 'true' || radio.hasAttribute('disabled')) return false;
      radio.click();
      return true;
    }, index);
    if (!clicked) throw new CommandExecutionError(`DeepSeek model unavailable: ${requested}`);
    await page.wait(0.5);
  }
  const selected = await page.evaluate((labels) => {
    const radios = [...document.querySelectorAll('div[role="radio"]')];
    const active = radios.findIndex((radio) => radio.getAttribute('aria-checked') === 'true');
    return active >= 0 ? labels[active] : '';
  }, modelLabels);
  if (selected !== requested) {
    throw new CommandExecutionError(`DeepSeek model selection mismatch: requested ${requested}, selected ${selected || 'unknown'}`);
  }
  return selected;
}

// Observed composer toggles: .ds-toggle-button, DeepThink first, Search second.
// Search exists only on the instant model. Returns the verified active state so
// callers can fail closed when a click is missing or ignored by the UI.
export async function setFeature(page, feature, enabled) {
  const index = feature === 'DeepThink' ? 0 : feature === 'Search' ? 1 : -1;
  if (index < 0) throw new CommandExecutionError(`Unknown DeepSeek feature: ${feature}`);
  const read = () => page.evaluate((idx) => {
    const button = document.querySelectorAll('.ds-toggle-button')[idx];
    if (!button) return null;
    return button.classList.contains('ds-toggle-button--selected');
  }, index);
  let active = await read();
  if (active === null) return { ok: false, active: null };
  if (active !== enabled) {
    const clicked = await page.evaluate((idx) => {
      const button = document.querySelectorAll('.ds-toggle-button')[idx];
      if (!button) return false;
      button.click();
      return true;
    }, index);
    if (!clicked) return { ok: false, active: null };
    for (let attempt = 0; attempt < 2 && active !== enabled; attempt++) {
      await page.wait(0.3);
      active = await read();
      if (active === null) return { ok: false, active: null };
    }
  }
  return { ok: active === enabled, active };
}
