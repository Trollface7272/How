using System.Collections.Generic;
using System.Linq;
using howbot.PerformanceCalculator.Models;
using osu.Game.Rulesets.Mods;
using osu.Game.Rulesets.Scoring;
using osu.Game.Scoring;

namespace howbot.PerformanceCalculator;

internal static class ScoreImprovement
{
    public static ImprovementMode Parse(string? value) => (value?.Trim().ToLowerInvariant()) switch
    {
        null or "" or "none" => ImprovementMode.None,
        "fc" or "fullcombo" or "full_combo" => ImprovementMode.Fc,
        "ss" or "perfect" => ImprovementMode.Ss,
        "auto" => ImprovementMode.Auto,
        "all" or "both" => ImprovementMode.All,
        _ => throw new System.ArgumentException($"Unknown improvement mode '{value}'. Use none, fc, ss, auto, or all.")
    };

    public static string ToApi(ImprovementMode mode) => mode switch
    {
        ImprovementMode.Fc => "fc",
        ImprovementMode.Ss => "ss",
        ImprovementMode.Auto => "auto",
        ImprovementMode.All => "all",
        _ => "none"
    };

    /// <summary>
    /// Resolve <see cref="ImprovementMode.Auto"/> into none/fc/ss. Other modes pass through.
    /// </summary>
    public static ImprovementMode Resolve(
        ImprovementMode requested,
        ScoreInfo score,
        int mapMaxCombo,
        Mod[] mods)
    {
        if (requested != ImprovementMode.Auto)
            return requested;

        if (score.Accuracy >= 1.0)
            return ImprovementMode.None;

        return IsFullCombo(score, mapMaxCombo, mods)
            ? ImprovementMode.Ss
            : ImprovementMode.Fc;
    }

    public static bool IsFullCombo(ScoreInfo score, int mapMaxCombo, Mod[] mods)
    {
        int miss = score.Statistics.GetValueOrDefault(HitResult.Miss);
        int largeTickMiss = score.Statistics.GetValueOrDefault(HitResult.LargeTickMiss);
        bool classic = mods.Any(m => m is ModClassic);

        if (classic)
        {
            if (miss > 0)
                return false;

            return score.MaxCombo >= mapMaxCombo * 0.95;
        }

        return miss == 0 && largeTickMiss == 0;
    }

    /// <summary>
    /// FC-improved stats: misses folded into greats via max.great + miss (Node CalculateScore parity).
    /// </summary>
    public static Dictionary<HitResult, int> BuildFcStatistics(
        Dictionary<HitResult, int> statistics,
        Dictionary<HitResult, int> maximumStatistics)
    {
        int miss = statistics.GetValueOrDefault(HitResult.Miss);
        int maxGreat = maximumStatistics.GetValueOrDefault(HitResult.Great);

        var result = new Dictionary<HitResult, int>
        {
            [HitResult.Great] = (maxGreat > 0 ? maxGreat : statistics.GetValueOrDefault(HitResult.Great)) + miss,
            [HitResult.Ok] = statistics.GetValueOrDefault(HitResult.Ok),
            [HitResult.Meh] = statistics.GetValueOrDefault(HitResult.Meh),
            [HitResult.Miss] = 0,
            [HitResult.SliderTailHit] = statistics.GetValueOrDefault(HitResult.SliderTailHit),
            [HitResult.IgnoreHit] = statistics.GetValueOrDefault(HitResult.IgnoreHit),
            [HitResult.IgnoreMiss] = statistics.GetValueOrDefault(HitResult.IgnoreMiss),
            [HitResult.LargeBonus] = statistics.GetValueOrDefault(HitResult.LargeBonus),
            [HitResult.SmallBonus] = statistics.GetValueOrDefault(HitResult.SmallBonus),
        };

        if (maximumStatistics.TryGetValue(HitResult.LargeTickHit, out int maxLargeTick))
            result[HitResult.LargeTickHit] = maxLargeTick;
        else if (statistics.TryGetValue(HitResult.LargeTickHit, out int largeTick))
            result[HitResult.LargeTickHit] = largeTick;

        foreach (var (key, value) in statistics)
        {
            if (value == 0 || result.ContainsKey(key))
                continue;

            if (key is HitResult.LargeTickMiss or HitResult.Miss)
                continue;

            result[key] = value;
        }

        return result;
    }

    /// <summary>
    /// SS stats from maximum judgements (ignore hit/miss zeroed — Node CalculateScore parity).
    /// </summary>
    public static Dictionary<HitResult, int> BuildSsStatistics(Dictionary<HitResult, int> maximumStatistics)
    {
        return new Dictionary<HitResult, int>
        {
            [HitResult.Great] = maximumStatistics.GetValueOrDefault(HitResult.Great),
            [HitResult.Ok] = 0,
            [HitResult.Meh] = 0,
            [HitResult.Miss] = 0,
            [HitResult.LargeTickHit] = maximumStatistics.GetValueOrDefault(HitResult.LargeTickHit),
            [HitResult.SliderTailHit] = maximumStatistics.GetValueOrDefault(HitResult.SliderTailHit),
            [HitResult.IgnoreHit] = 0,
            [HitResult.IgnoreMiss] = 0,
            [HitResult.LargeBonus] = maximumStatistics.GetValueOrDefault(HitResult.LargeBonus),
            [HitResult.SmallBonus] = maximumStatistics.GetValueOrDefault(HitResult.SmallBonus),
        };
    }
}
