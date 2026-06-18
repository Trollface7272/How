import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { Logger } from "@src/class/Logger";
import { SlashCommandBuilder } from "discord.js";
import { CONTEXT_FULL, CountryStringOption, PageNumberOption, UsernameStringOption } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";
import { PageArg } from "@src/utils/discord/help";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";
import { CommandHelp } from "@src/class/help/CommandHelp";

interface args {
    List: boolean
    Page: number
    Search: string
}

class DailyChallengeData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const command = this.data.GetCommand()
        let List = this.data.GetBoolean("list", ["-list", "l", "-l"])

        if (command === "dcl") {
            List = true
        }

        return {
            List,
            Page: 0,
            Search: this.data.GetRemaining() ?? ""
        }
    }
}

class DailyChallenge extends CommandBase implements CommandAbstract {
    public static readonly name: string = "daily-challenge"
    public static readonly names: string[] = [this.name, "dailychallenge", "dc", "dcl"]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: DailyChallengeData


    constructor(data: MessageEventData) {
        super()
        this.data = new DailyChallengeData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { List, Page, Search } = this.data.args
        const PER_PAGE = List ? 10 : 1

        const challenges = await DailyChallengeFactory.GetDailyChallenges({
            fetchedScores: true
        }, PER_PAGE, Page * PER_PAGE, { ends_at: 1 })

        if (!challenges) {
            this.data.Reply(this.RenderApiError())
            Logger.Error(challenges)
            return CommandResponseCodes.ERROR
        }

        const embed = this.GetBaseEmbed()

        if (List) {

        } else {
            const challenge = challenges[0]
        }


        console.log(challenges)

        return CommandResponseCodes.OK
    }

}

DailyChallenge.helpData
    .setCommand(DailyChallenge.name)
    .setDescription("Display daily challenge information.")
    .setUsage("daily-challenge [list] [page] [search]")
    .setAliases(DailyChallenge.names)
    .addArg(new CommandHelpArg()
        .setName("list")
        .setDescription("List all daily challenges")
        .setUsage("-list"))
    .addArg(PageArg)
    .addArg(new CommandHelpArg()
        .setName("search")
        .setDescription("Search for a specific daily challenge")
        .setUsage("challenge name"));

DailyChallenge.interactionData
    .setName("daily-challenge")
    .setDescription("Dailychallange")
    .setContexts(CONTEXT_FULL)
    .addSubcommand(sub =>
        sub
            .setName("leaderboards")
            .setDescription("Display daily challenge leaderboards")
            .addStringOption(CountryStringOption)
            .addBooleanOption(opt =>
                opt
                    .setName("friends")
                    .setDescription("Only show scores by friends")
                    .setRequired(false)
            )
            .addNumberOption(PageNumberOption)
    )
    .addSubcommand(sub =>
        sub
            .setName("profile")
            .setDescription("Display user daily challenge profile")
            .addStringOption(UsernameStringOption)
    )
    .addSubcommand(sub =>
        sub
            .setName("thresholds")
            .setDescription("Display daily challenge placement thresholds")

    )
    .addSubcommand(sub =>
        sub
            .setName("top-players")
            .setDescription("Display daily challenge top players leaderboards")
            .addStringOption(CountryStringOption)
            .addBooleanOption(opt =>
                opt
                    .setName("today")
                    .setDescription("Show today daily challenge placement")
                    .setRequired(false)
            )
            .addNumberOption(PageNumberOption)
    )
    .addSubcommand(sub =>
        sub
            .setName("streaks")
            .setDescription("Display daily challenge streaks leaderboards")
            .addStringOption(CountryStringOption)
            .addBooleanOption(opt =>
                opt
                    .setName("current")
                    .setDescription("Show current streaks")
                    .setRequired(false)
            )
            .addNumberOption(PageNumberOption)
            .addBooleanOption(opt =>
                opt
                    .setName("friends")
                    .setDescription("Only show scores by friends")
                    .setRequired(false)
            )
    )

CommandEmitterInstance.AddCommand(DailyChallenge, DailyChallenge.names)
InteractionRegistrerInstance.AddInteraction(DailyChallenge.interactionData)