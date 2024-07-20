import { escapeMarkdown } from "discord.js"
import { Logger } from "./class/Logger"
import { Beatmap } from "./class/api/osu/class/Beatmap"
import { Gamemode } from "./class/api/osu/types/MiscTypes"
import { Score } from "./class/api/osu/class/Score"
import { exec } from "child_process"


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

export const RunProcess = (command: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            exec(command, {}, (err, stdout, stderr) => {
                if (err) return reject({ err, stderr, stdout })
                resolve(stdout)
            })
        } catch (error) {
            reject(error)
        }
    })
}

export const ParseJson = <T>(json: string): Promise<[T, null] | [null, SyntaxError]> => {
    return new Promise((resolve) => {
        try {
            resolve([JSON.parse(json), null])
        } catch (error) {
            resolve([null, error])
        }
    })
}

export const ButtonEmojis = {
    Start: "⇇",
    End: "⇉",
    Left: "←",
    Right: "→"
}

export const lookupScoresColumn = (col: string) => {
    switch (col) {
        case "ar":
        case "od":
        case "cs":
        case "hp":
            return `beatmap.difficulty.${col}`

        case "miss":
        case "misses":
            return `counts.misses`

        case "replay":
            return "hasReplay"


        case "pp":
        case "accuracy":
        case "combo":
        case "score":
        case "rank":
            return col


        case "setid":
            return "beatmap.setId"


        case "playcount":
        case "pascount":
        case "rating":
        case "storyboard":
        case "video":
        case "bpm":
        case "id":
            return `beatmap.${col}`

        case "stars":
            return `beatmap.difficulty.stars.total`
        case "aimstars":
            return `beatmap.difficulty.stars.aim`
        case "speedstars":
            return `beatmap.difficulty.stars.speed`
        case "flstars":
            return `beatmap.difficulty.stars.fl`

        case "length":
        case "drain":
            return `beatmap.length.${col}`

        case "acc":
            return `accuracy`

        case "date":
            return "setAt"

        case "n100":
            return "counts.100"
        case "n50":
            return "counts.50"
        case "n300":
            return "counts.300"

        default: return col
    }
}

export function merge(target: { [key: string]: any }, source: { [key: string]: any }) {
    for (const [key, val] of Object.entries(source)) {
        if (val !== null && typeof val === `object`) {
            if (target[key] === undefined) {
                target[key] = new val.__proto__.constructor();
            }
            target[key] = merge(target[key], val);
        } else {
            target[key] = val;
        }
    }
    return target;
}