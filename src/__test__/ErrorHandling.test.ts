import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AxiosError, AxiosResponse } from 'axios';
import { InteractionReplyOptions, MessageReplyOptions } from 'discord.js';
import { ErrorMapper } from '@src/class/errors/ErrorMapper';
import { Logger } from '@src/class/Logger';
import {
    UserNotFoundError,
    UserNotLinkedError,
    BeatmapNotFoundError,
    OsuApiError,
    DatabaseError,
    NetworkError,
    UnexpectedError
} from '@src/class/errors/UserFacingError';

function httpError(status: number, message: string) {
    const error = new AxiosError(message);
    error.response = { status } as AxiosResponse;
    return error;
}

function expectEphemeral(reply: InteractionReplyOptions | MessageReplyOptions) {
    expect((reply as { ephemeral?: boolean }).ephemeral).toBe(true);
}

beforeEach(() => {
    jest.spyOn(Logger, 'Error').mockImplementation(() => undefined);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('ErrorMapper', () => {
    describe('toUserFacingError', () => {
        it('should pass through UserFacingError unchanged', () => {
            const originalError = new UserNotFoundError('testuser');
            const mapped = ErrorMapper.toUserFacingError(originalError);
            expect(mapped).toBe(originalError);
            expect(mapped).toBeInstanceOf(UserNotFoundError);
        });

        it('should map AxiosError 404 to UserNotFoundError', () => {
            const mapped = ErrorMapper.toUserFacingError(httpError(404, 'Not found'));
            expect(mapped).toBeInstanceOf(UserNotFoundError);
            expect(mapped.userMessage).toContain('not found');
        });

        it('should map AxiosError 401 to UserNotLinkedError', () => {
            const mapped = ErrorMapper.toUserFacingError(httpError(401, 'Unauthorized'));
            expect(mapped).toBeInstanceOf(UserNotLinkedError);
            expect(mapped.userMessage).toContain('link');
        });

        it('should map AxiosError 429 to OsuApiError', () => {
            const mapped = ErrorMapper.toUserFacingError(httpError(429, 'Too many requests'));
            expect(mapped).toBeInstanceOf(OsuApiError);
            expect(mapped.message).toContain('429');
        });

        it('should map AxiosError network errors', () => {
            const mapped = ErrorMapper.toUserFacingError(new AxiosError('Connection refused', 'ECONNREFUSED'));
            expect(mapped).toBeInstanceOf(NetworkError);
            expect(mapped.message.toLowerCase()).toContain('network');
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
        expectEphemeral(reply);
    });

    it('should create BeatmapNotFoundError with proper reply', () => {
        const error = new BeatmapNotFoundError('12345');
        const reply = error.toReply();
        expect(reply.content).toContain('12345');
        expect(reply.content).toContain('Beatmap');
        expectEphemeral(reply);
    });

    it('should create OsuApiError with proper reply', () => {
        const error = new OsuApiError(503);
        const reply = error.toReply();
        expect(reply.content).toContain('osu! API');
        expectEphemeral(reply);
    });

    it('should create NetworkError with proper reply', () => {
        const error = new NetworkError('external API');
        const reply = error.toReply();
        expect(reply.content).toContain('external API');
        expectEphemeral(reply);
    });

    it('should create DatabaseError with proper reply', () => {
        const error = new DatabaseError('Connection timeout');
        const reply = error.toReply();
        expect(reply.content).toContain('database');
        expectEphemeral(reply);
    });

    it('should create UnexpectedError with proper reply', () => {
        const error = new UnexpectedError('Kaboom');
        const reply = error.toReply();
        expect(reply.content).toContain('unexpected');
        expectEphemeral(reply);
    });
});
