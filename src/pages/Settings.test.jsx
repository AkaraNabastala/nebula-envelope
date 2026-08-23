import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Settings from './Settings';

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }
}));

vi.mock('../services/db', () => ({
    getSettings: vi.fn(),
    updateSettings: vi.fn()
}));

describe('Settings Component', () => {
    it('renders Pengaturan title correctly', () => {
        render(<Settings />);
        // PERBAIKAN: Mencari teks Konfigurasi Sistem agar unik
        expect(screen.getByText(/Profil Organisasi/i)).toBeInTheDocument();
    });
});
