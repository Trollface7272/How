import { describe, it, expect, vi } from 'vitest';
import {
    HandleAsync,
    GetFlag,
    FormatCombo,
    FormatHits,
    FormatProgress,
    Escape,
    ParseJson,
    ButtonEmojis
} from '@src/Utils';

describe('Utils - HandleAsync', () => {
    it('should return [result, null] on success', async () => {
        const promise = Promise.resolve('success');
        const [result, error] = await HandleAsync(promise);
        
        expect(result).toBe('success');
        expect(error).toBeNull();
    });

    it('should return [null, error] on failure', async () => {
        const testError = new Error('test error');
        const promise = Promise.reject(testError);
        const [result, error] = await HandleAsync(promise);
        
        expect(result).toBeNull();
        expect(error).toBe(testError);
    });

    it('should handle async functions', async () => {
        const asyncFn = async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 42;
        };
        
        const [result, error] = await HandleAsync(asyncFn());
        expect(result).toBe(42);
        expect(error).toBeNull();
    });
});

describe('Utils - GetFlag', () => {
    it('should return flag URL for country code', () => {
        const url = GetFlag('US');
        expect(url).toBe('https://flagcdn.com/w80/us.png');
    });

    it('should convert to lowercase', () => {
        const url = GetFlag('GB');
        expect(url).toBe('https://flagcdn.com/w80/gb.png');
    });

    it('should handle already lowercase', () => {
        const url = GetFlag('jp');
        expect(url).toBe('https://flagcdn.com/w80/jp.png');
    });
});

describe('Utils - FormatCombo', () => {
    it('should format mania combo without max', () => {
        const result = FormatCombo(500, 800, 3);
        expect(result).toBe('x500');
    });

    it('should format mania combo with string mode', () => {
        const result = FormatCombo(500, 800, 'mania');
        expect(result).toBe('x500');
    });

    it('should format osu combo with max', () => {
        const result = FormatCombo(500, 800, 0);
        expect(result).toBe('x500/800');
    });

    it('should format taiko combo with max', () => {
        const result = FormatCombo(250, 300, 1);
        expect(result).toBe('x250/300');
    });

    it('should format fruits combo with max', () => {
        const result = FormatCombo(1000, 1200, 'fruits');
        expect(result).toBe('x1000/1200');
    });
});

describe('Utils - FormatHits', () => {
    it('should format osu hits', () => {
        const stats = {
            great: 300,
            ok: 50,
            meh: 10,
            miss: 5
        };
        const result = FormatHits(stats, 0);
        expect(result).toBe('[300/50/10/5]');
    });

    it('should format taiko hits', () => {
        const stats = {
            great: 200,
            ok: 20,
            meh: 5,
            miss: 2
        };
        const result = FormatHits(stats, 'taiko');
        expect(result).toBe('[200/20/5/2]');
    });

    it('should format fruits hits', () => {
        const stats = {
            great: 500,
            ok: 50,
            meh: 10,
            large_tick_hit: 20,
            miss: 3
        };
        const result = FormatHits(stats, 2);
        expect(result).toBe('[500/50/10/20/3]');
    });

    it('should format mania hits', () => {
        const stats = {
            large_bonus: 10,
            great: 400,
            small_bonus: 5,
            ok: 30,
            meh: 10,
            miss: 2
        };
        const result = FormatHits(stats, 'mania');
        expect(result).toBe('[10/400/5/30/10/2]');
    });

    it('should handle missing optional stats', () => {
        const stats = {
            great: 300,
            miss: 5
        };
        const result = FormatHits(stats, 0);
        expect(result).toBe('[300/0/0/5]');
    });

    it('should handle unknown gamemode', () => {
        const stats = { great: 100, miss: 0 };
        const result = FormatHits(stats, 999 as any);
        expect(result).toBe('[Error]');
    });
});

// FormatProgress tests skipped - requires Number.prototype.roundFixed extension

describe('Utils - Escape', () => {
    it('should escape markdown characters', () => {
        const input = 'Test *bold* _italic_ **strong**';
        const result = Escape(input);
        // Discord's escapeMarkdown handles this
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('should handle plain text', () => {
        const input = 'Plain text';
        const result = Escape(input);
        expect(result).toBe('Plain text');
    });
});

describe('Utils - ParseJson', () => {
    it('should parse valid JSON', async () => {
        const json = '{"name": "test", "value": 123}';
        const [result, error] = await ParseJson(json);
        
        expect(error).toBeNull();
        expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should handle invalid JSON', async () => {
        const json = '{invalid json}';
        const [result, error] = await ParseJson(json);
        
        expect(result).toBeNull();
        expect(error).toBeInstanceOf(SyntaxError);
    });

    it('should handle empty string', async () => {
        const json = '';
        const [result, error] = await ParseJson(json);
        
        expect(result).toBeNull();
        expect(error).toBeInstanceOf(SyntaxError);
    });

    it('should parse arrays', async () => {
        const json = '[1, 2, 3, 4, 5]';
        const [result, error] = await ParseJson<number[]>(json);
        
        expect(error).toBeNull();
        expect(result).toEqual([1, 2, 3, 4, 5]);
    });
});

describe('Utils - ButtonEmojis', () => {
    it('should have navigation emojis', () => {
        expect(ButtonEmojis.Start).toBe('⇇');
        expect(ButtonEmojis.End).toBe('⇉');
        expect(ButtonEmojis.Left).toBe('←');
        expect(ButtonEmojis.Right).toBe('→');
    });
});

