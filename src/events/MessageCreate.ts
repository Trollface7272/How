import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Event, EventData } from "@src/class/partials/Event";
import { GuildMember, Interaction, InteractionType, Message, MessageReaction, ReplyOptions } from "discord.js";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { RawUser } from "@src/class/RawUser";
import { Logger } from "@src/class/Logger";
import { Client } from "@src/class/Client";
import { User } from "@src/class/database/User";
import { Guild } from "@src/class/database/Guild";
import { CommandResponseCodes } from "@src/class/partials/Command";
import { Gamemode, ParsedMods } from "@src/class/api/osu/types/MiscTypes";
import { GamemodeNumToStr } from "@src/class/api/osu/Consts";
import { matchForId, searchMessage } from "@src/class/api/osu/Utils";
import { Score } from "@src/class/api/osu/class/Score";
import { TriggerEmitterInstance } from "@src/class/TriggerEmitter";
import { Mods } from "@src/class/api/osu/class/Mods";
import context from "node-execution-context";
import { Context } from "@src/types/Context";

const regexes = {
    normal: /^\+?(NF|EZ|TD|HD|HR|SD|DT|RX|HT|NC|FL|AU|SO|AP|PF|4K|5K|6K|7K|8K|FI|RD|CN|TP|9K|KC|1K|3K|2K|V2|MR)+$/gi,
    include: /^\+(NF|EZ|TD|HD|HR|SD|DT|RX|HT|NC|FL|AU|SO|AP|PF|4K|5K|6K|7K|8K|FI|RD|CN|TP|9K|KC|1K|3K|2K|V2|MR)+$/gi,
    exactInclude: /^\+(NF|EZ|TD|HD|HR|SD|DT|RX|HT|NC|FL|AU|SO|AP|PF|4K|5K|6K|7K|8K|FI|RD|CN|TP|9K|KC|1K|3K|2K|V2|MR)+!$/gi,
    exclude: /^\-(NF|EZ|TD|HD|HR|SD|DT|RX|HT|NC|FL|AU|SO|AP|PF|4K|5K|6K|7K|8K|FI|RD|CN|TP|9K|KC|1K|3K|2K|V2|MR)+$/gi,
    exactExclude: /^\-(NF|EZ|TD|HD|HR|SD|DT|RX|HT|NC|FL|AU|SO|AP|PF|4K|5K|6K|7K|8K|FI|RD|CN|TP|9K|KC|1K|3K|2K|V2|MR)+!$/gi,
}
export class MessageCreateData implements EventData, MessageEventData {
    private _user: User
    private _guild: Guild
    private args: string[]
    private command: string

    public get user() {
        return this._user
    }
    public get guild() {
        return this._guild
    }

