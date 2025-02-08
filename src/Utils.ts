import { escapeMarkdown, SlashCommandStringOption } from "discord.js"
import { Logger } from "./class/Logger"
import { Beatmap } from "./class/api/osu/class/Beatmap"
import { Gamemode, RulesetIds } from "./class/api/osu/types/MiscTypes"
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

export const FormatHits = ({ great, ignore_hit, ignore_miss, large_bonus, large_tick_hit, meh, miss, ok, slider_tail_hit, small_bonus }: Partial<Score.Statistics>, gamemode: RulesetIds | Gamemode) => {
    switch (gamemode) {
        case 0:
        case "osu":
        case 1:
        case "taiko":
            return `[${great}/${ok}/${meh}/${miss}]`
        case 2:
        case "fruits":
            return `[${great}/${ok}/${meh}/${large_tick_hit}/${miss}]`
        case 3:
        case "mania":
            return `[${large_bonus}/${great}/${small_bonus}/${ok}/${meh}/${miss}]`
        default:
            Logger.Error(`Unknown gamemode: ${gamemode}`)
            return "[Error]"
    }
}

export const FormatProgress = (gamemode: RulesetIds, { great, ignore_hit, ignore_miss, large_bonus, large_tick_hit, meh, miss, ok, slider_tail_hit, small_bonus }: Partial<Score.Statistics>, { count_circles, count_sliders, count_spinners }: Beatmap.Base) => {
    switch (gamemode) {
        case 0:
        case 1:
            return ((great + ok + meh + miss) / (count_circles + count_sliders + count_spinners) * 100).roundFixed(2)
        case 2:
            return ((great + ok + meh + miss + large_tick_hit) / (count_circles + count_sliders + count_spinners) * 100).roundFixed(2)
        case 3:
            return ((large_bonus + great + ignore_hit + ok + meh + miss + ignore_miss) / (count_circles + count_sliders + count_spinners) * 100).roundFixed(2)
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

        case "difference":
        case "diff":
            return "altPp.{ppver}.difference"

        case "newpp":
            return "altPp.{ppver}.normal.pp"


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

export function formatAsGain(val: number) {
    return val > 0 ? `+${val.toLocaleString()}` : val.toLocaleString()
}

export function GetCountryFlag(countryCode: string) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

export function convertSeconds(seconds: number): { days: number, hours: number, minutes: number, seconds: number } {
    const days = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return { days, hours, minutes, seconds };
}