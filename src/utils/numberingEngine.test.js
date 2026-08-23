import { describe, it, expect } from 'vitest';
import { parseNumberingFormat, generateLetterNumber } from './numberingEngine';

describe('numberingEngine', () => {
    it('parses numbering format correctly', () => {
        const format = '{NO_URUT}/{BULAN_ROMAWI}/{TAHUN}/Surat Keluar';
        const parsed = parseNumberingFormat(format);
        expect(parsed.length).toBe(3);
        expect(parsed[0]).toBe('NO_URUT');
        expect(parsed[1]).toBe('BULAN_ROMAWI');
    });

    it('generates letter number correctly', () => {
        const format = '{NO_URUT}/{BULAN_ROMAWI}/{TAHUN}/SK';
        const values = {
            NO_URUT: '015',
            BULAN_ROMAWI: 'VIII',
            TAHUN: '2026'
        };
        const result = generateLetterNumber(format, values);
        expect(result).toBe('015/VIII/2026/SK');
    });
});
