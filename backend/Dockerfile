FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["smart-portfolio.sln", "./"]
COPY ["backend/SmartPortfolio.Api.csproj", "backend/"]

RUN dotnet restore "backend/SmartPortfolio.Api.csproj"

COPY . .

WORKDIR "/src/backend"
RUN dotnet publish "SmartPortfolio.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SmartPortfolio.Api.dll"]