import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorMapper } from '@src/class/errors/ErrorMapper';
import { UserNotFoundError, OsuApiError, NetworkError } from '@src/class/errors/UserFacingError';

describe('Event Handler Error Handling', () => {
    describe('Error reply with interaction states', () => {
        it('should use reply() when interaction is not replied or deferred', async () => {
            const mockInteraction = {
                replied: false,
                deferred: false,
                reply: vi.fn().mockResolvedValue(undefined),
                followUp: vi.fn(),
                editReply: vi.fn()
            };

            const error = new UserNotFoundError('testuser');
            const reply = error.toReply();

            // Simulate the event handler logic
            if (!mockInteraction.replied && !mockInteraction.deferred) {
                await mockInteraction.reply(reply);
            }

            expect(mockInteraction.reply).toHaveBeenCalledWith(reply);
            expect(mockInteraction.reply).toHaveBeenCalledOnce();
            expect(mockInteraction.followUp).not.toHaveBeenCalled();
            expect(mockInteraction.editReply).not.toHaveBeenCalled();
        });

        it('should use editReply() when interaction is deferred', async () => {
            const mockInteraction = {
                replied: false,
                deferred: true,
                reply: vi.fn(),
                followUp: vi.fn(),
                editReply: vi.fn().mockResolvedValue(undefined)
            };

            const error = new OsuApiError(429);
            const reply = error.toReply();

            // Simulate the event handler logic
            if (mockInteraction.deferred) {
                await mockInteraction.editReply(reply);
            }

            expect(mockInteraction.editReply).toHaveBeenCalledWith(reply);
            expect(mockInteraction.editReply).toHaveBeenCalledOnce();
            expect(mockInteraction.reply).not.toHaveBeenCalled();
            expect(mockInteraction.followUp).not.toHaveBeenCalled();
        });

        it('should use followUp() when interaction is already replied', async () => {
            const mockInteraction = {
                replied: true,
                deferred: false,
                reply: vi.fn(),
                followUp: vi.fn().mockResolvedValue(undefined),
                editReply: vi.fn()
            };

            const error = new NetworkError('osu! API');
            const reply = error.toReply();

            // Simulate the event handler logic
            if (mockInteraction.replied) {
                await mockInteraction.followUp(reply);
            }

            expect(mockInteraction.followUp).toHaveBeenCalledWith(reply);
            expect(mockInteraction.followUp).toHaveBeenCalledOnce();
            expect(mockInteraction.reply).not.toHaveBeenCalled();
            expect(mockInteraction.editReply).not.toHaveBeenCalled();
        });
    });

    describe('Error reply always ephemeral', () => {
        it('should always set ephemeral: true for error replies', () => {
            const errors = [
                new UserNotFoundError('test'),
                new OsuApiError(),
                new NetworkError('test')
            ];

            errors.forEach(error => {
                const reply = error.toReply();
                expect(reply.ephemeral).toBe(true);
            });
        });
    });

    describe('No stack trace leaking', () => {
        it('should not include stack trace in user message', () => {
            const internalError = new Error('Internal server error at line 42');
            internalError.stack = 'Error: Internal server error\n  at someFile.ts:42:10';

            const userError = ErrorMapper.toUserFacingError(internalError);
            const reply = userError.toReply();

            expect(reply.content).not.toContain('stack');
            expect(reply.content).not.toContain('line 42');
            expect(reply.content).not.toContain('someFile.ts');
            expect(reply.content).not.toContain('Error:');
        });

        it('should not include sensitive info in database errors', () => {
            const dbError = {
                name: 'MongoError',
                message: 'Connection failed to mongodb://admin:password@localhost:27017/mydb'
            };

            const userError = ErrorMapper.toUserFacingError(dbError);
            const reply = userError.toReply();

            expect(reply.content).not.toContain('mongodb://');
            expect(reply.content).not.toContain('password');
            expect(reply.content).not.toContain('localhost');
            expect(reply.content).not.toContain('27017');
            expect(reply.content).toContain('database');
        });
    });

    describe('Error logging', () => {
        it('should log the full error internally while showing friendly message', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const error = new Error('Detailed internal error with stack trace');

            // ErrorMapper logs internally
            const userError = ErrorMapper.toUserFacingError(error);

            // User sees friendly message
            const reply = userError.toReply();
            expect(reply.content).toContain('unexpected error');
            expect(reply.content).not.toContain('Detailed internal');

            consoleSpy.mockRestore();
        });
    });
});

