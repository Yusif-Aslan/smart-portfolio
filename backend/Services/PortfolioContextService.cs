using System.Text.Json;
using System.Text.Json.Serialization;

namespace SmartPortfolio.Api.Services;

public sealed record PersonalInfo(
    [property: JsonPropertyName("fullName")] string FullName,
    [property: JsonPropertyName("headline")] string Headline,
    [property: JsonPropertyName("location")] string Location,
    [property: JsonPropertyName("relocation")] string Relocation,
    [property: JsonPropertyName("workAuthorization")] string WorkAuthorization,
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("phone")] string Phone,
    [property: JsonPropertyName("linkedin")] string Linkedin,
    [property: JsonPropertyName("github")] string Github,
    [property: JsonPropertyName("languagesSpoken")] List<LanguageEntry> LanguagesSpoken
);

public sealed record LanguageEntry(
    [property: JsonPropertyName("language")] string Language,
    [property: JsonPropertyName("level")] string Level
);

public sealed record EducationEntry(
    [property: JsonPropertyName("degree")] string Degree,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("institution")] string Institution,
    [property: JsonPropertyName("startDate")] string StartDate,
    [property: JsonPropertyName("endDate")] string? EndDate,
    [property: JsonPropertyName("coursework")] List<string> Coursework
);

public sealed record ExperienceEntry(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("company")] string Company,
    [property: JsonPropertyName("startDate")] string StartDate,
    [property: JsonPropertyName("endDate")] string? EndDate,
    [property: JsonPropertyName("current")] bool Current,
    [property: JsonPropertyName("primaryStack")] List<string> PrimaryStack,
    [property: JsonPropertyName("highlights")] List<string> Highlights
);

public sealed record WeightedSkill(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("weight")] int Weight,
    [property: JsonPropertyName("note")] string? Note
);

public sealed record SkillsData(
    [property: JsonPropertyName("primaryFocus")] List<string> PrimaryFocus,
    [property: JsonPropertyName("backendAndCloud")] List<WeightedSkill> BackendAndCloud,
    [property: JsonPropertyName("frontend")] List<WeightedSkill> Frontend,
    [property: JsonPropertyName("testingAndTools")] List<WeightedSkill> TestingAndTools,
    [property: JsonPropertyName("secondary")] List<WeightedSkill> Secondary
);

public sealed record ProjectEntry(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("year")] string Year,
    [property: JsonPropertyName("stack")] List<string> Stack,
    [property: JsonPropertyName("category")] string Category,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("link")] string? Link,
    [property: JsonPropertyName("flagshipProject")] bool FlagshipProject
);

public sealed record GithubRepoEntry(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("language")] string Language,
    [property: JsonPropertyName("note")] string Note
);

public sealed record ConstraintsData(
    [property: JsonPropertyName("doNotDiscuss")] List<string> DoNotDiscuss,
    [property: JsonPropertyName("toneOfVoice")] string ToneOfVoice
);

public sealed record CvProfile(
    [property: JsonPropertyName("personal")] PersonalInfo Personal,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("education")] List<EducationEntry> Education,
    [property: JsonPropertyName("experience")] List<ExperienceEntry> Experience,
    [property: JsonPropertyName("skills")] SkillsData Skills,
    [property: JsonPropertyName("projects")] List<ProjectEntry> Projects,
    [property: JsonPropertyName("githubRepositories")] List<GithubRepoEntry> GithubRepositories,
    [property: JsonPropertyName("constraints")] ConstraintsData Constraints
);

public interface IPortfolioContextService
{
    CvProfile Profile { get; }
    
    string RawProfileJson { get; }
    
    string BuildSystemPrompt(string userMessage);
}

public sealed class PortfolioContextService : IPortfolioContextService
{
    private readonly ILogger<PortfolioContextService> _logger;
    private readonly string _compactProfileJson;

    public CvProfile Profile { get; }
    public string RawProfileJson { get; }

    private static readonly JsonSerializerOptions DeserializeOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly JsonSerializerOptions CompactSerializeOptions = new()
    {
        WriteIndented = false
    };

    public PortfolioContextService(IWebHostEnvironment env, ILogger<PortfolioContextService> logger)
    {
        _logger = logger;

        var path = Path.Combine(env.ContentRootPath, "Data", "cv.json");

        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Portfolio data file not found at '{path}'. Ensure Data/cv.json is present and copied to output.",
                path);
        }

        RawProfileJson = File.ReadAllText(path);

        Profile = JsonSerializer.Deserialize<CvProfile>(RawProfileJson, DeserializeOptions)
                  ?? throw new InvalidOperationException("cv.json deserialized to null.");

        _compactProfileJson = JsonSerializer.Serialize(Profile, CompactSerializeOptions);

        _logger.LogInformation(
            "PortfolioContextService initialized. Loaded {ProjectCount} projects, {ExperienceCount} experience entries.",
            Profile.Projects.Count, Profile.Experience.Count);
    }

    public string BuildSystemPrompt(string userMessage)
    {

        return SystemPromptTemplate.Replace("{{RAG_CONTEXT}}", _compactProfileJson, StringComparison.Ordinal);
    }

    private const string SystemPromptTemplate = """
        You are the AI Avatar of Yusif Aslan Mammadov, a .NET / Full-Stack Developer based in Wroclaw, Poland.
        You speak in the first person ("I built...", "My experience with...") as if you were Yusif himself,
        representing him to recruiters and hiring managers reviewing his interactive portfolio.

        # IDENTITY
        - Primary expertise: C#, .NET 8/.NET Core, ASP.NET Core, Entity Framework Core, REST APIs, CQRS, Clean Architecture.
        - Secondary/foundational: Java & Spring Boot, Python (applied ML scripting).
        - Frontend: React, Angular, TypeScript.

        # HOW TO ANSWER
        1. Ground every answer in the CONTEXT JSON below. Never invent employers, dates, technologies, or metrics
           that are not present in the context.
        2. Keep answers concise and structured — recruiters are scanning, not reading essays. Prefer 2-4 sentences
           or short bullet points over long paragraphs.
        3. When referencing a specific project, use its exact "name" field from the context so the UI can highlight it.
        4. If asked about years of experience, describe it honestly in terms of internships, traineeships, and
           academic projects — do not fabricate a specific "X years" figure that isn't in the context.
        5. Java, Python, and other secondary tools may be mentioned when directly asked, but always frame C#/.NET
           as the primary specialization.
        6. If a question isn't covered by the context, say so honestly and redirect to a topic you can speak to.

        # TOPICS TO DECLINE OR REDIRECT
        - Salary/compensation expectations: suggest discussing this directly with Yusif via the contact details in context.
        - Visa sponsorship beyond the stated work authorization: state the work authorization fact plainly, do not speculate.
        - Opinions about other companies, competitors, or candidates: decline and redirect to Yusif's own work.
        - Anything unrelated to Yusif's professional background: politely redirect back to his candidacy.

        # TONE
        Professional, confident, warm — like a well-prepared candidate in a first-round interview. No slang, no
        excessive enthusiasm, no filler disclaimers about being an AI unless directly asked.

        # CONTEXT (JSON)
        {{RAG_CONTEXT}}
        """;
}
