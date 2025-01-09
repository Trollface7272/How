import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { Profile as OsuProfile } from "@src/class/api/osu/class/Profile";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionReplyOptions, MessageReplyOptions, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { EmojiFactory } from "@src/class/Emojis";
import { GamemodeNames, GamemodeNumToStr } from "@src/class/api/osu/Consts";
import { ButtonEmojis, GetFlag, HandleAsync } from "@src/Utils";
import { TextRenderer } from "@src/class/renderer/Text";
import { AxiosError } from "axios";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { Logger } from "@src/class/Logger";
import { FetcherError, FetcherErrors } from "@src/class/api/osu/class/FetcherError";
import { CONTEXT_FULL, GamemodeStringOption, UsernameStringOption } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";
import { RespektiveScoreAPI } from "@src/class/api/osu/class/respektive/Score";

interface args {
  username: string
  mode: Gamemode
  events: boolean
}

class ProfileData extends CommandData implements CommandDataAbstract {
  public args: args
  constructor(data: MessageEventData) {
    super(data)
    this.args = this.GetComandArgs()
  }

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
    const events = this.data.GetBoolean("events", ["e"])
    const username = this.data.GetRemaining()
    return {
      mode,
      username,
      events
    }
  }
}

class Profile extends CommandBase implements CommandAbstract {
  public static readonly names: string[] = ["osu", "std", "mania", "ctb", "fruits", "profile"]
  public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
  private data: ProfileData

  constructor(data: MessageEventData) {
    super()
    this.data = new ProfileData(data)
  }
  public async Handle(): Promise<CommandResponseCodes> {
    const user = this.data.GetUser()

    let {
      mode, username, events
    } = this.data.args

    let page = 1
    const perPage = 15

    if (this.data.IsInteraction()) {
      const interaction = this.data.GetInteraction()
      if (interaction.isAnySelectMenu()) {
        username = interaction.customId.split(";")[1]
        mode = interaction.values[0] as Gamemode
      }
      if (interaction.isButton()) {
        const [_, _username, __, _page] = interaction.customId.split(";")
        events = true
        page = Number(_page)
        username = _username
      }
    }


    const fetcher = await Fetcher.Create(user.id)

    let replyOptions: InteractionReplyOptions | MessageReplyOptions

    if (events) {
      const [profile, errProfile] = await HandleAsync(username ? fetcher.GetProfile({ Username: username, Gamemode: mode }) : fetcher.GetOwnProfile({ Gamemode: mode }))
      if (errProfile) return await this.ApiError(errProfile, username)
      const [events, err] = await HandleAsync(fetcher.GetRecentEvents({ id: profile.id, Limit: perPage, Offset: (page - 1) * perPage }))
      if (err) return await this.ApiError(err, username)
      replyOptions = this.RenderEvents({ events, page, profile, perPage })
    } else {
      const [profile, err] = await HandleAsync(username ? fetcher.GetProfile({ Username: username, Gamemode: mode }) : fetcher.GetOwnProfile({ Gamemode: mode }))
      if (err) {
        const errorReply = this.HandleProfileError(err, username)
        if (errorReply) {
          this.data.Reply(errorReply)
          return CommandResponseCodes.OK
        }
        return CommandResponseCodes.UnknownError
      }
      const [scoreProfile, scoreProfileErr] = await HandleAsync(fetcher.ScoreProfile({ user_id: profile.id }))
      if (scoreProfileErr) {
        const embed = this.HandleProfileError(scoreProfileErr, username)
        await this.data.Reply(embed)
        return CommandResponseCodes.OK
      }
      replyOptions = this.RenderProfile({ profile, mode, scoreProfile })
    }

    await this.data.Reply(replyOptions)


    return CommandResponseCodes.OK
  }

