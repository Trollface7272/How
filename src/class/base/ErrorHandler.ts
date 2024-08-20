import { AxiosError } from "axios";
import { ErrorRenderer } from "./ErrorRenderer";
import { Logger } from "../Logger";

export class ErrorHandler extends ErrorRenderer {


    protected HandleProfileError(err: AxiosError | unknown, username: string) {
        if (err instanceof AxiosError) {
            if (err.response.status === 404) return this.RenderNoUserFound(username)
        }
        Logger.Error(err)
        return this.RenderApiError()
    }
}