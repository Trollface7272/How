using System;
using System.Collections.Generic;
using osu.Game.Rulesets.Scoring;

namespace howbot.PerformanceCalculator;

internal static class HitStatisticsParser
{
    public static Dictionary<HitResult, int> Parse(Dictionary<string, int>? source, Dictionary<string, int>? maximum = null)
    {
        var result = new Dictionary<HitResult, int>();

        if (source is null)
            return result;

        foreach (var (key, value) in source)
        {
            if (TryParseHitResult(key, out var hitResult))
                result[hitResult] = value;
        }

        // Match prior TS behaviour: derive large_tick_miss from maximum when omitted.
        if (!result.ContainsKey(HitResult.LargeTickMiss)
            && maximum is not null
            && TryGet(maximum, "large_tick_hit", out int maxLargeTickHit)
            && result.TryGetValue(HitResult.LargeTickHit, out int largeTickHit))
        {
            result[HitResult.LargeTickMiss] = Math.Max(0, maxLargeTickHit - largeTickHit);
        }

        return result;
    }

    private static bool TryGet(Dictionary<string, int> dict, string key, out int value)
    {
        if (dict.TryGetValue(key, out value))
            return true;

        foreach (var (k, v) in dict)
        {
            if (string.Equals(k, key, StringComparison.OrdinalIgnoreCase))
            {
                value = v;
                return true;
            }
        }

        value = 0;
        return false;
    }

    private static bool TryParseHitResult(string key, out HitResult hitResult)
    {
        var normalized = key.Replace("_", string.Empty, StringComparison.Ordinal);

        if (Enum.TryParse(normalized, ignoreCase: true, out hitResult) && hitResult != HitResult.None)
            return true;

        // Common aliases from osu! API / legacy naming
        hitResult = normalized.ToLowerInvariant() switch
        {
            "count300" or "n300" or "300" => HitResult.Great,
            "count100" or "n100" or "100" => HitResult.Ok,
            "count50" or "n50" or "50" => HitResult.Meh,
            "countmiss" or "nmiss" => HitResult.Miss,
            "countgeki" or "ngeki" or "geki" => HitResult.Perfect,
            "countkatu" or "nkatu" or "katu" => HitResult.Good,
            _ => HitResult.None
        };

        return hitResult != HitResult.None;
    }
}

