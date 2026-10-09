import { AxiosError } from "axios"
import { FetcherError, FetcherErrors } from "../api/osu/class/FetcherError"
import {
    UserFacingError,
    UserNotFoundError,
    UserNotLinkedError,
    OsuApiError,
    RequiresSupporterError,
    BeatmapNotFoundError,
    NetworkError,
    UnexpectedError,
    DatabaseError
} from "./UserFacingError"
import { Logger } from "../Logger"

/**
 * Maps various error types to UserFacingError instances
 */
export class ErrorMapper {
    /**
     * Convert any error to a user-facing error
     */
    static toUserFacingError(err: unknown, context?: string): UserFacingError {
        // Already a user-facing error
        if (err instanceof UserFacingError) {
            return err
        }

        // FetcherError (custom osu! API errors)
        if (err instanceof FetcherError) {
            return this.mapFetcherError(err)
        }

        // AxiosError (HTTP errors)
        if (err instanceof AxiosError) {
            return this.mapAxiosError(err)
        }

        // MongoDB/Database errors
        if (this.isDatabaseError(err)) {
            Logger.Error("Database error:", err)
            return new DatabaseError(context || "unknown operation")
        }

        // Unknown errors
        Logger.Error("Unexpected error:", err)
        return new UnexpectedError(context)
    }

    /**
     * Map FetcherError to UserFacingError
     */
    private static mapFetcherError(err: FetcherError): UserFacingError {
        switch (err.code) {
            case FetcherErrors.UserNotLinked:
                return new UserNotLinkedError()
            case FetcherErrors.RequiresSupporter:
                return new RequiresSupporterError()
            case FetcherErrors.MissingIdentifyScope:
                return new OsuApiError()
            default:
                Logger.Error("Unknown FetcherError:", err)
                return new UnexpectedError("fetching osu! data")
        }
    }

    /**
     * Map AxiosError to UserFacingError
     */
    private static mapAxiosError(err: AxiosError): UserFacingError {
        const status = err.response?.status

        if (!status) {
            // Network error (no response)
            return new NetworkError("external API")
        }

        switch (status) {
            case 401:
                return new UserNotLinkedError()
            case 404:
                // Could be user or beatmap, context would help but default to generic
                return new UserNotFoundError("requested resource")
            case 429:
                return new OsuApiError(429)
            case 500:
            case 502:
            case 503:
            case 504:
            case 520:
                return new OsuApiError(status)
            default:
                Logger.Error(`Unhandled HTTP status ${status}:`, err)
                return new UnexpectedError("API request")
        }
    }

    /**
     * Check if error is database-related
     */
    private static isDatabaseError(err: unknown): boolean {
        if (!err || typeof err !== "object") return false
        
        const errorName = (err as Error).name
        const errorMessage = (err as Error).message?.toLowerCase() || ""

        // MongoDB error patterns
        return (
            errorName?.includes("Mongo") ||
            errorMessage.includes("mongo") ||
            errorMessage.includes("database") ||
            errorName === "MongoError" ||
            errorName === "MongoServerError"
        )
    }

    /**
     * Create a user-facing error for beatmap not found
     */
    static beatmapNotFound(identifier?: string | number): UserFacingError {
        return new BeatmapNotFoundError(identifier)
    }

    /**
     * Create a user-facing error for user not found with specific username
     */
    static userNotFound(username: string): UserFacingError {
        return new UserNotFoundError(username)
    }
}
