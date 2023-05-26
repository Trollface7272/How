import { ColorResolvable, User as DiscordUser } from "discord.js"
import { ObjectId } from "mongodb"
import { db } from "./Main"
import { RawUser } from "../RawUser"

export class User extends RawUser {
    public _id: ObjectId
    public username: string
    public blacklisted: boolean
    public messages: number
    public commands: number
    public interactions: {
        command: number
        button: number
        dropdown: number
    }
    public embedColor: ColorResolvable
    public firstSeen: Date
    public lastSeen: Date
    public knownIps: string[]
    public osuTemp: string
    public settings: {
        missesTheme: string
    }

    constructor(user: DiscordUser) {
        super(user)
    }

    public async LoadUser() {
        const user = await db.collection("users").findOne({
            _id: new ObjectId(this.id)
        })
        if(!user) return false
        for (const key in user) {
            this[key] = user[key]
        }
        return true
    }
}