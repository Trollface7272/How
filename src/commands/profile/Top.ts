import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/MiscTypes";
import { GamemodeNames } from "@src/class/api/osu/Consts";

interface args {
    Mode: Gamemode
}

class TopData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        let Mode = this.GetModeFromCommand()
        
        return {}
    }

    private GetModeFromCommand() {
        switch (this.data.GetCommand()) {
            case "osutop":
            case "top":
                return GamemodeNames.osu

            case "maniatop":
                return GamemodeNames.mania

            case "fruitstop":
            case "ctbtop":
                return GamemodeNames.fruits

            case "taikotop":
                return GamemodeNames.taiko

            default:
                return GamemodeNames.osu
        }
    }
}

class Top extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["top", "osutop", "maniatop", "taikotop", "ctbtop", "fruitstop"]
    private data: TopData


    constructor(data: MessageEventData) {
        super()
        this.data = new TopData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Top, Top.names)