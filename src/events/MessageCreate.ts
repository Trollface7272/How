import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Event, EventData } from "@src/class/partials/Event";
import { Message, ReplyOptions } from "discord.js";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { User } from "@src/class/User";
import { Logger } from "@src/class/Logger";
import { Client } from "@src/class/Client";

export class MessageCreateData implements EventData, MessageEventData {
    constructor(
        private message: Message
    ) {}
    public async LoadDbData(): Promise<void> {
        console.log("Implelent Db loading to interaction create")
    }

    public GetClient(): Client {
        return this.message.client as Client
    }

    public GetUser() {
        return new User(this.message.author)
    }

    public GetContent() {
        return this.message.content
    }

    public async Reply(msg: ReplyOptions): Promise<Message<boolean>> {
        return await this.message.reply(msg)
    }
}

export class MessageCreate implements Event {
    public async Handle(data: MessageCreateData): Promise<Event.ReturnCode> {
        const loading = data.LoadDbData()
        const prefix = "!"
        const content = data.GetContent().toLowerCase()

        if (!content.startsWith(prefix)) return 0

        const [command, ...args] = content.split(" ")

        const commandData = CommandEmitterInstance.GetCommand(command)
        if (!commandData) return 0
        await loading
        try { 
            const command = new commandData(data)
            command.Handle()
        } catch (err) {
            Logger.Error(err)
            Logger.Trace()
        }

        return 0
    }
    
}
