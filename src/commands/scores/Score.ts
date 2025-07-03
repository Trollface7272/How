import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandWithComponentsBase } from "@src/class/base/Command";
import { CommandHelp } from "@src/class/help/CommandHelp";
import { GamemodeArg, ModsArg, PageArg, UsernameArg } from "@src/utils/discord/help";
import { Gamemode, ParsedMods } from "@src/class/api/osu/types/MiscTypes";
import { ButtonEmojis, FormatCombo, FormatHits, GetFlag, HandleAsync, lookupScoresColumn, merge } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { Document, Filter, Sort } from "mongodb";
import { ScoreFactory } from "@src/class/database/Score";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, escapeMarkdown, InteractionType, MessageComponentInteraction, SlashCommandBuilder } from "discord.js";
import { TextRenderer } from "@src/class/renderer/Text";
import { EmojiFactory } from "@src/class/Emojis";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { randomBytes } from "crypto";
import NodeCache from "node-cache";
import { CONTEXT_FULL, GamemodeStringOption, ModsStringOption, PageNumberOption, RandomBooleanOption, ReversedBooleanOption, UsernameStringOption } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";


type SortType = "ar" | "od" | "cs" | "hp" | "pp" | "bpm" | "score" | "difference" | "diff"
    | "rar" | "rod" | "rcs" | "rhp" | "rpp" | "rbpm" | "rscore" | "rdifference" | "rdiff"

interface args {
    Id?: number
    Username?: string
    Gamemode: Gamemode
    Reversed: boolean
    Random: boolean
    Page: number
    Sort: SortType[]
    Filter: string[]
    Mods: ParsedMods
    Anyone: boolean
    PpVer: string | undefined
}

const signs = {
    "<": "$lt",
    ">": "$gt",
    "=": "$eq",
    "<=": "$lte",
    ">=": "$gte",
    "==": "$eq"
}

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})


class ScoreData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const sorts = this.data.GetString("sort", ["s", "-s"])
        const filters = this.data.GetString("filter", ["f", "-f", "-filter"])
        let sortArr: SortType[] = []
        let filterArr: string[] = []
        if (sorts) {
            sortArr = sorts.split(" ") as SortType[]
        }
        if (filters) {
            filterArr = filters.split(",")
        }
        return {
            Sort: sortArr,
            Gamemode: this.data.GetGamemode(),
            Reversed: this.data.GetBoolean("reversed", ["rev", "-rev"]),
            Random: this.data.GetBoolean("random", ["rand", "-rand"]),
            Page: this.data.GetNumber("page", ["p", "-p", "-page"], 1),
            Filter: filterArr,
            Mods: this.data.GetExactMods(),
            Anyone: this.data.GetBoolean("anyone", ["any", "-any", "-anyone"]),
            Id: this.data.GetNumber("id", ["i", "-i", "-id"]),
            PpVer: this.translatePpVer(this.data.GetString("ppver", ["-ppver", "pp", "-pp"])),
            Username: this.data.GetRemaining()
        }
    }

    private translatePpVer(ppVer: string) {
        switch (ppVer) {
            case "lazer":
            case "next":
            case "next-deploy":
                return "next-deploy-csr"
            default:
                return undefined
        }
    }
}

