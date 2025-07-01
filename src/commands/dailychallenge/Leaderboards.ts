import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { DailyChallengeScoreFactory } from "@src/class/database/DailyChallengeScore";
import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { ButtonEmojis, GetCountryFlag, GetFlag, HandleAsync } from "@src/Utils";
import { GamemodeNumToStr } from "@src/class/api/osu/Consts";
import { Logger } from "@src/class/Logger";
import { TextRenderer } from "@src/class/renderer/Text";
import { randomBytes } from "crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import NodeCache from "node-cache";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";
import { CommandArg } from "@src/class/partials/CommandArg";

interface args {
    Country: string
    Friends: boolean
    Page: number
}

const argsConfig = {
    Country: new CommandArg("country", ["-country", "c", "-c"]),
    Friends: new CommandArg("friends", ["-friends", "f", "-f"])
}

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})

class DailyChallengeLeaderboardsData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Country: this.data.GetString(argsConfig.Country.name, argsConfig.Country.aliases) || null,
            Friends: this.data.GetCommand() === "dcflb" || this.data.GetBoolean(argsConfig.Friends.name, argsConfig.Friends.aliases),
            Page: 1
        }
    }
}

class DailyChallengeLeaderboards extends CommandBase implements CommandAbstract {
    public static readonly name: string = "daily-challenge-leaderboards"
    public static readonly names: string[] = [this.name, "dclb", "dcflb", "dailychallengeleaderboards"]
    public static readonly helpData = new CommandHelp()
    private data: DailyChallengeLeaderboardsData
    private args: args
    private componentId: string
    private oldComponentId: string

    constructor(data: MessageEventData) {
        super()
        this.componentId = randomBytes(16).toString("hex")
        this.data = new DailyChallengeLeaderboardsData(data)
        this.args = this.data.args
        this.oldComponentId = this.data.GetOldComponentId()
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isButton()) {
                const [cmd, id, page] = interaction.customId.split(";")
                this.args.Page = parseInt(page)
            }
        }
        const user = this.data.GetUser()
        const { Country, Page, Friends } = this.args
        const PER_PAGE = 10

        const challenge = await DailyChallengeFactory.GetCurrentChallenge()
        const fetcher = await Fetcher.Create(user.id)

        if (!challenge) {
            await this.data.Reply({ content: "No daily challenge is currently active." })
            return CommandResponseCodes.USER_ERROR
        }

        const query = {
            room_id: challenge.id,
        }
        if (Country) {
            query["user.country_code"] = Country.toUpperCase()
        }

        if (Friends) {
            if (!user.osu.scopes.includes("friends.read")) {
                await this.data.Reply({ content: "Relink with friends flag." })
                return CommandResponseCodes.USER_ERROR
            }
            const friends = await fetcher.GetUserFriends()
            const friendIds = friends.map(el => el.id)
            friendIds.push(user.osu.userId)
            query["user.id"] = { $in: friendIds }
        }

        const allScores = await DailyChallengeScoreFactory.GetDailyChallengeScores(query, true)
        if (!allScores || !allScores.length) {
            await this.data.Reply(this.RenderNoScores())
            return CommandResponseCodes.USER_ERROR
        }

        const [map, mapError] = await HandleAsync(fetcher.GetBeatmap({ id: challenge.current_playlist_item.beatmap_id, Gamemode: GamemodeNumToStr[challenge.current_playlist_item.ruleset_id] }))
        if (mapError) {
            await this.data.Reply(this.RenderApiError())
            Logger.Error(mapError)
            return CommandResponseCodes.ERROR
        }

        const user_score = allScores.find(score => score.UserId === user?.osu?.userId)
        const scores = allScores.slice((Page - 1) * PER_PAGE, Page * PER_PAGE)
        const ejsScoresData = scores.map((score, i) => {
            return {
                index: (Page - 1) * PER_PAGE + i, userId: score.UserId, username: score.user.username, userUrl: score.user.url,
                userRank: score.user.global_rank, pp: score.PP, accuracy: score.Accuracy, mods: score.Mods.Formatted,
                grade: score.Grade, score: score.TotalScore, combo: score.MaxCombo, max_combo: map.max_combo, misses: score.Statistics.miss, created_at: score.EndedAt,
                flag: Country ? "" : GetCountryFlag(score.user.country_code)
            }
        })

        const text = TextRenderer.render("leaderboards", {
            scores: ejsScoresData, user_score: user_score, author: user?.osu?.userId
        })

        const row = this.CreateButtons(Page, Math.ceil(allScores.length / PER_PAGE))

        const embed = this.GetBaseEmbed()
            .setDescription(text)
            .setAuthor({
                name: `${Country ? "Country " : ""}Daily Challenge Leaderboards`,
                iconURL: GetFlag(Country || scores[0].user.country_code),
                url: map.url
            })
            .setThumbnail(map.FullBackground)

        await this.data.Reply({ embeds: [embed], components: [row] })

        return CommandResponseCodes.OK
    }


    private CreateButtons(curentPage: number, maxPage: number) {
        const row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`dclb;${this.componentId};0;${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Start)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`dclb;${this.componentId};${curentPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Left)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`dclb;${this.componentId};${curentPage + 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Right)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage),
            new ButtonBuilder()
                .setCustomId(`dclb;${this.componentId};${maxPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.End)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage)
        )
        return row
    }

}

DailyChallengeLeaderboards.helpData
    .setCommand(DailyChallengeLeaderboards.name)
    .setAliases(DailyChallengeLeaderboards.names.filter(el => el !== DailyChallengeLeaderboards.name))
    .setDescription(`Display currents daily challenge leaderboards`)
    .setUsage(`!daily-challenge-leaderboards [options]`)
    .setGroup(CommandGroup.DailyChallenge)
    .addArg(
        new CommandHelpArg()
            .setName(argsConfig.Country.name)
            .setAliases(argsConfig.Country.aliases)
            .setDescription(`Filter by country`)
            .setUsage(`${argsConfig.Country.name} code`)
    )
    .addArg(
        new CommandHelpArg()
            .setName(argsConfig.Friends.name)
            .setAliases(argsConfig.Friends.aliases)
            .setDescription(`Filter by friends`)
            .setUsage(`!dcflb/-${argsConfig.Friends.name}`)
    )


CommandEmitterInstance.AddCommand(DailyChallengeLeaderboards, DailyChallengeLeaderboards.names)