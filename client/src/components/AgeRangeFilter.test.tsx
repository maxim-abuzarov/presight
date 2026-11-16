import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AgeRangeFilter } from './AgeRangeFilter.tsx';

function setup(ageMin: number | null = null, ageMax: number | null = null) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  const utils = render(<AgeRangeFilter ageMin={ageMin} ageMax={ageMax} onChange={onChange} />);
  return {
    ...utils,
    user,
    onChange,
    min: screen.getByLabelText('Minimum age'),
    max: screen.getByLabelText('Maximum age'),
  };
}

describe('AgeRangeFilter', () => {
  it('applies a valid range once typing pauses', async () => {
    const { user, onChange, min, max } = setup();
    await user.type(min, '25');
    await user.type(max, '40');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(25, 40));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('shows an error for non-numeric input, marks the field invalid and applies nothing', async () => {
    const { user, onChange, min } = setup();
    await user.type(min, '2e');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Minimum age must be a whole number.',
    );
    expect(min).toHaveAttribute('aria-invalid', 'true');
    expect(min).toHaveAccessibleDescription('Minimum age must be a whole number.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range age', async () => {
    const { user, max } = setup();
    await user.type(max, '200');
    expect(await screen.findByRole('alert')).toHaveTextContent('between 0 and 130');
  });

  it('rejects min greater than max and keeps the last valid range applied', async () => {
    const { user, onChange, min, max } = setup(20, 30);
    await user.clear(min);
    await user.type(min, '50');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Maximum age must be greater than or equal to minimum age.',
    );
    expect(max).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears the error and applies once the input is fixed', async () => {
    const { user, onChange, min } = setup();
    await user.type(min, 'x');
    await screen.findByRole('alert');
    await user.clear(min);
    await user.type(min, '18');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(18, null));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('treats clearing both fields as removing the filter', async () => {
    const { user, onChange, min, max } = setup(20, 30);
    await user.clear(min);
    await user.clear(max);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null, null));
  });

  it('reflects a range changed from outside, such as a removed chip', () => {
    const { rerender, min } = setup(20, 30);
    rerender(<AgeRangeFilter ageMin={null} ageMax={null} onChange={vi.fn()} />);
    expect(min).toHaveValue('');
  });
});
