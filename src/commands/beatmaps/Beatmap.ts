import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Gamemode } from "@src/class/api/osu/MiscTypes";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { HandleAsync } from "@src/Utils";
import { PerformanceCalculator } from "@src/class/api/osu/PerformanceCalculator";
import { Logger } from "@src/class/Logger";
import { AxiosError } from "axios";
import { TextRenderer } from "@src/class/renderer/Text";
import { ActionRow, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { EmojiFactory } from "@src/class/Emojis";
import { toBitMods } from "@src/class/api/osu/Utils";
import { CommandBase } from "@src/class/base/Command";

interface args {
  Gamemode: Gamemode
  Mods: string[]
  id: number
  Acc: number
  Background: boolean
}

class BeatmapData extends CommandData implements CommandDataAbstract {
  public args: args
  constructor(data: MessageEventData) {
    super(data)
    this.args = this.GetComandArgs()
  }

  public GetBeatmap() {
    return this.data.GetBeatmapFromConversation()
  }

  public GetComandArgs(): args {
    const Gamemode = this.data.GetGamemode()
    const Mods = this.data.GetMods()
    const Acc = this.data.GetNumber("accuracy", ["acc", "a", "-accuracy", "-acc", "-a"])
    const Background = this.data.GetBoolean("background", ["bg", "-background", "-bg"])
    const id = parseInt(this.data.GetUsername())
    return {
      Gamemode, Mods, id: !isNaN(id) ? id : null, Acc: Acc, Background
    }
  }
}

class Beatmap extends CommandBase implements CommandAbstract {
  public static readonly names: string[] = ["map", "beatmap", "m"]
  private data: BeatmapData

  constructor(data: MessageEventData) {
    super()
    this.data = new BeatmapData(data)
  }
  public async Handle(): Promise<CommandResponseCodes> {
    const user = this.data.GetUser()
    let { Gamemode, Mods, id: _id, Acc, Background } = this.data.args
    console.log({ Gamemode, Mods, _id, Acc })
    if (this.data.IsInteraction()) {
      const interaction = this.data.GetInteraction()
      if (interaction.isStringSelectMenu()) {
        const [_, type, id, gamemode] = interaction.customId.split(";")
        Gamemode = gamemode as Gamemode
        if (type === "mods") {
          _id = parseInt(id)
          Mods = interaction.values
        } else if (type === "difficulty") {
          _id = parseInt(interaction.values[0])
        }
      }
    }

    let id = _id
    if (!id) {
      id = await this.data.GetBeatmap()
    }

    const fetcher = await Fetcher.Create(user.id)
    const [beatmap, err] = await HandleAsync(fetcher.GetBeatmap({ Gamemode: Gamemode, id: id }))
    if (err) {
      if (err instanceof AxiosError) {
        this.BeatmapError(err)
        return CommandResponseCodes.OK
      }
      Logger.Error("Fetch beatmap error ->", err)
      return CommandResponseCodes.UnknownError
    }

    if (Background) {
      this.data.Reply({
        content: `https://assets.ppy.sh/beatmaps/${beatmap.beatmapset.id}/covers/raw.jpg`
      })
      return
    }

    beatmap.setMods(Mods)
    const loadingSet = HandleAsync(fetcher.GetBeatmapSet({ id: beatmap.beatmapset.id }))

    const calc = new PerformanceCalculator(beatmap, Mods)

    await calc.FetchAttributes()

    const { Drain: drain, AR: ar, HP: hp, OD: od, CS: cs, id: mapid, version, max_combo, Length: length, BPM: bpm, difficulty_rating, beatmapset: { id: setid, artist, creator, title, status: _status, ranked_date, favourite_count, submitted_date } } = beatmap
    const status = _status.charAt(0).toUpperCase() + _status.slice(1)
    let accs = [100, 99, 98, Acc ?? 95]
    const pps = await Promise.all([
      calc.CalculateByAcc(100), calc.CalculateByAcc(99), calc.CalculateByAcc(98), calc.CalculateByAcc(Acc ?? 95)
    ])

    let pp = this.RenderBeatmapPP(pps, accs)

    const [beatmapset, err2] = await loadingSet
    if (err2) {
      Logger.Error("Fetch beatmapset error ->", err2)
      return CommandResponseCodes.UnknownError
    }

    const difficultyOptions = []

    beatmapset.beatmaps.forEach(map => {
      difficultyOptions.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${map.difficulty_rating}★ - ${map.version}`)
          .setValue(map.id.toString())
          .setDefault(map.id === mapid)
          .setEmoji(EmojiFactory.GetDifficultyEmoji(map.difficulty_rating, Gamemode))
      )
    })


    const difficultySelect = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .addOptions(...difficultyOptions)
          .setCustomId(`beatmap;difficulty;${id};${Gamemode}`)
      )

    let mods = toBitMods(Mods)
    const modsSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .addOptions(
            this.modSelectMenuOption((mods & 1) > 0, "NoFail", "NF", "<:NoFail:586217719632887808>"),
            this.modSelectMenuOption((mods & 2) > 0, "Easy", "EZ", "<:Easy:586217683188580377>"),
            this.modSelectMenuOption((mods & 8) > 0, "Hidden", "HD", "<:Hidden:586217719129440256>"),
            this.modSelectMenuOption((mods & 16) > 0, "Hard Rock", "HR", "<:HardRock:586217719125245952>"),
            this.modSelectMenuOption((mods & 64) > 0, "Double Time", "DT", "<:DoubleTime:586217676276367361>"),
            this.modSelectMenuOption((mods & 256) > 0, "Half Time", "hT", "<:HalfTime:586217719104405504>"),
            this.modSelectMenuOption((mods & 1024) > 0, "Flashlight", "FL", "<:Flashlight:586217710371733536>"),
            this.modSelectMenuOption((mods & 4096) > 0, "Spun Out", "SO", "<:SpunOut:586217719318315030>")
          )
          .setMinValues(0)
          .setMaxValues(8)
          .setCustomId(`beatmap;mods;${id};${Gamemode}`)
      )


    const description = TextRenderer.render("beatmap/beatmap", {
      length: length.asTime(), drain: length != drain ? ` (${drain.asTime()})` : "", bpm: bpm, mods: Mods?.join("") ?? "No Mods",
      setid: setid, id: mapid,
      difficulty: EmojiFactory.GetDifficultyEmoji(difficulty_rating, Gamemode), version: version,
      stars: difficulty_rating.roundFixed(2), maxCombo: max_combo,
      ar: ar.roundDynamicFixed(1, 2), od: od.roundDynamicFixed(1, 2), hp: hp.roundDynamicFixed(1, 2), cs: cs.roundDynamicFixed(1, 2),
      pp: pp
    })
    const embed = this.GetBaseEmbed()
    embed.setDescription(description)
    embed.setAuthor({
      name: `${artist} - ${title} by ${creator}`,
      url: `https://osu.ppy.sh/b/${mapid}`,
    })
    embed.setFooter({
      text: `${status} ${new Date(ranked_date ?? submitted_date).toLocaleDateString()} | ${favourite_count} ❤︎`
    })
    embed.setThumbnail(`https://b.ppy.sh/thumb/${setid}l.jpg`)

    this.data.Reply({
      embeds: [embed],
      components: [difficultySelect, modsSelect]
    })

    return CommandResponseCodes.OK
  }

  private modSelectMenuOption(def: boolean, label: string, value: string, emoji: string) {
    return new StringSelectMenuOptionBuilder()
      .setDefault(def)
      .setLabel(label)
      .setValue(value)
      .setEmoji(emoji)
  }

  private BeatmapError(error: AxiosError) {
    switch (error.response.status) {
      case 404:
        this.data.Reply({
          content: "Beatmap not found",
          ephemeral: true
        })
        break;
      default:
        this.data.Reply({
          content: "Something went wrong",
          ephemeral: true
        })
        break;
    }
  }

}

CommandEmitterInstance.AddCommand(Beatmap, Beatmap.names)