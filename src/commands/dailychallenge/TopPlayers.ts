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
import { ButtonEmojis, GetFlag, HandleAsync } from "@src/Utils";
import { TextRenderer } from "@src/class/renderer/Text";
import NodeCache from "node-cache";
import { randomBytes } from "crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

interface args {
    Raw: boolean
    Page: number
}

const componentCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    checkperiod: 60 * 60 * 24,
    maxKeys: 10000, useClones: false
})

class DailyChallengeTopPlayersData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Raw: this.data.GetBoolean("raw", ["-r", "-raw"]),
            Page: this.data.GetNumber("page", ["-p", "-page"]) || 1
        }
    }
}

class DailyChallengeTopPlayers extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["dctp", "dctopplayers", "dailychallengetopplayers"]
    private data: DailyChallengeTopPlayersData
    private args: args
    private componentId: string
    private oldComponentId: string

    constructor(data: MessageEventData) {
        super()
        this.componentId = randomBytes(16).toString("hex")
        this.data = new DailyChallengeTopPlayersData(data)
        this.args = this.data.args
        this.oldComponentId = this.data.GetOldComponentId()
        if (this.oldComponentId) this.args = componentCache.get<args>(this.oldComponentId)
        componentCache.set(this.componentId, this.args)
    }

    public async Handle(): Promise<CommandResponseCodes> {
        if (this.args.Raw) {
            return this.SendRawData()
        }
        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isButton()) {
                const [command, componentId, page, id] = interaction.customId.split(";")
                this.args.Page = parseInt(page)
            }
        }
        const PER_PAGE = 20
        const { Page } = this.args
        const user = this.data.GetUser()

        const _profiles = await DailyChallengeProfileFactory.GetDailyChallengeProfiles({ }, [["top10Percent.count", - 1], ["averagePlacementPercent", 1]], Page * PER_PAGE, PER_PAGE * (Page - 1))

        const fetcher = await Fetcher.Create(user.id)

        const profiles = _profiles.slice((Page - 1) * PER_PAGE, Page * PER_PAGE)
        const [fetchedProfiles, fetchedProfilesError] = await HandleAsync(fetcher.GetByUserIds({ ids: profiles.map(el => el.id) }))
        if (fetchedProfilesError) {
            Logger.Error(fetchedProfilesError)
            this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.UnknownError
        }

        const text = TextRenderer.render("dailychallenge/topplayers", {
            profiles: profiles.map((profile, i) => {
                const fetched = fetchedProfiles.find(el => el.id == profile.id)
                return {
                    index: (Page - 1) * PER_PAGE + i + 1,
                    username: fetched.username,
                    rank: fetched.statistics_rulesets.osu.global_rank,
                    url: fetched.url, placementPercent: profile.averagePlacementPercent.roundFixed(2), placement: profile.averagePlacement.round(0)
                }
            })
        })

        const buttons = this.GetButtons()

        const embed = this.GetBaseEmbed()
            .setAuthor({
                name: "Top Daily Challenge Players",
                iconURL: GetFlag(fetchedProfiles.find(el => el.id == profiles[0].id)?.country?.code)
            })
            .setDescription(text)


        await this.data.Reply({ embeds: [embed], components: [buttons] })


        return CommandResponseCodes.OK
    }

    private GetButtons() {
        const row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(new ButtonBuilder()
            .setCustomId(`dctp;${this.componentId};${this.args.Page - 1};${randomBytes(4)}`)
            .setLabel(ButtonEmojis.Left)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(this.args.Page == 1),
        )
        row.addComponents(new ButtonBuilder()
            .setCustomId(`dctp;${this.componentId};${this.args.Page + 1};${randomBytes(4)}`)
            .setLabel(ButtonEmojis.Right)
            .setStyle(ButtonStyle.Primary)
        )
        return row
    }

    private async SendRawData() {
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


        const rows = fetchedProfiles.sort((a, b) => a.statistics_rulesets.osu.global_rank - b.statistics_rulesets.osu.global_rank).map((profile, i) => {
            return `${i + 1};${profile.id};${profile.username};${profile.statistics_rulesets.osu.global_rank}`
        })

        const text = `\`\`\`${rows.join("\n")}\`\`\``

        await this.data.Reply({ content: text })

        return CommandResponseCodes.OK
    }
}

CommandEmitterInstance.AddCommand(DailyChallengeTopPlayers, DailyChallengeTopPlayers.names)