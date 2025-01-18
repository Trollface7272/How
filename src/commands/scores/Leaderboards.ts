import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { ButtonEmojis, GetFlag, HandleAsync } from "@src/Utils";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { Logger } from "@src/class/Logger";
import NodeCache from "node-cache";
import { TextRenderer } from "@src/class/renderer/Text";
import { Profile } from "@src/class/api/osu/class/Profile";
import { randomBytes } from "crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import { Beatmap } from "@src/class/api/osu/class/Beatmap";
import { Score } from "@src/class/api/osu/class/Score";
import { Mods } from "@src/class/api/osu/class/Mods";
import { BeatmapStringOption, CONTEXT_FULL, GamemodeStringOption, ModsStringOption, PageNumberOption } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";

enum lbType {
    global = "global",
    country = "country",
    friend = "friend"
}

interface args {
    Type: lbType
    Gamemode: Gamemode
    Map: number
    Page: number
    Mods: Mods.ModList
}

interface cache {
    lb: Score.Leaderboards
    map: Beatmap.FromId
    users: Profile.FromIds[]
}

const lbAliases = {
    global: ["leaderboards", "lb", "rleaderboards", "rlb"],
    country: ["countryleaderboards", "clb", "rclb", "rcountryleaderboards"],
    friend: ["friendleaderboards", "flb", "rflb", "rfriendleaderboards"]
}

const cache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    useClones: false
})

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})

class LeaderboardsData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const command = this.data.GetCommand()
        return {
            Type: lbAliases.country.includes(command) ? lbType.country : lbAliases.friend.includes(command) ? lbType.friend : lbType.global,
            Gamemode: this.data.GetGamemode(),
            Map: this.data.GetBeatmap(),
            Page: 0,
            Mods: this.data.GetMods()
        }
    }

    public GetCommand() {
        return this.data.GetCommand()
    }

    public GetBeatmapFromConversation(): Promise<number> {
        return this.data.GetBeatmapFromConversation()
    }
}

