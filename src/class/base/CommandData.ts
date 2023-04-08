import { ColorResolvable, InteractionReplyOptions, MessageReplyOptions, ReplyOptions } from "discord.js";
import { Client } from "../Client";
import { MessageEventData } from "../partials/MessageEvent";
import { User } from "../User";

export class CommandData {
    constructor(protected data: MessageEventData) { }

    public Reply(msg: MessageReplyOptions|InteractionReplyOptions) {
        return this.data.Reply(msg)
    }

    public GetUser(): User {
        return this.data.GetUser()
    }

    public GetEmbedColor(): ColorResolvable {
        return "Random"
    }

    public GetClient(): Client {
        return this.data.GetClient()
    }
}