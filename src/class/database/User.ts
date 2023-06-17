import { ColorResolvable, User as DiscordUser } from "discord.js"
import { Document, ObjectId } from "mongodb"
import { db } from "./Main"
import { RawUser } from "../RawUser"
import { OAuth } from "../api/osu/OAuth"

type Osu = {
    token: string
    tokenType: "Bearer"
    expiresIn: Date
    refreshToken: string
    scopes: string[]
    username: string
    userId: number
    country: string
    pp: number
    rank: number
    countryRank: number
}

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

    public osu: Osu

    constructor(user?: DiscordUser | Document) {
        if (user instanceof DiscordUser) {
            super(user || {} as DiscordUser)
        } else {
            super({} as DiscordUser)
            for (const key in user) {
                this[key] = user[key]
            }
        }
    }

    public async LoadUser() {
        const user = await db.collection("users").findOne({
            _id: this.id as unknown as ObjectId
        })
        if (!user) return false
        for (const key in user) {
            this[key] = user[key]
        }
        return true
    }

    public async UpdateOsuAuth(auth: OAuth) {
        if (!this.osu) this.osu = {} as Osu
        this.osu.refreshToken = auth.refresh_token
        this.osu.token = auth.access_token
        this.osu.expiresIn = auth.expires_in
        this.osu.tokenType = auth.token_type as "Bearer"
        return this.Save()
    }

    public async Save() {
        return db.collection("users").updateOne({
            _id: this._id
        }, {
            $set: {
                username: this.username,
                blacklisted: this.blacklisted,
                messages: this.messages,
                commands: this.commands,
                interactions: this.interactions,
                embedColor: this.embedColor,
                firstSeen: this.firstSeen,
                lastSeen: this.lastSeen,
                knownIps: this.knownIps,
                osuTemp: this.osuTemp,
                settings: this.settings,
                osu: this.osu
            }
        })
    }
}

class cUserFactory {

    public async GetUser(id: string) {
        const user = await db.collection("users").findOne({
            _id: id as unknown as ObjectId
        })
        if (!user) return false
        return new User(user)
    }
}

export const UserFactory = new cUserFactory()