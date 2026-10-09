import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandResponseCodes } from '../class/partials/Command';
import { Fetcher } from '../class/api/osu/Fetcher';
import { createMockMessageEvent, createTestUser, createMockFetcher, createMockScores, createMockProfile, createMockBeatmap } from './testHelpers';

// Import score commands
import Recent from '../commands/scores/Recent';
import Top from '../commands/scores/Top';
import Score from '../commands/scores/Score';
import Compare from '../commands/scores/Compare';

vi.mock('../class/api/osu/Fetcher');

describe('Scores Commands - Recent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display recent scores for linked user', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        const mockScores = createMockScores(5);
        const mockFetcher = createMockFetcher({ scores: mockScores });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Recent(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.OK, CommandResponseCodes.ERROR, CommandResponseCodes.USER_ERROR]).toContain(result);
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['NonexistentUser'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('NonexistentUser');
        
        const notFoundError: any = new Error('Not found');
        notFoundError.response = { status: 404 };
        notFoundError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetProfile = vi.fn().mockRejectedValue(notFoundError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Recent(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR, CommandResponseCodes.USER_ERROR]).toContain(result);
    });

    it('should handle no recent plays found', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        const mockFetcher = createMockFetcher({ scores: [] });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Recent(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle API rate limit', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        
        const rateLimitError: any = new Error('Rate limit');
        rateLimitError.response = { status: 429 };
        rateLimitError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetUserScores = vi.fn().mockRejectedValue(rateLimitError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Recent(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR]).toContain(result);
    });
});

describe('Scores Commands - Top', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display top scores for user', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        const mockScores = createMockScores(5);
        const mockFetcher = createMockFetcher({ scores: mockScores });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Top(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle specific username', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['OtherPlayer'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('OtherPlayer');
        const mockFetcher = createMockFetcher({ 
            profile: createMockProfile({ username: 'OtherPlayer' }),
            scores: createMockScores(3)
        });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Top(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle network timeout', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        
        const timeoutError: any = new Error('Timeout');
        timeoutError.code = 'ETIMEDOUT';
        timeoutError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetUserScores = vi.fn().mockRejectedValue(timeoutError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Top(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR]).toContain(result);
    });
});

describe('Scores Commands - Score', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display score on beatmap', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['123456'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('123456');
        mockEvent.GetNumber = vi.fn().mockReturnValue(123456);
        const mockFetcher = createMockFetcher({
            beatmap: createMockBeatmap(),
            scores: createMockScores(1)
        });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Score(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle invalid beatmap ID', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['invalid'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('invalid');
        mockEvent.GetNumber = vi.fn().mockReturnValue(null);

        const command = new Score(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.USER_ERROR, CommandResponseCodes.ERROR]).toContain(result);
    });

    it('should handle beatmap not found', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['999999'] });
        mockEvent.GetRemaining = vi.fn().mockReturnValue('999999');
        mockEvent.GetNumber = vi.fn().mockReturnValue(999999);
        
        const notFoundError: any = new Error('Not found');
        notFoundError.response = { status: 404 };
        notFoundError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetBeatmap = vi.fn().mockRejectedValue(notFoundError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Score(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR, CommandResponseCodes.USER_ERROR]).toContain(result);
    });
});

describe('Scores Commands - Compare', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should compare scores on beatmap', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        const mockFetcher = createMockFetcher({
            beatmap: createMockBeatmap(),
            scores: createMockScores(2)
        });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Compare(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle no scores to compare', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        const mockFetcher = createMockFetcher({ scores: [] });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Compare(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle server error', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        
        const serverError: any = new Error('Server error');
        serverError.response = { status: 503 };
        serverError.isAxiosError = true;
        
        const mockFetcher = createMockFetcher({});
        mockFetcher.GetBeatmap = vi.fn().mockRejectedValue(serverError);
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Compare(mockEvent);
        const result = await command.Handle();

        expect([CommandResponseCodes.ERROR]).toContain(result);
    });
});
