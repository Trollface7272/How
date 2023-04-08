import { Events, Interaction, Message } from "discord.js";
import { Client } from "./Client";
import { MessageCreate, MessageCreateData } from "@src/events/MessageCreate";
import { InteractionCreate, InteractionCreateData } from "@src/events/InteractionCreate";
import { Logger } from "./Logger";

export class EventEmitter {
    constructor(client: Client) {
        Logger.Info(`Loading event ${Events.MessageCreate}`)
        client.on(Events.MessageCreate, this.MessageCreate)
        Logger.Info(`Loading event ${Events.InteractionCreate}`)
        client.on(Events.InteractionCreate, this.InteractionCreate)
    }

    public MessageCreate(message: Message) {
        const data = new MessageCreateData(message)
        const event = new MessageCreate()
        try {
            event.Handle(data)
        } catch (err) {
            Logger.Error(err)
        }
    }

    public InteractionCreate(interaction: Interaction) {
        const data = new InteractionCreateData(interaction)
        const event = new InteractionCreate()
        try {
            event.Handle(data)
        } catch (err) {
            Logger.Error(err)
        }
    }
}