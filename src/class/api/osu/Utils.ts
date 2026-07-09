import { createWriteStream } from "fs"
import axios from "axios"
import { Logger } from "@src/class/Logger"
import { Score } from "./class/Score"
import { APIEmbed, Embed, Message } from "discord.js"

export const Clamp = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max)
}

export const Smoothstep = (x: number, start: number, end: number) => {
    x = Clamp((x - start) / (end - start), 0.0, 1.0);

    return x * x * (3.0 - 2.0 * x);
}

export const Logistic = (x: number, midpointOffset: number, multiplier: number, maxValue: number = 1) => maxValue / (1 + Math.exp(multiplier * (midpointOffset - x)));

export const ReverseLerp = (x: number, start: number, end: number) => Clamp((x - start) / (end - start), 0.0, 1.0)

export const Lerp = (x: number, y: number, t: number) => x + t * (y - x)

export const Norm = (exponent: number, ...values: number[]) =>
    Math.pow(values.reduce((sum, value) => sum + Math.pow(value, exponent), 0), 1.0 / exponent)

export const Erf = (x: number) => {
    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)

    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911
    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
}

export const ErfInv = (x: number) => {
    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)

    if (x >= 1)
        return sign * Infinity

    if (x === 0)
        return 0

    const a = 0.147
    const ln = Math.log(1 - x * x)
    const part1 = 2 / (Math.PI * a) + ln / 2
    const part2 = ln / a

    return sign * Math.sqrt(Math.sqrt(part1 * part1 - part2) - part1)
}

const downloading: { url: string, hasFinished: Promise<unknown> }[] = []
export const DownloadFile = async (url: string, path: string) => {
  const progress = downloading.find(el => el?.url === url)
  if (progress) return progress.hasFinished
  console.log(`Downloading -> ${url} -> ${path}`)
  const promise = new Promise(async (resolve, reject) => {
    try {
      const writer = createWriteStream(path)
      const resp = await axios.get(url, { responseType: "stream" })
      console.log(resp.headers)
      writer.on("finish", () => {
        delete downloading[downloading.findIndex(el => el?.url === url)]
        return resolve(true)
      })
      writer.on("error", (err) => {
        delete downloading[downloading.findIndex(el => el?.url === url)]
        Logger.Error(`Downloading file -> writer on error`)
        reject(err)
      })
      resp.data.pipe(writer)
    } catch (err) {
      Logger.Error(`Downloading file -> catch at bottom`)
      resolve(err)
    }
  })
  downloading.push({ url, hasFinished: promise })
  return promise
}

export const DisplayCombo = (combo: number, maxCombo: number, mode: number | string): string => {
  if (mode === 3 || mode === "mania") return `x${combo}`
  return `x${combo}/${maxCombo}`
}

export const CalculateProgress = ({ great, ignore_hit, ignore_miss, large_bonus, large_tick_hit, meh, miss, ok, slider_tail_hit, small_bonus }: Score.Statistics, { circles, sliders, spinners }: { circles: number, sliders: number, spinners: number }, mode: 0 | 1 | 2 | 3) => {
  switch (mode) {
      case 1:
      case 0:
          return ((great + ok + meh + miss) / (circles + sliders + spinners) * 100).roundFixed(2)
      case 2:
          return ((great + ok + meh + miss + ignore_hit) / (circles + sliders + spinners) * 100).roundFixed(2)
      case 3:
          return ((large_bonus + great + large_tick_hit + ok + meh + miss + ignore_miss) / (circles + sliders + spinners) * 100).roundFixed(2)
      default:
          Logger.Error(`Unknown gamemode: ${mode}`)
          return "Unknown"
  }
}

export const matchForId = (input: string) => {
  if (!input) return
  const regex = /https:\/\/osu\.ppy\.sh\/(b|beatmapsets|beatmap|beatmaps)\/([0-9]+)/gm
  const fullRegex = /https:\/\/osu\.ppy\.sh\/(b|beatmapsets|beatmap|beatmaps)\/([0-9]+)#(?:osu|taiko|fruits|mania)\/([0-9]+)/gm
  let matches = regex.exec(input)

  if (!matches) return
  if (matches[1] === "beatmapsets") {
      matches = fullRegex.exec(input)
      if (!matches) return
      return parseInt(matches[3])
  }
  return parseInt(matches[2])
}

export const searchMessage = (msg: Message) => {
  let matches = matchForId(msg.content)
  if (matches) return matches
  for (const embed of msg.embeds ?? []) {
      matches = searchEmbed(embed)
      if (matches) return matches
  }
}

export const searchEmbed = (embed: Embed|APIEmbed) => {
  let matches = matchForId(embed.title) ?? matchForId(embed?.author?.url) ?? matchForId(embed.url) ?? matchForId(embed.description)
  if (matches) return matches
  for (const field of embed.fields ?? []) {
      matches = matchForId(field.name) ?? matchForId(field.value)
      if (matches) return matches
  }
}