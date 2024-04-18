import { Interaction, InteractionReplyOptions, InteractionResponse, InteractionType, Message, MessageReplyOptions } from "discord.js";
import { Client } from "../Client";
import { RawUser } from "../RawUser";
import { Event } from "./Event";
import { User } from "../database/User";
import { Guild } from "../database/Guild";
import { Gamemode } from "../api/osu/types/MiscTypes";

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

    public GetBoolean(key: string, aliases: string[]): boolean {
        throw Event.ReturnCode.Unimplemented
    }

    public GetNumber(key: string, aliases: string[], def?: number): number {
        throw Event.ReturnCode.Unimplemented
    }

    public GetString(key: string, aliases: string[]): string {
        throw Event.ReturnCode.Unimplemented
    }

    public GetGamemode(): Gamemode {
        throw Event.ReturnCode.Unimplemented
    }

    public GetMods(): string[] {
        throw Event.ReturnCode.Unimplemented
    }

    public GetUsername(): string {
        throw Event.ReturnCode.Unimplemented
    }

    public GetCommand(): string {
        throw Event.ReturnCode.Unimplemented
    }

    public GetSpecific(): number[] {
        throw Event.ReturnCode.Unimplemented
    }

    public IsInteraction(): boolean {
        throw Event.ReturnCode.Unimplemented
    }

    public GetInteractionType(): InteractionType {
        throw Event.ReturnCode.Unimplemented
    }

    public GetInteraction(): Interaction {
        throw Event.ReturnCode.Unimplemented
    }

    public async GetBeatmapFromConversation(): Promise<number> {
        throw Event.ReturnCode.Unimplemented
    }

    public GetBeatmap(): number {
        throw Event.ReturnCode.Unimplemented
    }
}