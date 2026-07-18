using System.Collections.Generic;
using System.Linq;
using System.Text;
using osu.Game.Rulesets.Scoring;

namespace howbot.PerformanceCalculator;

internal static class StatisticsConverter
{
    public static Dictionary<string, int> ToApi(Dictionary<HitResult, int> statistics)
        => statistics
            .Where(kvp => kvp.Value != 0)
            .ToDictionary(kvp => ToApiKey(kvp.Key), kvp => kvp.Value);

    private static string ToApiKey(HitResult result)
    {
        // Great -> great, LargeTickHit -> large_tick_hit
        string name = result.ToString();
        if (name.Length == 0)
            return name;

        var sb = new StringBuilder(name.Length + 4);
        sb.Append(char.ToLowerInvariant(name[0]));

        for (int i = 1; i < name.Length; i++)
        {
            char c = name[i];
            if (char.IsUpper(c))
            {
                sb.Append('_');
                sb.Append(char.ToLowerInvariant(c));
            }
            else
            {
                sb.Append(c);
            }
        }

        return sb.ToString();
    }
}
