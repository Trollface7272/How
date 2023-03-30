import { Client as DiscordClient } from "discord.js"
import { EventEmitter } from "./EventEmitter";
export class Client extends DiscordClient {
    public EventEmitter: EventEmitter
    constructor() {
        super({
            intents: ["DirectMessages", "Guilds", "GuildMembers", "GuildMessages", "MessageContent"]
        })
        this.once("ready", this.OnStart)
    }

    public async Start(token: string) {
        await super.login(token)
    }

    private async OnStart() {
        this.EventEmitter = new EventEmitter(this)
    }
}