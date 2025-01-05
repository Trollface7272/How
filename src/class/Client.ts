import { Client as DiscordClient, Partials } from "discord.js"
import { EventEmitter } from "./EventEmitter";
import { Logger } from "./Logger";
import { CommandLoader } from "./CommandLoader";
import { Connect } from "./database/Main";
import { EmojiFactory } from "./Emojis";
import { InteractionRegistrerInstance } from "./InteractionRegisterer";
import { TriggerLoader } from "./TriggerLoader";
import { BeatmapTrackingLoop } from "@src/tracking/Beatmaps";

export class Client extends DiscordClient {
    public EventEmitter: EventEmitter
    public TriggerEmitter: EventEmitter
    public BeatmapTrackingLoop: NodeJS.Timeout
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
        Logger.Info(`Creating Beatmap Tracking Loop`)
        this.BeatmapTrackingLoop = setInterval(BeatmapTrackingLoop.bind(this), 1000 * 60 * 5)
        BeatmapTrackingLoop(this)
    }

    private async LoadInteractions() {
        InteractionRegistrerInstance.RegisterAll()
    }
}