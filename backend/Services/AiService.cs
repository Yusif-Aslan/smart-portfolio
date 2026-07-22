using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using SmartPortfolio.Api.Models;

namespace SmartPortfolio.Api.Services;

public sealed class GroqOptions
{
    public const string SectionName = "Groq";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.groq.com/openai/v1/chat/completions";
    public string Model { get; set; } = "llama-3.3-70b-versatile";
    public double Temperature { get; set; } = 0.4;
    public int MaxTokens { get; set; } = 1024;
    
    public int MaxHistoryMessages { get; set; } = 12;
}

public interface IAiService
{
    IAsyncEnumerable<string> StreamChatResponseAsync(ChatRequestDto request, CancellationToken cancellationToken);
}

public sealed class AiService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly IPortfolioContextService _portfolioContext;
    private readonly GroqOptions _options;
    private readonly ILogger<AiService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public AiService(
        HttpClient httpClient,
        IPortfolioContextService portfolioContext,
        Microsoft.Extensions.Options.IOptions<GroqOptions> options,
        ILogger<AiService> logger)
    {
        _httpClient = httpClient;
        _portfolioContext = portfolioContext;
        _options = options.Value;
        _logger = logger;

        // DIAGNOSTIC LOGGING
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogError("CRITICAL: Groq API key is missing or empty during initialization.");
        }
        else
        {
            var prefix = _options.ApiKey.Length > 4 ? _options.ApiKey[..4] : "???";
            _logger.LogInformation("Groq API key loaded successfully! Length: {Length}, Prefix: {Prefix}...", 
                _options.ApiKey.Length, prefix);
        }

        if (_httpClient.BaseAddress is null)
        {
            _httpClient.BaseAddress = new Uri(_options.BaseUrl);
        }

        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        }
    }

    public async IAsyncEnumerable<string> StreamChatResponseAsync(
        ChatRequestDto request,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogError("Groq API key is not configured.");
            yield return "[Configuration error: AI provider API key is missing on the server.]";
            yield break;
        }

        var systemPrompt = _portfolioContext.BuildSystemPrompt(request.Message);

        var messages = new List<GroqMessage>
        {
            new() { Role = ChatRole.System, Content = systemPrompt }
        };
        
        var trimmedHistory = request.History
            .Skip(Math.Max(0, request.History.Count - _options.MaxHistoryMessages))
            .Select(h => new GroqMessage { Role = NormalizeRole(h.Role), Content = h.Content });

        messages.AddRange(trimmedHistory);
        messages.Add(new GroqMessage { Role = ChatRole.User, Content = request.Message });

        var payload = new GroqChatCompletionRequest
        {
            Model = _options.Model,
            Messages = messages,
            Temperature = _options.Temperature,
            MaxTokens = _options.MaxTokens,
            Stream = true
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, _options.BaseUrl)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload, JsonOptions),
                Encoding.UTF8,
                "application/json")
        };

        using var response = await _httpClient.SendAsync(
            httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Groq API returned {StatusCode}: {Body}", response.StatusCode, errorBody);
            yield return $"[AI provider error: {(int)response.StatusCode} {response.ReasonPhrase}]";
            yield break;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            if (!line.StartsWith("data:", StringComparison.Ordinal))
            {
                continue;
            }

            var payloadText = line["data:".Length..].Trim();

            if (payloadText is "[DONE]")
            {
                yield break;
            }

            GroqStreamChunk? chunk;
            try
            {
                chunk = JsonSerializer.Deserialize<GroqStreamChunk>(payloadText, JsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to parse Groq stream chunk: {Payload}", payloadText);
                continue;
            }

            var token = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;

            if (!string.IsNullOrEmpty(token))
            {
                yield return token;
            }
        }
    }

    private static string NormalizeRole(string role) => role switch
    {
        ChatRole.System => ChatRole.System,
        ChatRole.Assistant => ChatRole.Assistant,
        _ => ChatRole.User
    };
}
