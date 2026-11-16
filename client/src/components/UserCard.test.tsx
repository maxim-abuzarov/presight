import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { User } from '../api/types.ts';
import { UserCard } from './UserCard.tsx';

const user = (hobbies: string[]): User => ({
  id: 1,
  avatar: 'https://example.test/a.svg',
  first_name: 'Ana',
  last_name: 'Lima',
  age: 34,
  nationality: 'Brazil',
  hobbies,
});

describe('UserCard', () => {
  it('shows name, nationality and age', () => {
    render(<UserCard user={user([])} />);
    expect(screen.getByRole('heading', { name: 'Ana Lima' })).toBeInTheDocument();
    expect(screen.getByText('Brazil')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
  });

  it('shows at most two hobbies and the rest as +n', () => {
    render(<UserCard user={user(['Chess', 'Yoga', 'Golf', 'Tennis'])} />);
    expect(screen.getByText('Chess')).toBeInTheDocument();
    expect(screen.getByText('Yoga')).toBeInTheDocument();
    expect(screen.queryByText('Golf')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toHaveAttribute('title', 'Golf, Tennis');
  });

  it('shows no +n when there are two hobbies or fewer', () => {
    render(<UserCard user={user(['Chess', 'Yoga'])} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('says so when there are no hobbies', () => {
    render(<UserCard user={user([])} />);
    expect(screen.getByText('No hobbies listed')).toBeInTheDocument();
  });
});
