import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { CommandHelp } from "@src/class/help/CommandHelp";
import { CommandHelpDataInstance } from "@src/class/help/CommandHelpData";

interface args {
    Command: string
}

class HelpData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Command: this.data.GetRemaining("command")
        }
    }
}

class Help extends CommandBase implements CommandAbstract {
    public static readonly name: string = "help"
    public static readonly names: string[] = [this.name]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: HelpData


    constructor(data: MessageEventData) {
        super()
        this.data = new HelpData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        const { Command } = this.data.args

        const embed = CommandHelpDataInstance.getHelp(Command).renderEmbed(this.GetBaseEmbed())

        this.data.Reply({
            embeds: [embed]
        })

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Help, Help.names)