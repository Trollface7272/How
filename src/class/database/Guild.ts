import { Document, ObjectId } from "mongodb";
import { RawGuild } from "../RawGuild";
import { Guild as DiscordGuild } from "discord.js"
import { db } from "./Main";

export class Guild extends RawGuild {
    public _id: ObjectId
    public id: string
    public name: string
    public prefix: string
    public owner: string
    public ownerUsername: string
    public messages: number
    public commands: number
    public embedColor: string
    public prefixes: string[]

    public settings: {
        autoreply: {
            neverKillYourself: boolean
        }
    }


    constructor(guild?: DiscordGuild | Document) {
        if (guild instanceof DiscordGuild) {
            super(guild || {} as DiscordGuild)
            this.LoadDefault(guild)
        } else {
            super({} as DiscordGuild)
            for (const key in guild) {
                this[key] = guild[key]
            }
        }
        if (!this.prefixes) this.prefixes = []

        this.settings ??= {
            autoreply: {
                neverKillYourself: false
            }
        }
    }

    private LoadDefault(guild: DiscordGuild) {
        this._id = new ObjectId()
        this.id = guild.id
        this.name = guild.name
        this.prefix = "!"
        this.owner = guild.ownerId
        this.messages = 0
        this.commands = 0
        this.embedColor = "Random"
        this.prefixes = []
    }

    public async LoadGuild() {
        const guild = await db.collection("guilds").findOne({
            id: this.id
        })
        if(!guild) {
            await this.Save()
            return true
        }
        for (const key in guild) {
            this[key] = guild[key]
        }
        return true
    }

    public async Save() {
        return db.collection("guilds").updateOne({
            _id: this._id
        }, {
            $set: {
                id: this.id,
                name: this.name,
                prefix: this.prefix,
                owner: this.owner,
                ownerUsername: this.ownerUsername,
                messages: this.messages,
                commands: this.commands,
                embedColor: this.embedColor,
                prefixes: this.prefixes,
                settings: this.settings
            }
        }, { upsert: true })
    }
}

class cGuildFactory {
    public async GetGuild(id: string) {
        const guild = await db.collection("guilds").findOne({
            id: id
        })
        if(!guild) return false
        return new Guild(guild)
    }
}

export const GuildFactory = new cGuildFactory()