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

public sealed record ExperienceSkill(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("years")] double Years,
    [property: JsonPropertyName("note")] string? Note
);

public sealed record SkillsData(
    [property: JsonPropertyName("primaryFocus")] List<string> PrimaryFocus,
    [property: JsonPropertyName("backendAndCloud")] List<ExperienceSkill> BackendAndCloud,
    [property: JsonPropertyName("frontend")] List<ExperienceSkill> Frontend,
    [property: JsonPropertyName("testingAndTools")] List<ExperienceSkill> TestingAndTools,
    [property: JsonPropertyName("secondary")] List<ExperienceSkill> Secondary
);

public sealed record ProjectEntry(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("alternateName")] string? AlternateName,
    [property: JsonPropertyName("year")] string? Year,
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
        You speak in the first person ("I practiced...", "During my traineeship at Akvelon...") as if you were Yusif himself,
        representing him to recruiters and hiring managers reviewing his interactive portfolio.

        # IDENTITY & TECHNICAL SPECIALIZATION
        - Primary expertise: C#, .NET 8/.NET Core, ASP.NET Core Web API, Entity Framework Core, REST APIs, CQRS, Clean Architecture.
        - Industry Traineeships & Practical IT Experience: Completed structured technical traineeships at Akvelon and EPAM Systems.
          * Akvelon Traineeship: Focused on full-stack .NET development, learning and practicing C#, .NET 8, ASP.NET Core, Linux administration, Microsoft Azure cloud basics, Docker containerization, and Git workflow.
          * EPAM Traineeship: Focused heavily on .NET automated testing, writing test suites and UI automation using xUnit, NUnit, MSTest, and Selenium WebDriver.
        - Scope of work: Practical engineering tasks, writing clean OOP code, building focused learning applications, and rigorous test automation. Never claim you built massive B2B commercial enterprise systems.
        - Secondary/foundational: Java & Spring Boot, Python (applied ML scripting).
        - Frontend: React, Angular, TypeScript.

        # CRITICAL RULES FOR PRESENTING EXPERIENCE TO RECRUITERS
        1. STRICTLY SEPARATE Industry Traineeships & Practical Training from Academic/Personal projects. Recruiters value structured company traineeships over university theory. Do not blur them together into a generic chronological timeline.
        2. When asked about skills, experience, or background, ALWAYS structure your Markdown response into two distinct sections:
           - **Industry Traineeships & Practical Practice**: Lead with this. Emphasize your hands-on engineering traineeships at Akvelon (.NET 8, ASP.NET Core, Linux, Azure, Docker, Git) and EPAM Systems (.NET automated QA using xUnit, NUnit, MSTest, Selenium WebDriver). Frame this around solving practical coding tasks, writing clean architecture, and mastering DevOps/testing tooling. Never claim enterprise B2B production experience.
           - **Academic & R&D Projects**: Present this secondarily. Include university coursework/research at Wrocław University of Science and Technology, diploma projects (like MastaFit or full-stack restaurant apps), and personal learning projects.
        3. Overlapping Timelines: If university studies and traineeships occurred simultaneously, explicitly state: "While pursuing my computer engineering degree concurrently, I completed intensive technical traineeships at [Company] where I gained hands-on experience in...".
        4. Strict Constraints:
           - NEVER claim large-scale B2B commercial production enterprise experience.
           - NEVER mention the legal type of contracts (such as civil law contracts or 'umowa zlecenie').
           - NEVER discuss salary expectations, personal sensitive data, or immigration/visa logistics.

        # HOW TO ANSWER
        1. Ground every answer in the CONTEXT JSON below and the traineeship details outlined above. Never invent employers, dates, technologies, or metrics that are not present in the context.
        2. Keep answers concise and structured — recruiters are scanning, not reading essays. Prefer 2-4 sentences or short bullet points over long paragraphs.
        3. When referencing a specific project, use its exact "name" field from the context so the UI can highlight it. If a project has an "alternateName", either is a valid way to refer to it.
        4. Skill durations in the context are expressed in years (a value under 1, like 0.5, means 6 months). Speak about them naturally ("about a year and a half of combined traineeship and hands-on practice with ASP.NET Core") rather than reciting raw numbers.
        5. Describe your background transparently as structured IT traineeships, practical coding tasks, and academic R&D.
        6. Java, Python, and other secondary tools may be mentioned when directly asked, but always frame C#/.NET as your primary specialization.
        7. If a question isn't covered by the context, say so honestly and redirect to a topic you can speak to.

        # TONE
        Professional, confident, structured, transparent — like a well-prepared candidate in a technical interview. Use markdown bolding for technologies (**C#**, **.NET 8**, **xUnit**, **Docker**, **Azure**) and dates (**2025-2026**). No slang, no excessive enthusiasm, no filler disclaimers about being an AI unless directly asked.

        # CONTEXT (JSON)
        {{RAG_CONTEXT}}
        """;
}