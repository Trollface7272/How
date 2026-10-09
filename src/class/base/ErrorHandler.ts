import { AxiosError } from "axios";
import { ErrorRenderer } from "./ErrorRenderer";
import { Logger } from "../Logger";
import { FetcherError, FetcherRequiredSupporterError, FetcherUserNotLinkedError } from "../api/osu/class/FetcherError";
import { ErrorMapper } from "../errors/ErrorMapper";
import { UserFacingError } from "../errors/UserFacingError";

export class ErrorHandler extends ErrorRenderer {

    /**
     * Convert any error to a UserFacingError
     */
    protected toUserFacingError(err: unknown, context?: string): UserFacingError {
        return ErrorMapper.toUserFacingError(err, context)
    }

    /**
     * Handle profile-related errors
     */
    protected HandleProfileError(err: AxiosError | FetcherError | unknown, username: string) {
        if (err instanceof AxiosError) {
            if (err.response?.status === 404) return this.RenderNoUserFound(username)
        }

        return this.HandlegenericErrors(err)
    }

    /**
     * Handle ranking-related errors
     */
    protected HandleRankingError(err: AxiosError | FetcherError | unknown) {
        return this.HandlegenericErrors(err)
    }

    /**
     * Handle leaderboard-related errors
     */
    protected HandleLeaderboardsError(err: AxiosError | FetcherError | unknown) {
        return this.HandlegenericErrors(err)

    }

    /**
     * Handle score-related errors
     */
    protected HandleScoreError(err: AxiosError | FetcherError | unknown) {
        return this.HandlegenericErrors(err)
    }

    /**
     * Handle generic errors with proper fallback
     */
    private HandlegenericErrors(err: AxiosError | FetcherError | unknown) {
        if (err instanceof FetcherError) {
            if (err instanceof FetcherUserNotLinkedError) {
                return this.RenderNoUserError()
            }
            if (err instanceof FetcherRequiredSupporterError) {
                return this.RenderRequiredSupporterError()
            }
        }

        if (err instanceof AxiosError) {
            if (err.response?.status === 401) {
                return this.RenderNoUserError()
            }
        }

        Logger.Error(err)
        return this.RenderApiError()
    }
}