    constructor(
        private message: Message
    ) {
        this.args = Array.from(message.content.replace(/🤓/, "pristine").matchAll(/(?:[^\s"]+|"[^"]*")+/g)).flat().filter(e => e !== ' ' && e !== '').map(el => el.replaceAll('\"', ""))
        this.args.shift()
    }
    public GetMember(): GuildMember {
        if (!this.IsInGuild()) return null
        return this.message.member
    }
    public IsInGuild(): boolean {
        return this.message.inGuild()
    }
    public async SendTyping(): Promise<void> {
        try {
            if (this.message.channel.isTextBased() && 'sendTyping' in this.message.channel)
                return await this.message.channel.sendTyping();
        } catch (err) {
            console.error("Error sending typing", err);
        }
    }
    public async React(emoji: string): Promise<MessageReaction> {
        return this.message.react(emoji)
    }
    public findString(match: RegExp | string): string {
        for (let i = 0; i < this.args.length; i++) {
            const el = this.args[i];
            if (typeof match === "string") {
                if (el === match) {
                    this.args.splice(i, 1)
                    return el
                }
            } else {
                if (match.test(el)) {
                    this.args.splice(i, 1)
                    return el
                }
            }
        }
        return null
    }

    public GetBeatmap(): number {
        for (let i = 0; i < this.args.length; i++) {
            const el = this.args[i];
            const matches = matchForId(el)
            if (matches) {
                this.args.slice(i, 1)
                return matches
            }
        }
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

    public GetMods(): Mods.ModList {
        const regex = regexes.normal
        for (let arg of this.args) {
            if (regex.test(arg)) {
                if (arg.startsWith("+")) arg = arg.substring(1)
                const mods = arg.toUpperCase().match(/.{1,2}/g)
                this.args.splice(this.args.indexOf(arg), 1)
                return new Mods.ModList(mods)
            }
        }
        return new Mods.ModList([])
    }

    public GetExactMods() {
        const mods = {}
        const removeIdx: number[] = []
        for (const key in regexes) {
            const regex = new RegExp(regexes[key])
            for (let arg of this.args) {
                if (regex.test(arg)) {
                    let exact = false
                    arg = arg.substring(1)
                    if (arg.endsWith("!")) {
                        exact = true
                        arg = arg.substring(0, arg.length - 1)
                    }
                    const modsArr = arg.toUpperCase().match(/.{1,2}/g)
                    removeIdx.push(this.args.indexOf(arg))
                    mods[key] = { mods: modsArr, exact }
                }
            }
        }
        removeIdx.sort((a, b) => b - a)
        for (const idx of removeIdx) {
            this.args.splice(idx, 1)
        }
        return mods as ParsedMods
    }

    public GetGamemode(): Gamemode {
        let Gamemode = this.GetString("gamemode", ["-gamemode", "m", "mode", "-m", "-mode"]) as Gamemode ?? "osu"
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
        const regex = /^[1]?[0-9][0-9]?$|^100|200$/
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
        return this.command
    }
    public GetRemaining(str: string= "username"): string {
        const username = this.args.join(" ")
        
        if (!username && str === "username") {
            const ctx = context.get<Context>()
            return ctx.user?.osu?.username || null
        }

        if (this.args.length == 0) return null

        if (username == "") return null
        return username
    }

    public GetString(key: string, aliases: string[]): string {
        aliases.push(key)
        for (const alias of aliases) {
            const index = this.args.findIndex((arg) => arg === alias)
            if (index === -1) continue
            const val = this.args[index + 1]
            if (val == null) continue
            this.args.splice(index, 2)
            return val
        }
    }

    public GetNumber(key: string, aliases: string[], def?: number, match_any?: boolean): number {
        aliases.push(key)
        for (const alias of aliases) {
            const index = this.args.findIndex((arg) => arg === alias)
            if (index === -1) continue
            const val = Number(this.args[index + 1])
            if (isNaN(val) || val == null) continue
            this.args.splice(index, 2)
            return val
        }

        if (match_any) {
            const idx = this.args.findIndex(el => el.isNumber())
            return parseInt(this.args.splice(idx, 1)[0])
        }

        return def
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

    public setCommand(cmd: string) {
        this.command = cmd
    }
}

export class MessageCreate implements Event {
    public async Handle(data: MessageCreateData): Promise<Event.ReturnCode> {
        this.RunTriggers(data)
        if (data.GetRawUser().bot) return
        await data.LoadDbData()
        let prefix = process.env.PREFIX_FORCE ?? data.guild.prefix ?? "!"
        const content = data.GetContent().toLowerCase()

        if (!content.startsWith(prefix)) {
            //forced prefix == dev
            if (process.env.PREFIX_FORCE) return 0
            const prefixes = [...data.user.prefixes, ...data.guild.prefixes]
            prefix = prefixes.find(prefix => content.startsWith(prefix))
            if (!prefix) return 0
        }

        const [command, ...args] = content.substring(prefix.length).split(" ")

        data.setCommand(command)

        Logger.Info(`Running command ->`, command)

        const commandData = CommandEmitterInstance.GetCommand(command)
        if (!commandData) return 0


        return new Promise((resolve) => {
            context.run(async () => {
                try {
                    const command = new commandData(data)
                    await data.SendTyping()
                    
                    const code = await command.Handle()
                    switch (code) {
                        case CommandResponseCodes.OK:
                            return resolve(Event.ReturnCode.OK)
                        default:
                            console.log("Unknown CommandResponseCode", code)
                            break;
                    }
                } catch (err) {
                    Logger.Error(err)
                    Logger.Trace()
                }
                resolve(0)
            }, {
                command: command
            })
        })
    }

    private RunTriggers(data: MessageCreateData) {
        const content = data.GetContent().toLowerCase()
        const triggers = TriggerEmitterInstance.GetAllTriggers()
        for (const trigger of triggers) {
            for (const match of trigger.trigger) {
                if (typeof match === "string") {
                    if (content.includes(match)) {
                        new trigger(data).Handle()
                    }
                } else {
                    if (match.test(content)) {
                        new trigger(data).Handle()
                    }
                }
            }
        }

    }
}
