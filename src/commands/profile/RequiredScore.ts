import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { UsernameArg } from "@src/utils/discord/help";
import { SlashCommandBuilder } from "discord.js";
import { CONTEXT_FULL, UsernameStringOption } from "@src/utils/discord/interaction";
import { TextRenderer } from "@src/class/renderer/Text";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { GetFlag, HandleAsync } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";

interface args {
    Rank: number
    Username: string
}

class RequiredScoreData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Rank: this.data.GetNumber("rank", [], null, true),
            Username: this.data.GetRemaining("username")
        }
    }
}

class RequiredScore extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["rrs", "required-score", "requiredscore", "requiredrankedscore", "rrankedscore", "rrscore", "rrankeds", "requiredrankeds", "requiredrscore"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: RequiredScoreData


    constructor(data: MessageEventData) {
        super()
        this.data = new RequiredScoreData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        const { Rank, Username: _username } = this.data.args
        const Username = _username ?? user.osu?.username

        if (!Username) {
            this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.USER_ERROR
        }

        const fetcher = await Fetcher.Create(user.id)

        const profilePromise = HandleAsync(fetcher.GetProfile({ Username, Gamemode: "osu" }))
        const rankPromise = HandleAsync(fetcher.ScoreRequiredForRank({ pos: Rank }))

        const [[profile, profileErr], [rank, rankError]] = await Promise.all([profilePromise, rankPromise])

        if (profileErr) {
            const embed = this.HandleProfileError(profileErr, Username)
            await this.data.Reply(embed)
            return CommandResponseCodes.USER_ERROR
        }

        if (rankError) {
            const embed = this.HandleProfileError(rankError, Username)
            await this.data.Reply(embed)
            return CommandResponseCodes.USER_ERROR
        }


        const description = TextRenderer.render("profile/required-ranked-score", {
            held_by: rank.username, held_by_url: rank.UserUrl,
            required_score: rank.score.toLocaleString("en-US"),
            missing_score: (rank.score - profile.statistics.ranked_score).toLocaleString("en-US")
        })

        const embed = this.GetBaseEmbed()
            .setDescription(description)
            .setAuthor({
                name: `Required Ranked Score for Rank #${Rank}`,
                url: profile.url,
                iconURL: GetFlag(profile.country.code)
            })
            .setThumbnail(profile.avatar_url)

        await this.data.Reply({
            embeds: [embed]
        })

        return CommandResponseCodes.OK
    }

}

RequiredScore.interactionData
    .setContexts(CONTEXT_FULL)
    .setName("required-score")
    .setDescription("Display required score for rank")
    .addNumberOption(opt =>
        opt
            .setName("rank")
            .setDescription("Rank to get requirements for")
            .setRequired(true)
    )
    .addStringOption(UsernameStringOption)

CommandEmitterInstance.AddCommand(RequiredScore, RequiredScore.names)
InteractionRegistrerInstance.AddInteraction(RequiredScore.interactionData)

RequiredScore.helpData
    .setCommand(RequiredScore.name)
    .setGroup(CommandGroup.Profile)
    .setDescription("Display required score for rank")
    .setUsage("rrs <rank> [username]")
    .setAliases(RequiredScore.names)
    .addArg(new CommandHelpArg()
        .setName("rank")
        .setDescription("Rank to get requirements for")
        .setUsage("1"))
    .addArg(UsernameArg);