class Score extends CommandWithComponentsBase implements CommandAbstract {
    public static readonly name: string = "score"
    public static readonly names: string[] = [this.name, "sc", "scores"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    declare protected data: ScoreData
    protected args: args

    constructor(data: MessageEventData) {
        super(data)
        this.data = new ScoreData(data)
        this.args = this.data.args
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)

    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        if (this.data.IsInteraction()) {
            if (this.data.GetInteractionType() == InteractionType.MessageComponent) {
                const customId = (this.data.GetInteraction() as MessageComponentInteraction).customId
                const [command, componentId, page, random] = customId.split(";")
                this.args.Page = parseInt(page)
            }
        }

        if (!this.args.Username && !this.args.Id && !this.args.Anyone) {
            this.args.Id = user.osu?.userId

            if (!this.args.Id) {
                this.data.Reply(this.RenderNoUserError())
                return CommandResponseCodes.USER_ERROR
            }
        }

        const fetcher = await Fetcher.Create(user.id)

        const { Id: _id, Username, Gamemode, Reversed, Random, Page, Sort, Filter, Mods, Anyone, PpVer } = this.args
        const Id = _id ?? await fetcher.LookupId(Username)
        const Limit = Random ? 1 : 5

        const sortQuery: Sort = {}
        for (const sort of Sort) {
            const sign = sort.startsWith("r") ? 1 : -1
            let column = lookupScoresColumn(sort.startsWith("r") ? sort.replace("r", "") : sort)
            if (column.includes("{ppver}")) column = column.replace("{ppver}", PpVer)
            if (!column) {
                Logger.Info(`Unknown sort column: ${sort}`, Sort)
                continue
            }
            sortQuery[column] = (Reversed ? -sign : sign) as 1 | -1
        }

        if (Sort.length === 0) sortQuery.setAt = Reversed ? 1 : -1

        const filterQuery: Filter<Document> = {}
        for (const filter of Filter) {
            merge(filterQuery, this.parseFilter(filter))
        }

        if (Mods.exactExclude?.mods.length > 0) {
            merge(filterQuery, { mods: { $not: { $all: Mods.exactExclude.mods } } })
        }
        if (Mods.exactInclude?.mods.length > 0) {
            merge(filterQuery, { mods: { $all: Mods.exactInclude.mods, "$size": Mods.exactInclude.mods.length } })
        }
        if (Mods.exclude?.mods.length > 0) {
            merge(filterQuery, { mods: { $nin: Mods.exclude.mods } })
        }
        if (Mods.include?.mods.length > 0) {
            merge(filterQuery, { mods: { $all: Mods.include.mods } })
        }


        const [score, err] = await HandleAsync(ScoreFactory.GetScoresByUser(Anyone ? -1 : Id, filterQuery, sortQuery, Limit, (Page - 1) * Limit, Random))
        if (err) {
            Logger.Error(err)
            await this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.ERROR
        }
        const { scores, total, randomOffset } = score
        const profileQuery = HandleAsync(fetcher.GetProfile({ Username: Anyone ? scores[0].userId : Username ?? Id, Gamemode: Gamemode }))

        if (total == 0) {
            await this.data.Reply(this.RenderNoImportedScoresError())
            return CommandResponseCodes.USER_ERROR
        }

        const description = scores.map((score, i) => {
            const index = Random ? randomOffset + 1 : (Page - 1) * 5 + i + 1
            if (score.mods.length === 0) score.mods.push("NoMod")
            const pp = {
                normal: score.pp.roundFixed(3),
                improved: score.improvedPp.roundFixed(3),
                stars: score.beatmap.difficulty.stars.total.roundFixed(2)
            }
            if (score?.altPp?.[PpVer]) {
                const fpp = score.altPp[PpVer]
                const isFc = (score.combo > (score.beatmap.difficulty.combo * 0.95)) && score.counts.misses === 0
                pp.improved = (isFc ? fpp.ss.pp.roundFixed(3) : fpp.fc.pp.roundFixed(3)) + `(${fpp.difference >= 0 ? "+" : ""}${fpp.difference.roundFixed(2)})`
                pp.normal = fpp.normal.pp.roundFixed(3),
                    pp.stars = fpp.difficulty.star_rating.roundFixed(2)
            }
            return TextRenderer.render("score/score", {
                index: index, title: escapeMarkdown(score.beatmap.title, { escape: false }), version: escapeMarkdown(score.beatmap.version, { escape: false }), url: score.beatmap.url, mods: score.mods.join(""), difficulty: pp.stars,
                grade: EmojiFactory.GetEmoji(`Ranking${score.rank}`), pp: pp.normal, improvedPp: pp.improved, accuracy: score.accuracy.roundFixed(2),
                score: score.score.toLocaleString(), combo: FormatCombo(score.combo, score.beatmap.difficulty.combo, score.beatmap.mode), counts: FormatHits({ ok: score.counts[100], great: score.counts[300], meh: score.counts[50], miss: score.counts.misses }, score.beatmap.mode),
                setAt: score.setAt.toDiscordToolTip()
            })
        }).join("\n")

        const [profile, profileErr] = await profileQuery
        
        const profileData = profileErr ? {
            country: { code: "XX", name: "Unknown" },
            username: "unknown user " + scores[0].userId,
            url: undefined,
            flag: undefined,
            avatar_url: "https://a.ppy.sh/-1",
        } : {
            ...profile,
            avatar_url: profile.avatar_url ?? "https://a.ppy.sh/-1",
            flag: GetFlag(profile.country.code),
            url: profile.url ?? undefined
        }

        const embed = this.GetBaseEmbed()
            .setAuthor({
                name: `Matched scores${Anyone && scores.length > 1 ? "" : ` for ${profileData.username}`}`,
                iconURL: profileData.flag,
                url: profileData.url
            })
            .setFooter({
                text: `Page ${Page}/${Math.ceil(total / (Random ? 1 : 5))}`
            })
            .setThumbnail(profileData.avatar_url)
            .setDescription(description)

        const buttons = this.CreateButtons(Page, Math.ceil(total / (Random ? 1 : 5)))

        this.data.Reply({ embeds: [embed], components: [buttons] })

        return CommandResponseCodes.OK
    }

