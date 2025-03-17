import { AxiosError } from "axios";
import { ErrorRenderer } from "./ErrorRenderer";
import { Logger } from "../Logger";
import { FetcherError, FetcherRequiredSupporterError, FetcherUserNotLinkedError } from "../api/osu/class/FetcherError";

export class ErrorHandler extends ErrorRenderer {


    protected HandleProfileError(err: AxiosError | FetcherError | unknown, username: string) {
        if (err instanceof AxiosError) {
            if (err.response.status === 404) return this.RenderNoUserFound(username)
        }

        return this.HandlegenericErrors(err)
    }

    protected HandleRankingError(err: AxiosError | FetcherError | unknown) {
        return this.HandlegenericErrors(err)
    }

    protected HandleLeaderboardsError(err: AxiosError | FetcherError | unknown) {
        return this.HandlegenericErrors(err)

    }




    private HandlegenericErrors(err: AxiosError | FetcherError | unknown) {
        if (err instanceof FetcherError) {
            if (err instanceof FetcherUserNotLinkedError) {
                return this.RenderNoUserError()
            }
            if (err instanceof FetcherRequiredSupporterError) {
                return this.RenderRequiredSupporterError()
            }
        }

        Logger.Error(err)
        return this.RenderApiError()
    }
}