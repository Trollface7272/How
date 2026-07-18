using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using howbot.PerformanceCalculator.Models;
using howbot.PerformanceCalculator.Simulate;
using osu.Game.Beatmaps;
using osu.Game.Database;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Mods;
using osu.Game.Rulesets.Scoring;
using osu.Game.Scoring;

namespace howbot.PerformanceCalculator;

/// <summary>
/// Replacement for <c>src/class/api/osu/PerformanceCalculator/</c> score PP calculation.
/// </summary>
public static class PerformanceCalculatorService
{
    /// <summary>
    /// Calculate performance for a score against a local .osu beatmap.
    /// </summary>
    public static object CalculateScore(ScoreCalculationRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.BeatmapPath))
            throw new ArgumentException("beatmapPath is required.");

        if (!File.Exists(request.BeatmapPath))
            throw new FileNotFoundException("Beatmap file not found.", request.BeatmapPath);

        if (request.Statistics is null || request.Statistics.Count == 0)
            throw new ArgumentException("statistics are required.");

        var workingBeatmap = new ProcessorWorkingBeatmap(request.BeatmapPath);
        int rulesetId = request.RulesetId ?? workingBeatmap.BeatmapInfo.Ruleset.OnlineID;
        var ruleset = LegacyHelper.GetRulesetFromLegacyId(rulesetId);

        var mods = ModParser.Parse(ruleset, request.Mods);
        var playableBeatmap = workingBeatmap.GetPlayableBeatmap(ruleset.RulesetInfo, mods);
        var scoreProcessor = CreateScoreProcessor(ruleset, playableBeatmap, mods);

        var statistics = HitStatisticsParser.Parse(request.Statistics, request.MaximumStatistics);
        var maximumStatistics = HitStatisticsParser.Parse(request.MaximumStatistics);
        if (maximumStatistics.Values.Sum() == 0)
            maximumStatistics = scoreProcessor.MaximumStatistics;

        var scoreInfo = new ScoreInfo(playableBeatmap.BeatmapInfo, ruleset.RulesetInfo)
        {
            Statistics = statistics,
            MaximumStatistics = maximumStatistics,
            LegacyTotalScore = request.LegacyTotalScore,
            TotalScore = request.TotalScore ?? request.LegacyTotalScore ?? 0,
            Mods = mods
        };

        scoreInfo.Accuracy = request.Accuracy is double provided
            ? NormalizeAccuracy(provided)
            : StandardisedScoreMigrationTools.ComputeAccuracy(scoreInfo, scoreProcessor);

        var difficultyCalculator = ruleset.CreateDifficultyCalculator(workingBeatmap);
        var difficultyAttributes = difficultyCalculator.Calculate(mods);

        // Omitted maxCombo → assume full combo for the map (+ mods).
        scoreInfo.MaxCombo = request.MaxCombo ?? difficultyAttributes.MaxCombo;

        var requestedImprovement = ScoreImprovement.Parse(request.Improvement);
        // Auto collapses to none/fc/ss; All stays All.
        var resolvedImprovement = ScoreImprovement.Resolve(requestedImprovement, scoreInfo, difficultyAttributes.MaxCombo, mods);

        var normal = BuildResultBody(ruleset, scoreInfo, difficultyAttributes, rulesetId, scoreProcessor);
        Dictionary<string, object?>? fc = null;
        Dictionary<string, object?>? ss = null;

        bool wantFc = resolvedImprovement is ImprovementMode.Fc or ImprovementMode.All;
        bool wantSs = resolvedImprovement is ImprovementMode.Ss or ImprovementMode.All;

        if (wantFc)
        {
            var fcScore = CreateImprovedScoreInfo(
                scoreInfo, maximumStatistics, difficultyAttributes.MaxCombo, scoreProcessor, ImprovementMode.Fc);
            fc = BuildResultBody(ruleset, fcScore, difficultyAttributes, rulesetId, scoreProcessor);
        }

        if (wantSs)
        {
            var ssScore = CreateImprovedScoreInfo(
                scoreInfo, maximumStatistics, difficultyAttributes.MaxCombo, scoreProcessor, ImprovementMode.Ss);
            ss = BuildResultBody(ruleset, ssScore, difficultyAttributes, rulesetId, scoreProcessor);
        }

        // `improved` keeps prior single-pick behaviour (auto/fc/ss); for `all` prefer SS if present else FC.
        Dictionary<string, object?>? improved = resolvedImprovement switch
        {
            ImprovementMode.Fc => fc,
            ImprovementMode.Ss => ss,
            ImprovementMode.All => ss ?? fc,
            _ => null
        };

        return EdgeMarshal.ToEdgeObject(new Dictionary<string, object?>
        {
            ["ok"] = true,
            ["improvement"] = ScoreImprovement.ToApi(resolvedImprovement),
            ["normal"] = normal,
            ["fc"] = fc,
            ["ss"] = ss,
            ["improved"] = improved
        });
    }

    /// <summary>
    /// Simulate performance. Only beatmap path required; omitted fields assume max/SS.
    /// Accuracy ↔ statistics: providing one derives the other.
    /// </summary>
    public static object Simulate(SimulateRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.BeatmapPath))
            throw new ArgumentException("beatmapPath is required.");

        if (!File.Exists(request.BeatmapPath))
            throw new FileNotFoundException("Beatmap file not found.", request.BeatmapPath);

        var workingBeatmap = new ProcessorWorkingBeatmap(request.BeatmapPath);
        int rulesetId = request.RulesetId ?? workingBeatmap.BeatmapInfo.Ruleset.OnlineID;
        var ruleset = LegacyHelper.GetRulesetFromLegacyId(rulesetId);

        var mods = ModParser.Parse(ruleset, request.Mods);
        var playableBeatmap = workingBeatmap.GetPlayableBeatmap(ruleset.RulesetInfo, mods);
        var scoreProcessor = CreateScoreProcessor(ruleset, playableBeatmap, mods);

        var providedStatistics = HitStatisticsParser.Parse(request.Statistics, request.MaximumStatistics);
        var maximumStatistics = HitStatisticsParser.Parse(request.MaximumStatistics);
        if (maximumStatistics.Values.Sum() == 0)
            maximumStatistics = scoreProcessor.MaximumStatistics;

        var scoreInfo = new ScoreInfo(playableBeatmap.BeatmapInfo, ruleset.RulesetInfo)
        {
            MaximumStatistics = maximumStatistics,
            LegacyTotalScore = request.LegacyTotalScore,
            TotalScore = request.TotalScore ?? request.LegacyTotalScore ?? 0,
            Mods = mods
        };

        bool hasJudgements = HitResultSimulator.HasUsableJudgements(providedStatistics);
        double? accuracy = request.Accuracy is double a ? NormalizeAccuracy(a) : null;

        if (hasJudgements)
        {
            scoreInfo.Statistics = providedStatistics;
            scoreInfo.Accuracy = accuracy ?? StandardisedScoreMigrationTools.ComputeAccuracy(scoreInfo, scoreProcessor);
        }
        else if (accuracy is double targetAccuracy)
        {
            int countMiss = providedStatistics.GetValueOrDefault(HitResult.Miss);
            scoreInfo.Statistics = HitResultSimulator.FromAccuracy(rulesetId, playableBeatmap, mods, targetAccuracy, countMiss);
            // Generators focus on basic judgements; keep nested maxima perfect unless a miss was generated.
            ApplyPerfectNestedJudgements(scoreInfo.Statistics, maximumStatistics);
            // Recompute so returned accuracy matches the rounded hit results.
            scoreInfo.Accuracy = StandardisedScoreMigrationTools.ComputeAccuracy(scoreInfo, scoreProcessor);
        }
        else
        {
            // Assume SS / max judgements from beatmap autoplay maxima.
            scoreInfo.Statistics = maximumStatistics.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
            scoreInfo.Accuracy = 1.0;
        }

        var difficultyCalculator = ruleset.CreateDifficultyCalculator(workingBeatmap);
        var difficultyAttributes = difficultyCalculator.Calculate(mods);
        scoreInfo.MaxCombo = request.MaxCombo ?? difficultyAttributes.MaxCombo;

        return BuildResult(ruleset, scoreInfo, difficultyAttributes, rulesetId, scoreProcessor);
    }

    private static ScoreProcessor CreateScoreProcessor(Ruleset ruleset, IBeatmap playableBeatmap, Mod[] mods)
    {
        var scoreProcessor = ruleset.CreateScoreProcessor();
        scoreProcessor.Mods.Value = mods;
        scoreProcessor.ApplyBeatmap(playableBeatmap);
        return scoreProcessor;
    }

    /// <summary>
    /// Accuracy generators often omit nested maxima (slider ticks/tails). Fill those from
    /// <paramref name="maximumStatistics"/> when not already present / missed.
    /// </summary>
    private static void ApplyPerfectNestedJudgements(
        Dictionary<HitResult, int> statistics,
        Dictionary<HitResult, int> maximumStatistics)
    {
        foreach (var (result, count) in maximumStatistics)
        {
            if (count <= 0)
                continue;

            // Don't overwrite basic judgements produced from the accuracy curve.
            if (result is HitResult.Great or HitResult.Ok or HitResult.Meh or HitResult.Good
                or HitResult.Perfect or HitResult.Miss)
                continue;

            if (statistics.ContainsKey(result))
                continue;

            // Skip miss-side counterparts if a miss count was generated for that category.
            if (result == HitResult.LargeTickHit && statistics.GetValueOrDefault(HitResult.LargeTickMiss) > 0)
                continue;

            if (result == HitResult.SmallTickHit && statistics.GetValueOrDefault(HitResult.SmallTickMiss) > 0)
                continue;

            if (result == HitResult.SliderTailHit && statistics.ContainsKey(HitResult.SliderTailHit))
                continue;

            statistics[result] = count;
        }
    }

    private static ScoreInfo CreateImprovedScoreInfo(
        ScoreInfo original,
        Dictionary<HitResult, int> maximumStatistics,
        int mapMaxCombo,
        ScoreProcessor scoreProcessor,
        ImprovementMode mode)
    {
        var statistics = mode == ImprovementMode.Ss
            ? ScoreImprovement.BuildSsStatistics(maximumStatistics)
            : ScoreImprovement.BuildFcStatistics(original.Statistics, maximumStatistics);

        var improved = new ScoreInfo(original.BeatmapInfo, original.Ruleset)
        {
            Statistics = statistics,
            MaximumStatistics = maximumStatistics,
            MaxCombo = mapMaxCombo,
            Mods = original.Mods.ToArray(),
            LegacyTotalScore = null,
            TotalScore = 0,
            Passed = true
        };

        improved.Accuracy = StandardisedScoreMigrationTools.ComputeAccuracy(improved, scoreProcessor);
        improved.Rank = StandardisedScoreMigrationTools.ComputeRank(improved, scoreProcessor);
        return improved;
    }

    private static Dictionary<string, object?> BuildResultBody(
        Ruleset ruleset,
        ScoreInfo scoreInfo,
        osu.Game.Rulesets.Difficulty.DifficultyAttributes difficultyAttributes,
        int rulesetId,
        ScoreProcessor scoreProcessor)
    {
        var performanceCalculator = ruleset.CreatePerformanceCalculator()
            ?? throw new InvalidOperationException($"No performance calculator for ruleset {rulesetId}.");

        var performanceAttributes = performanceCalculator.Calculate(scoreInfo, difficultyAttributes);

        // Ruleset RankFromScore + mod AdjustRank (HD/FL → SH/XH).
        var grade = StandardisedScoreMigrationTools.ComputeRank(scoreInfo, scoreProcessor);
        scoreInfo.Rank = grade;

        return new Dictionary<string, object?>
        {
            ["rulesetId"] = rulesetId,
            ["accuracy"] = scoreInfo.Accuracy,
            ["maxCombo"] = scoreInfo.MaxCombo,
            ["grade"] = grade.ToString(),
            ["statistics"] = StatisticsConverter.ToApi(scoreInfo.Statistics),
            ["performance"] = performanceAttributes,
            ["difficulty"] = difficultyAttributes
        };
    }

    private static object BuildResult(
        Ruleset ruleset,
        ScoreInfo scoreInfo,
        osu.Game.Rulesets.Difficulty.DifficultyAttributes difficultyAttributes,
        int rulesetId,
        ScoreProcessor scoreProcessor)
    {
        var body = BuildResultBody(ruleset, scoreInfo, difficultyAttributes, rulesetId, scoreProcessor);
        body["ok"] = true;
        return EdgeMarshal.ToEdgeObject(body);
    }

    private static double NormalizeAccuracy(double accuracy)
    {
        // osu! API uses 0–1; some callers may pass 0–100.
        if (accuracy > 1.0)
            accuracy /= 100.0;

        return Math.Clamp(accuracy, 0.0, 1.0);
    }
}
