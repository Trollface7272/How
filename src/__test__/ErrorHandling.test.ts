import { describe, it, expect, vi } from 'vitest';
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

describe('ErrorMapper', () => {
    describe('toUserFacingError', () => {
        it('should pass through UserFacingError unchanged', () => {
            const originalError = new UserNotFoundError('testuser');
            const mapped = ErrorMapper.toUserFacingError(originalError);
            expect(mapped).toBe(originalError);
            expect(mapped).toBeInstanceOf(UserNotFoundError);
        });

        it('should map AxiosError 404 to UserNotFoundError', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 404 },
                message: 'Not found'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(UserNotFoundError);
        });

        it('should map AxiosError 401 to UserNotLinkedError', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 401 },
                message: 'Unauthorized'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(UserNotLinkedError);
        });

        it('should map AxiosError 429 to OsuApiError', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 429 },
                message: 'Too many requests'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
            expect(mapped.userMessage).toContain('osu! API');
        });

        it('should map AxiosError network errors', () => {
            const axiosError = {
                isAxiosError: true,
                code: 'ECONNREFUSED',
                message: 'Connection refused'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(NetworkError);
            expect(mapped.userMessage).toContain('Failed to contact');
        });

        it('should map MongoDB errors to DatabaseError', () => {
            const mongoError = {
                name: 'MongoError',
                message: 'Connection failed'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(mongoError);
            expect(mapped).toBeInstanceOf(DatabaseError);
        });

        it('should map unknown errors to UnexpectedError', () => {
            const unknownError = new Error('Something unexpected');
            const mapped = ErrorMapper.toUserFacingError(unknownError);
            expect(mapped).toBeInstanceOf(UnexpectedError);
        });

        it('should handle null/undefined errors', () => {
            const mappedNull = ErrorMapper.toUserFacingError(null as any);
            expect(mappedNull).toBeInstanceOf(UnexpectedError);
            
            const mappedUndefined = ErrorMapper.toUserFacingError(undefined as any);
            expect(mappedUndefined).toBeInstanceOf(UnexpectedError);
        });
    });
});

describe('UserFacingError classes', () => {
    it('should create UserNotFoundError with proper reply', () => {
        const error = new UserNotFoundError('testuser');
        const reply = error.toReply();
        expect(reply.content).toContain('testuser');
        expect(reply.content).toContain('not found');
        expect(reply.ephemeral).toBe(true);
    });

    it('should create BeatmapNotFoundError with proper reply', () => {
        const error = new BeatmapNotFoundError('12345');
        const reply = error.toReply();
        expect(reply.content).toContain('12345');
        expect(reply.content).toContain('Beatmap');
        expect(reply.ephemeral).toBe(true);
    });

    it('should create OsuApiError with proper reply', () => {
        const error = new OsuApiError('API is down');
        const reply = error.toReply();
        expect(reply.content).toContain('osu! API');
        expect(reply.ephemeral).toBe(true);
    });

    it('should create NetworkError with proper reply', () => {
        const error = new NetworkError('test service');
        const reply = error.toReply();
        expect(reply.content).toContain('Failed to contact');
        expect(reply.content).toContain('test service');
        expect(reply.ephemeral).toBe(true);
    });

    it('should create DatabaseError with proper reply', () => {
        const error = new DatabaseError('Connection timeout');
        const reply = error.toReply();
        expect(reply.content).toContain('database');
        expect(reply.ephemeral).toBe(true);
    });

    it('should create UnexpectedError with proper reply', () => {
        const error = new UnexpectedError('Kaboom');
        const reply = error.toReply();
        expect(reply.content).toContain('unexpected');
        expect(reply.ephemeral).toBe(true);
    });
});
