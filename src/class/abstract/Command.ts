import { MessageCreateData } from "@src/events/MessageCreate"
import { CommandData } from "./CommandData"

export abstract class Command {
    public readonly names: string[] = []
    constructor() {
        if (this.constructor == Command)
            throw new Error("Cannot instanciate abstract class")
    }

    public Handle(data: CommandData) {
        throw new Error("Not Implemented")
    }

    public GetDataFromMessage(data: MessageCreateData): CommandData {
        throw new Error("Not Implemented")
    }
}
