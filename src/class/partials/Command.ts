import { SlashCommandBuilder } from "discord.js"
import { MessageEventData } from "./MessageEvent"

export enum CommandResponseCodes {
    OK,
    ErrorReplying,
    OsuApiDown,
    UnknownError
}

export abstract class CommandDataAbstract {
    constructor() {
        if (this.constructor == CommandDataAbstract)
            throw new Error("Cannot instanciate abstract class")
    }

    public GetComandArgs() {
        throw new Error("Unimplemented")
    }
}

export abstract class CommandAbstract {
    public static readonly names: string[] = []
    constructor(data: MessageEventData) {
        if (this.constructor == CommandAbstract)
            throw new Error("Cannot instanciate abstract class")
    }

    public static readonly interactionData?: SlashCommandBuilder = null

    public Handle(): Promise<number>|number {
        throw new Error("Not Implemented")
    }
}
