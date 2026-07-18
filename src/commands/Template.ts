import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";

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
    public static readonly name: string = "command-name"
    public static readonly names: string[] = [this.name]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
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

// Configure help before or after AddCommand — CommandLoader registers all help after load.
CommandName.helpData
    .setCommand(CommandName.name)
    .setAliases(CommandName.names.filter(el => el !== CommandName.name))
    .setDescription("Short description shown by the help command.")
    .setUsage("command-name [options]")
    .setGroup(CommandGroup.Misc)
    .addArg(new CommandHelpArg()
        .setName("example")
        .setDescription("Example argument")
        .setUsage("-example value"))

// Use helpData = null for internal handlers that should not appear in help.

//CommandEmitterInstance.AddCommand(CommandName, CommandName.names)
