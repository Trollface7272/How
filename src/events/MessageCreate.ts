import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Event, EventData } from "@src/class/partials/Event";
import { Message, ReplyOptions } from "discord.js";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { RawUser } from "@src/class/RawUser";
import { Logger } from "@src/class/Logger";
import { Client } from "@src/class/Client";
import { User } from "@src/class/database/User";
import { Guild } from "@src/class/database/Guild";

export class MessageCreateData implements EventData, MessageEventData {
    private _user: User
    private _guild: Guild
    public get user() {
        return this._user
    }
    public get guild() {
        return this._guild
    }
    constructor(
        private message: Message
    ) {}
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
            command.Handle()
        } catch (err) {
            Logger.Error(err)
            Logger.Trace()
        }

        return 0
    }
    
}
