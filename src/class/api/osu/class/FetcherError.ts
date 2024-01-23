
export enum FetcherErrors {
    UserNotLinked,
    MissingIdentifyScope
}

export class FetcherError {
    public code: number
    public message: string
}

export class FetcherUserNotLinkedError extends FetcherError {
    public code = FetcherErrors.UserNotLinked
    public message = "User not linked"
}

export class FetcherMissingIdentifyScopeError extends FetcherError {
    public code = FetcherErrors.MissingIdentifyScope
    public message = "Missing identify scope"
}