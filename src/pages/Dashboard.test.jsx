import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

vi.mock('../services/db', () => ({
    getDashboardStats: vi.fn()
}));

describe('Dashboard Component', () => {
    it('renders Dashboard title correctly', () => {
        render(<BrowserRouter><Dashboard /></BrowserRouter>);
        // PERBAIKAN: Mengganti teks yang dicari agar sesuai dengan komponen asli
        expect(screen.getByText(/Pantauan ringkas/i)).toBeInTheDocument();
    });
});
