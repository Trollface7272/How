import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { DailyChallengeProfileFactory } from "@src/class/database/DailyChallengeProfile";
import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { Profile } from "@src/class/api/osu/class/Profile";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { Logger } from "@src/class/Logger";
import { HandleAsync } from "@src/Utils";

interface args {
}

class DailyChallengeTopPlayersData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
        }
    }
}

class DailyChallengeTopPlayers extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["dctp", "dctopplayers", "dailychallengetopplayers"]
    private data: DailyChallengeTopPlayersData


    constructor(data: MessageEventData) {
        super()
        this.data = new DailyChallengeTopPlayersData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const challengeCount = await DailyChallengeFactory.GetCount({})
        const _profiles = await DailyChallengeProfileFactory.GetDailyChallengeProfiles({
            "top10Percent.count": challengeCount
        })

        const fetcher = await Fetcher.Create(user.id)

        const fetchedProfiles: Profile.FromIds[] = []
        const profiles = []
        while (_profiles.length) {
            const batch = _profiles.splice(0, 50)
            const [fetched, err] = await HandleAsync(fetcher.GetByUserIds({ ids: batch.map(el => el.id) }))
            if (err) {
                Logger.Error(err)
                this.data.Reply(this.RenderApiError())
                return CommandResponseCodes.UnknownError
            }
            profiles.push(...batch)
            fetchedProfiles.push(...fetched)
        }


        const rows = fetchedProfiles.sort((a,b) => a.statistics_rulesets.osu.global_rank - b.statistics_rulesets.osu.global_rank).map((profile, i) => {
            return `${i+1};${profile.id};${profile.username};${profile.statistics_rulesets.osu.global_rank}`
        })

        const text = `\`\`\`${rows.join("\n")}\`\`\``

        await this.data.Reply({ content: text })

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(DailyChallengeTopPlayers, DailyChallengeTopPlayers.names)