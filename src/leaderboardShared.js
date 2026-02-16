export function normalizeSessionId(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

export function parseExcludedSessionIds(urlParams) {
    const values = [
        ...urlParams.getAll('exclude_session_id'),
        ...urlParams.getAll('exclude_session'),
        ...urlParams.getAll('exclude_session_ids'),
    ];

    return new Set(
        values
            .flatMap((value) => String(value || '').split(','))
            .map((value) => normalizeSessionId(value))
            .filter(Boolean)
    );
}

function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
}

function sortMembersById(members) {
    return [...members].sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || '')));
}

function getMemberDisplayName(member) {
    return (
        member?.name ||
        member?.ingame_name ||
        member?.ingameName ||
        member?.ingame ||
        ''
    );
}

function buildTeamName(members) {
    return members.map((member) => getMemberDisplayName(member)).filter(Boolean).join(' - ');
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function sortSessionsByKey(entries) {
    return [...entries].sort((a, b) => {
        const ak = String(a[0] ?? '');
        const bk = String(b[0] ?? '');
        const an = Number.parseInt(ak, 10);
        const bn = Number.parseInt(bk, 10);

        const aIsNum = Number.isFinite(an);
        const bIsNum = Number.isFinite(bn);
        if (aIsNum && bIsNum) return an - bn;
        if (aIsNum && !bIsNum) return -1;
        if (!aIsNum && bIsNum) return 1;
        return ak.localeCompare(bk);
    });
}

function getV7SessionPoints(session) {
    if (!session) return null;

    const metrics = session.metrics || {};
    if (Object.prototype.hasOwnProperty.call(metrics, '1')) {
        const p = Number(metrics['1']);
        if (Number.isFinite(p)) return p;
    }
    if (Object.prototype.hasOwnProperty.call(metrics, '-1000')) {
        const p = Number(metrics['-1000']);
        if (Number.isFinite(p)) return p;
    }
    return null;
}

async function fetchV7EntriesByTeamName(leaderboardId) {
    const map = {};
    if (!leaderboardId) return map;

    try {
        const payload = {
            queries: [{ range: { from: 0, to: 50000 }, flags: 1 }],
            flags: 1,
        };
        const response = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboardId}/v7/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        const entries = Array.isArray(data?.queries?.[0]?.entries) ? data.queries[0].entries : [];

        for (const entry of entries) {
            const members = sortMembersById(toArray(entry?.members));
            const teamname = buildTeamName(members);
            if (!teamname) continue;

            const sessions = Array.isArray(entry?.sessions) ? entry.sessions : [];
            const sessionPointsById = {};
            sessions.forEach((session) => {
                const sid = normalizeSessionId(session?.id);
                if (!sid) return;
                const p = getV7SessionPoints(session);
                if (p !== null) sessionPointsById[sid] = p;
            });

            map[teamname] = {
                alive: ((Number(entry?.flags) || 0) & 2) === 2,
                sessions,
                sessionPointsById,
            };
        }
    } catch (error) {
        console.error('Error loading v7/query data:', error);
    }

    return map;
}

function buildMemberData(members, showFlags, epicIdToCountry) {
    if (!showFlags) return [];
    return members.map((member) => {
        const epicId = member?.ingame_id || member?.id;
        return {
            name: getMemberDisplayName(member),
            flag: epicIdToCountry?.[epicId] || 'GroupIdentity_GeoIdentity_global',
        };
    });
}

function sortLeaderboardRows(rows, forceByPoints) {
    const sorted = [...rows];
    if (forceByPoints) {
        sorted.sort((a, b) =>
            (b.points - a.points) ||
            (b.wins - a.wins) ||
            (b.elims - a.elims) ||
            (a.avg_place - b.avg_place) ||
            a.teamname.localeCompare(b.teamname)
        );
        sorted.forEach((row, index) => {
            row.place = index + 1;
        });
        return sorted;
    }

    sorted.sort((a, b) => (a.place - b.place) || (b.points - a.points));
    return sorted;
}

