import { escapeMarkdown } from "discord.js"
import { Logger } from "./class/Logger"
import { Beatmap } from "./class/api/osu/Beatmap"
import { Gamemode } from "./class/api/osu/MiscTypes"
import { Score } from "./class/api/osu/Score"


export const HandleAsync = async <T, E>(promise: Promise<T>): Promise<[T, E]> => {
    try {
        return [await promise, null]
    } catch (err) {
        return [null, err]
    }
}

export const GetFlag = (code: string) => `https://flagcdn.com/w80/${code.toLowerCase()}.png`

export const FormatCombo = (combo: number, maxCombo: number, mode: number | string): string => {
    if (mode === 3 || mode === "mania") return `x${combo}`
    return `x${combo}/${maxCombo}`
}

export const FormatHits = ({ count_300, count_100, count_50, count_geki, count_katu, count_miss }: Score.Statistics, gamemode: Gamemode) => {
    switch (gamemode) {
        case "osu":
        case "taiko":
            return `[${count_300}/${count_100}/${count_50}/${count_miss}]`
        case "fruits":
            return `[${count_300}/${count_100}/${count_50}/${count_katu}/${count_miss}]`
        case "mania":
            return `[${count_geki}/${count_300}/${count_katu}/${count_100}/${count_50}/${count_miss}]`
        default:
            Logger.Error(`Unknown gamemode: ${gamemode}`)
            return "[Error]"
    }
}

export const FormatProgress = (gamemode: Gamemode, { count_300, count_100, count_50, count_geki, count_katu, count_miss }: Score.Statistics, { count_circles, count_sliders, count_spinners }: Beatmap.Base) => {
    switch (gamemode) {
        case "osu":
        case "taiko":
            return ((count_300 + count_100 + count_50 + count_miss) / (count_circles + count_sliders + count_spinners) * 100).roundFixed(2)
        case "fruits":
            return ((count_300 + count_100 + count_50 + count_miss + count_katu) / (count_circles + count_sliders + count_spinners) * 100).roundFixed(2)
        case "mania":
            return ((count_geki + count_300 + count_katu + count_100 + count_50 + count_miss + count_katu) / (count_circles + count_sliders + count_spinners) * 100).roundFixed(2)
        default:
            Logger.Error(`Unknown gamemode: ${gamemode}`)
            return "Unknown"
    }
}

export const Escape = (inp: string) => {
    return escapeMarkdown(inp, { escape: false })
}

export const ButtonEmojis = {
    Start: "⇇",
    End: "⇉",
    Left: "←",
    Right: "→"
}