    private RenderNoImportedScoresError() {
        const embed = this.GetBaseEmbed()
        embed.setDescription("**No scores found.**")
        return { embeds: [embed] }
    }

    private CreateButtons(page: number, maxPage: number) {
        const row = new ActionRowBuilder<ButtonBuilder>()
        if (this.args.Random) {
            const button = new ButtonBuilder()
                .setCustomId(`score;${this.componentId};1;${randomBytes(4)}`)
                .setLabel("?")
                .setStyle(ButtonStyle.Primary)
            row.addComponents(button)
            return row
        }
        const buttons = [
            this.createButton(`scores;${this.componentId};1;${randomBytes(8).toString("hex")}`, ButtonEmojis.Start, page == 1),
            this.createButton(`scores;${this.componentId};${Math.max(1, page - 1)};${randomBytes(8).toString("hex")}`, ButtonEmojis.Left, page === 1),
            this.createButton(`scores;${this.componentId};${Math.min(maxPage, page + 1)};${randomBytes(8).toString("hex")}`, ButtonEmojis.Right, page === maxPage),
            this.createButton(`scores;${this.componentId};${maxPage};${randomBytes(8).toString("hex")}`, ButtonEmojis.End, page === maxPage)
        ]
        row.addComponents(...buttons)
        return row
    }

    private createButton(id: string, label: string, disabled: boolean) {
        return new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId(id)
            .setLabel(label)
            .setDisabled(disabled)
    }


    private parseFilter(filter: string): Filter<Score> {
        const regex = /([A-z]*)(<=|>=|==|<|>|=)([A-z0-9]*)/gm
        const [, collumn, sign, value] = regex.exec(filter)
        return {
            [lookupScoresColumn(collumn)]: {
                [signs[sign]]: value.isNumber() ? parseFloat(value) : value
            }
        }
    }

}

Score.interactionData
    .setName("score")
    .setDescription("Display imported user scores")
    .setContexts(CONTEXT_FULL)
    .addStringOption(UsernameStringOption)
    .addStringOption(GamemodeStringOption)
    .addNumberOption(PageNumberOption)
    .addStringOption(ModsStringOption)
    .addBooleanOption(ReversedBooleanOption)
    .addBooleanOption(RandomBooleanOption)
    .addStringOption(opt =>
        opt
            .setName("sort")
            .setDescription("Sort filtered scores by")
            .setRequired(false)
            .setChoices({
                name: "Approach Rate",
                value: "ar"
            }, {
                name: "Overall Difficulty",
                value: "od"
            }, {
                name: "Circle Size",
                value: "cs"
            }, {
                name: "Health Drain",
                value: "hp"
            }, {
                name: "Performance Points",
                value: "pp"
            }, {
                name: "BPM",
                value: "bpm"
            }, {
                name: "Score",
                value: "score"
            })
    )
    .addBooleanOption(opt =>
        opt
            .setName("anyone")
            .setDescription("Get scores by all users")
            .setRequired(false)
    )
    .addStringOption(opt =>
        opt
            .setName("filter")
            .setDescription("Filter scores by")
            .setRequired(false)
    )

CommandEmitterInstance.AddCommand(Score, Score.names)
InteractionRegistrerInstance.AddInteraction(Score.interactionData)

Score.helpData
    .setCommand(Score.name)
    .setDescription("Display imported user scores")
    .setUsage("score [username] [gamemode] [page] [sort] [filter] [mods] [anyone] [ppver]")
    .setAliases(Score.names)
    .addArg(UsernameArg)
    .addArg(GamemodeArg)
    .addArg(PageArg)
    .addArg(ModsArg)