import { InteractionReplyOptions, MessageReplyOptions } from "discord.js"

/**
 * Base class for errors that should be shown to users.
 * These errors contain user-friendly messages and don't expose internal details.
 */
export abstract class UserFacingError extends Error {
    constructor(
        public readonly userMessage: string,
        public readonly reason?: string
    ) {
        super(reason || userMessage)
        this.name = this.constructor.name
        Object.setPrototypeOf(this, new.target.prototype)
    }

    abstract toReply(): InteractionReplyOptions | MessageReplyOptions
}

/**
 * Error when user is not found
 */
export class UserNotFoundError extends UserFacingError {
    constructor(username: string) {
        super(
            `User ${username} not found`,
            `User lookup failed for: ${username}`
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error when user hasn't linked their osu! account
 */
export class UserNotLinkedError extends UserFacingError {
    constructor() {
        super(
            "Please link your osu! account using /link",
            "User attempted to use command without linking account"
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error when a beatmap is not found
 */
export class BeatmapNotFoundError extends UserFacingError {
    constructor(identifier?: string | number) {
        const detail = identifier ? ` (${identifier})` : ""
        super(
            `Beatmap not found${detail}`,
            `Beatmap lookup failed${detail}`
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error when no scores are found
 */
export class NoScoresFoundError extends UserFacingError {
    constructor(context?: string) {
        const detail = context ? ` for ${context}` : ""
        super(
            `No scores found${detail}`,
            `Score lookup returned no results${detail}`
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error when osu! API is unavailable
 */
export class OsuApiError extends UserFacingError {
    constructor(statusCode?: number) {
        const detail = statusCode ? ` (Status: ${statusCode})` : ""
        super(
            "The osu! API is currently unavailable. Please try again later.",
            `osu! API error${detail}`
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error when command requires osu!supporter
 */
export class RequiresSupporterError extends UserFacingError {
    constructor() {
        super(
            "This command requires osu!supporter",
            "User attempted supporter-only command without supporter status"
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error for invalid command arguments
 */
export class InvalidArgumentError extends UserFacingError {
    constructor(argument: string, expectedFormat?: string) {
        const formatHint = expectedFormat ? `. Expected format: ${expectedFormat}` : ""
        super(
            `Invalid ${argument}${formatHint}`,
            `Invalid argument: ${argument}`
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error when a beatmap has no leaderboards
 */
export class BeatmapUnscoreableError extends UserFacingError {
    constructor() {
        super(
            "This beatmap does not have leaderboards",
            "Beatmap is not ranked/approved"
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error when database operation fails
 */
export class DatabaseError extends UserFacingError {
    constructor(operation: string) {
        super(
            "A database error occurred. Please try again later.",
            `Database operation failed: ${operation}`
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Error for network/timeout issues
 */
export class NetworkError extends UserFacingError {
    constructor(service: string) {
        super(
            `Failed to contact ${service}. Please try again later.`,
            `Network error connecting to ${service}`
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}

/**
 * Generic error for unexpected failures
 */
export class UnexpectedError extends UserFacingError {
    constructor(context?: string) {
        const detail = context ? ` while ${context}` : ""
        super(
            "An unexpected error occurred. Please try again later.",
            `Unexpected error${detail}`
        )
    }

    toReply(): InteractionReplyOptions | MessageReplyOptions {
        return {
            content: this.userMessage,
            ephemeral: true
        }
    }
}
