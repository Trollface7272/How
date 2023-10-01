import { ColorResolvable, Interaction, InteractionReplyOptions, InteractionType, MessageReplyOptions, ReplyOptions } from "discord.js";
import { Client } from "../Client";
import { MessageEventData } from "../partials/MessageEvent";
import { RawUser } from "../RawUser";
import { User } from "../database/User";

export class CommandData {
    constructor(protected data: MessageEventData) { }

    public Reply(msg: MessageReplyOptions | InteractionReplyOptions) {
        return this.data.Reply(msg)
    }

    public GetUser(): User {
        return this.data.user
    }

    public GetEmbedColor(): ColorResolvable {
        return "Random"
    }

    public GetClient(): Client {
        return this.data.GetClient()
    }

    public IsInteraction(): boolean {
        return this.data.IsInteraction()
    }

    public GetInteractionType(): InteractionType {
        return this.data.GetInteractionType()
    }

    public GetInteraction(): Interaction {
        return this.data.GetInteraction()
    }
}