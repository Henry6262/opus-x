# Feature: Simulation + Twitter

## Purpose
Monitor curated Twitter accounts, run the simulation pipeline on new tweets, and trigger 3D generation on valid media assets.

## Data Sources
- Devprnt core WebSocket (`/ws/tweets`) from J7Tracker bridge
- J7Tracker tweet metadata
- Ponzinomics API character generation

## UI Sections
- Target list with tracking status
- Recent tweet feed per account
- Media validation gate + AI queue status
- AI confidence score with queue/skip decision
- Quote queue status for approved media tweets

## Changelog
- 2026-01-08: Added tweet tracking panel, feed list, and terminal logging for new tweets.
- 2026-01-08: Switched tweet ingestion to devprnt J7 WebSocket stream.
- 2026-01-08: Added AI simulation scoring per tweet (confidence + queue/skip).
- 2026-01-08: Trigger 3D character generation when AI queues a media tweet.
- 2026-01-08: Queue quote tweets after 3D generation is triggered.
