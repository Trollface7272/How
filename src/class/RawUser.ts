import { User as disUser } from "discord.js"
export class RawUser { 
    public get Username() {
        return this.user.username
    }
    public get AvatarUrl() {
        return this.user.avatarURL()
    }
    public get id() {
        return this.user.id
    }
    public get bot() {
        return this.user.bot
    }
    constructor(protected user: disUser) {}

}