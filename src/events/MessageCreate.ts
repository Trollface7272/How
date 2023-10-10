import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Event, EventData } from "@src/class/partials/Event";
import { Interaction, InteractionType, Message, ReplyOptions } from "discord.js";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { RawUser } from "@src/class/RawUser";
import { Logger } from "@src/class/Logger";
import { Client } from "@src/class/Client";
import { User } from "@src/class/database/User";
import { Guild } from "@src/class/database/Guild";
import { CommandResponseCodes } from "@src/class/partials/Command";
import { Gamemode } from "@src/class/api/osu/MiscTypes";
import { GamemodeNumToStr } from "@src/class/api/osu/Consts";
import { matchForId, searchMessage } from "@src/class/api/osu/Utils";

export class MessageCreateData implements EventData, MessageEventData {
    private _user: User
    private _guild: Guild
    private args: string[]

    public get user() {
        return this._user
    }
    public get guild() {
        return this._guild
    }

    constructor(
        private message: Message
    ) {
        this.args = message.content.split(/('.*?'|".*?"|\S+)/).filter(e => e !== ' ' && e !== '')
        this.args.shift()
    }
    public async GetBeatmapFromConversation(): Promise<number> {
        if (this.message.mentions.repliedUser) {
            const id = searchMessage(await this.message.channel.messages.fetch(this.message.reference.messageId))
            if (id) return id
        }
        for (let i = 0; i < this.args.length; i++) {
            const el = this.args[i];
            const matches = matchForId(el)
            if (matches) {
                this.args.slice(i, 1)
                return matches
            }
            if (el.isNumber()) {
                this.args.slice(i, 1)
                return parseInt(el)
            }
        }
        const messages = await this.message.channel.messages.fetch({ limit: 32, before: this.message.id })
        for (const msgData of messages) {
            const id = searchMessage(msgData[1])
            if (id) return id
        }
    }

    public GetMods(): string[] {
        const regex = /^\+?(NF|EZ|TD|HD|HR|SD|DT|RX|HT|NC|FL|AU|SO|AP|PF|4K|5K|6K|7K|8K|FI|RD|CN|TP|9K|KC|1K|3K|2K|V2|MR)+$/gi
        for (let arg of this.args) {
            if (regex.test(arg)) {
                if (arg.startsWith("+")) arg = arg.substring(1)
                const mods = arg.toUpperCase().split(/.{1,2}/g)
                this.args.splice(this.args.indexOf(arg), 1)
                return mods
            }
        }
    }

    public GetGamemode(): Gamemode {
        let Gamemode = this.GetString("gamemode", ["m", "mode", "-m", "-mode"]) as Gamemode ?? "osu"
        if (!isNaN(Number(Gamemode)))
            Gamemode = GamemodeNumToStr[Number(Gamemode)] ?? "osu"
        return Gamemode
    }

    public GetInteraction(): Interaction {
        throw null
    }

    public GetInteractionType(): InteractionType {
        return null
    }

    public IsInteraction(): boolean {
        return false
    }

    public GetSpecific(): number[] {
        const regex = /^[1-9][0-9]?$|^100$/
        const idxs = this.args.map((arg, index) => {
            if (regex.test(arg))
                return index
            return null
        }).filter(e => e !== null)

        const out = []
        for (const index of idxs) {
            const num = Number(this.args[index]) - 1
            out.push(num)
            this.args.splice(index, 1)
        }
        return out
    }
    public GetCommand(): string {
        return this.GetContent().split(" ")[0]
    }
    public GetUsername(): string {
        if (this.args.length == 0) return null
        const username = this.args.join(" ")
        if (username == "") return null
        return username
    }

    public GetString(key: string, aliases: string[]): string {
        aliases.push(key)
        for (const alias of aliases) {
            const index = this.args.findIndex((arg) => arg === alias)
            if (index === -1) return null
            const val = this.args[index + 1]
            if (val == null) return null
            this.args.splice(index, 2)
            return val
        }
    }

    public GetNumber(key: string, aliases: string[]): number {
        aliases.push(key)
        for (const alias of aliases) {
            const index = this.args.findIndex((arg) => arg === alias)
            if (index === -1) return null
            const val = Number(this.args[index + 1])
            if (isNaN(val) || val == null) return null
            this.args.splice(index, 2)
            return val
        }
    }

    public GetBoolean(key: string, aliases: string[]): boolean {
        aliases.push(key)
        for (const alias of aliases) {
            const index = this.args.findIndex((arg) => arg === alias)
            if (index === -1) continue
            this.args.splice(index, 1)
            return true
        }
        return false
    }

    public async LoadDbData(): Promise<unknown> {
        const loading: Promise<unknown>[] = []

        this._user = new User(this.message.author)
        loading.push(this._user.LoadUser())

        this._guild = new Guild(this.message.guild)
        loading.push(this._guild.LoadGuild())


        return Promise.all(loading)
    }

    public GetClient(): Client {
        return this.message.client as Client
    }

    public GetRawUser() {
        return new RawUser(this.message.author)
    }

    public GetContent() {
        return this.message.content
    }

    public async Reply(msg: ReplyOptions): Promise<Message<boolean>> {
        return await this.message.reply(msg)
    }
}

export class MessageCreate implements Event {
    public async Handle(data: MessageCreateData): Promise<Event.ReturnCode> {
        if (data.GetRawUser().bot) return
        await data.LoadDbData()
        const prefix = data.guild.prefix ?? "!"
        const content = data.GetContent().toLowerCase()

        if (!content.startsWith(prefix)) return 0

        const [command, ...args] = content.substring(prefix.length).split(" ")

        Logger.Info(`Running command ->`, command)

        const commandData = CommandEmitterInstance.GetCommand(command)
        if (!commandData) return 0
        try {
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

        return 0
    }

}
