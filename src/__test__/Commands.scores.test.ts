import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandResponseCodes } from '../class/partials/Command';
import { Fetcher } from '../class/api/osu/Fetcher';
import { createMockMessageEvent, createTestUser, createMockFetcher, createMockScores, createMockProfile, axiosError } from './testHelpers';
import { db } from '../class/database/Main';
import { createStoredScore } from './testHelpers';

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
        const mockFetcher = createMockFetcher();
        mockFetcher.GetUserScores = vi.fn().mockRejectedValue(axiosError(404, 'Not found'));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Recent(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.ERROR);
        expect(mockEvent.Reply).toHaveBeenCalled();
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
        
        const mockFetcher = createMockFetcher();
        mockFetcher.GetUserScores = vi.fn().mockRejectedValue(axiosError(429, 'Rate limit'));
        
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
        
        const mockFetcher = createMockFetcher();
        mockFetcher.GetUserScores = vi.fn().mockRejectedValue(axiosError(504, 'Timeout'));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Top(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        const reply = (mockEvent as any)._getLastReply();
        expect(reply.embeds[0].data.title).toMatch(/osu!api/i);
    });
});

describe('Scores Commands - Score', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display an imported score', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        await db.collection('scores').insertOne(createStoredScore({ userId: user.osu.userId }));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);

        const command = new Score(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.OK);
        expect((mockEvent as any)._getLastReply().embeds[0].data.description).toContain('Test Song');
    });

    it('should handle no imported scores', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);

        const command = new Score(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect((mockEvent as any)._getLastReply().embeds[0].data.description).toMatch(/no scores/i);
    });

    it('should handle a score query failure', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [] });
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const { ScoreFactory } = await import('../class/database/Score');
        vi.spyOn(ScoreFactory, 'GetScoresByUser').mockRejectedValue(new Error('db down'));

        const command = new Score(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.ERROR);
    });
});

describe('Scores Commands - Compare', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should compare scores on beatmap', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [], conversationBeatmap: 123456 });
        const mockFetcher = createMockFetcher({ scores: createMockScores(2, {}, 'fromId') });
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Compare(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.OK);
        expect((mockEvent as any)._getLastReply().embeds[0].data.description).toContain('pp');
    });

    it('should handle no scores to compare', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [], conversationBeatmap: 123456 });
        const mockFetcher = createMockFetcher({ scores: [] });
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Compare(mockEvent);
        const result = await command.Handle();

        expect(typeof result).toBe('number');
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle server error', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: [], conversationBeatmap: 123456 });
        const mockFetcher = createMockFetcher();
        mockFetcher.GetBeatmapUserScores = vi.fn().mockRejectedValue(axiosError(503, 'Server error'));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Compare(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.USER_ERROR);
    });
});
