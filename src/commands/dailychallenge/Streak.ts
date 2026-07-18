import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";
import { DailyChallengeProfile, DailyChallengeProfileFactory } from "@src/class/database/DailyChallengeProfile";
import { Filter, Sort } from "mongodb";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { ButtonEmojis, GetFlag, HandleAsync } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { TextRenderer } from "@src/class/renderer/Text";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { randomBytes } from "crypto";
import NodeCache from "node-cache";
import { PageArg } from "@src/utils/discord/help";

interface args {
    Country: string
    Friends: boolean
    Page: number
    Current: boolean
}

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})

class StreakLeaderboardsData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Country: this.data.GetString("country", ["-c", "-country", "c"]),
            Friends: this.data.GetBoolean("friends", ["-f", "-friends", "f"]),
            Page: this.data.GetNumber("page", ["-p", "-page", "p"]) || 1,
            Current: this.data.GetBoolean("current", ["-c", "-current", "c"])
        }
    }
}

class StreakLeaderboards extends CommandBase implements CommandAbstract {
    public static readonly name: string = "daily-challenge-streak-leaderboards"
    public static readonly names: string[] = [this.name, "dcsl", "dcslb", "dailychallengestreakleaderboards"]
    public static readonly helpData = new CommandHelp()
    private data: StreakLeaderboardsData
    private args: args
    private componentId: string
    private oldComponentId: string

    private PER_PAGE = 20


    constructor(data: MessageEventData) {
        super()
        this.componentId = randomBytes(16).toString("hex")
        this.data = new StreakLeaderboardsData(data)
        this.args = this.data.args
        this.oldComponentId = this.data.GetOldComponentId()
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isButton()) {
                const [command, componentId, page, id] = interaction.customId.split(";")
                this.args.Page = parseInt(page)
            }
        }
        const user = this.data.GetUser()
        const { Page, Current } = this.args

        const [filter, err] = await HandleAsync(this.GetFilter())
        if (err) {
            if (err === CommandResponseCodes.USER_ERROR) return CommandResponseCodes.USER_ERROR
            Logger.Error(err)
            this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.ERROR
        }

        const sort = this.GetSort()
        
        const users = await DailyChallengeProfileFactory.GetDailyChallengeProfiles(filter, sort, this.PER_PAGE, (Page - 1) * this.PER_PAGE)

        const [templateData, templateDataErr] = await HandleAsync(this.GetTemplateData(users))
        if (templateDataErr) {
            if (templateDataErr === CommandResponseCodes.USER_ERROR) return CommandResponseCodes.USER_ERROR
            Logger.Error(templateDataErr)
            this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.ERROR
        }

        const text = TextRenderer.render("dailychallenge/streak", {
            profiles: templateData
        })
        
        const embed = this.GetBaseEmbed()
            .setDescription(text)
            .setAuthor({
                name: `${Current ? "Current" : "Longest"} Streak Leaderboards`,
                iconURL: GetFlag(templateData[0].country)
            })

        await this.data.Reply({ embeds: [embed], components: [this.GetButtons()] })

        return CommandResponseCodes.OK
    }

    private GetButtons() {
        const row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(new ButtonBuilder()
            .setCustomId(`dcsl;${this.componentId};${this.args.Page - 1};${randomBytes(4)}`)
            .setLabel(ButtonEmojis.Left)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(this.args.Page == 1),
        )
        row.addComponents(new ButtonBuilder()
            .setCustomId(`dcsl;${this.componentId};${this.args.Page + 1};${randomBytes(4)}`)
            .setLabel(ButtonEmojis.Right)
            .setStyle(ButtonStyle.Primary)
        )
        return row
    }

    private async GetTemplateData(profiles: DailyChallengeProfile[]) {
        const user = this.data.GetUser()
        const { Page, Current } = this.args
        const fetcher = await Fetcher.Create(user.id)

        const [fetchedProfiles, err] = await HandleAsync(fetcher.GetByUserIds({ ids: profiles.map(el => el.id) }))
        if (err) {
            Logger.Error(err)
            this.data.Reply(this.RenderApiError())
            throw CommandResponseCodes.ERROR
        }

        return profiles.map((profile, i) => {
            const fetched = fetchedProfiles.find(el => el.id == profile.id)
            return {
                index: (Page - 1) * this.PER_PAGE + i + 1,
                username: fetched.username,
                url: fetched.url,
                rank: fetched.statistics_rulesets.osu.global_rank,
                streak: Current ? profile.streakData.currentStreak : profile.streakData.longestStreak,
                country: fetched.country?.code,
                placementPercent: profile.averagePlacementPercent.roundFixed(2),
                placement: profile.averagePlacement.round(0),
            }
        })
    }

    private GetSort(): Sort {
        const { Current } = this.args
        if (Current) {
            return {
                "streakData.currentStreak": -1,
                "averagePlacementPercent": 1
            }
        }
        return {
            "streakData.longestStreak": -1,
            "averagePlacementPercent": 1
        }
    }

    private async GetFilter(): Promise<Filter<DailyChallengeProfile>> {
        const user = this.data.GetUser()
        const { Country, Friends } = this.args
        const fetcher = await Fetcher.Create(user.id)

        const filter: Filter<DailyChallengeProfile> = { }

        if (Country) {
            filter["country"] = Country.toUpperCase()
        }

        if (Friends) {
            if (!user.osu.scopes.includes("friends.read")) {
                this.data.Reply({ content: "Relink with friends flag." })
                throw CommandResponseCodes.USER_ERROR
            }
            const friends = await fetcher.GetUserFriends()
            const friendIds = friends.map(el => el.id)
            friendIds.push(user.osu.userId)
            filter["id"] = { $in: friendIds }
        }
        
        return filter
    }

}

StreakLeaderboards.helpData
    .setCommand(StreakLeaderboards.name)
    .setAliases(StreakLeaderboards.names.filter(el => el !== StreakLeaderboards.name))
    .setDescription("Display daily challenge streak leaderboards")
    .setUsage("daily-challenge-streak-leaderboards [options]")
    .setGroup(CommandGroup.DailyChallenge)
    .addArg(new CommandHelpArg()
        .setName("country")
        .setAliases(["-c", "-country", "c"])
        .setDescription("Filter by country code")
        .setUsage("country PL"))
    .addArg(new CommandHelpArg()
        .setName("friends")
        .setAliases(["-f", "-friends", "f"])
        .setDescription("Only show friends")
        .setUsage("-friends"))
    .addArg(PageArg)
    .addArg(new CommandHelpArg()
        .setName("current")
        .setAliases(["-current"])
        .setDescription("Show current streak instead of best")
        .setUsage("-current"))

CommandEmitterInstance.AddCommand(StreakLeaderboards, StreakLeaderboards.names)