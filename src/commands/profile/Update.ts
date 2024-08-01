import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";

interface args {

}

class UpdateData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {}
    }
}

class Update extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = [""]
    private data: UpdateData


    constructor(data: MessageEventData) {
        super()
        this.data = new UpdateData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Update, Update.names)