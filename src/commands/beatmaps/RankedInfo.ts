import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { convertSeconds, HandleAsync } from "@src/Utils";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { BeatmapSetFactory } from "@src/class/database/BeatmapSet";

interface args {
    Month: number
    Year: number
    Day: number
    Gamemode: Gamemode
}

class RankedInfoData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Year: this.data.GetNumber("year", ["-year", "-y", "y"], new Date().getFullYear()),
            Month: this.data.GetNumber("month", ["-month", "-m", "m"], new Date().getMonth()),
            Day: this.data.GetNumber("day", ["-day", "-d", "d"], null),
            Gamemode: this.data.GetGamemode()
        }
    }
}

class RankedInfo extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["rankedinfo", "ri"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    private data: RankedInfoData


    constructor(data: MessageEventData) {
        super()
        this.data = new RankedInfoData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        const { Day, Month, Year, Gamemode } = this.data.args

        const fetcher = await Fetcher.Create(user.id)

        const start = new Date(Year, Month, 1)
        const end = new Date(Year, Month + 1, 0)

        if (Day) {
            start.setDate(Day)
            end.setDate(Day)
        }

        const [sets, sets_err] = await HandleAsync(BeatmapSetFactory.GetByRange(start, end))

        const info = {
            drain: [],
            length: [],
        }

        for (const set of sets) {
            for (const map of set.beatmaps) {
                info.drain.push(map.hit_length)
                info.length.push(map.total_length)
            }
        }






        

        console.log(info, {
            a: convertSeconds(info.drain.sum()),
            b: convertSeconds(info.length.sum())
        })
        

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(RankedInfo, RankedInfo.names)