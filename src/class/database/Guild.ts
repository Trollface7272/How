import { Document, ObjectId } from "mongodb";
import { RawGuild } from "../RawGuild";
import { Guild as DiscordGuild } from "discord.js"
import { db } from "./Main";

export class Guild extends RawGuild {
    public _id: ObjectId
    public name: string
    public prefix: string
    public owner: string
    public ownerUsername: string
    public messages: number
    public commands: number
    public embedColor: string

    constructor(guild?: DiscordGuild | Document) {
        if (guild instanceof DiscordGuild) {
            super(guild || {} as DiscordGuild)
        } else {
            super({} as DiscordGuild)
            for (const key in guild) {
                this[key] = guild[key]
            }
        }
    }

    public async LoadGuild() {
        const guild = await db.collection("guilds").findOne({
            _id: this.id as unknown as ObjectId
        })
        if(!guild) return false
        for (const key in guild) {
            this[key] = guild[key]
        }
        return true
    }
}

class cGuildFactory {
    public async GetGuild(id: string) {
        const guild = await db.collection("guilds").findOne({
            _id: id as unknown as ObjectId
        })
        if(!guild) return false
        return new Guild(guild)
    }
}

export const GuildFactory = new cGuildFactory()