import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App.tsx';
import type { FacetsResponse, User, UsersResponse } from './api/types.ts';
import { renderWithProviders } from './test/render.tsx';

const people: User[] = [
  {
    id: 1,
    avatar: '',
    first_name: 'Ana',
    last_name: 'Lima',
    age: 34,
    nationality: 'Brazil',
    hobbies: ['Chess'],
  },
  {
    id: 2,
    avatar: '',
    first_name: 'Bo',
    last_name: 'Chen',
    age: 41,
    nationality: 'China',
    hobbies: [],
  },
];

const usersBody = (data: User[]): UsersResponse => ({
  data,
  pagination: { page: 1, pageSize: 50, total: data.length, totalPages: 1, hasMore: false },
});

const facetsBody: FacetsResponse = {
  hobbies: [{ value: 'Chess', count: 1 }],
  nationalities: [
    { value: 'Brazil', count: 1 },
    { value: 'China', count: 1 },
  ],
};

type Handler = (url: URL) => { status: number; body: unknown };
let handler: Handler;
const requests: URL[] = [];

beforeEach(() => {
  requests.length = 0;
  handler = (url) =>
    url.pathname === '/api/users'
      ? { status: 200, body: usersBody(people) }
      : { status: 200, body: facetsBody };

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://localhost');
    requests.push(url);
    const { status, body } = handler(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  });

  // jsdom has no layout: give the virtualised list a viewport so rows render.
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
});

afterEach(() => vi.restoreAllMocks());

describe('App', () => {
  it('loads the list and facets once each on startup, with no failed requests', async () => {
    renderWithProviders(<App />);
    expect(await screen.findByText('2 people match')).toBeInTheDocument();
    expect(requests.filter((url) => url.pathname === '/api/users')).toHaveLength(1);
    expect(requests.filter((url) => url.pathname === '/api/facets')).toHaveLength(1);
  });

  it('restores filters from the URL and sends only valid, normalised parameters', async () => {
    renderWithProviders(<App />, '/?q=%20%20ana%20%20&ageMin=abc&hobbies=Chess&sort=bogus');
    await screen.findByText('2 people match');
    const usersRequest = requests.find((url) => url.pathname === '/api/users')!;
    expect(usersRequest.searchParams.get('q')).toBe('ana');
    expect(usersRequest.searchParams.has('ageMin')).toBe(false);
    expect(usersRequest.searchParams.getAll('hobbies')).toEqual(['Chess']);
    expect(usersRequest.searchParams.get('sort')).toBe('first_name');
  });

  it('shows the error state with a retry when the list fails', async () => {
    handler = (url) =>
      url.pathname === '/api/users'
        ? { status: 500, body: { error: 'Internal server error', requestId: 'abcdef1234' } }
        : { status: 200, body: facetsBody };
    renderWithProviders(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load the directory');
    expect(alert).toHaveTextContent('reference abcdef12');

    handler = (url) =>
      url.pathname === '/api/users'
        ? { status: 200, body: usersBody(people) }
        : { status: 200, body: facetsBody };
    await userEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('2 people match')).toBeInTheDocument();
  });

  it('keeps the list usable when only the facets fail', async () => {
    handler = (url) =>
      url.pathname === '/api/users'
        ? { status: 200, body: usersBody(people) }
        : { status: 503, body: { error: 'unavailable' } };
    renderWithProviders(<App />);

    expect(await screen.findByText('2 people match')).toBeInTheDocument();
    expect(await screen.findAllByText(/Filter counts could not be loaded/)).not.toHaveLength(0);
    expect(screen.queryByText('Could not load the directory')).not.toBeInTheDocument();
  });

  it('shows the empty state with a way out when nothing matches', async () => {
    handler = (url) =>
      url.pathname === '/api/users'
        ? { status: 200, body: usersBody([]) }
        : { status: 200, body: { hobbies: [], nationalities: [] } };
    renderWithProviders(<App />, '/?q=zzz');

    expect(await screen.findByText('No one matches these filters')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    await waitFor(() =>
      expect(
        requests.some((url) => url.pathname === '/api/users' && !url.searchParams.has('q')),
      ).toBe(true),
    );
  });

  it('toggles a facet into the request and shows it as a removable chip', async () => {
    renderWithProviders(<App />);
    await screen.findByText('2 people match');

    const [chess] = await screen.findAllByRole('button', { name: /Chess/ });
    await userEvent.click(chess!);
    await waitFor(() =>
      expect(requests.some((url) => url.searchParams.getAll('hobbies').includes('Chess'))).toBe(
        true,
      ),
    );
    expect(screen.getByRole('button', { name: 'Remove filter Chess' })).toBeInTheDocument();
  });
});
