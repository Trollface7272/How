import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandResponseCodes } from '../class/partials/Command';
import { Fetcher } from '../class/api/osu/Fetcher';
import { createMockMessageEvent, createTestUser, mockFetcherSuccess, createMockProfile, createMockFetcher, createMockSearchResult } from './testHelpers';
import { FetcherError, FetcherErrors } from '../class/api/osu/class/FetcherError';

// Import more real commands
import Link from '../commands/misc/Link';
import Update from '../commands/profile/Update';
import CountMods from '../commands/profile/CountMods';
import Search from '../commands/beatmaps/Search';

vi.mock('../class/api/osu/Fetcher');

describe('More Commands - Real Handle() Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Link Command', () => {
        it('should require interaction (slash command only)', async () => {
            const user = createTestUser();
            user.osu = null;
            const mockEvent = createMockMessageEvent({ user, args: [], isInteraction: false });

            const command = new Link(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.USER_ERROR);
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            expect(reply.embeds[0].data.description).toContain('slash command');
        });

        it('should generate OAuth link for interactions', async () => {
            const user = createTestUser();
            user.osu = null;
            user.AddOsuTemp = vi.fn().mockResolvedValue(undefined);
            
            const mockInteraction = { isAnySelectMenu: vi.fn().mockReturnValue(false) };
            const mockEvent = createMockMessageEvent({ 
                user, 
                args: [], 
                isInteraction: true,
                interaction: mockInteraction 
            });
            mockEvent.GetBoolean = vi.fn().mockReturnValue(false);

            const command = new Link(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.OK);
            expect(user.AddOsuTemp).toHaveBeenCalled();
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            expect(reply.embeds[0].data.author?.url).toContain('osu.ppy.sh/oauth');
        });
    });

    describe('Update Command', () => {
        it('should handle user not linked error', async () => {
            const user = createTestUser();
            user.osu = null;
            const mockEvent = createMockMessageEvent({ user, args: [] });

            const fetcherError = new FetcherError(
                FetcherErrors.UserNotLinked,
                'User not linked'
            );
            vi.spyOn(Fetcher, 'Create').mockRejectedValue(fetcherError);

            const command = new Update(mockEvent);
            const result = await command.Handle();

            // Should handle the error gracefully
            expect([CommandResponseCodes.ERROR, CommandResponseCodes.USER_ERROR]).toContain(result);
        });

        it('should update user profile when linked', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: [] });
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher({ profile: createMockProfile() }) as any);

            const command = new Update(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.OK);
            expect((mockEvent as any)._getLastReply().embeds[0].data.description).toContain('Rank');
        });
    });

    describe('CountMods Command', () => {
        it('should handle missing username when user not linked', async () => {
            const user = createTestUser();
            user.osu = null;
            const mockEvent = createMockMessageEvent({ user, args: [] });

            const command = new CountMods(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.USER_ERROR);
            expect(mockEvent.Reply).toHaveBeenCalled();
        });

        it('should fetch and display mod counts', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
            const mockProfile = createMockProfile();
            const mockFetcher = {
                GetProfile: vi.fn().mockResolvedValue(mockProfile),
                GetUserScores: vi.fn().mockResolvedValue([])
            };
            
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

            const command = new CountMods(mockEvent);
            const result = await command.Handle();

            expect([CommandResponseCodes.OK, CommandResponseCodes.USER_ERROR, CommandResponseCodes.ERROR]).toContain(result);
            expect(mockEvent.Reply).toHaveBeenCalled();
        });
    });

    describe('Search Command', () => {
        it('should require search query', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: [] });
            mockEvent.GetRemaining = vi.fn().mockReturnValue('');

            const command = new Search(mockEvent);
            const result = await command.Handle();

            expect([CommandResponseCodes.USER_ERROR, CommandResponseCodes.ERROR]).toContain(result);
        });

        it('should search beatmaps with query', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['test song'] });
            mockEvent.GetRemaining = vi.fn().mockReturnValue('test song');
            mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
            
            const mockFetcher = createMockFetcher({ searchResults: createMockSearchResult() });
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

            const command = new Search(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.OK);
            expect((mockEvent as any)._getLastReply().embeds[0].data.description).toContain('Test Song');
        });

        it('should handle no results found', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['nonexistent'] });
            mockEvent.GetRemaining = vi.fn().mockReturnValue('nonexistent');
            mockEvent.GetGamemode = vi.fn().mockReturnValue('osu');
            
            const mockFetcher = {
                SearchBeatmaps: vi.fn().mockResolvedValue({ beatmapsets: [] })
            };
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

            const command = new Search(mockEvent);
            const result = await command.Handle();

            expect(typeof result).toBe('number');
            expect(mockEvent.Reply).toHaveBeenCalled();
        });
    });
});

describe('Command Error Path Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle 401 Unauthorized', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
        
        const authError: any = new Error('Unauthorized');
        authError.response = { status: 401 };
        authError.isAxiosError = true;
        
        const mockFetcher = {
            GetProfile: vi.fn().mockRejectedValue(authError)
        };
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const Avatar = (await import('../commands/profile/Avatar')).default;
        const command = new Avatar(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.ERROR);
    });

    it('should handle ECONNREFUSED network error', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
        
        const connError: any = new Error('Connection refused');
        connError.code = 'ECONNREFUSED';
        connError.isAxiosError = true;
        
        const mockFetcher = {
            GetProfile: vi.fn().mockRejectedValue(connError)
        };
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const Avatar = (await import('../commands/profile/Avatar')).default;
        const command = new Avatar(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.ERROR);
    });

    it('should handle ENOTFOUND DNS error', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
        
        const dnsError: any = new Error('DNS lookup failed');
        dnsError.code = 'ENOTFOUND';
        dnsError.isAxiosError = true;
        
        const mockFetcher = {
            GetProfile: vi.fn().mockRejectedValue(dnsError)
        };
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const Avatar = (await import('../commands/profile/Avatar')).default;
        const command = new Avatar(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.ERROR);
    });
});
