import { DiscordAPIError, Client as DiscordClient, Routes } from "discord.js"
import { EventEmitter } from "./EventEmitter";
import { Logger } from "./Logger";
import { CommandLoader } from "./CommandLoader";
import { Connect } from "./database/Main";
import { EmojiFactory } from "./Emojis";
import { CommandEmitterInstance } from "./CommandEmitter";
import { HandleAsync } from "@src/Utils";
import { InteractionRegistrerInstance } from "./InteractionRegisterer";
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
        return
        const commandClasses = CommandEmitterInstance.GetAllCommands()
        const commands = commandClasses.map(cmd => cmd.interactionData).filter(cmd => cmd !== null)

        const route = process.env.NODE_ENV === "production" ? Routes.applicationCommands(this.application.id) : Routes.applicationGuildCommands(this.application.id, process.env.LOG_GUILD)
        const [, err] = await HandleAsync(this.rest.put(route, { body: commands }))
        if (err) {
            Logger.Error(`Failed to load commands: ${err}`, (err as DiscordAPIError))
        }
        Logger.Info(`Loaded ${commands.length} commands`)
        
    }
}