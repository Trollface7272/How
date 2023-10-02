import { Event, EventData } from "@src/class/partials/Event";
import { AnySelectMenuInteraction, ChatInputCommandInteraction, CommandInteraction, Interaction, InteractionReplyOptions, InteractionResponse, InteractionType, Message, MessageEditOptions, MessageInteraction, ReplyOptions } from "discord.js";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { RawUser } from "@src/class/RawUser";
import { Client } from "@src/class/Client";
import { RawGuild } from "@src/class/RawGuild";
import { User } from "@src/class/database/User";
import { Guild } from "@src/class/database/Guild";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Logger } from "@src/class/Logger";
import { CommandResponseCodes } from "@src/class/partials/Command";

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
        return this.GetString("specific").split(",").map(e => Number(e) - 1)
    }

    public GetCommand(): string {
        if (this.interaction.isChatInputCommand())
            return this.interaction.command.name
        if (this.interaction.isAnySelectMenu() || this.interaction.isButton())
            return this.interaction.customId.split(";")[0]
    }

    public GetUsername(): string {
        return this.GetString("username")
    }

    public GetString(key: string): string {
        if (!this.interaction.isChatInputCommand()) return null
        return this.interaction.options.getString(key)
    }

    public GetNumber(key: string): number {
        if (!this.interaction.isChatInputCommand()) return null
        return this.interaction.options.getNumber(key)
    }

    public GetBoolean(key: string): boolean {
        if (!this.interaction.isChatInputCommand()) return null
        return this.interaction.options.getBoolean(key)
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
        if (this.interaction.isAnySelectMenu() || this.interaction.isButton())
            return this.interaction.update(msg as MessageEditOptions)
        if (this.interaction.isCommand()) {
            if (this.interaction.replied) return
            return this.interaction.reply(msg as InteractionReplyOptions)
        }

    }
}

export class InteractionCreate implements Event {
    public async Handle(data: InteractionCreateData): Promise<Event.ReturnCode> {
        await data.LoadDbData()

        const command = data.GetCommand()

        console.log(command)

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


        return Event.ReturnCode.Unimplemented
    }

}
