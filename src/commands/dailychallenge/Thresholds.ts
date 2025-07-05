import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandHelp } from "@src/class/help/CommandHelp";

import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { TextRenderer } from "@src/class/renderer/Text";
import { DailyChallengeScoreFactory } from "@src/class/database/DailyChallengeScore";
import { GetFlag, HandleAsync } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { GamemodeNumToStr } from "@src/class/api/osu/Consts";

interface args {

}

class DailyChallengeThresholdData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {}
    }
}

class DailyChallengeThreshold extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["dcth", "daily-challenge-thresholds", "dailychallengethresholds"]
    public static readonly helpData = new CommandHelp()
    private data: DailyChallengeThresholdData


    constructor(data: MessageEventData) {
        super()
        this.data = new DailyChallengeThresholdData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        const challenge = await DailyChallengeFactory.GetCurrentChallenge()

        if (!challenge) {
            this.data.Reply({ content: "No active challenge" })
            return CommandResponseCodes.ERROR
        }

        const [userScore, userScoreError] = user.osu ? await HandleAsync(DailyChallengeScoreFactory.GetDailyChallengeScoreByUser(user?.osu?.userId, challenge.id)) : [null, null]
        if (userScoreError) {
            this.data.Reply(this.RenderApiError())
            Logger.Error(userScoreError)
            return CommandResponseCodes.ERROR
        }
        const fetcher = await Fetcher.Create(user.id)
        const [beatmap, beatmapErr] = await HandleAsync(fetcher.GetBeatmap({ id: challenge.current_playlist_item.beatmap_id, Gamemode: GamemodeNumToStr[challenge.current_playlist_item.ruleset_id] }))
        if (beatmapErr) {
            this.data.Reply(this.RenderApiError())
            Logger.Error(beatmapErr)
            return CommandResponseCodes.ERROR
        }

        const user_score = userScore ? { score: userScore.TotalScore.toLocaleString(), rank: userScore.position.toLocaleString() } : null

        const threshold = challenge.thresholds.at(-1)

        const text = TextRenderer.render("dailychallenge/threshold", {
            total: threshold.total, score1Threshold: threshold.rank1.score.toLocaleString(),
            score10Threshold: threshold.top10.score.toLocaleString(), rank10Threshold: threshold.top10.position.toLocaleString(),
            score50Threshold: threshold.top50.score.toLocaleString(), rank50Threshold: threshold.top50.position.toLocaleString(),
            updated: threshold.date.toDiscordToolTip(),
            user_score, user_percent: userScore ? (userScore.position / threshold.total * 100).roundFixed(2) : null
        })

        const embed = this.GetBaseEmbed()
            .setDescription(text)
            .setAuthor(userScore ? {
                name: "Daily Challenge Thresholds",
                iconURL: GetFlag(user.osu.country),
                url: challenge.URL,
            } : {
                name: "Daily Challenge Thresholds",
                url: challenge.URL,
            })
            .setThumbnail(beatmap.FullBackground)
            .setFooter({
                text: `${beatmap.beatmapset.artist} - ${beatmap.beatmapset.title} [${beatmap.version}] by ${beatmap.beatmapset.creator}`
            })


        this.data.Reply({ embeds: [embed] })


        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(DailyChallengeThreshold, DailyChallengeThreshold.names)

DailyChallengeThreshold.helpData
    .setCommand(DailyChallengeThreshold.name)
    .setDescription("Display daily challenge thresholds.")
    .setUsage("dcth")
    .setAliases(DailyChallengeThreshold.names);