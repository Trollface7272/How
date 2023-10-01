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
        const idxs = this.args.map((arg, index) => {
            const num = Number(arg)
            if (isNaN(num) || num > 100 || num < 1) return null
            return index
        }).filter(e => e !== null)

        const out = []
        for (const index of idxs) {
            const num = Number(this.args[index]) - 1
            out.push(num)
            this.args.slice(index, 1)
        }
        return out
    }
    public GetCommand(): string {
        return this.GetContent().split(" ")[0]
    }
    public GetUsername(): string {
        return this.args.join(" ")
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
            if (index === -1) return false
            this.args.splice(index, 1)
            return true
        }
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
        const prefix = "!"
        const content = data.GetContent().toLowerCase()

        if (!content.startsWith(prefix)) return 0

        const [command, ...args] = content.substring(prefix.length).split(" ")

        console.log(command)

        const commandData = CommandEmitterInstance.GetCommand(command)
        if (!commandData) return 0
        try {
            const command = new commandData(data)
            const code = await command.Handle()
            switch(code) {
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
