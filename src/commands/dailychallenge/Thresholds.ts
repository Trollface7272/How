import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { TextRenderer } from "@src/class/renderer/Text";
import { DailyChallengeScoreFactory } from "@src/class/database/DailyChallengeScore";
import { HandleAsync } from "@src/Utils";
import { Logger } from "@src/class/Logger";

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
    public static readonly names: string[] = ["dcth"]
    private data: DailyChallengeThresholdData


    constructor(data: MessageEventData) {
        super()
        this.data = new DailyChallengeThresholdData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        const challenge = await DailyChallengeFactory.GetCurrentChallenge()

        if (!challenge) {
            this.data.Reply({content: "No active challenge"})
            return CommandResponseCodes.UnknownError
        }

        const [userScore, userScoreError] = await HandleAsync(DailyChallengeScoreFactory.GetDailyChallengeScoreByUser(user.osu.userId, challenge.id))
        if (userScoreError) {
            this.data.Reply(this.RenderApiError())
            Logger.Error(userScoreError)
            return CommandResponseCodes.UnknownError
        }
    
        const user_score = userScore ? {score: userScore.TotalScore.toLocaleString(), rank: userScore.position.toLocaleString() } : null

        const threshold = challenge.thresholds.at(-1)

        const text = TextRenderer.render("dailychallenge/threshold", {
            total: threshold.total.toLocaleString(), score1Threshold: threshold.rank1.score.toLocaleString(),
            score10Threshold: threshold.top10.score.toLocaleString(), rank10Threshold: threshold.top10.position.toLocaleString(),
            score50Threshold: threshold.top50.score.toLocaleString(), rank50Threshold: threshold.top50.position.toLocaleString(),
            updated: threshold.date.toDiscordToolTip(),
            user_score
        })

        const embed = this.GetBaseEmbed()
            .setDescription(text)
            .setAuthor({
                name: "Daily Challenge Thresholds"
            })

        this.data.Reply({embeds: [embed]})
        

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(DailyChallengeThreshold, DailyChallengeThreshold.names)