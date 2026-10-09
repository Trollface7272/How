import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";

interface args {
}

class SimulateData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {}
    }
}

class Simulate extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["simulate", "sim"]
    public static readonly helpData = new CommandHelp()
    private data: SimulateData

    constructor(data: MessageEventData) {
        super()
        this.data = new SimulateData(data)
    }
    
    public async Handle(): Promise<CommandResponseCodes> {
        await this.data.Reply({
            content: "The simulate command is not yet implemented.",
            ephemeral: true
        })
        return CommandResponseCodes.USER_ERROR
    }
}

// Do not register this command until implemented
// CommandEmitterInstance.AddCommand(Simulate, Simulate.names)

Simulate.helpData
    .setCommand(Simulate.name)
    .setGroup(CommandGroup.Scores)
    .setDescription("Simulate score performance (not yet implemented)")
    .setUsage("simulate")
    .setAliases(Simulate.names)
    .setEnabled(false);

export default Simulate;
