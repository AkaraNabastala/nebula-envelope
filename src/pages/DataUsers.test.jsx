import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MasterData from './MasterData';

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }
}));

vi.mock('../services/db', () => ({
    saveMasterData: vi.fn(),
    deleteMasterData: vi.fn()
}));

// ... kode di atasnya sama
describe('Data Users / MasterData Component', () => {
    it('renders Data Master title correctly', () => {
        render(<MasterData masterData={[]} />);
        // PERBAIKAN: Ubah menjadi "Database Users"
        expect(screen.getByText(/Database Users/i)).toBeInTheDocument();
    });
});

