import { Event, EventData } from "@src/class/partials/Event";
import { ChatInputCommandInteraction, CommandInteraction, Interaction, InteractionReplyOptions, InteractionResponse, Message, MessageEditOptions, MessageInteraction, ReplyOptions } from "discord.js";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { RawUser } from "@src/class/RawUser";
import { Client } from "@src/class/Client";
import { RawGuild } from "@src/class/RawGuild";
import { User } from "@src/class/database/User";
import { Guild } from "@src/class/database/Guild";

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
    ) {}
    public GetSpecific(): number[] {
        return this.GetString("specific").split(",").map(e => Number(e))
    }
    public GetCommand(): string {
        return (this.interaction as ChatInputCommandInteraction).commandName
    }

    public GetUsername(): string {
        return this.GetString("username")
    }

    public GetString(key: string): string {
        return (this.interaction as ChatInputCommandInteraction).options.getString(key)
    }

    public GetNumber(key: string): number {
        return (this.interaction as ChatInputCommandInteraction).options.getNumber(key)
    }

    public GetBoolean(key: string): boolean {
        return (this.interaction as ChatInputCommandInteraction).options.getBoolean(key)
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

    public async Reply(msg: ReplyOptions): Promise<Message<boolean>|InteractionResponse> {
        if (this.interaction.isAnySelectMenu() || this.interaction.isButton())
            return this.interaction.message.edit(msg as MessageEditOptions)
        if (this.interaction.isCommand()) {
            if (this.interaction.replied) return
            return this.interaction.reply(msg as InteractionReplyOptions)
        }
        
    }
}

export class InteractionCreate implements Event {
    public async Handle(data: InteractionCreateData): Promise<Event.ReturnCode> {
        const loading = data.LoadDbData()


        await loading
        return Event.ReturnCode.Unimplemented
    }
    
}
