using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using howbot.PerformanceCalculator.Models;
using Newtonsoft.Json.Linq;

namespace howbot.PerformanceCalculator.Edge;

/// <summary>
/// Edge-js entry points. Node loads this assembly with EDGE_USE_CORECLR=1.
/// </summary>
public class EdgeBridge
{
    /// <summary>
    /// Calculate performance for a real score (statistics required).
    /// </summary>
    public Task<object> CalculatePerformance(object input)
    {
        try
        {
            var request = ParseScoreRequest(input);
            return Task.FromResult(PerformanceCalculatorService.CalculateScore(request));
        }
        catch (Exception ex)
        {
            return Task.FromResult(ErrorResult(ex));
        }
    }

    /// <summary>
    /// Simulate performance. Only beatmapPath required; omitted fields assume max/SS.
    /// Accuracy ↔ statistics derived when only one is provided.
    /// </summary>
    public Task<object> SimulatePerformance(object input)
    {
        try
        {
            var request = ParseSimulateRequest(input);
            return Task.FromResult(PerformanceCalculatorService.Simulate(request));
        }
        catch (Exception ex)
        {
            return Task.FromResult(ErrorResult(ex));
        }
    }

    /// <summary>
    /// Health / version probe for Edge wiring checks.
    /// </summary>
    public Task<object> Ping(object? input)
    {
        return Task.FromResult<object>(new Dictionary<string, object?>
        {
            ["ok"] = true,
            ["assembly"] = typeof(EdgeBridge).Assembly.GetName().Name,
            ["message"] = "howbot.PerformanceCalculator ready"
        });
    }

    private static object ErrorResult(Exception ex)
        => EdgeMarshal.ToEdgeObject(new Dictionary<string, object?>
        {
            ["ok"] = false,
            ["error"] = ex.Message,
            ["type"] = ex.GetType().Name
        });

    private static ScoreCalculationRequest ParseScoreRequest(object input)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (input is ScoreCalculationRequest typed)
            return typed;

        var token = input as JToken ?? JToken.FromObject(input);
        var request = token.ToObject<ScoreCalculationRequest>()
                      ?? throw new ArgumentException("Could not parse CalculatePerformance input.");

        ApplyCommonAliases(token, request);
        return request;
    }

    private static SimulateRequest ParseSimulateRequest(object input)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (input is SimulateRequest typed)
            return typed;

        var token = input as JToken ?? JToken.FromObject(input);
        var request = token.ToObject<SimulateRequest>()
                      ?? throw new ArgumentException("Could not parse SimulatePerformance input.");

        ApplyCommonAliases(token, request);
        return request;
    }

    private static void ApplyCommonAliases(JToken token, ScoreCalculationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.BeatmapPath))
            request.BeatmapPath = token.Value<string>("beatmap_path") ?? string.Empty;

        if (request.RulesetId is null && token["ruleset_id"] is not null)
            request.RulesetId = token.Value<int?>("ruleset_id");

        if (request.MaxCombo is null && token["max_combo"] is not null)
            request.MaxCombo = token.Value<int?>("max_combo");

        if (request.TotalScore is null && token["total_score"] is not null)
            request.TotalScore = token.Value<long?>("total_score");

        if (request.LegacyTotalScore is null && token["legacy_total_score"] is not null)
            request.LegacyTotalScore = token.Value<long?>("legacy_total_score");

        if (request.Statistics is null && token["statistics"] is JObject statsObj)
            request.Statistics = statsObj.ToObject<Dictionary<string, int>>();

        if (request.MaximumStatistics is null && token["maximum_statistics"] is JObject maxStatsObj)
            request.MaximumStatistics = maxStatsObj.ToObject<Dictionary<string, int>>();

        if (request.Mods is null && token["mods"] is not null)
            request.Mods = token["mods"];
    }

    private static void ApplyCommonAliases(JToken token, SimulateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.BeatmapPath))
            request.BeatmapPath = token.Value<string>("beatmap_path") ?? string.Empty;

        if (request.RulesetId is null && token["ruleset_id"] is not null)
            request.RulesetId = token.Value<int?>("ruleset_id");

        if (request.MaxCombo is null && token["max_combo"] is not null)
            request.MaxCombo = token.Value<int?>("max_combo");

        if (request.TotalScore is null && token["total_score"] is not null)
            request.TotalScore = token.Value<long?>("total_score");

        if (request.LegacyTotalScore is null && token["legacy_total_score"] is not null)
            request.LegacyTotalScore = token.Value<long?>("legacy_total_score");

        if (request.Statistics is null && token["statistics"] is JObject statsObj)
            request.Statistics = statsObj.ToObject<Dictionary<string, int>>();

        if (request.MaximumStatistics is null && token["maximum_statistics"] is JObject maxStatsObj)
            request.MaximumStatistics = maxStatsObj.ToObject<Dictionary<string, int>>();

        if (request.Mods is null && token["mods"] is not null)
            request.Mods = token["mods"];
    }
}
