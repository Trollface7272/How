import { describe, it, expect } from '@jest/globals';
import { ErrorMapper } from '@src/class/errors/ErrorMapper';
import {
    UserFacingError,
    UserNotFoundError,
    BeatmapNotFoundError,
    OsuApiError,
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

        it('should map AxiosError 404 to appropriate error', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 404 },
                message: 'Not found'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
            expect(mapped.message).toContain('not found');
        });

        it('should map AxiosError 401 to OsuApiError', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 401 },
                message: 'Unauthorized'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
            expect(mapped.message).toContain('authentication');
        });

        it('should map AxiosError 429 to rate limit error', () => {
            const axiosError = {
                isAxiosError: true,
                response: { status: 429 },
                message: 'Too many requests'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(OsuApiError);
            expect(mapped.message).toContain('rate limit');
        });

        it('should map AxiosError network errors', () => {
            const axiosError = {
                isAxiosError: true,
                code: 'ECONNREFUSED',
                message: 'Connection refused'
            } as any;
            
            const mapped = ErrorMapper.toUserFacingError(axiosError);
            expect(mapped).toBeInstanceOf(NetworkError);
            expect(mapped.message).toContain('network');
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
        expect(reply.content).toContain('beatmap');
        expect(reply.ephemeral).toBe(true);
    });

    it('should create OsuApiError with proper reply', () => {
        const error = new OsuApiError('API is down');
        const reply = error.toReply();
        expect(reply.content).toContain('osu! API');
        expect(reply.ephemeral).toBe(true);
    });

    it('should create NetworkError with proper reply', () => {
        const error = new NetworkError();
        const reply = error.toReply();
        expect(reply.content).toContain('network');
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
