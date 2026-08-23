import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreateLetter from './CreateLetter';

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }
}));

vi.mock('../services/db', () => ({
    saveOutgoingLetter: vi.fn()
}));

// ... kode di atasnya sama
describe('CreateLetter Component', () => {
    it('renders Buat Surat title correctly', () => {
        render(<CreateLetter templates={[]} masterData={[]} settings={{}} outgoingCount={0} />);
        // PERBAIKAN: Ubah menjadi "Studio Surat Baru"
        expect(screen.getByText(/Studio Surat Baru/i)).toBeInTheDocument();
    });
});

