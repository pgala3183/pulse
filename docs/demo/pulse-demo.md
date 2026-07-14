# Pulse demo video

## Status

**Recording script:** [docs/demo.md](../demo.md) (Path A is designed for a 3–5 minute capture).

**Hosted video URL:** _Not yet published._ When available, set it as the GitHub repository
homepage / About link and replace this line:

```
https://youtu.be/REPLACE_ME
```

**Live deployment URL:** _Not yet published._ Local Compose is the supported demo environment
(`make up` → http://localhost:3001).

## What the recording should show

1. Twitch platform selected → start ingestion → live panels populate.
2. YouTube platform selected → start ingestion → panels populate (paid chat callout if seeded).
3. Optional: Grafana chat throughput after seed traffic.

## Ownership

Whoever cuts the capture should:

1. Upload to YouTube (unlisted is fine) or GitHub Release assets.
2. Run (with GitHub CLI):

```bash
gh repo edit --homepage "https://youtu.be/REPLACE_ME"
```

3. Update the URL above and the README demo blurb in the same PR.
