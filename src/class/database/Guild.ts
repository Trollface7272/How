import { ObjectId } from "mongodb";
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

    constructor(guild: DiscordGuild) {
        super(guild)
    }

    public async LoadGuild() {
        const guild = db.collection("guilds").findOne({
            _id: new ObjectId(this.id)
        })
        if(!guild) return false
        for (const key in guild) {
            this[key] = guild[key]
        }
        return true
    }
}