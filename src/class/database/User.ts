import { ColorResolvable } from "discord.js"
import { Collection, ObjectId } from "mongodb"
import { db } from "./Main"

export class User {
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
    private collection: Collection
    constructor() {
        this.collection = db.collection("users")
    }

    public LoadUser(_id: string) {

    }
}