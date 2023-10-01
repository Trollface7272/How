import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { Profile as OsuProfile } from "@src/class/api/osu/Profile";
import { ActionRowBuilder, EmbedBuilder, InteractionReplyOptions, MessageReplyOptions, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { EmojiFactory } from "@src/class/Emojis";
import { GamemodeNames, GamemodeNumToStr } from "@src/class/api/osu/Consts";
import { GetFlag } from "@src/Utils";
import { TextRenderer } from "@src/class/renderer/Text";

interface args {
    username: string
    mode: "osu" | "mania" | "fruits" | "fruits"
}

class ProfileData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    private aliasToGamemode = {
        "osu": "osu",
        "std": "osu",
        "mania": "mania",
        "ctb": "fruits",
        "fruits": "fruits",
    }

    public GetComandArgs(): args {
        let mode = this.aliasToGamemode[this.data.GetCommand()] ?? "osu"
        mode = this.data.GetString("gamemode", ["m", "mode", "-m", "-mode"]) ?? mode
        if (!isNaN(Number(mode)))
            mode = GamemodeNumToStr[Number(mode)] ?? mode
        const username = this.data.GetUsername()
        return {
            mode,
            username
        }
    }
}

class Profile implements CommandAbstract {
    public static readonly names: string[] = ["osu", "std", "mania", "ctb", "fruits", "profile"]
    private data: ProfileData

    constructor(data: MessageEventData) {
        this.data = new ProfileData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()

        let {
            mode, username
        } = this.data.GetComandArgs()

        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction()
            if (interaction.isAnySelectMenu()) {
                username = interaction.customId.split(";")[1]
                mode = interaction.values[0] as "osu" | "mania" | "fruits" | "fruits"
            }
        }


        const fetcher = await Fetcher.Create(user.id)
        const profile = username ? await fetcher.GetProfile({ Username: username, Gamemode: mode }) : await fetcher.GetOwnProfile({ Gamemode: "osu" })

        const replyOptions = this.RenderProfile({ profile, mode })

        await this.data.Reply(replyOptions)


        return CommandResponseCodes.OK
    }

    private RenderProfile({ profile, mode }: { profile: OsuProfile.FromId, mode: "osu" | "mania" | "fruits" | "fruits" }) {
        const embed = new EmbedBuilder()
        const { statistics, username, country_code, is_online } = profile
        const { global_rank, level, pp, hit_accuracy: accuracy, ranked_score, total_score, grade_counts, play_count, play_time, country_rank } = statistics
        const { current: currentLevel, progress: levelProgress } = level

        const countryRank = !country_rank ? "" : ` (${country_code}#${country_rank})`
        const globalRank = !global_rank ? "-" : `${global_rank.toLocaleString("en-US")}`

        const description = TextRenderer.render("profile", {
            globalRank: globalRank, countryRank: countryRank,
            currentLevel: currentLevel, levelProgress: (levelProgress % 1 !== 0) ? levelProgress.roundFixed(2) : levelProgress,
            pp: pp.roundFixed(2), accuracy: accuracy.roundFixed(2),
            rankedScore: ranked_score.asScientificNotation(), totalScore: total_score.asScientificNotation(),
            grades: this.RenderGrades(grade_counts),
            playCount: play_count.toLocaleString("en-US"), playTime: Math.round(play_time / 3600),
        })

        embed
            .setAuthor({
                name: `${GamemodeNames[mode]} Profile for ${username}`,
                iconURL: GetFlag(country_code),
                url: `https://osu.ppy.sh/users/${profile.id}`
            }).setDescription(description)
            .setThumbnail(`https://a.ppy.sh/${profile.id}`)
            .setFooter({ text: `Currently ${is_online ? "Online" : "Offline"}` })
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`profile;${profile.id}`)
            .setPlaceholder("Select a gamemode")
            .setOptions(this.GamemodeSelectMenuOptions(mode))

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

        const response: MessageReplyOptions | InteractionReplyOptions = {
            embeds: [embed],
            components: [row]
        }
        return response
    }

    private GamemodeSelectMenuOptions(currentMode: string) {
        return [
            new StringSelectMenuOptionBuilder()
                .setDefault(currentMode === "osu")
                .setLabel(GamemodeNames.osu)
                .setValue("osu")
                .setEmoji(EmojiFactory.GetEmoji("ModeOsu")),
            new StringSelectMenuOptionBuilder()
                .setDefault(currentMode === "fruits")
                .setLabel(GamemodeNames.fruits)
                .setValue("fruits")
                .setEmoji(EmojiFactory.GetEmoji("ModeFruits")),
            new StringSelectMenuOptionBuilder()
                .setDefault(currentMode === "taiko")
                .setLabel(GamemodeNames.taiko)
                .setValue("taiko")
                .setEmoji(EmojiFactory.GetEmoji("ModeTaiko")),
            new StringSelectMenuOptionBuilder()
                .setDefault(currentMode === "mania")
                .setLabel(GamemodeNames.mania)
                .setValue("mania")
                .setEmoji(EmojiFactory.GetEmoji("ModeMania"))
        ]
    }

    private RenderGrades({ a, s, sh, ss, ssh }: OsuProfile.Grades) {
        return [
            `${EmojiFactory.GetEmoji("RankingXH")}${ssh}`,
            `${EmojiFactory.GetEmoji("RankingSH")}${sh}`,
            `${EmojiFactory.GetEmoji("RankingX")}${ss}`,
            `${EmojiFactory.GetEmoji("RankingS")}${s}`,
            `${EmojiFactory.GetEmoji("RankingA")}${a}`,
        ].join(" ")
    }

}

CommandEmitterInstance.AddCommand(Profile, Profile.names)