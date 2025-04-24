import { Event, EventData } from "@src/class/partials/Event";
import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Interaction, InteractionReplyOptions, InteractionResponse, InteractionType, Message, MessageEditOptions, ReplyOptions } from "discord.js";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { RawUser } from "@src/class/RawUser";
import { Client } from "@src/class/Client";
import { RawGuild } from "@src/class/RawGuild";
import { User } from "@src/class/database/User";
import { Guild } from "@src/class/database/Guild";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Logger } from "@src/class/Logger";
import { CommandResponseCodes } from "@src/class/partials/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { matchForId, searchEmbed, searchMessage } from "@src/class/api/osu/Utils";
import { Mods } from "@src/class/api/osu/class/Mods";
import { assert } from "console";
import context from "node-execution-context";
import { Context } from "@src/types/Context";
import { channelBeatmapCache } from "@src/utils/osu/cache";

export class InteractionCreateData implements EventData, MessageEventData {
    private _user: User
    private _guild: Guild

    public get user() {
        return this._user
    }
    public get guild() {
        return this._guild
    }
    public get channel() {
        return this.interaction.channel
    }


    constructor(
        private interaction: Interaction
    ) { }

    public GetMember(): GuildMember {
        if (!this.IsInGuild()) return null
        return this.interaction.member as GuildMember
    }

    public IsInGuild(): boolean {
        return this.interaction.inGuild()
    }
    public SendTyping(): Promise<void> {
        return
    }
    public React(emoji: string): Promise<null> {
        return null
    }
    public findString(match: RegExp | string): string {
        return null
    }

    public GetBeatmap(): number {
        return matchForId(this.GetString("beatmap"))
    }

    public async GetBeatmapFromConversation(): Promise<number> {
        const map = this.GetString("beatmap")
        if (map) {
            if (map.isNumber()) return parseInt(map)
            const id = matchForId(map)
            if (id) return id
        }

        const messages = await this.interaction.channel.messages.fetch({ limit: 32 })
        for (const msgData of messages) {
            const id = searchMessage(msgData[1])
            if (id) return id
        }

        return channelBeatmapCache.get(this.interaction.channel.id)
    }

    public GetMods(): Mods.ModList {
        return new Mods.ModList(this._GetMods("mods"))
    }

    private _GetMods(key: string) {
        return this.GetString(key)?.split(/.{1,2}/gmi).map(el => el.toUpperCase()) || []
    }

    public GetExactMods() {
        return {
            exactExclude: { mods: this._GetMods("mods-exact-exclude"), exact: true },
            exactInclude: { mods: this._GetMods("mods-exact-include"), exact: true },
            exclude: { mods: this._GetMods("mods-exclude"), exact: false },
            include: { mods: this._GetMods("mods-include"), exact: false }
        }
    }

    public GetGamemode(): Gamemode {
        return this.GetString("gamemode") as Gamemode ?? "osu"
    }

    public GetInteraction(): Interaction {
        return this.interaction
    }

    public GetInteractionType(): InteractionType {
        return this.interaction.type
    }

    public IsInteraction(): boolean {
        return true
    }

    public GetSpecific(): number[] {
        return this.GetString("index")?.split(",")?.map(e => Number(e) - 1) || []
    }

    public GetCommand(): string {
        if (this.interaction.isChatInputCommand()) {
            if (this.interaction.options.getSubcommand(false)) {
                return this.interaction.commandName + "-" + this.interaction.options.getSubcommand()
            }
            return this.interaction.commandName
        }

        if (this.interaction.isAnySelectMenu() || this.interaction.isButton())
            return this.interaction.customId.split(";")[0]
    }

    public GetRemaining(str: string = "username"): string {
        const name = this.GetString(str)

        if (!name && str === "username") {
            const ctx = context.get<Context>()
            return ctx.user?.osu?.username || null
        }

        if (name == "") return null
        return name
    }

    public GetString(key: string): string {
        if (!this.interaction.isChatInputCommand()) return null
        return this.interaction.options.getString(key)
    }

    public GetNumber(key: string, { }, def: number): number {
        if (!this.interaction.isChatInputCommand()) return null
        return this.interaction.options.getNumber(key) ?? def
    }

    public GetBoolean(key: string): boolean {
        if (!this.interaction.isChatInputCommand()) return null
        return this.interaction.options.getBoolean(key) ?? false
    }

    public async LoadDbData(): Promise<unknown> {
        const loading: Promise<unknown>[] = []

        this._user = new User(this.interaction.user)
        loading.push(this.user.LoadUser())

        this._guild = new Guild(this.interaction.guild)
        loading.push(this.guild.LoadGuild())


        return Promise.all(loading)
    }

    public GetClient(): Client {
        return this.interaction.client as Client
    }

    public GetRawUser(): RawUser {
        return new RawUser(this.interaction.user)
    }

    public GetRawGuild(): RawGuild {
        return new RawGuild(this.interaction.guild)
    }

    public async Reply(msg: ReplyOptions): Promise<Message<boolean> | InteractionResponse> {
        // @ts-ignore
        const embeds = msg.embeds! as EmbedBuilder[] ?? []
        for (const embed of embeds) {
            const id = searchEmbed(embed.data)
            if (id) channelBeatmapCache.set(this.interaction.channel.id, id)
        }
        if (this.interaction.isAnySelectMenu() || this.interaction.isButton()) {
            if (this.interaction.deferred) {
                return this.interaction.editReply(msg as MessageEditOptions)
            }
            return this.interaction.update(msg as MessageEditOptions)
        }
        if (this.interaction.isCommand()) {
            if (this.interaction.replied) return
            if (this.interaction.deferred) return this.interaction.editReply(msg as MessageEditOptions)
            return this.interaction.reply(msg as InteractionReplyOptions)
        }

    }

    public async defer() {
        if (this.interaction.isCommand()) {
            if (this.interaction.replied) return
            return this.interaction.deferReply()
        }
    }

    public async deferButton() {
        if (this.interaction.isMessageComponent()) {
            return this.interaction.deferUpdate()
        }
    }
}

export class InteractionCreate implements Event {
    public async Handle(data: InteractionCreateData): Promise<Event.ReturnCode> {
        await data.LoadDbData()

        if (data.GetRawUser().bot) return

        const command = data.GetCommand()

        Logger.Info(`Running interaction command ->`, command)

        const commandData = CommandEmitterInstance.GetCommand(command)
        if (!commandData) return 0

        return new Promise((resolve) => {
            context.run(async () => {
                try {
                    await Promise.all([data.deferButton(), data.defer()])
                    const command = new commandData(data)
                    const code = await command.Handle()
                    switch (code) {
                        case CommandResponseCodes.OK:
                            return resolve(Event.ReturnCode.OK)

                        default:
                            console.log("Unknown CommandResponseCode", code)
                            return resolve(code)
                            break;
                    }
                    resolve(0)
                } catch (err) {
                    Logger.Error(err)
                    Logger.Trace()
                }
            }, {
                command: commandData.name,
                user: data.user,
                guild: data.guild,
                channel: data.channel
            })

        })
    }

}
