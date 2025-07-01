import { ColorResolvable, Interaction, InteractionReplyOptions, InteractionType, MessageReplyOptions } from "discord.js";
import { Client } from "../Client";
import { MessageEventData } from "../partials/MessageEvent";
import { User } from "../database/User";
import { Logger } from "../Logger";
import context from "node-execution-context";
import { Context } from "@src/types/Context";

export class CommandData {
    constructor(protected data: MessageEventData) {
        const ctx = context.get<Context>()
        ctx.user = this.GetUser()
        context.set(ctx)
    }

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

    public IsInGuild() {
        return this.data.IsInGuild()
    }

    public GetMember() {
        return this.data.GetMember()
    }

    public GetChannelId(): string {
        return this.data.GetChannelId();
    }

    public GetMessageId(): string {
        return this.data.GetMessageId();
    }
}