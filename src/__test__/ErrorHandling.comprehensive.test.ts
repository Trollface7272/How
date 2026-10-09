import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorMapper } from '@src/class/errors/ErrorMapper';
import {
    UserFacingError,
    UserNotFoundError,
    UserNotLinkedError,
    BeatmapNotFoundError,
    NoScoresFoundError,
    OsuApiError,
    RequiresSupporterError,
    InvalidArgumentError,
    BeatmapUnscoreableError,
    DatabaseError,
    NetworkError,
    UnexpectedError
} from '@src/class/errors/UserFacingError';

describe('ErrorMapper - Comprehensive', () => {
    describe('AxiosError mapping', () => {
        it('should map 401 Unauthorized to UserNotLinkedError', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 401, statusText: 'Unauthorized' },
                message: 'Unauthorized'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(UserNotLinkedError);
        });

        it('should map 404 Not Found to UserNotFoundError', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 404, statusText: 'Not Found' },
                message: 'Not found'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(UserNotFoundError);
        });

        it('should map 429 Rate Limit to OsuApiError', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 429, statusText: 'Too Many Requests' },
                message: 'Too many requests'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
            expect(mapped.userMessage).toContain('osu! API');
        });

        it('should map 500 Internal Server Error', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 500, statusText: 'Internal Server Error' },
                message: 'Server error'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
            expect(mapped.userMessage).toContain('osu! API');
        });

        it('should map 502 Bad Gateway', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 502, statusText: 'Bad Gateway' },
                message: 'Bad gateway'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
        });

        it('should map 503 Service Unavailable', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 503, statusText: 'Service Unavailable' },
                message: 'Service unavailable'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
        });

        it('should map 504 Gateway Timeout', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 504, statusText: 'Gateway Timeout' },
                message: 'Gateway timeout'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
        });

        it('should map network timeout (ETIMEDOUT)', () => {
            const axiosError = {
                isAxiosError: true,
                code: 'ETIMEDOUT',
                message: 'timeout of 5000ms exceeded'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(NetworkError);
            expect(mapped.userMessage).toContain('Failed to contact');
        });

        it('should map connection refused (ECONNREFUSED)', () => {
            const axiosError = {
                isAxiosError: true,
                code: 'ECONNREFUSED',
                message: 'connect ECONNREFUSED'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(NetworkError);
        });

        it('should map connection reset (ECONNRESET)', () => {
            const axiosError = {
                isAxiosError: true,
                code: 'ECONNRESET',
                message: 'socket hang up'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(NetworkError);
        });

        it('should map network error without response', () => {
            const axiosError = {
                isAxiosError: true,
                message: 'Network Error',
                code: 'ERR_NETWORK'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(NetworkError);
            expect(mapped.userMessage).toContain('osu! API');
        });
    });

    describe('FetcherError mapping', () => {
        it('should map UserNotLinked error', () => {
            const fetcherError = {
                code: 0, // FetcherErrors.UserNotLinked
                message: 'User not linked'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(fetcherError);
            expect(mapped).toBeInstanceOf(UserNotLinkedError);
        });

        it('should map RequiresSupporter error', () => {
            const fetcherError = {
                code: 2, // FetcherErrors.RequiresSupporter
                message: 'Command requires osu!supporter'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(fetcherError);
            expect(mapped).toBeInstanceOf(RequiresSupporterError);
        });

        it('should map MissingIdentifyScope error', () => {
            const fetcherError = {
                code: 1, // FetcherErrors.MissingIdentifyScope
                message: 'Missing identify scope'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(fetcherError);
            expect(mapped).toBeInstanceOf(OsuApiError);
        });
    });

    describe('MongoDB error mapping', () => {
        it('should map MongoError to DatabaseError', () => {
            const mongoError = {
                name: 'MongoError',
                message: 'Connection to database failed'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(mongoError);
            expect(mapped).toBeInstanceOf(DatabaseError);
        });

        it('should map MongoServerError to DatabaseError', () => {
            const mongoError = {
                name: 'MongoServerError',
                message: 'Duplicate key error'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(mongoError);
            expect(mapped).toBeInstanceOf(DatabaseError);
        });

        it('should map MongoNetworkError to DatabaseError', () => {
            const mongoError = {
                name: 'MongoNetworkError',
                message: 'Failed to connect to server'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(mongoError);
            expect(mapped).toBeInstanceOf(DatabaseError);
        });
    });

    describe('Unknown error mapping', () => {
        it('should map generic Error to UnexpectedError', () => {
            const error = new Error('Something went wrong');
            const mapped = ErrorMapper.toUserFacingError(error);
            expect(mapped).toBeInstanceOf(UnexpectedError);
        });

        it('should map string error to UnexpectedError', () => {
            const error = 'String error message' as any;
            const mapped = ErrorMapper.toUserFacingError(error);
            expect(mapped).toBeInstanceOf(UnexpectedError);
        });

        it('should map null to UnexpectedError', () => {
            const mapped = ErrorMapper.toUserFacingError(null as any);
            expect(mapped).toBeInstanceOf(UnexpectedError);
        });

        it('should map undefined to UnexpectedError', () => {
            const mapped = ErrorMapper.toUserFacingError(undefined as any);
            expect(mapped).toBeInstanceOf(UnexpectedError);
        });

        it('should map object without message to UnexpectedError', () => {
            const error = { foo: 'bar' } as any;
            const mapped = ErrorMapper.toUserFacingError(error);
            expect(mapped).toBeInstanceOf(UnexpectedError);
        });
    });

    describe('UserFacingError passthrough', () => {
        it('should pass through UserNotFoundError unchanged', () => {
            const original = new UserNotFoundError('testuser');
            const mapped = ErrorMapper.toUserFacingError(original);
            expect(mapped).toBe(original);
        });

        it('should pass through BeatmapNotFoundError unchanged', () => {
            const original = new BeatmapNotFoundError('12345');
            const mapped = ErrorMapper.toUserFacingError(original);
            expect(mapped).toBe(original);
        });

        it('should pass through NoScoresFoundError unchanged', () => {
            const original = new NoScoresFoundError('No recent scores');
            const mapped = ErrorMapper.toUserFacingError(original);
            expect(mapped).toBe(original);
        });
    });
});

describe('UserFacingError Classes - All Types', () => {
    describe('UserNotFoundError', () => {
        it('should create with username and generate proper reply', () => {
            const error = new UserNotFoundError('testuser123');
            const reply = error.toReply();
            
            expect(error.message).toContain('testuser123');
            expect(reply.content).toContain('testuser123');
            expect(reply.content).toContain('not found');
            expect(reply.ephemeral).toBe(true);
        });

        it('should handle special characters in username', () => {
            const error = new UserNotFoundError('user-_123');
            const reply = error.toReply();
            expect(reply.content).toContain('user-_123');
        });
    });

    describe('UserNotLinkedError', () => {
        it('should create with proper link instructions', () => {
            const error = new UserNotLinkedError();
            const reply = error.toReply();
            
            expect(reply.content).toContain('link');
            expect(reply.content).toContain('/link');
            expect(reply.ephemeral).toBe(true);
        });
    });

    describe('BeatmapNotFoundError', () => {
        it('should create with beatmap ID', () => {
            const error = new BeatmapNotFoundError('987654');
            const reply = error.toReply();
            
            expect(error.message).toContain('987654');
            expect(reply.content).toContain('987654');
            expect(reply.content).toContain('Beatmap');
            expect(reply.ephemeral).toBe(true);
        });
    });

    describe('NoScoresFoundError', () => {
        it('should create with context message', () => {
            const error = new NoScoresFoundError('No recent plays found');
            const reply = error.toReply();
            
            expect(reply.content).toContain('No recent plays found');
            expect(reply.ephemeral).toBe(true);
        });

        it('should handle different contexts', () => {
            const error = new NoScoresFoundError('No top plays on this beatmap');
            const reply = error.toReply();
            expect(reply.content).toContain('No top plays on this beatmap');
        });
    });

    describe('OsuApiError', () => {
        it('should create with status code', () => {
            const error = new OsuApiError(429);
            const reply = error.toReply();
            
            expect(reply.content).toContain('osu! API');
            expect(reply.ephemeral).toBe(true);
        });

        it('should create with default message', () => {
            const error = new OsuApiError();
            const reply = error.toReply();
            expect(reply.content).toContain('osu! API');
        });
    });

    describe('RequiresSupporterError', () => {
        it('should create with supporter message', () => {
            const error = new RequiresSupporterError();
            const reply = error.toReply();
            
            expect(reply.content).toContain('osu!supporter');
            expect(reply.ephemeral).toBe(true);
        });
    });

    describe('InvalidArgumentError', () => {
        it('should create with argument details', () => {
            const error = new InvalidArgumentError('Invalid gamemode: invalid');
            const reply = error.toReply();
            
            expect(reply.content).toContain('Invalid gamemode: invalid');
            expect(reply.ephemeral).toBe(true);
        });
    });

    describe('BeatmapUnscoreableError', () => {
        it('should create with beatmap context', () => {
            const error = new BeatmapUnscoreableError();
            const reply = error.toReply();
            
            expect(reply.content).toContain('beatmap');
            expect(reply.content).toContain('leaderboards');
            expect(reply.ephemeral).toBe(true);
        });
    });

    describe('DatabaseError', () => {
        it('should create with generic message (no leak)', () => {
            const error = new DatabaseError('Connection timeout at host:27017');
            const reply = error.toReply();
            
            expect(reply.content).toContain('database');
            expect(reply.content).not.toContain('27017'); // Should not leak internal details
            expect(reply.ephemeral).toBe(true);
        });
    });

    describe('NetworkError', () => {
        it('should create with network message', () => {
            const error = new NetworkError('test service');
            const reply = error.toReply();
            
            expect(reply.content).toContain('Failed to contact');
            expect(reply.content).toContain('test service');
            expect(reply.ephemeral).toBe(true);
        });
    });

    describe('UnexpectedError', () => {
        it('should create with generic error message', () => {
            const error = new UnexpectedError('Stack trace details');
            const reply = error.toReply();
            
            expect(reply.content).toContain('unexpected');
            expect(reply.content).not.toContain('Stack trace'); // Should not leak stack
            expect(reply.ephemeral).toBe(true);
        });
    });
});

describe('Error Reply Format Validation', () => {
    it('all errors should return ephemeral replies', () => {
        const errors = [
            new UserNotFoundError('test'),
            new UserNotLinkedError(),
            new BeatmapNotFoundError('123'),
            new NoScoresFoundError('none'),
            new OsuApiError(),
            new RequiresSupporterError(),
            new InvalidArgumentError('bad'),
            new BeatmapUnscoreableError(),
            new DatabaseError('db'),
            new NetworkError('service'),
            new UnexpectedError('unexpected')
        ];

        errors.forEach(error => {
            const reply = error.toReply();
            expect(reply.ephemeral).toBe(true);
            expect(reply.content).toBeTruthy();
            expect(reply.content.length).toBeGreaterThan(10);
        });
    });

    it('all errors should have user-friendly content', () => {
        const errors = [
            new UserNotFoundError('test'),
            new OsuApiError(),
            new DatabaseError('db'),
            new NetworkError('service')
        ];

        errors.forEach(error => {
            const reply = error.toReply();
            // Should not contain technical jargon
            expect(reply.content).not.toMatch(/stack|trace|exception|null pointer/i);
            // Should be readable
            expect(reply.content.split(' ').length).toBeGreaterThan(3);
        });
    });
});
