using SmartPortfolio.Api.Services;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicyName = "SmartPortfolioCorsPolicy";

builder.Services.Configure<GroqOptions>(builder.Configuration.GetSection(GroqOptions.SectionName));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<IPortfolioContextService, PortfolioContextService>();

builder.Services.AddHttpClient<IAiService, AiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(100);
});

var configuredOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        // Production Vercel URL explicitly allowed alongside any configuration
        var allowedOrigins = new List<string>(configuredOrigins)
        {
            "https://smartportfolio-yusif-aslan.vercel.app"
        };

        policy.WithOrigins(allowedOrigins.ToArray())
            .SetIsOriginAllowedToAllowWildcardSubdomains()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors(CorsPolicyName);

app.MapControllers();

app.Services.GetRequiredService<IPortfolioContextService>();

app.Run();