  private RenderProfile({ profile, mode, scoreProfile }: { profile: OsuProfile.FromId, mode: Gamemode, scoreProfile: RespektiveScoreAPI.Profile }) {
    const embed = this.GetBaseEmbed()
    const { statistics, username, country_code, is_online } = profile
    const { global_rank, level, pp, hit_accuracy: accuracy, ranked_score, total_score, grade_counts, play_count, play_time, country_rank } = statistics
    const { current: currentLevel, progress: levelProgress } = level

    const countryRank = !country_rank ? "" : ` (${country_code}#${country_rank})`
    const globalRank = !global_rank ? "-" : `${global_rank.toLocaleString("en-US")}`

    const description = TextRenderer.render("profile/profile", {
      globalRank: globalRank, countryRank: countryRank, scoreRank: scoreProfile?.rank,
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

  private async ApiError(err: any, username: string) {
    if (err) {
      if (err instanceof AxiosError) {
        switch (err.status) {
          case 404: {
            await this.data.Reply(this.RenderUserNotFound({ username }))
            return CommandResponseCodes.OK
          }
          case 502:
          case 503:
          case 520: {
            await this.data.Reply(this.RenderApiError())
            return CommandResponseCodes.OsuApiDown
          }
          default:
            Logger.Error("Profile - ApiError", err)
            return CommandResponseCodes.UnknownError
        }
      } else {
        if (err instanceof FetcherError) {
          switch (err.code) {
            case FetcherErrors.UserNotLinked: {
              await this.data.Reply(this.RenderUserNotFound({ username }))
              return CommandResponseCodes.OK
            }
            case FetcherErrors.MissingIdentifyScope: {
              await this.data.Reply(this.RenderApiError())
              return CommandResponseCodes.OsuApiDown
            }
            default:
              Logger.Error("Profile - ApiError", err)
              return CommandResponseCodes.UnknownError
          }

        }
      }
    }
  }

  private RenderEvent({ event }: { event: OsuProfile.RecentActivity }) {
    let data: { [key: string]: any } = {}
    const urlBase = "https://osu.ppy.sh"
    switch (event.type) {
      case "achievement": {
        const e = event as OsuProfile.RecentActivityAchievement
        data = {
          achievement: e.achievement,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "beatmapPlaycount": {
        const e = event as OsuProfile.RecentActivityBeatmapPlaycount
        data = {
          beatmapName: e.beatmap.title,
          beatmapUrl: urlBase + e.beatmap.url,
          count: e.count,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "beatmapsetApprove": {
        const e = event as OsuProfile.RecentActivityBeatmapsetApprove
        data = {
          approval: e.approval,
          beatmapName: e.beatmapset.title,
          beatmapUrl: urlBase + e.beatmapset.url,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "beatmapsetDelete": {
        const e = event as OsuProfile.RecentActivityBeatmapsetDelete
        data = {
          beatmapName: e.beatmapset.title,
          beatmapUrl: urlBase + e.beatmapset.url,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "beatmapsetRevive": {
        const e = event as OsuProfile.RecentActivityBeatmapsetRevive
        data = {
          beatmapName: e.beatmapset.title,
          beatmapUrl: urlBase + e.beatmapset.url,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "beatmapsetUpdate": {
        const e = event as OsuProfile.RecentActivityBeatmapsetUpdate
        data = {
          beatmapName: e.beatmapset.title,
          beatmapUrl: urlBase + e.beatmapset.url,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "beatmapsetUpload": {
        const e = event as OsuProfile.RecentActivityBeatmapsetUpload
        data = {
          beatmapName: e.beatmapset.title,
          beatmapUrl: urlBase + e.beatmapset.url,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "rank": {
        const e = event as OsuProfile.RecentActivityRank
        data = {
          beatmapName: e.beatmap.title,
          beatmapUrl: urlBase + e.beatmap.url,
          grade: EmojiFactory.GetEmoji(`Ranking${e.scoreRank}`),
          rank: e.rank,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "rankLost": {
        const e = event as OsuProfile.RecentActivityRankLost
        data = {
          beatmapName: e.beatmap.title,
          beatmapUrl: urlBase + e.beatmap.url,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "usernameChange": {
        const e = event as OsuProfile.RecentActivityUsernameChange
        data = {
          oldUsername: e.user.previousUsername,
          newUsername: e.user.username,
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "userSupportAgain": {
        const e = event as OsuProfile.RecentActivityUserSupportAgain
        data = {
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "userSupportFirst": {
        const e = event as OsuProfile.RecentActivityUserSupportFirst
        data = {
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
      case "userSupportGift": {
        const e = event as OsuProfile.RecentActivityUserSupportGift
        data = {
          timestamp: new Date(e.created_at).toDiscordToolTip()
        }
        break
      }
    }
    return TextRenderer.render(`events/${event.type}`, data)
  }

  private RenderEvents({ events, profile, page, perPage }: { events: OsuProfile.RecentActivity[], profile: OsuProfile.FromId, page: number, perPage: number }): InteractionReplyOptions | MessageReplyOptions {
    const row = this.EventsArrows(profile.username, page)
    if (perPage > events.length) row.components[1].setDisabled(true)
    const embed = this.GetBaseEmbed()
    embed.setAuthor({
      name: `Recent Activity for ${profile.username}`,
      iconURL: GetFlag(profile.country_code),
      url: `https://osu.ppy.sh/users/${profile.id}`
    })
    embed.setThumbnail(`https://a.ppy.sh/${profile.id}`)
    embed.setDescription(events.map(event => this.RenderEvent({ event })).join("\n"))
    return {
      embeds: [embed],
      components: [row]
    }
  }

  private EventsArrows(username: string, page: number) {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`profile;${username};events;${page - 1}`)
          .setDisabled(page - 1 <= 0)
          .setLabel(ButtonEmojis.Left)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`profile;${username};events;${page + 1}`)
          .setDisabled(false)
          .setLabel(ButtonEmojis.Right)
          .setStyle(ButtonStyle.Primary),
      )
  }

  private RenderUserNotFound({ username }: { username: string }) {
    const embed = this.GetBaseEmbed()
      .setTitle(`User ${username} not found`)
    return {
      embeds: [embed]
    }
  }

  private GamemodeSelectMenuOptions(currentMode: string) {
    return [
      new StringSelectMenuOptionBuilder()
        .setDefault(currentMode === "osu")
        .setLabel(GamemodeNames.osu)
        .setValue("osu")
        .setEmoji(EmojiFactory.GetEmoji("ModeOsu", true)),
      new StringSelectMenuOptionBuilder()
        .setDefault(currentMode === "fruits")
        .setLabel(GamemodeNames.fruits)
        .setValue("fruits")
        .setEmoji(EmojiFactory.GetEmoji("ModeFruits", true)),
      new StringSelectMenuOptionBuilder()
        .setDefault(currentMode === "taiko")
        .setLabel(GamemodeNames.taiko)
        .setValue("taiko")
        .setEmoji(EmojiFactory.GetEmoji("ModeTaiko", true)),
      new StringSelectMenuOptionBuilder()
        .setDefault(currentMode === "mania")
        .setLabel(GamemodeNames.mania)
        .setValue("mania")
        .setEmoji(EmojiFactory.GetEmoji("ModeMania", true))
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

Profile.interactionData
  .setContexts(CONTEXT_FULL)
  .setName("profile")
  .setDescription("Osu profile for user")
  .addStringOption(UsernameStringOption)
  .addStringOption(GamemodeStringOption)
  .addBooleanOption(opt =>
    opt
      .setName("events")
      .setDescription("Show profile events")
      .setRequired(false)
  )


CommandEmitterInstance.AddCommand(Profile, Profile.names)
InteractionRegistrerInstance.AddInteraction(Profile.interactionData)