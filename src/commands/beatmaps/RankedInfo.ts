import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { HandleAsync } from "@src/Utils";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";

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

        let query = `ranked=${Year}-${Month}`

        if (Day) {
            query += `-${Day}`
        }

        const [search, search_err] = await HandleAsync(fetcher.SearchBeatmaps({
            gamemode: Gamemode,
            type: null,
            query: query
        }))

        const info = search.beatmapsets.map(set => {
            return set.beatmaps.map(map => {
                return {
                    length: map.Length,
                    drain: map.hit_length
                }
            }).reduce((prev, cur) => {
                prev.drain += cur.drain
                prev.length += cur.length
                return prev
            })
        }).reduce((prev, cur) => {
            prev.drain += cur.drain
            prev.length += cur.length
            return prev
        })

        

        console.log(info, {
            a: Math.floor(info.drain / 60 / 60) + ":" + Math.floor(info.drain / 60) % 60 + ":" + info.drain % 60,
            b: Math.floor(info.length / 60 / 60) + ":" + Math.floor(info.length / 60) % 60 + ":" + info.length % 60
        })
        

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(RankedInfo, RankedInfo.names)