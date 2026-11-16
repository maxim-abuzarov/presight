import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SearchField } from './SearchField.tsx';

function setup(value = '') {
  const onChange = vi.fn();
  const user = userEvent.setup();
  const utils = render(<SearchField value={value} onChange={onChange} />);
  return { ...utils, user, onChange, input: screen.getByRole('searchbox') };
}

describe('SearchField', () => {
  it('sends trimmed, collapsed text after the debounce', async () => {
    const { user, onChange, input } = setup();
    await user.type(input, '  anna    smith  ');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('anna smith'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps the raw text in the box while typing, so a space before the next word survives', async () => {
    const { user, input } = setup();
    await user.type(input, 'anna ');
    expect(input).toHaveValue('anna ');
  });

  it('treats whitespace-only input as no search and sends nothing', async () => {
    const { user, onChange, input } = setup();
    await user.type(input, '    ');
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not re-send when only whitespace changed', async () => {
    const { user, onChange, input } = setup('anna');
    await user.type(input, '   ');
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies immediately on Enter', async () => {
    const { user, onChange, input } = setup();
    await user.type(input, 'lee{Enter}');
    expect(onChange).toHaveBeenCalledWith('lee');
  });

  it('shows a validation error for too many words and does not search', async () => {
    const { user, onChange, input } = setup();
    await user.type(input, 'a b c d e f g h i j k');
    expect(await screen.findByRole('alert')).toHaveTextContent('Use at most 10 words.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('enforces the maximum length in the input itself', () => {
    const { input } = setup();
    expect(input).toHaveAttribute('maxLength', '120');
  });

  it('clears with the clear button and Escape', async () => {
    const { user, onChange, input } = setup('anna');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(onChange).toHaveBeenCalledWith('');

    await user.type(input, 'bo');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });
});
