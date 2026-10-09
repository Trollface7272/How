import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { GamemodeArg } from "@src/utils/discord/help";
import { SlashCommandBuilder } from "discord.js";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { convertSeconds, HandleAsync } from "@src/Utils";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { BeatmapSetFactory } from "@src/class/database/BeatmapSet";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";

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
    public static readonly helpData = new CommandHelp()
    private data: RankedInfoData


    constructor(data: MessageEventData) {
        super()
        this.data = new RankedInfoData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        await this.data.Reply({
            content: "This command is not yet implemented.",
            ephemeral: true
        })
        return CommandResponseCodes.USER_ERROR
        
        // TODO: Complete implementation
        // const user = this.data.GetUser()
        // const { Day, Month, Year, Gamemode } = this.data.args
        // const fetcher = await Fetcher.Create(user.id)
        // const start = new Date(Year, Month, 1)
        // const end = new Date(Year, Month + 1, 0)
        // if (Day) {
        //     start.setDate(Day)
        //     end.setDate(Day)
        // }
        // const [sets, sets_err] = await HandleAsync(BeatmapSetFactory.GetByRange(start, end))
        // if (sets_err) {
        //     Logger.Error("RankedInfo error:", sets_err)
        //     await this.data.Reply(this.RenderApiError())
        //     return CommandResponseCodes.ERROR
        // }
        // ... process and render results
    }

}

CommandEmitterInstance.AddCommand(RankedInfo, RankedInfo.names)

RankedInfo.helpData
    .setCommand(RankedInfo.name)
    .setGroup(CommandGroup.Beatmaps)
    .setDescription("Display ranked beatmap information for a given month/day.")
    .setUsage("ri [year] [month] [day] [gamemode]")
    .setAliases(RankedInfo.names)
    .addArg(new CommandHelpArg()
        .setName("year")
        .setDescription("The year (e.g., 2023)")
        .setUsage("2023"))
    .addArg(new CommandHelpArg()
        .setName("month")
        .setDescription("The month (1-12)")
        .setUsage("7"))
    .addArg(new CommandHelpArg()
        .setName("day")
        .setDescription("The day (1-31)")
        .setUsage("15"))
    .addArg(GamemodeArg)
    .setEnabled(false)

export default RankedInfo;
