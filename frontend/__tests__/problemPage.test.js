import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ProblemPage from '../pages/problems/[slug]';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/Header', () => () => null);
jest.mock('../config/env', () => ({ config: { backend_url: 'http://localhost:3999' } }));

// This route is the public summary; the editor and execution controls live in /practice.
const problem = {
  id: 'add-pair',
  title: 'Add a pair',
  difficulty: 'Easy',
  tags: ['Arithmetic'],
  description: 'Return the **sum** of two integers.',
  examples: [{ input: '4, 7', output: '11', explanation: 'Adding four and seven gives eleven.' }],
  constraints: ['Both integers are between 0 and 20.'],
};
const solution = { code: 'function add(a, b) { return a + b; }', language: 'javascript' };

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  fetch.mockReset();
  useAuth.mockReturnValue({ token: null });
});

test('shows the public problem details and links to the library, practice and battles', () => {
  render(<ProblemPage problem={problem} />);

  expect(screen.getByRole('heading', { name: 'Add a pair', level: 1 })).toBeVisible();
  expect(screen.getByText('Easy')).toBeVisible();
  expect(screen.getByText('Arithmetic')).toBeVisible();
  expect(screen.getByRole('main')).toHaveTextContent('Return the sum of two integers.');
  expect(screen.getByRole('heading', { name: 'Examples' })).toBeVisible();
  expect(screen.getByText('4, 7')).toBeVisible();
  expect(screen.getByText('11')).toBeVisible();
  expect(screen.getByText('Adding four and seven gives eleven.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Constraints' })).toBeVisible();
  expect(screen.getByText('Both integers are between 0 and 20.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Problem library' })).toHaveAttribute('href', '/problems');
  expect(screen.getByRole('link', { name: 'Warm up with this problem' })).toHaveAttribute('href', '/practice?problem=add-pair');
  expect(screen.getByRole('link', { name: 'Battle on it' })).toHaveAttribute('href', '/matchmaking');
  expect(screen.queryByRole('heading', { name: /Your accepted solution/ })).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test('omits empty optional sections while keeping the problem available', () => {
  render(<ProblemPage problem={{ ...problem, tags: [], examples: [], constraints: [] }} />);

  expect(screen.getByRole('heading', { name: 'Add a pair' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Warm up with this problem' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Examples' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Constraints' })).not.toBeInTheDocument();
  expect(screen.queryByText('Arithmetic')).not.toBeInTheDocument();
});

test('keeps the problem readable while loading, then shows the signed-in player’s accepted code and language', async () => {
  useAuth.mockReturnValue({ token: 'test-token' });
  const request = deferred();
  fetch.mockReturnValueOnce(request.promise);
  render(<ProblemPage problem={problem} />);

  expect(screen.getByRole('heading', { name: 'Add a pair' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: /Your accepted solution/ })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('http://localhost:3999/api/practice/solution/add-pair', {
    headers: { Authorization: 'Bearer test-token' },
  });

  await act(async () => {
    request.resolve({ ok: true, json: async () => ({ success: true, solution }) });
  });

  expect(screen.getByRole('heading', { name: 'Your accepted solution (JavaScript)' })).toBeVisible();
  expect(screen.getByText(solution.code)).toBeVisible();
});
