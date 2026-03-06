# Discord Bot Registry

All bots on guild `1354474492629618828` (Kochito Labs).

To revive: add the agent back to `openclaw.json` agents list + accounts, copy workspace from this archive to `~/.openclaw/agents/<id>/workspace/`, restart gateway.

**Tokens stored in:** `~/.openclaw/openclaw.json` on the Mac mini (NOT in this repo — GitHub blocks secrets).

## Bots

| Agent | Bot ID | Discord Mention |
|-------|--------|-----------------|
| Mave | `1358909827614769263` | `<@1358909827614769263>` |
| Pit | `1467910932318650658` | `<@1467910932318650658>` |
| Loop | `1468305644930207784` | `<@1468305644930207784>` |
| Push | `1468306346574217402` | `<@1468306346574217402>` |
| Tap | `1471932827682734140` | `<@1471932827682734140>` |
| Drift | `1472645860235149362` | `<@1472645860235149362>` |
| Hype | `1472647567073476780` | `<@1472647567073476780>` |
| Pixel | `1472650719403315221` | `<@1472650719403315221>` |
| Ship | `1472651071187976357` | `<@1472651071187976357>` |
| Hallman | `1473697658857324645` | `<@1473697658857324645>` |

## Channel Assignments (as of decommission)

| Channel | ID | Agents |
|---------|----|--------|
| #general | `1441080550415929406` | Mave, Loop, Push, Tap, Hallman |
| #pixelpit | `1473898864523214870` | Mave, Pit, Loop, Push, Tap |
| #shipshot | `1472651712677286039` | Drift, Hype, Pixel, Ship |

All channels: `requireMention: true`, `groupPolicy: allowlist`
All agents: `dmPolicy: open`, `allowFrom: ["*"]`

## Discord Developer Portal

To regenerate tokens or manage bot settings: https://discord.com/developers/applications
Each bot is a separate application — search by name or Bot ID.
