import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";

interface args {
    Gamemode?: 0 | 1 | 2 | 3
    Specific?: number[]
    Page?: number
    Name?: string
    Id?: number
    Best?: boolean
    Fails?: boolean
    List?: boolean
    Count?: boolean
    Map?: boolean
    Scores?: Score.Recent[]
    OD?: number
}

class RecentData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    public GetComandArgs(): args {
        return {}
    }
}

class Recent implements CommandAbstract {
    public static readonly names: string[] = ["recent", "r", "rs", "recents", "recentscores", "recentscore"]
    private data: RecentData

    constructor(data: MessageEventData) {
        this.data = new RecentData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const client = this.data.GetClient()
        const user = this.data.GetUser()


        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Recent, Recent.names)