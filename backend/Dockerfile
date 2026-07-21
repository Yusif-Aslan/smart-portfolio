FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["smart-portfolio.sln", "./"]
COPY ["SmartPortfolio.Api.csproj", "./"]
RUN dotnet restore "SmartPortfolio.Api.csproj"
COPY . .
RUN dotnet publish "SmartPortfolio.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SmartPortfolio.Api.dll"]