function buildGameSnapshots(rows) {
    const perTeam = rows.map((team) => {
        const sessions = Array.isArray(team.sessionsForIndicators) ? team.sessionsForIndicators : [];
        let cumulativePoints = 0;
        let cumulativeWins = 0;
        let cumulativeElims = 0;
        let cumulativePlace = 0;

        const snapshots = sessions.map((session, index) => {
            cumulativePoints += toNumber(session?.points, 0);
            cumulativeWins += toNumber(session?.place, 0) === 1 ? 1 : 0;
            cumulativeElims += toNumber(session?.kills, 0);
            cumulativePlace += toNumber(session?.place, 0);

            const games = index + 1;
            return {
                games,
                points: cumulativePoints,
                wins: cumulativeWins,
                elims: cumulativeElims,
                avgPlace: games > 0 ? cumulativePlace / games : 0,
            };
        });

        return {
            teamname: team.teamname,
            snapshots,
            games: snapshots.length,
        };
    });

    const maxGames = perTeam.reduce((max, team) => Math.max(max, team.games), 0);
    const ranksByGame = {};

    for (let game = 1; game <= maxGames; game += 1) {
        const contenders = perTeam
            .filter((team) => team.games >= game)
            .map((team) => {
                const snap = team.snapshots[game - 1];
                return {
                    teamname: team.teamname,
                    points: snap.points,
                    wins: snap.wins,
                    elims: snap.elims,
                    avgPlace: snap.avgPlace,
                };
            });

        contenders.sort((a, b) =>
            (b.points - a.points) ||
            (b.wins - a.wins) ||
            (b.elims - a.elims) ||
            (a.avgPlace - b.avgPlace) ||
            a.teamname.localeCompare(b.teamname)
        );

        const ranks = {};
        contenders.forEach((contender, index) => {
            ranks[contender.teamname] = index + 1;
        });
        ranksByGame[game] = ranks;
    }

    const positionChanges = {};
    perTeam.forEach((team) => {
        const game = team.games;
        if (game < 2) {
            positionChanges[team.teamname] = null;
            return;
        }

        const prevRank = ranksByGame[game - 1]?.[team.teamname];
        const currRank = ranksByGame[game]?.[team.teamname];
        if (typeof prevRank !== 'number' || typeof currRank !== 'number') {
            positionChanges[team.teamname] = null;
            return;
        }
        positionChanges[team.teamname] = prevRank - currRank;
    });

    return positionChanges;
}

export function computePositionChangesFromSessions(rows) {
    return buildGameSnapshots(rows);
}

