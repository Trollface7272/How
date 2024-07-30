import { ColorResolvable, Interaction, InteractionReplyOptions, InteractionType, MessageReplyOptions } from "discord.js";
import { Client } from "../Client";
import { MessageEventData } from "../partials/MessageEvent";
import { User } from "../database/User";
import { Logger } from "../Logger";

export class CommandData {
    constructor(protected data: MessageEventData) { }

    public Reply(msg: MessageReplyOptions | InteractionReplyOptions) {
        return this.data.Reply(msg)
            .catch(err => {
                Logger.Error("Error responding to command", err)
                Logger.Trace()
            })
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

    public GetOldComponentId(): string {
        if (!this.IsInteraction()) return
        const interaction = this.data.GetInteraction()
        if (interaction.isChatInputCommand()) return null
        if (interaction.isMessageComponent()) return interaction.customId.split(";")[1]
    }
}