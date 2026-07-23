FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копируем .sln из корня
COPY ["smart-portfolio.sln", "./"]
# Копируем .csproj из папки backend
COPY ["backend/SmartPortfolio.Api.csproj", "backend/"]

# Восстанавливаем зависимости
RUN dotnet restore "backend/SmartPortfolio.Api.csproj"

# Копируем все остальные файлы
COPY . .

# Переходим в папку проекта и собираем его
WORKDIR "/src/backend"
RUN dotnet publish "SmartPortfolio.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Disable file watching to prevent inotify exhaustion in Linux containers
ENV DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SmartPortfolio.Api.dll"]