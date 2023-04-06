import { User as disUser } from "discord.js"
export class User { 
    public get Username() {
        return this.user.username
    }
    public get AvatarUrl() {
        return this.user.avatar
    }
    constructor(protected user: disUser) {}

}