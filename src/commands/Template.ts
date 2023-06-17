import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";

interface args {

}

class CommandNameData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    public GetComandArgs(): args {
        return {}
    }
}

class CommandName implements CommandAbstract {
    public static readonly names: string[] = [""]
    private data: CommandNameData

    constructor(data: MessageEventData) {
        this.data = new CommandNameData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {

        return CommandResponseCodes.OK
    }

}

//CommandEmitterInstance.AddCommand(CommandName, CommandName.names)