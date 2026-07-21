using System.Text.Json.Serialization;

namespace SmartPortfolio.Api.Models;

public static class ChatRole
{
    public const string System = "system";
    public const string User = "user";
    public const string Assistant = "assistant";
}

public sealed class ChatMessageDto
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = ChatRole.User;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

public sealed class ChatRequestDto
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
    
    [JsonPropertyName("history")]
    public List<ChatMessageDto> History { get; set; } = new();
}

public sealed class ChatStreamChunkDto
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("done")]
    public bool Done { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public sealed class GroqChatCompletionRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("messages")]
    public List<GroqMessage> Messages { get; set; } = new();

    [JsonPropertyName("temperature")]
    public double Temperature { get; set; } = 0.4;

    [JsonPropertyName("max_tokens")]
    public int MaxTokens { get; set; } = 1024;

    [JsonPropertyName("stream")]
    public bool Stream { get; set; } = true;
}

public sealed class GroqMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = ChatRole.User;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

public sealed class GroqStreamChunk
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("choices")]
    public List<GroqStreamChoice> Choices { get; set; } = new();
}

public sealed class GroqStreamChoice
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("delta")]
    public GroqDelta Delta { get; set; } = new();

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }
}

public sealed class GroqDelta
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
