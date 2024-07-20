import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Client } from "@src/class/Client";
import { OAuth2Scopes } from "discord.js";

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

CommandEmitterInstance.AddCommand(Invite, Invite.names)