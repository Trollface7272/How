import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { GetFlag, HandleAsync, formatAsGain } from "@src/Utils";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { Logger } from "@src/class/Logger";
import { TextRenderer } from "@src/class/renderer/Text";
import { EmojiFactory } from "@src/class/Emojis";

interface args {
    Username: string
}

class UpdateData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Username: this.data.GetUsername()
        }
    }
}

class Update extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["update", "u"]
    private data: UpdateData


    constructor(data: MessageEventData) {
        super()
        this.data = new UpdateData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { Username: username } = this.data.args
        const user = this.data.GetUser()

        const Username = username ?? user.osu.username

        const fetcher = await Fetcher.Create(user.id)

        const [profile, profileError] = await HandleAsync(fetcher.GetProfile({ Username, Gamemode: "osu" }))
        if (profileError) {
            Logger.Error(profileError)
            return CommandResponseCodes.UnknownError
        }

        const [updated, updateError] = await HandleAsync(fetcher.AmeoTrackUpdate({ id: profile.id, mode: 0 }))
        if (updateError) {
            Logger.Error(updateError)
            return CommandResponseCodes.UnknownError
        }

        const text = TextRenderer.render("profile/update", {
            global_rank: profile.statistics.global_rank.toLocaleString(), 
            gain: formatAsGain(updated.pp_rank * -1) || "0",
            pp: profile.statistics.pp.toLocaleString(),
            ppGain: formatAsGain(updated.pp_raw),
            accuracy: profile.statistics.hit_accuracy.roundFixed(2),
            accuracyGain: formatAsGain(updated.accuracy.round(2)),
            rankedScore: profile.statistics.ranked_score.asScientificNotation(),
            totalScore: profile.statistics.total_score.asScientificNotation(),
            rankedScoreGain: updated.ranked_score.asScientificNotation(),
            totalScoreGain: updated.total_score.asScientificNotation(),
            grades: `${EmojiFactory.GetEmoji("RankingX")}${profile.statistics.grade_counts.ss + profile.statistics.grade_counts.ssh} ${EmojiFactory.GetEmoji("RankingS")}${profile.statistics.grade_counts.s + profile.statistics.grade_counts.sh} ${EmojiFactory.GetEmoji("RankingA")}${profile.statistics.grade_counts.a}`,
            gradesGain: `${EmojiFactory.GetEmoji("RankingX")}${updated.count_rank_ss} ${EmojiFactory.GetEmoji("RankingS")}${updated.count_rank_s} ${EmojiFactory.GetEmoji("RankingA")}${updated.count_rank_a}`,
            playcount: profile.statistics.play_count.toLocaleString(),
            playcountGain: updated.playcount.toLocaleString(),
            topPlayCount: updated.newhs.length
        })

        const embed = this.GetBaseEmbed()
            .setAuthor({
                name: `Gains since last update for ${profile.username}`,
                iconURL: GetFlag(profile.country_code),
                url: `https://ameobea.me/osutrack/user/${profile.username}/`
            })
            .setDescription(text)
            .setThumbnail(profile.avatar_url)

        this.data.Reply({ embeds: [embed] })


        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Update, Update.names)