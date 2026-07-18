using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Newtonsoft.Json.Linq;
using osu.Game.Online.API;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Mods;

namespace howbot.PerformanceCalculator;

internal static class ModParser
{
    /// <summary>
    /// Parse mods from Edge/Node input.
    /// Supported forms:
    /// <list type="bullet">
    /// <item><c>["HD", "DT"]</c></item>
    /// <item><c>[{ "acronym": "DT", "settings": { "speed_change": 1.3 } }]</c></item>
    /// <item>mixed array with acronym strings + objects</item>
    /// <item>osu-tools style options: <c>["DT", "DT_speed_change=1.3"]</c></item>
    /// </list>
    /// </summary>
    public static Mod[] Parse(Ruleset ruleset, JToken? modsToken)
    {
        if (modsToken is null || modsToken.Type == JTokenType.Null)
            return [];

        if (modsToken.Type != JTokenType.Array)
            throw new ArgumentException("mods must be an array of acronyms or { acronym, settings } objects.");

        var apiMods = new Dictionary<string, APIMod>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in (JArray)modsToken)
        {
            switch (item.Type)
            {
                case JTokenType.String:
                    ParseStringEntry(item.Value<string>()!, apiMods);
                    break;

                case JTokenType.Object:
                    ParseObjectEntry((JObject)item, apiMods);
                    break;

                default:
                    throw new ArgumentException($"Unsupported mod entry: {item}");
            }
        }

        return apiMods.Values
            .Where(m => !string.IsNullOrWhiteSpace(m.Acronym))
            .Select(m => m.ToMod(ruleset))
            .ToArray();
    }

    private static void ParseStringEntry(string raw, Dictionary<string, APIMod> apiMods)
    {
        raw = raw.Trim();
        if (raw.Length == 0)
            return;

        // osu-tools: "DT_speed_change=1.3"
        int eq = raw.IndexOf('=');
        if (eq > 0)
        {
            string left = raw[..eq];
            string value = raw[(eq + 1)..];
            int underscore = left.IndexOf('_');
            if (underscore <= 0)
                throw new ArgumentException($"Invalid mod-option format (Acronym_setting=value): {raw}");

            string acronym = left[..underscore];
            string settingKey = left[(underscore + 1)..];

            var mod = GetOrCreate(apiMods, acronym);
            mod.Settings[settingKey] = CoerceSettingValue(value);
            return;
        }

        GetOrCreate(apiMods, raw);
    }

    private static void ParseObjectEntry(JObject obj, Dictionary<string, APIMod> apiMods)
    {
        string? acronym = obj.Value<string>("acronym") ?? obj.Value<string>("Acronym");
        if (string.IsNullOrWhiteSpace(acronym))
            throw new ArgumentException($"Mod object missing acronym: {obj}");

        var mod = GetOrCreate(apiMods, acronym);

        JToken? settingsToken = obj["settings"] ?? obj["Settings"];
        if (settingsToken is null || settingsToken.Type == JTokenType.Null)
            return;

        if (settingsToken is not JObject settingsObj)
            throw new ArgumentException($"Mod settings must be an object for {acronym}.");

        foreach (var prop in settingsObj.Properties())
            mod.Settings[prop.Name] = CoerceSettingValue(prop.Value);
    }

    private static APIMod GetOrCreate(Dictionary<string, APIMod> apiMods, string acronym)
    {
        if (!apiMods.TryGetValue(acronym, out var mod))
        {
            mod = new APIMod { Acronym = acronym };
            apiMods[acronym] = mod;
        }

        return mod;
    }

    /// <summary>
    /// Edge/JSON often boxes numbers as long/double/string; bindables need clean primitives.
    /// </summary>
    private static object CoerceSettingValue(JToken token) => token.Type switch
    {
        JTokenType.Integer => token.Value<long>(),
        JTokenType.Float => token.Value<double>(),
        JTokenType.Boolean => token.Value<bool>(),
        JTokenType.String => CoerceSettingValue(token.Value<string>()!),
        JTokenType.Null => null!,
        _ => token.ToObject<object>() ?? token.ToString()
    };

    private static object CoerceSettingValue(string value)
    {
        if (bool.TryParse(value, out bool b))
            return b;

        if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out long l)
            && !value.Contains('.', StringComparison.Ordinal))
            return l;

        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out double d))
            return d;

        return value;
    }
}
