# Applies GitHub About description, homepage, and topics for Pulse.
# Requires: gh auth login  (or GH_TOKEN in the environment)
#
# Usage:
#   ./scripts/set-github-about.sh
#   # or PowerShell: & "$env:ProgramFiles\GitHub CLI\gh.exe" ... (see below)

set -euo pipefail

DESCRIPTION='Real-time Twitch + YouTube live stream intelligence: chat ingestion, sentiment, sponsor-relevance scoring, GraphQL subscriptions, and a Next.js operator dashboard on Kafka.'

# Prefer the demo video URL when published; until then point at the demo guide in-repo.
HOMEPAGE="${PULSE_HOMEPAGE:-https://github.com/pgala3183/pulse/blob/master/docs/demo.md}"

gh repo edit pgala3183/pulse \
  --description "$DESCRIPTION" \
  --homepage "$HOMEPAGE" \
  --add-topic typescript \
  --add-topic nestjs \
  --add-topic kafka \
  --add-topic microservices \
  --add-topic graphql \
  --add-topic youtube-api \
  --add-topic sentiment-analysis \
  --add-topic twitch \
  --add-topic opentelemetry \
  --add-topic prometheus

echo "Updated About for pgala3183/pulse"
gh repo view pgala3183/pulse --json description,homepageUrl,repositoryTopics
