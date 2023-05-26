import { InteractionReplyOptions, InteractionResponse, Message, MessageReplyOptions } from "discord.js";
import { Client } from "../Client";
import { RawUser } from "../RawUser";
import { Event } from "./Event";
import { User } from "../database/User";
import { Guild } from "../database/Guild";

export abstract class MessageEventData {
    public get user(): User {
        throw Event.ReturnCode.Unimplemented
    }
    public get guild(): Guild {
        throw Event.ReturnCode.Unimplemented
    }

    public Reply(msg: MessageReplyOptions | InteractionReplyOptions): Promise<Message<boolean> | InteractionResponse> {
        throw Event.ReturnCode.Unimplemented
    }

    public GetRawUser(): RawUser {
        throw Event.ReturnCode.Unimplemented
    }

    public GetClient(): Client {
        throw Event.ReturnCode.Unimplemented
    }

    public async LoadDbData(userId: string, guildId: string): Promise<unknown> {
        throw Event.ReturnCode.Unimplemented
    }
}