export async function fetchUnifiedLeaderboardData({
    leaderboardId,
    excludedSessionIds = new Set(),
    showFlags = false,
    epicIdToCountry = {},
    forceRankByPoints = true,
    includeV7 = true,
    indicatorsOnlyWhenAllDead = true,
}) {
    const firstResponse = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboardId}?page=0`);
    const firstData = await firstResponse.json();
    const totalPages = firstData?.total_pages || 1;

    const pagePromises = [];
    for (let page = 0; page < totalPages; page += 1) {
        pagePromises.push(
            fetch(`https://api.wls.gg/v5/leaderboards/${leaderboardId}?page=${page}`).then((response) => response.json())
        );
    }
    const allPagesData = await Promise.all(pagePromises);

    const v7EntriesByTeamName = includeV7 ? await fetchV7EntriesByTeamName(leaderboardId) : {};

    const rows = [];
    const teamDetails = {};
    const matchedExcludedSessionIds = new Set();

    allPagesData.forEach((pageData) => {
        const teams = toArray(pageData?.teams);
        teams.forEach((teamData) => {
            const members = sortMembersById(toArray(teamData?.members));
            const teamname = buildTeamName(members);
            if (!teamname) return;

            const v7Team = v7EntriesByTeamName[teamname] || null;
            const v7PointsBySessionId = v7Team?.sessionPointsById || {};
            const sessionEntries = sortSessionsByKey(Object.entries(teamData?.sessions || {}));

            const includedSessions = [];
            let excludedPointsFromV7 = 0;

            sessionEntries.forEach(([sessionId, session], sessionIndex) => {
                const normalizedId = normalizeSessionId(sessionId);
                const alignedV7Id = normalizeSessionId(v7Team?.sessions?.[sessionIndex]?.id);
                const canonicalSessionId = alignedV7Id || normalizedId;

                const v7Points = v7PointsBySessionId[canonicalSessionId]
                    ?? v7PointsBySessionId[alignedV7Id]
                    ?? v7PointsBySessionId[normalizedId];

                const sessionPoints = Number.isFinite(Number(session?.points))
                    ? Number(session.points)
                    : (v7Points ?? null);

                const normalizedSession = {
                    ...session,
                    id: canonicalSessionId,
                    points: sessionPoints,
                };

                const matchedExcludedId = [canonicalSessionId, alignedV7Id, normalizedId]
                    .find((candidateId) => candidateId && excludedSessionIds.has(candidateId));

                if (matchedExcludedId) {
                    matchedExcludedSessionIds.add(matchedExcludedId);
                    if (Number.isFinite(v7Points)) {
                        excludedPointsFromV7 += Number(v7Points);
                    }
                    return;
                }

                includedSessions.push(normalizedSession);
            });

            const games = includedSessions.length;
            if (excludedSessionIds.size > 0 && games === 0) {
                return;
            }

            const elims = includedSessions.reduce((acc, session) => acc + toNumber(session?.kills, 0), 0);
            const wins = includedSessions.reduce((acc, session) => acc + (toNumber(session?.place, 0) === 1 ? 1 : 0), 0);
            const avg_place = games > 0
                ? includedSessions.reduce((acc, session) => acc + toNumber(session?.place, 0), 0) / games
                : 0;

            const apiPoints = toNumber(teamData?.points, 0);
            let points = apiPoints;
            if (excludedSessionIds.size > 0) {
                if (excludedPointsFromV7 > 0) {
                    points = Math.max(0, apiPoints - excludedPointsFromV7);
                } else {
                    const allSessions = sessionEntries.map(([, session]) => session);
                    const hasPerSessionPoints = allSessions.length > 0 && allSessions.every(
                        (session) => Number.isFinite(Number(session?.points))
                    );

                    if (hasPerSessionPoints) {
                        points = includedSessions.reduce((acc, session) => acc + toNumber(session?.points, 0), 0);
                    } else {
                        const ratio = allSessions.length > 0 ? (games / allSessions.length) : 1;
                        points = Math.max(0, Math.round(apiPoints * ratio));
                    }
                }
            }

            const memberData = buildMemberData(members, showFlags, epicIdToCountry);

            teamDetails[teamname] = {
                members,
                sessions: includedSessions,
                teamData,
            };

            rows.push({
                teamname,
                elims,
                avg_place,
                wins,
                games,
                originalGames: sessionEntries.length,
                place: toNumber(teamData?.place, 0),
                points,
                alive: !!v7Team?.alive,
                memberData,
                sessionsForIndicators: includedSessions,
            });
        });
    });

    const globalExcludedGamesCount = matchedExcludedSessionIds.size;
    const rowsWithAdjustedGames = rows.map((team) => {
        if (globalExcludedGamesCount <= 0) return team;
        return {
            ...team,
            games: Math.max(0, toNumber(team.originalGames, team.games) - globalExcludedGamesCount),
        };
    });
    const hasMultipleGames = rowsWithAdjustedGames.some((team) => team.games > 1);

    const sortedRows = sortLeaderboardRows(rowsWithAdjustedGames, forceRankByPoints || excludedSessionIds.size > 0);
    const allDead = sortedRows.length > 0 && sortedRows.every((team) => !team.alive);
    const showPositionIndicators = indicatorsOnlyWhenAllDead ? allDead : true;
    const computedPositionChanges = buildGameSnapshots(sortedRows);

    const leaderboard = sortedRows.map((team) => {
        const positionChange = showPositionIndicators
            ? (Object.prototype.hasOwnProperty.call(computedPositionChanges, team.teamname)
                ? computedPositionChanges[team.teamname]
                : null)
            : null;
        const { originalGames, ...rest } = team;

        return {
            ...rest,
            positionChange,
        };
    });

    return {
        leaderboard,
        teamDetails,
        hasMultipleGames,
        totalPages,
        allDead,
        showPositionIndicators,
    };
}

export function enrichWithPreviousLeaderboard(currentLeaderboard, previousLeaderboard) {
    const previousByTeam = new Map((previousLeaderboard || []).map((team) => [team.teamname, team]));
    let changedCount = 0;

    const leaderboard = currentLeaderboard.map((team) => {
        const previous = previousByTeam.get(team.teamname);
        const hasChanged = !previous
            || previous.place !== team.place
            || previous.points !== team.points
            || previous.elims !== team.elims
            || previous.wins !== team.wins
            || previous.games !== team.games
            || Math.abs((previous.avg_place || 0) - (team.avg_place || 0)) > 0.01
            || (previous.positionChange ?? null) !== (team.positionChange ?? null);

        if (hasChanged) changedCount += 1;

        return {
            ...team,
            teamId: team.teamname,
            hasPositionChanged: hasChanged,
        };
    });

    return { leaderboard, changedCount };
}

export async function loadEpicIdToCountryMap(publicUrl) {
    const response = await fetch(`${publicUrl}/id-epic-pays-database.txt`);
    const text = await response.text();
    const mapping = {};

    text.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const match = trimmed.match(/^([a-f0-9]+):\s*(.+)$/);
        if (!match) return;
        const epicId = match[1].trim();
        const country = match[2].trim();
        mapping[epicId] = country;
    });

    return mapping;
}
