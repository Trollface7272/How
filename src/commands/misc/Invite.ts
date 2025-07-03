import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandHelp } from "@src/class/help/CommandHelp";

import { Client } from "@src/class/Client";
import { OAuth2Scopes, SlashCommandBuilder } from "discord.js";
import { CONTEXT_FULL } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";

interface args {
    Client: Client
}

class InviteData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Client: this.data.GetClient()
        }
    }
}

class Invite extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["invite", "inv"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: InviteData


    constructor(data: MessageEventData) {
        super()
        this.data = new InviteData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const {Client} = this.data.args
        const invite = Client.generateInvite({
            scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
        })
        await this.data.Reply({content: `${invite}`})
        return CommandResponseCodes.OK
    }

}

Invite.interactionData
    .setContexts(CONTEXT_FULL)
    .setName("invite")
    .setDescription("Get invite link for the bot")


CommandEmitterInstance.AddCommand(Invite, Invite.names)
InteractionRegistrerInstance.AddInteraction(Invite.interactionData)

Invite.helpData
    .setCommand(Invite.name)
    .setDescription("Get invite link for the bot")
    .setUsage("invite")
    .setAliases(Invite.names);