class Leaderboards extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["leaderboards", "lb", "clb", "countryleaderboards", "flb", "friendleaderboards", "rleaderboards", "rlb", "rclb", "rcountryleaderboards", "rflb", "rfriendleaderboards"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    private data: LeaderboardsData
    private args: args
    private componentId: string
    private oldComponentId: string

    constructor(data: MessageEventData) {
        super()
        this.componentId = randomBytes(16).toString("hex")
        this.data = new LeaderboardsData(data)
        this.args = this.data.args
        this.oldComponentId = this.data.GetOldComponentId()
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        let isButton = false
        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isButton()) {
                isButton = true
                const [cmd, id, page] = interaction.customId.split(";")
                this.args.Page = parseInt(page)
            }
        }

        const fetcher = await Fetcher.Create(user.id)

        if (this.data.GetCommand().startsWith("r")) {
            const [recent, recentErr] = await HandleAsync(fetcher.GetUserScores({ Id: user.osu.userId, Limit: 1, Type: "recent", Gamemode: this.args.Gamemode }))
            if (recentErr) {
                Logger.Error(recentErr)
                return CommandResponseCodes.UnknownError
            }
            if (recent.length === 0) {
                await this.data.Reply(this.RenderNoScores())
                return CommandResponseCodes.OK
            }
            this.args.Map = recent[0].BeatmapId
        }

        const { Type, Gamemode, Page, Mods } = this.args
        const cached = isButton ? cache.get<cache>(this.oldComponentId) : null


        const Map = this.data.args.Map || await this.data.GetBeatmapFromConversation()
        if (!Map) {
            await this.data.Reply(this.RenderNoBeatmapError())
            return CommandResponseCodes.OK
        }


        const [map, mapErr] = isButton ? [cached.map] : await HandleAsync(fetcher.GetBeatmap({ id: Map, Gamemode }))
        if (mapErr) {
            await this.data.Reply(this.RenderApiError())
            Logger.Error(mapErr)
            return CommandResponseCodes.OK
        }
        if (!map.is_scoreable) {
            await this.data.Reply(this.RenderBeatmapUnscoreable())
            return CommandResponseCodes.OK
        }

        const [lb, scoresErr] = isButton ? [cached.lb] : await HandleAsync(fetcher.GetLeaderboards({ id: Map, mods: Mods, gamemode: Gamemode, type: Type }))
        if (scoresErr) {
            await this.data.Reply(this.RenderApiError())
            Logger.Error(scoresErr)
            return CommandResponseCodes.OK
        }
        const { user_score } = lb
        const scores = lb.scores.slice(Page * 10, (Page + 1) * 10)
        if (scores.length === 0) {
            await this.data.Reply(this.RenderNoScores())
            return CommandResponseCodes.OK
        }

        const userids = lb.scores.map(score => score.UserId)
        const users = isButton ? cached.users : await fetcher.GetByUserIds({ ids: userids })
        const userRanks: { [key: number]: Profile.FromIds } = {}
        users.forEach(user => userRanks[user.id] = user)
        scores.forEach(score => score.User.global_rank = userRanks[score.UserId].statistics_rulesets[Gamemode].global_rank)

        const ejsScoresData = scores.map(score => {
            return {
                index: score.index, userId: score.UserId, username: score.User.username, userUrl: score.User.url,
                userRank: score.User.global_rank, pp: score.PP, accuracy: score.Accuracy, mods: score.Mods.Formatted,
                grade: score.Grade, score: score.ScoreFormatted, combo: score.MaxCombo, max_combo: map.max_combo, misses: score.Statistics.miss, created_at: score.EndedAt
            }
        })

        const embed = this.GetBaseEmbed()
        const text = TextRenderer.render("leaderboards", {
            scores: ejsScoresData, user_score: user_score, author: user.osu.userId
        })

        embed.setDescription(text)
            .setAuthor({
                name: `Top ${Page * 10 + 1}-${Math.min((Page + 1) * 10, lb.scores.length)} ${Type == lbType.friend ? "Friend" : Type == lbType.country ? "Country" : "Global"} Scores On ${map.beatmapset.title} [${map.version}]`, iconURL: GetFlag(scores[0].User.country_code), url: map.url
            })
            .setThumbnail(map.beatmapset.covers["list@2x"])



        const [_, err] = await HandleAsync(this.data.Reply({ embeds: [embed], components: this.RenderComponents(Page, Math.ceil(lb.scores.length / 10)) }))

        if (!err) {
            componentCache.set(this.componentId, this.args)
            cache.set(this.componentId, { lb, map, users })

            if (this.oldComponentId) {
                cache.del(this.oldComponentId)
                componentCache.del(this.oldComponentId)
            }
        }

        return CommandResponseCodes.OK
    }

    private RenderComponents(curentPage: number, maxPage: number) {
        const row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboards;${this.componentId};0;${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Start)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`leaderboards;${this.componentId};${curentPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Left)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == 0),
            new ButtonBuilder()
                .setCustomId(`leaderboards;${this.componentId};${curentPage + 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.Right)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage),
            new ButtonBuilder()
                .setCustomId(`leaderboards;${this.componentId};${maxPage - 1};${randomBytes(4)}`)
                .setLabel(ButtonEmojis.End)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(curentPage == maxPage)
        )
        return [row]
    }

}

Leaderboards.interactionData
    .setContexts(CONTEXT_FULL)
    .setName("leaderboards")
    .setDescription("Display map leaderboards")
    .addStringOption(BeatmapStringOption)
    .addStringOption(opt =>
        opt
            .setName("type")
            .setDescription("Leaderboards type to get")
            .setRequired(false)
            .setChoices({
                name: "Global",
                value: "global"
            }, {
                name: "Country",
                value: "country"
            }, {
                name: "Friends",
                value: "friends"
            })
    )
    .addStringOption(GamemodeStringOption)
    .addStringOption(ModsStringOption)
    .addNumberOption(PageNumberOption)


CommandEmitterInstance.AddCommand(Leaderboards, Leaderboards.names)
InteractionRegistrerInstance.AddInteraction(Leaderboards.interactionData)