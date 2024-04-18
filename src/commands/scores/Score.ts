import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";


type SortType = "ar" | "od" | "cs" | "hp" | "pp" | "bpm" | "score"
    | "rar" | "rod" | "rcs" | "rhp" | "rpp" | "rbpm" | "rscore"

interface args {
    Id?: number
    Username?: string
    Gamemode: Gamemode
    GreaterThan?: number
    Reversed: boolean
    Random: boolean
    Page: number
    Sort: SortType[]
    Filter: string[]
    Mods: string,
    Anyone: boolean
}

class ScoreData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const sorts = this.data.GetString("sort", ["s", "-s"])
        const filters = this.data.GetString("filter", ["f", "-f", "-filter"])
        let sortArr: SortType[] = []
        let filterArr: string[] = []
        if (sorts != "") {
            sortArr = sorts.split(" ") as SortType[]
        }
        if (filters != "") {
            filterArr = filters.split(" ")
        }
        return {
            Sort: sortArr,
            Gamemode: this.data.GetGamemode(),
            Reversed: this.data.GetBoolean("reversed", ["rev", "-rev"]),
            Random: this.data.GetBoolean("random", ["rand", "-rand"]),
            Page: this.data.GetNumber("page", ["p", "-p", "-page"], 1),
            Filter: filterArr,
            Mods: this.data.GetString("mods", ["m", "-m", "-mods"]),
            Anyone: this.data.GetBoolean("anyone", ["any", "-any", "-anyone"]),
            Id: this.data.GetNumber("id", ["i", "-i", "-id"]),
            Username: this.data.GetUsername(),
        }
    }
}

class Score extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["sc", "score", "scores"]
    private data: ScoreData


    constructor(data: MessageEventData) {
        super()
        this.data = new ScoreData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Score, Score.names)