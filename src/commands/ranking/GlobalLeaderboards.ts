import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { Gamemode, RankingType } from "@src/class/api/osu/types/MiscTypes";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { GetCountryFlag, GetFlag, HandleAsync } from "@src/Utils";
import { TextRenderer } from "@src/class/renderer/Text";

interface args {
    Country: string
    Type: RankingType
    Me: boolean
    Gamemode: Gamemode
    Friends: boolean
}

class GlobalLeaderboardsData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const country = this.data.GetString("country", ["c"])

        let type = GlobalLeaderboards.score.includes(this.data.GetCommand()) ? RankingType.score : RankingType.performance
        if (type !== RankingType.score && country) type = RankingType.country

        return {
            Country: country,
            Me: this.data.GetBoolean("me", []),
            Type: type,
            Gamemode: this.data.GetGamemode(),
            Friends: this.data.GetBoolean("friends", ["f"])
        }
    }
}

class GlobalLeaderboards extends CommandBase implements CommandAbstract {
    public static readonly score: string[] = ["slb", "sr", "scoreleaderboards", "scoreranking", "score-leaderboards", "score-ranking"]
    public static readonly names: string[] = [...this.score, "glb", "gr", "globalleaderboards", "globalranking", "global-leaderboards", "global-ranking"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    private data: GlobalLeaderboardsData


    constructor(data: MessageEventData) {
        super()
        this.data = new GlobalLeaderboardsData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        const PAGE_SIZE = 25

        const { Me, Country, Type, Gamemode, Friends } = this.data.args

        const user_id = user.osu.userId
        const username = user?.osu?.username

        let page = 1

        const fetcher = await Fetcher.Create(user.id)

        if (Me) {
            const [profile_score, scoreProfile_err] = await HandleAsync(fetcher.ScoreProfile({ user_id: user_id }))
            if (scoreProfile_err) {
                const embed = this.HandleProfileError(scoreProfile_err, username)
                await this.data.Reply(embed)
                return CommandResponseCodes.OK
            }
            if (!profile_score) {
                const embed = this.GetBaseEmbed()
                    .setDescription(`User ${username} is not in top 10000.`)
                await this.data.Reply({ embeds: [embed] })
                return CommandResponseCodes.OK
            }

            page = Math.ceil(profile_score.rank / 50)
        }

        const [ranking, ranking_err] = await HandleAsync(
            fetcher.GetRankings({ gamemode: Gamemode, filter: Friends ? "friends" : "all", page, type: Type, country: Country })
        )
        if (ranking_err) {
            const embed = this.HandleRankingError(ranking_err)
            await this.data.Reply(embed)
            return CommandResponseCodes.OK
        }

        let user_idx = ranking.ranking.findIndex(el => el.user.id === user_id)

        const half = Math.floor(PAGE_SIZE / 2)
        if ((user_idx - half) < 0) {
            const success = await ranking.fetchBack(fetcher)
            if (success) user_idx = ranking.ranking.findIndex(el => el.user.id === user_id)
        } else if ((user_idx + half + 1) > 50) {
            const success = await ranking.fetchForward(fetcher)
        }
        const scores = ranking.ranking.slice(user_idx - half, user_idx + half)

        const idx_base = user_idx > 50 ? (page - 1) * 50 : page * 50 

        const text = scores.map((el, i) => {
            return TextRenderer.render("ranking/score-leaderboards", {
                index: idx_base + el.index, username: el.user.username,
                user_url: el.user.url, global_rank: el.global_rank.toLocaleString("en-US"),
                score: el.ranked_score.toLocaleString("en-US"), 
                score_diff: (el.ranked_score - ranking.ranking[el.index + 1].ranked_score).toLocaleString("en-US"),
                flag: GetCountryFlag(el.user.country_code)
            })
        }).join("\n")


        const embed = this.GetBaseEmbed()
            .setDescription(text)
            .setAuthor({
                name: `${Friends ? "Friends" : "Global"}${Type === RankingType.score ? " Score" : ""} Leaderboards`,
                url: `https://osu.ppy.sh/rankings/${Gamemode}/${Type}`
            })

        await this.data.Reply({ embeds: [embed] })


        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(GlobalLeaderboards, GlobalLeaderboards.names)