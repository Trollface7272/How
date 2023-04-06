import { InteractionResponse, Message, ReplyOptions } from "discord.js";
import { Client } from "../Client";
import { User } from "../User";
import { Event } from "./Event";

export abstract class MessageEventData {

    public Reply(msg: ReplyOptions): Promise<Message<boolean>|InteractionResponse> {
        throw Event.ReturnCode.Unimplemented
    }

    public GetUser(): User {
        throw Event.ReturnCode.Unimplemented
    }

    public GetClient(): Client {
        throw Event.ReturnCode.Unimplemented
    }

    public async LoadDbData() {

    }
}