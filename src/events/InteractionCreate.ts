import { Event, EventData } from "@src/class/partials/Event";
import { Interaction, InteractionReplyOptions, InteractionResponse, InteractionType, Message, MessageEditOptions, ReplyOptions } from "discord.js";
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
import { matchForId, searchMessage } from "@src/class/api/osu/Utils";
import { Score } from "@src/class/api/osu/class/Score";

export class InteractionCreateData implements EventData, MessageEventData {
    private _user: User
    private _guild: Guild

    public get user() {
        return this._user
    }
    public get guild() {
        return this._guild
    }

    constructor(
        private interaction: Interaction
    ) { }

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
    }

    public GetMods(): Score.ModList {
        return new Score.ModList(this._GetMods("mods"))
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
        return this.GetString("gamemode") as Gamemode
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
        return this.GetString("specific")?.split(",")?.map(e => Number(e) - 1) || []
    }

    public GetCommand(): string {
        if (this.interaction.isChatInputCommand())
            return this.interaction.commandName
        if (this.interaction.isAnySelectMenu() || this.interaction.isButton())
            return this.interaction.customId.split(";")[0]
    }

    public GetUsername(): string {
        const name = this.GetString("username")
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
        if (this.interaction.isAnySelectMenu() || this.interaction.isButton()) {
            if (this.interaction.deferred) {
                return this.interaction.editReply(msg as MessageEditOptions)
            }
            return this.interaction.update(msg as MessageEditOptions)
        }
        if (this.interaction.isCommand()) {
            if (this.interaction.replied) return
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

        const command = data.GetCommand()

        Logger.Info(`Running interaction command ->`, command)

        const commandData = CommandEmitterInstance.GetCommand(command)
        if (!commandData) return 0
        try {
            data.deferButton()
            const command = new commandData(data)
            const code = await command.Handle()
            switch (code) {
                case CommandResponseCodes.OK:
                    return Event.ReturnCode.OK
                default:
                    console.log("Unknown CommandResponseCode", code)
                    break;
            }
        } catch (err) {
            Logger.Error(err)
            Logger.Trace()
        }


        return Event.ReturnCode.Unimplemented
    }

}
