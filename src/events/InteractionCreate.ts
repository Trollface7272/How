import { Event, EventData } from "@src/class/partials/Event";
import { Interaction, InteractionReplyOptions, InteractionResponse, Message, MessageEditOptions, ReplyOptions } from "discord.js";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { User } from "@src/class/User";
import { Client } from "@src/class/Client";

export class InteractionCreateData implements EventData, MessageEventData {
    constructor(
        private interaction: Interaction
    ) {}
    public async LoadDbData(): Promise<void> {
        console.log("Implelent Db loading to interaction create")
    }
    public GetClient(): Client {
        return this.interaction.client as Client
    }
    public GetUser(): User {
        return new User(this.interaction.user)
    }

    public async Reply(msg: ReplyOptions): Promise<Message<boolean>|InteractionResponse> {
        if (this.interaction.isAnySelectMenu() || this.interaction.isButton())
            return this.interaction.message.edit(msg as MessageEditOptions)
        if (this.interaction.isCommand()) {
            if (this.interaction.replied) return
            return this.interaction.reply(msg as InteractionReplyOptions)
        }
        
    }
}

export class InteractionCreate implements Event {
    public async Handle(data: InteractionCreateData): Promise<Event.ReturnCode> {
        const loading = data.LoadDbData()


        await loading
        return Event.ReturnCode.Unimplemented
    }
    
}
