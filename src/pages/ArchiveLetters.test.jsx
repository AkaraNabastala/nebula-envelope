import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchiveLetters from './ArchiveLetters';

// Mock pustaka notifikasi (sonner) agar tidak error saat dirender di NodeJS
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn()
    }
}));

// Mock fungsi database agar pengujian tidak merusak data asli
vi.mock('../services/db', () => ({
    saveIncomingArchive: vi.fn(),
    deleteIncomingArchive: vi.fn(),
    deleteOutgoingLetter: vi.fn(),
    updateOutgoingStatus: vi.fn()
}));

const mockIncoming = [
    { id: 1, nomor_surat: 'IN-001', perihal: 'Undangan Rapat', tanggal_diterima: '2026-08-01T10:00:00.000Z' }
];
const mockOutgoing = [
    { id: 2, nomor_surat: 'OUT-001', perihal: 'Surat Balasan', created_at: '2026-08-02T10:00:00.000Z' }
];

describe('ArchiveLetters Component', () => {
    it('renders Pusat Arsip title', () => {
        render(<ArchiveLetters incomingArchives={mockIncoming} outgoingLetters={mockOutgoing} />);
        expect(screen.getByText('Pusat Arsip')).toBeInTheDocument();
    });

    it('renders outgoing letters by default', () => {
        render(<ArchiveLetters incomingArchives={mockIncoming} outgoingLetters={mockOutgoing} />);
        // Tab 'Surat Keluar' aktif secara default
        expect(screen.getByText('OUT-001')).toBeInTheDocument();
        expect(screen.queryByText('IN-001')).not.toBeInTheDocument();
    });

    it('shows bulk delete button when a row is checked', () => {
        render(<ArchiveLetters incomingArchives={mockIncoming} outgoingLetters={mockOutgoing} />);

        // Ambil semua kotak centang (checkbox)
        const checkboxes = screen.getAllByRole('checkbox');

        // checkbox[0] adalah checkbox "Pilih Semua" di header tabel
        // checkbox[1] adalah checkbox di baris dokumen pertama
        fireEvent.click(checkboxes[1]);

        // Memastikan tombol Hapus (Bulk Delete) muncul saat ada yang dicentang
        expect(screen.getByText(/Hapus \(1\)/i)).toBeInTheDocument();
    });
});
