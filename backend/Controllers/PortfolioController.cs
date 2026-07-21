using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using SmartPortfolio.Api.Models;
using SmartPortfolio.Api.Services;

namespace SmartPortfolio.Api.Controllers;

[ApiController]
[Route("api/portfolio")]
public sealed class PortfolioController : ControllerBase
{
    private readonly IPortfolioContextService _portfolioContext;
    private readonly IAiService _aiService;
    private readonly ILogger<PortfolioController> _logger;

    private static readonly JsonSerializerOptions StreamJsonOptions = new()
    {
        WriteIndented = false
    };

    public PortfolioController(
        IPortfolioContextService portfolioContext,
        IAiService aiService,
        ILogger<PortfolioController> logger)
    {
        _portfolioContext = portfolioContext;
        _aiService = aiService;
        _logger = logger;
    }
    
    [HttpGet("data")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetData()
    {
        return Content(_portfolioContext.RawProfileJson, "application/json", Encoding.UTF8);
    }
    
    [HttpPost("chat/stream")]
    public async Task ChatStream([FromBody] ChatRequestDto request, CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no"; 

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            await WriteChunkAsync(new ChatStreamChunkDto { Error = "Message must not be empty.", Done = true }, cancellationToken);
            return;
        }

        try
        {
            await foreach (var token in _aiService.StreamChatResponseAsync(request, cancellationToken))
            {
                await WriteChunkAsync(new ChatStreamChunkDto { Content = token }, cancellationToken);
            }

            await WriteChunkAsync(new ChatStreamChunkDto { Done = true }, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // Client navigated away / closed the connection — nothing further to do.
            _logger.LogInformation("Chat stream cancelled by client.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error while streaming chat response.");
            await WriteChunkAsync(
                new ChatStreamChunkDto { Error = "An unexpected error occurred while generating the response.", Done = true },
                cancellationToken);
        }
    }

    private async Task WriteChunkAsync(ChatStreamChunkDto chunk, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(chunk, StreamJsonOptions);
        var sseFrame = $"data: {json}\n\n";
        var bytes = Encoding.UTF8.GetBytes(sseFrame);

        await Response.Body.WriteAsync(bytes, cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
