import { SlashCommandBuilder } from "discord.js"
import { MessageEventData } from "./MessageEvent"

export enum CommandResponseCodes {
    OK,
    ERROR,
    USER_ERROR,
    OSU_API_DOWN
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
    public static readonly doNotDefer?: boolean = false
    constructor(data: MessageEventData) {
        if (this.constructor == CommandAbstract)
            throw new Error("Cannot instanciate abstract class")
    }

    public static readonly interactionData?: SlashCommandBuilder = null

    public Handle(): Promise<number>|number {
        throw new Error("Not Implemented")
    }
}
