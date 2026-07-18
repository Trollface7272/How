import { existsSync, mkdirSync } from "fs";
import { Score } from "../class/Score";
import { PerformanceCalculatorEdgeError, ImprovementMode } from "../types/PerformanceCalculator-Edge";
import { Beatmap } from "../class/Beatmap";
import { DownloadFile, DownloadWithQueue } from "../Utils";
import { join } from "path";
import { EdgeBindings } from "./EdgeBindings";
import { Mods } from "../class/Mods";
import { PerformanceContainer } from "../types/PerformanceContainer";


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

interface CalculateScoreOptions {
    /** none | fc | ss | auto | all. Default auto (prior behaviour). */
    improvement?: ImprovementMode
}

export class PerformanceCalculator {


    public async CalculateScore(
        score: Score.Recent | Score.FromId,
        { improvement = "auto" }: CalculateScoreOptions = {}
    ): Promise<PerformanceContainer> {
        const result = await calculate({
            beatmapPath: await this.getBeatmapFile(score.Beatmap),
            accuracy: score.Accuracy,
            maxCombo: score.MaxCombo,
            statistics: score.Statistics,
            maximumStatistics: score.MaximumStatistics,
            legacyTotalScore: score.LegacyTotalScore,
            mods: score.Mods.Mods,
            rulesetId: score.RulesetId,
            totalScore: score.TotalScore,
            improvement,
        })

        if (!result.ok) {
            console.error(result, await this.getBeatmapFile(score.Beatmap))
            throw new Error((result as PerformanceCalculatorEdgeError).error)
        }

        return {
            normal: result.normal,
            improved: result.improved,
            fc: result.fc,
            ss: result.ss,
        }
    }

    public async SimulateScore({ accuracy, beatmap, mods }: SimulateScoreParams) {
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
            await DownloadWithQueue(`https://osu.ppy.sh/osu/${beatmap.id}`, path)
        }
        return path
    }
}
