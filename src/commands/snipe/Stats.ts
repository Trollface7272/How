import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";
import { UsernameArg } from "@src/utils/discord/help";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { HandleAsync } from "@src/Utils";
import { TextRenderer } from "@src/class/renderer/Text";

interface args {
    Username: string
}

class SnipeStatsData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Username: this.data.GetRemaining()
        }
    }
}

class SnipeStats extends CommandBase implements CommandAbstract {
    public static readonly name: string = "daily-snipe-stats"
    public static readonly names: string[] = [this.name, "dss", "dailysnipestats"]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: SnipeStatsData


    constructor(data: MessageEventData) {
        super()
        this.data = new SnipeStatsData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Username } = this.data.args

        const fetcher = await Fetcher.Create(user.id)

        const [profile, profileError] = await HandleAsync(fetcher.GetProfile({ Username, Gamemode: "osu" }))
        if (profileError) {
            this.data.Reply(this.HandleProfileError(profileError, Username))
            return CommandResponseCodes.USER_ERROR
        }
        
        const from = new Date()
        from.setDate(from.getDate() - 1)
        const to = new Date()

        const gainPromise = HandleAsync(fetcher.SnipeGetScores({ name: profile.id, gains: true, country: profile.country_code, from: from, to: to }))
        const lossesPromise = HandleAsync(fetcher.SnipeGetScores({ name: profile.id, gains: false, country: profile.country_code, from: from, to: to }))

        const [gains, gainsError] = await gainPromise
        const [losses, lossesError] = await lossesPromise
        if (gainsError) {
            console.log(gainsError)
            this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.USER_ERROR
        }
        if (lossesError) {
            console.log(gainsError)
            this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.USER_ERROR
        }

        const total = (gains.length - losses.length).toString()
        
        const description = TextRenderer.render("snipe/stats", {
            gains: gains.length.toString().padStart(4, " "),
            losses: losses.length.toString().padStart(4, " "),
            total: (total).toString().padStart(4, " "),
        })

        const embed = this.GetBaseEmbed()
        embed.setDescription(description)
        embed.setTitle(`Daily Snipe Stats for ${profile.username}`)
        embed.setThumbnail(profile.avatar_url)

        this.data.Reply({ embeds: [embed] })


        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(SnipeStats, SnipeStats.names)

SnipeStats.helpData
    .setCommand(SnipeStats.name)
    .setGroup(CommandGroup.Snipe)
    .setDescription("Display daily snipe statistics for a user.")
    .setUsage("dss [username]")
    .setAliases(SnipeStats.names)
    .addArg(UsernameArg);