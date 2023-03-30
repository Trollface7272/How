import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Event, EventData } from "@src/class/abstract/Event";
import { Message } from "discord.js";

export class MessageCreateData implements EventData {
    constructor(
        private message: Message
    ) {}

    public GetContent() {
        return this.message.content
    }
}

export class MessageCreate implements Event {
    public async Handle(data: MessageCreateData): Promise<Event.ReturnCode> {
        const prefix = "!"
        const content = data.GetContent().toLowerCase()

        if (!content.startsWith(prefix)) return 0

        const [command, ...args] = content.split(" ")

        const commandData = CommandEmitterInstance.GetCommand(command)
        if (!commandData) return 0

        commandData.Handle(data)

        return 0
    }
    
}
