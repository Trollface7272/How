import { MessageEventData } from "./MessageEvent"

export enum TriggerResponseCodes {
    OK,
    ErrorReplying,
    OsuApiDown,
    UnknownError
}

export abstract class TriggerDataAbstract {
    constructor() {
        if (this.constructor == TriggerDataAbstract)
            throw new Error("Cannot instanciate abstract class")
    }

    public GetTriggerArgs() {
        throw new Error("Unimplemented")
    }
}

export abstract class TriggerAbstract {
    public static readonly trigger: (string|RegExp)[] = []
    constructor(data: MessageEventData) {
        if (this.constructor == TriggerAbstract)
            throw new Error("Cannot instanciate abstract class")
    }

    public Handle(): Promise<number>|number {
        throw new Error("Not Implemented")
    }
}