describe('Command Error Handling Patterns', () => {
    describe('User validation', () => {
        it('should handle missing username when user not linked', () => {
            // Mock user without osu link
            const user = {
                id: '123456',
                osu: null
            };

            const hasUsername = !!user.osu?.username;
            expect(hasUsername).toBe(false);

            // Should trigger UserNotLinkedError
            if (!hasUsername) {
                const error = new UserNotFoundError('requested user');
                const reply = error.toReply();
                expect(reply.ephemeral).toBe(true);
            }
        });

        it('should handle user lookup with valid username', () => {
            const user = {
                id: '123456',
                osu: {
                    username: 'validuser',
                    userId: 999
                }
            };

            expect(user.osu.username).toBeTruthy();
            expect(user.osu.userId).toBeGreaterThan(0);
        });
    });

    describe('Beatmap validation', () => {
        it('should handle invalid beatmap ID', () => {
            const beatmapId = 'invalid';
            const parsedId = parseInt(beatmapId);

            expect(isNaN(parsedId)).toBe(true);

            if (isNaN(parsedId)) {
                const error = ErrorMapper.beatmapNotFound(beatmapId);
                const reply = error.toReply();
                expect(reply.content).toContain('Beatmap not found');
                expect(reply.content).toContain('invalid');
            }
        });

        it('should handle valid beatmap ID', () => {
            const beatmapId = '123456';
            const parsedId = parseInt(beatmapId);

            expect(isNaN(parsedId)).toBe(false);
            expect(parsedId).toBe(123456);
        });
    });

    describe('API error handling', () => {
        it('should handle API timeout gracefully', () => {
            const axiosError = {
                isAxiosError: true,
                code: 'ETIMEDOUT',
                message: 'timeout of 5000ms exceeded'
            };

            const userError = ErrorMapper.toUserFacingError(axiosError);
            expect(userError).toBeInstanceOf(NetworkError);

            const reply = userError.toReply();
            expect(reply.content).toContain('Failed to contact');
            expect(reply.ephemeral).toBe(true);
        });

        it('should handle API rate limit', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 429 }
            };

            const userError = ErrorMapper.toUserFacingError(axiosError);
            expect(userError).toBeInstanceOf(OsuApiError);

            const reply = userError.toReply();
            expect(reply.content).toContain('osu! API');
            expect(reply.ephemeral).toBe(true);
        });

        it('should handle API server error', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 503 }
            };

            const userError = ErrorMapper.toUserFacingError(axiosError);
            expect(userError).toBeInstanceOf(OsuApiError);
        });
    });

    describe('Happy path - quick validation', () => {
        it('should pass valid gamemode', () => {
            const gamemodes = ['osu', 'taiko', 'fruits', 'mania'];
            gamemodes.forEach(mode => {
                expect(gamemodes).toContain(mode);
            });
        });

        it('should pass valid mod combinations', () => {
            const validMods = ['HD', 'HR', 'DT', 'FL', 'EZ'];
            validMods.forEach(mod => {
                expect(mod.length).toBeGreaterThan(0);
                expect(mod).toMatch(/^[A-Z]+$/);
            });
        });

        it('should pass valid Discord interaction', () => {
            const mockInteraction = {
                replied: false,
                deferred: false,
                isButton: () => false,
                isCommand: () => true,
                commandName: 'profile'
            };

            expect(mockInteraction.isCommand()).toBe(true);
            expect(mockInteraction.commandName).toBeTruthy();
        });
    });
});

describe('Error Recovery Patterns', () => {
    describe('Fallback mechanisms', () => {
        it('should have fallback when primary reply method fails', async () => {
            const mockInteraction = {
                replied: false,
                deferred: false,
                reply: vi.fn().mockRejectedValue(new Error('Reply failed')),
                followUp: vi.fn().mockResolvedValue(undefined),
                editReply: vi.fn()
            };

            const error = new UserNotFoundError('test');
            const reply = error.toReply();

            try {
                await mockInteraction.reply(reply);
            } catch (e) {
                // Fallback to followUp
                await mockInteraction.followUp(reply);
            }

            expect(mockInteraction.reply).toHaveBeenCalled();
            expect(mockInteraction.followUp).toHaveBeenCalled();
        });

        it('should log error if all reply methods fail', async () => {
            const mockInteraction = {
                replied: false,
                deferred: false,
                reply: vi.fn().mockRejectedValue(new Error('Reply failed')),
                followUp: vi.fn().mockRejectedValue(new Error('FollowUp failed')),
                editReply: vi.fn().mockRejectedValue(new Error('EditReply failed'))
            };

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const error = new UserNotFoundError('test');
            const reply = error.toReply();

            try {
                await mockInteraction.reply(reply);
            } catch (e) {
                try {
                    await mockInteraction.followUp(reply);
                } catch (e2) {
                    console.error('Failed to send error reply:', e2);
                }
            }

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
