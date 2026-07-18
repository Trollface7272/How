import { existsSync, mkdirSync } from "fs";
import { Score } from "../class/Score";
import { func } from "edge-js"
import { PerformanceCalculatorEdgeError, PerformanceCalculatorEdgeRequest, PerformanceCalculatorEdgeResponse } from "../types/PerformanceCalculator-Edge";
import { Beatmap } from "../class/Beatmap";
import { DownloadFile } from "../Utils";
import { join } from "path";
import { EdgeBindings } from "./EdgeBindings";
import { Mods } from "../class/Mods";


const cachePath = process.env.BEATMAP_CACHE ?? "cache/beatmaps/osu"


if (!existsSync(cachePath))
    mkdirSync(cachePath, { recursive: true })

const {
    calculate,
    simulate
} = new EdgeBindings(`${process.env.DOTNET_BUILD_PATH}/howbot.PerformanceCalculator.dll`)

interface SimulateScoreParams {
    beatmap: Beatmap.Base
    mods: Mods.ModList
    accuracy: number
}

export class PerformanceCalculator {
    

    public async CalculateScore(score: Score.Recent|Score.FromId) {
        const input = {
            beatmapPath: await this.getBeatmapFile(score.Beatmap),
            accuracy: score.Accuracy,
            maxCombo: score.MaxCombo,
            statistics: score.Statistics,
            maximumStatistics: score.MaximumStatistics,
            legacyTotalScore: score.LegacyTotalScore,
            mods: score.Mods.Mods,
            rulesetId: score.RulesetId,
            totalScore: score.TotalScore,
        }
        const result = await calculate(input)

        if (!result.ok) throw new Error((result as PerformanceCalculatorEdgeError).error)
        
        if (score.Accuracy === 1) {
            return {
                normal: result,
                improved: null
            }
        }

        if (score.IsFullCombo(result.difficulty.max_combo)) {
            input.accuracy = 1
            delete input.maxCombo
            input.statistics = {
                great: score.MaximumStatistics.great,
                ok: 0,
                meh: 0,
                miss: 0,
                large_tick_hit: score.MaximumStatistics.large_tick_hit,
                slider_tail_hit: score.MaximumStatistics.slider_tail_hit,
                ignore_hit: 0,
                ignore_miss: 0,
                large_bonus: score.MaximumStatistics.large_bonus,
                small_bonus: score.MaximumStatistics.small_bonus,
            }
            delete input.legacyTotalScore
            delete input.totalScore
        } else {
            delete input.accuracy
            delete input.maxCombo
            input.statistics = {
                great: score.MaximumStatistics.great + score.Statistics.miss,
                ok: score.Statistics.ok,
                meh: score.Statistics.meh,
                miss: 0,
                large_tick_hit: score.MaximumStatistics.large_tick_hit,
                slider_tail_hit: score.Statistics.slider_tail_hit,
                ignore_hit: score.Statistics.ignore_hit,
                ignore_miss: score.Statistics.ignore_miss,
                large_bonus: score.Statistics.large_bonus,
                small_bonus: score.Statistics.small_bonus,       
            }
            delete input.legacyTotalScore
            delete input.totalScore
        }

        const improved = await calculate(input)

        if (!improved.ok) throw new Error((improved as PerformanceCalculatorEdgeError).error)

        return {
            normal: result,
            improved: improved
        }
    }

    public async SimulateScore({accuracy, beatmap, mods}: SimulateScoreParams) {
        const input = {
            beatmapPath: await this.getBeatmapFile(beatmap),
            mods: mods.Mods,
            rulesetId: beatmap.mode_int,
            accuracy: accuracy,
        }

        const result = await simulate(input)
        if (!result.ok) throw new Error((result as PerformanceCalculatorEdgeError).error)
        return result
    }

    private async getBeatmapFile(beatmap: Beatmap.Base) {
        const path = join(`${cachePath}`, `${beatmap.id}.osu`)
        if (!existsSync(path)) {
            await DownloadFile(`https://osu.ppy.sh/osu/${beatmap.id}`, path)
        }
        return path
    }
}