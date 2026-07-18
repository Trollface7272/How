import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { UsernameArg } from "@src/utils/discord/help";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { GetFlag, HandleAsync } from "@src/Utils";
import { DailyChallengeProfileFactory } from "@src/class/database/DailyChallengeProfile";
import { TextRenderer } from "@src/class/renderer/Text";
import { EmojiFactory } from "@src/class/Emojis";
import { SlashCommandBuilder } from "discord.js";

interface args {
    Username: string
}

class DailyChallengeProfileData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Username: this.data.GetRemaining()
        }
    }
}

class DailyChallengeProfile extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["dcp", "dcprofile", "dailychallengeprofile", "daily-challenge-profile"]
    public static readonly helpData = new CommandHelp()
    private data: DailyChallengeProfileData


    constructor(data: MessageEventData) {
        super()
        this.data = new DailyChallengeProfileData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { Username: username } = this.data.args
        const user = this.data.GetUser()

        const Username = username || user?.osu?.username
        if (!Username) {
            this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.USER_ERROR
        }
        const fetcher = await Fetcher.Create(user.id)
        const [profile, err] = await HandleAsync(fetcher.GetProfile({ Username, Gamemode: "osu" }))
        if (err) {
            this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.ERROR
        }

        const dcProfile = await DailyChallengeProfileFactory.GetDailyChallengeProfile(profile.id)
        if (!dcProfile) {
            this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.USER_ERROR
        }

        const grades = {
            XH: 0,
            X: 0,
            SH: 0,
            S: 0,
            A: 0,
            B: 0,
            C: 0,
            D: 0
        }

        dcProfile.scoreData.forEach(score => {
            grades[score.rank]++
        })

        const description = TextRenderer.render("dailychallenge/profile", {
            avgRank: Math.round(dcProfile.scoreData.reduce((v, p) => v + p.position, 0) / dcProfile.scoreData.length),
            avgRankPerc: (dcProfile.scoreData.reduce((v, p) => v + p.positionPercent, 0) / dcProfile.scoreData.length).toFixed(3),
            perc10Placements: dcProfile.placements.top10.count,
            perc50Placements: dcProfile.placements.top50.count,
            played: dcProfile.placements.total,
            avgScore: Math.round(dcProfile.scoreData.reduce((v, p) => v + p.score, 0) / dcProfile.scoreData.length),
            grades: Object.entries(grades).filter(([k, v]) => v > 0).map(([key, value]) => EmojiFactory.GetEmoji(`Ranking${key}`) + `${value} `).join(""),
            streak: dcProfile.streakData.currentStreak,
            longestStreak: dcProfile.streakData.longestStreak,
            detailedView: `https://howbot.net/daily-challenge/user/${profile.id}`
        })

        const embed = this.GetBaseEmbed()
            .setAuthor({
                name: `Daily Challenge Profile for ${profile.username}`,
                iconURL: GetFlag(profile.country_code),
                url: profile.url
            })
            .setDescription(description)
            .setThumbnail(profile.avatar_url)

        this.data.Reply({ embeds: [embed] })
            

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(DailyChallengeProfile, DailyChallengeProfile.names)

DailyChallengeProfile.helpData
    .setCommand(DailyChallengeProfile.name)
    .setGroup(CommandGroup.DailyChallenge)
    .setDescription("Display daily challenge profile")
    .setUsage("dcp [username]")
    .setAliases(DailyChallengeProfile.names)
    .addArg(UsernameArg);