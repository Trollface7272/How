import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";

interface args {

}

class CommandNameData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {}
    }
}

class CommandName extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = [""]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    private data: CommandNameData


    constructor(data: MessageEventData) {
        super()
        this.data = new CommandNameData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        return CommandResponseCodes.OK
    }

}

//CommandEmitterInstance.AddCommand(CommandName, CommandName.names)