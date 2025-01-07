import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { Logger } from "@src/class/Logger";
import { SlashCommandBuilder } from "discord.js";
import { CONTEXT_FULL } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";

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
    public static readonly names: string[] = ["dc", "dcl"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
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
            return CommandResponseCodes.UnknownError
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

DailyChallenge.interactionData
    .setName("daily-challenge")
    .setDescription("Dailychallange")
    .setContexts(CONTEXT_FULL)
    .addSubcommand(sub =>
        sub
            .setName("leaderboards")
            .setDescription("Get daily challenge leaderboards")
            .addStringOption(opt =>
                opt
                    .setName("country")
                    .setDescription("Country code to get leaderboards for")
                    .setRequired(false)
                    .setMinLength(2)
                    .setMaxLength(2)
            )
            .addBooleanOption(opt =>
                opt
                    .setName("friends")
                    .setDescription("Only show scores by friends")
                    .setRequired(false)
            )
            .addNumberOption(opt =>
                opt
                    .setName("page")
                    .setDescription("Leaderboards page to get")
                    .setRequired(false)
                    .setMinValue(1)
            )
    )
    .addSubcommand(sub =>
        sub
            .setName("profile")
            .setDescription("Get daily challenge profile")
            .addStringOption(opt =>
                opt
                    .setName("username")
                    .setDescription("Username to get profile for")
                    .setRequired(false)
            )
    )
    .addSubcommand(sub =>
        sub
            .setName("thresholds")
            .setDescription("Daily challenge placement thresholds")

    )
    .addSubcommand(sub =>
        sub
            .setName("top-players")
            .setDescription("Daily challenge top players leaderboards")
            .addStringOption(opt =>
                opt
                    .setName("country")
                    .setDescription("Country code to get leaderboards for")
                    .setRequired(false)
            )
            .addBooleanOption(opt =>
                opt
                    .setName("today")
                    .setDescription("Show today daily challenge placement")
                    .setRequired(false)
            )
            .addNumberOption(opt =>
                opt
                    .setName("page")
                    .setDescription("Page to get")
                    .setRequired(false)
            )
    )

CommandEmitterInstance.AddCommand(DailyChallenge, DailyChallenge.names)
InteractionRegistrerInstance.AddInteraction(DailyChallenge.interactionData)