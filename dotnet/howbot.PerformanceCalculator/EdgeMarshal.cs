using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace howbot.PerformanceCalculator;

/// <summary>
/// Edge-js cannot marshal Newtonsoft <see cref="JObject"/> / complex POCOs reliably
/// (nested values often arrive in Node as empty arrays). Convert to plain
/// <see cref="Dictionary{TKey,TValue}"/> + CLR primitives first.
/// </summary>
internal static class EdgeMarshal
{
    public static object ToEdgeObject(object value)
    {
        var json = JsonConvert.SerializeObject(value);
        return FromToken(JToken.Parse(json))!;
    }

    private static object? FromToken(JToken token) => token.Type switch
    {
        JTokenType.Object => ((JObject)token).Properties()
            .ToDictionary(p => p.Name, p => FromToken(p.Value)),

        JTokenType.Array => token.Select(FromToken).ToArray(),

        JTokenType.Integer => token.Value<long>(),
        JTokenType.Float => token.Value<double>(),
        JTokenType.Boolean => token.Value<bool>(),
        JTokenType.String => token.Value<string>(),
        JTokenType.Null or JTokenType.Undefined => null,

        _ => token.ToString()
    };
}
