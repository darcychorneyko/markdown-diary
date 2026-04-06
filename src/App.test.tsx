import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the vault, editor, and preview placeholder panes', () => {
    render(<App />);

    expect(screen.getByText('Vault')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
