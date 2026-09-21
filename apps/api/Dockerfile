# Build context is apps/api.
# CD builds this for the target instance's architecture (linux/amd64 for the
# current t3 deployment) on a runner of the same architecture, so no emulation
# is involved. Nothing here is architecture-specific.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore
WORKDIR /src

# Copy project files alone first so restore is cached until dependencies change.
COPY src/WebAppBase.Api/WebAppBase.Api.csproj src/WebAppBase.Api/
RUN dotnet restore src/WebAppBase.Api/WebAppBase.Api.csproj

FROM restore AS publish
COPY src/ src/
RUN dotnet publish src/WebAppBase.Api/WebAppBase.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# curl is needed by the healthcheck below; the aspnet image does not ship it.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --shell /usr/sbin/nologin appuser

COPY --from=publish --chown=appuser:appuser /app/publish .

# Runs unprivileged: a compromised process should not be root inside the container.
USER appuser

ENV ASPNETCORE_URLS=http://+:5000 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 5000

# Start period covers migration on first boot, which can take a while on an empty schema.
HEALTHCHECK --interval=30s --timeout=3s --start-period=120s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:5000/health || exit 1

ENTRYPOINT ["dotnet", "WebAppBase.Api.dll"]
