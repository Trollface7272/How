import { DiscordAPIError, Client as DiscordClient, Partials, Routes } from "discord.js"
import { EventEmitter } from "./EventEmitter";
import { Logger } from "./Logger";
import { CommandLoader } from "./CommandLoader";
import { Connect } from "./database/Main";
import { EmojiFactory } from "./Emojis";
import { CommandEmitterInstance } from "./CommandEmitter";
import { HandleAsync } from "@src/Utils";
import { InteractionRegistrerInstance } from "./InteractionRegisterer";
import { TriggerLoader } from "./TriggerLoader";
export class Client extends DiscordClient {
    public EventEmitter: EventEmitter
    public TriggerEmitter: EventEmitter
    constructor() {
        super({
            intents: ["DirectMessages", "Guilds", "GuildMembers", "GuildMessages", "MessageContent", "DirectMessages"],
            allowedMentions: { repliedUser: false },
            partials: [Partials.Message, Partials.Channel]
        })
        this.once("ready", this.OnStart)
        new CommandLoader()
        new TriggerLoader()
    }

    public async Start(token: string) {
        Logger.Info(`Starting Client`)
        await Connect()
        await super.login(token)
        Logger.Info(`Client Started`)
    }

    private async OnStart() {
        Logger.Info(`Loading Emojis`)
        await EmojiFactory.LoadAllEmojis(this)
        Logger.Info("Loading Interavtions")
        await this.LoadInteractions()
        Logger.Info(`Creating Event Emitter`)
        this.EventEmitter = new EventEmitter(this)
    }

    private async LoadInteractions() {
        InteractionRegistrerInstance.RegisterAll()
    }
}