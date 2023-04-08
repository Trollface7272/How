import { Client as DiscordClient } from "discord.js"
import { EventEmitter } from "./EventEmitter";
import { Logger } from "./Logger";
import { CommandLoader } from "./CommandLoader";
export class Client extends DiscordClient {
    public EventEmitter: EventEmitter
    constructor() {
        super({
            intents: ["DirectMessages", "Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
            allowedMentions: { repliedUser: false }
        })
        this.once("ready", this.OnStart)
        new CommandLoader()
    }

    public async Start(token: string) {
        Logger.Info(`Starting Client`)
        await super.login(token)
        Logger.Info(`Client Started`)
    }

    private async OnStart() {
        Logger.Info(`Creating Event Emitter`)
        this.EventEmitter = new EventEmitter(this)
    }
}