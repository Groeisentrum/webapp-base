using System.Text.Json;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace WebAppBase.Api.Data.Configurations;

/// <summary>
/// Builds converters for value objects persisted as JSON text. A matching comparer
/// is required alongside every converter, otherwise EF cannot detect in-place edits
/// to the converted object and silently drops the change.
/// </summary>
internal static class JsonColumn
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public static ValueConverter<TValue, string> Converter<TValue>()
        where TValue : class, new() => new(
            value => Serialise(value),
            json => Deserialise<TValue>(json));

    public static ValueComparer<TValue> Comparer<TValue>()
        where TValue : class, new() => new(
            (left, right) => Serialise(left) == Serialise(right),
            value => Serialise(value).GetHashCode(StringComparison.Ordinal),
            value => Deserialise<TValue>(Serialise(value)));

    public static ValueConverter<IReadOnlyList<string>, string> StringListConverter() => new(
        value => JsonSerializer.Serialize(value, SerializerOptions),
        json => DeserialiseStringList(json));

    public static ValueComparer<IReadOnlyList<string>> StringListComparer() => new(
        (left, right) => left != null && right != null && left.SequenceEqual(right),
        value => value.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode(StringComparison.Ordinal))),
        value => value.ToList());

    private static string Serialise<TValue>(TValue? value)
        where TValue : class, new() => JsonSerializer.Serialize(value ?? new TValue(), SerializerOptions);

    private static TValue Deserialise<TValue>(string json)
        where TValue : class, new() => string.IsNullOrWhiteSpace(json)
            ? new TValue()
            : JsonSerializer.Deserialize<TValue>(json, SerializerOptions) ?? new TValue();

    private static IReadOnlyList<string> DeserialiseStringList(string json) => string.IsNullOrWhiteSpace(json)
        ? []
        : JsonSerializer.Deserialize<List<string>>(json, SerializerOptions) ?? [];
}
