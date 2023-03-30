import { Events, Message } from "discord.js";
import { Client } from "./Client";
import { MessageCreate, MessageCreateData } from "@src/events/MessageCreate";

export class EventEmitter {
    constructor(client: Client) {
        client.on(Events.MessageCreate, this.MessageCreate)
    }

    public MessageCreate(message: Message) {
        const data = new MessageCreateData(message)
        const event = new MessageCreate()
        try {
            event.Handle(data)
        } catch (err) {
            console.error(err)
        }
    }
}