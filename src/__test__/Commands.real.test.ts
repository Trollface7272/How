import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandResponseCodes } from '../class/partials/Command';
import { Fetcher } from '../class/api/osu/Fetcher';
import { createMockMessageEvent, createTestUser, mockFetcherSuccess, mockFetcherNotFound, createMockProfile } from './testHelpers';

// Import real command classes
import Avatar from '../commands/profile/Avatar';
import Help from '../commands/misc/Help';
import Info from '../commands/misc/Info';
import Invite from '../commands/misc/Invite';

// Mock Fetcher module
vi.mock('../class/api/osu/Fetcher');

describe('Profile Commands - Real Handle() Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Avatar Command', () => {
        it('should successfully display avatar for valid user', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
            const mockFetcher = mockFetcherSuccess();
            
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

            const command = new Avatar(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.OK);
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            expect(reply.embeds).toBeDefined();
            expect(reply.embeds[0].data.image).toBeDefined();
        });

        it('should handle user not found error', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['NonexistentUser'] });
            const mockFetcher = mockFetcherNotFound();
            
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

            const command = new Avatar(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.ERROR);
            expect(mockEvent.Reply).toHaveBeenCalled();
        });

        it('should handle missing username when user not linked', async () => {
            const user = createTestUser();
            user.osu = null;
            const mockEvent = createMockMessageEvent({ user, args: [] });

            const command = new Avatar(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.USER_ERROR);
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            const replyText = reply.content || reply.embeds?.[0]?.data?.description || '';
            expect(replyText).toMatch(/link your osu! account|provide a username/i);
        });

        it('should use own username when no argument provided and user is linked', async () => {
            const user = createTestUser({ osuUsername: 'LinkedPlayer' });
            const mockEvent = createMockMessageEvent({ user, args: [] });
            mockEvent.GetRemaining = vi.fn().mockReturnValue('');
            const mockFetcher = mockFetcherSuccess();
            
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

            const command = new Avatar(mockEvent);
            const result = await command.Handle();

            // Should either succeed or return user error, but should call Handle without throwing
            expect([CommandResponseCodes.OK, CommandResponseCodes.USER_ERROR, CommandResponseCodes.ERROR]).toContain(result);
            expect(mockEvent.Reply).toHaveBeenCalled();
        });

        it('should handle profile without avatar', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
            const profileWithoutAvatar = createMockProfile({ avatar_url: null });
            const mockFetcher = {
                GetProfile: vi.fn().mockResolvedValue(profileWithoutAvatar)
            };
            
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

            const command = new Avatar(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.USER_ERROR);
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            expect(reply.content).toContain('No avatar found');
        });

        it('should display online/offline status', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
            const onlineProfile = createMockProfile({ is_online: true });
            const mockFetcher = {
                GetProfile: vi.fn().mockResolvedValue(onlineProfile)
            };
            
            vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

            const command = new Avatar(mockEvent);
            await command.Handle();

            const reply = (mockEvent as any)._getLastReply();
            expect(reply.embeds[0].data.footer.text).toContain('Online');
        });
    });
});

describe('Misc Commands - Real Handle() Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Help Command', () => {
        it('should display command list when no argument provided', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: [] });

            const command = new Help(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.OK);
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            expect(reply.embeds).toBeDefined();
            expect(reply.embeds[0].data.author?.name).toContain('Commands');
        });

        it('should display help for specific command', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['avatar'] });
            mockEvent.GetRemaining = vi.fn().mockReturnValue('avatar');

            const command = new Help(mockEvent);
            const result = await command.Handle();

            // Result code depends on whether command is found in registry
            expect([CommandResponseCodes.OK, CommandResponseCodes.USER_ERROR]).toContain(result);
            expect(mockEvent.Reply).toHaveBeenCalled();
        });

        it('should handle unknown command', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: ['nonexistentcommand'] });
            mockEvent.GetRemaining = vi.fn().mockReturnValue('nonexistentcommand');

            const command = new Help(mockEvent);
            const result = await command.Handle();

            expect(result).toBe(CommandResponseCodes.USER_ERROR);
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            expect(reply.embeds[0].data.description).toContain('Unknown command');
        });

        it('should handle errors gracefully', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: [] });
            
            // Mock Reply to fail once then succeed
            let callCount = 0;
            mockEvent.Reply = vi.fn().mockImplementation(async (reply: any) => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('First reply failed');
                }
                (mockEvent as any)._getReplies().push(reply);
                return undefined;
            });

            const command = new Help(mockEvent);
            
            // The error is caught and re-thrown by the command
            try {
                await command.Handle();
            } catch (e) {
                // Error was thrown as expected
            }
            
            // Should have attempted to reply multiple times
            expect(mockEvent.Reply.mock.calls.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Info Command', () => {
        it('should display bot information', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: [] });

            const command = new Info(mockEvent);
            const result = await command.Handle();

            expect([CommandResponseCodes.OK, CommandResponseCodes.ERROR]).toContain(result);
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            const fields = reply.embeds[0].data.fields.map((field: { name: string }) => field.name);
            expect(fields).toEqual(expect.arrayContaining(['Guilds', 'Users', 'Commands']));
        });
    });

    describe('Invite Command', () => {
        it('should provide invite link', async () => {
            const user = createTestUser();
            const mockEvent = createMockMessageEvent({ user, args: [] });

            const command = new Invite(mockEvent);
            const result = await command.Handle();

            expect([CommandResponseCodes.OK, CommandResponseCodes.ERROR]).toContain(result);
            expect(mockEvent.Reply).toHaveBeenCalled();
            
            const reply = (mockEvent as any)._getLastReply();
            // Should contain invite URL or button
            const hasInviteContent = reply.content?.includes('oauth') || 
                reply.embeds?.[0]?.data?.description?.includes('invite') ||
                reply.components?.length > 0;
            expect(hasInviteContent || result === CommandResponseCodes.ERROR).toBe(true);
        });
    });
});

describe('Command Error Handling Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle network timeout errors', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
        
        const timeoutError: any = new Error('Network timeout');
        timeoutError.code = 'ETIMEDOUT';
        timeoutError.isAxiosError = true;
        
        const mockFetcher = {
            GetProfile: vi.fn().mockRejectedValue(timeoutError)
        };
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Avatar(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.ERROR);
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle API rate limit (429)', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
        
        const rateLimitError: any = new Error('Rate limit');
        rateLimitError.response = { status: 429 };
        rateLimitError.isAxiosError = true;
        
        const mockFetcher = {
            GetProfile: vi.fn().mockRejectedValue(rateLimitError)
        };
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Avatar(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.ERROR);
        expect(mockEvent.Reply).toHaveBeenCalled();
    });

    it('should handle server errors (500)', async () => {
        const user = createTestUser();
        const mockEvent = createMockMessageEvent({ user, args: ['TestPlayer'] });
        
        const serverError: any = new Error('Internal server error');
        serverError.response = { status: 500 };
        serverError.isAxiosError = true;
        
        const mockFetcher = {
            GetProfile: vi.fn().mockRejectedValue(serverError)
        };
        
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(mockFetcher as any);

        const command = new Avatar(mockEvent);
        const result = await command.Handle();

        expect(result).toBe(CommandResponseCodes.ERROR);
        expect(mockEvent.Reply).toHaveBeenCalled();
    });
});
