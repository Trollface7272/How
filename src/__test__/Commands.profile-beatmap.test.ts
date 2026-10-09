import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandResponseCodes } from '../class/partials/Command';
import { Fetcher } from '../class/api/osu/Fetcher';
import { createMockMessageEvent, createTestUser, createMockFetcher, createMockProfile, createMockBeatmap, createMockBeatmapset, createMockScores } from './testHelpers';

// Import commands
import Profile from '../commands/profile/Profile';
import Beatmap from '../commands/beatmaps/Beatmap';

vi.mock('../class/api/osu/Fetcher');

describe('Profile Command Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display own profile when no username provided', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('');
        mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
        mockEvent.GetBoolean = vi.fn().mockReturnValue(false);
        
        const mockFetcher = createMockFetcher({
            profile: createMockProfile({ username: user.osu.username }),
            scores: createMockScores(5)
        });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Profile(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should display profile for specified user', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['OtherPlayer'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('OtherPlayer');
        mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
        mockEvent.GetBoolean = vi.fn().mockReturnValue(false);
        
        const mockFetcher = createMockFetcher({
            profile: createMockProfile({ username: 'OtherPlayer' }),
            scores: createMockScores(3)
        });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Profile(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['NonexistentUser'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('NonexistentUser');
        mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
        mockEvent.GetBoolean = vi.fn().mockReturnValue(false);
        
        const notFoundError: any = new Error('Not found');
        notFoundError.response = { status: 404 };
        notFoundError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetProfile = vi.fn().mockRejectedValue(notFoundError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Profile(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR, CommandResponseCodes.USER_ERROR]).toContain(result);
    });

    it('should handle different gamemodes', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('');
        mockEvent.GetGamemode = vi.fn().mockReturnValue('mania');
        mockEvent.GetBoolean = vi.fn().mockReturnValue(false);
        
        const mockFetcher = createMockFetcher({
            profile: createMockProfile({ playmode: 'mania' as const }),
            scores: createMockScores(2)
        });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Profile(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle API unavailable', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('');
        mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
        mockEvent.GetBoolean = vi.fn().mockReturnValue(false);
        
        const serverError: any = new Error('Service unavailable');
        serverError.response = { status: 503 };
        serverError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetOwnProfile = vi.fn().mockRejectedValue(serverError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Profile(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect((mockEvent as any)._getLastReply().embeds[0].data.title).toMatch(/osu!api/i);
    });
});

describe('Beatmap Command Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display beatmap info with valid ID', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['123456'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('123456');
        mockEvent.GetNumber = vi.fn().mockReturnValue(123456);
        mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
        
        const mockFetcher = createMockFetcher({
            beatmap: createMockBeatmap({ id: 123456 })
        });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Beatmap(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle invalid beatmap ID', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['invalid'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('invalid');
        mockEvent.GetNumber = vi.fn().mockReturnValue(null);

        const command = new Beatmap(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.USER_ERROR, CommandResponseCodes.ERROR]).toContain(result);
    });

    it('should handle beatmap not found', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['999999'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('999999');
        mockEvent.GetNumber = vi.fn().mockReturnValue(999999);
        mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
        
        const notFoundError: any = new Error('Not found');
        notFoundError.response = { status: 404 };
        notFoundError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetBeatmap = vi.fn().mockRejectedValue(notFoundError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Beatmap(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR, CommandResponseCodes.USER_ERROR]).toContain(result);
    });

    it('should handle network timeout', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['123456'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('123456');
        mockEvent.GetNumber = vi.fn().mockReturnValue(123456);
        mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
        
        const timeoutError: any = new Error('Timeout');
        timeoutError.code = 'ETIMEDOUT';
        timeoutError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetBeatmap = vi.fn().mockRejectedValue(timeoutError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Beatmap(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR]).toContain(result);
    });

    it('should handle rate limit', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['123456'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('123456');
        mockEvent.GetNumber = vi.fn().mockReturnValue(123456);
        mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
        
        const rateLimitError: any = new Error('Rate limit');
        rateLimitError.response = { status: 429 };
        rateLimitError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetBeatmap = vi.fn().mockRejectedValue(rateLimitError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Beatmap(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR]).toContain(result);
    });
});
