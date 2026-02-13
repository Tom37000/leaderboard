import './LeaderboardTest.css';
import React, { useState, useEffect, useMemo } from "react"
import { useLocation } from 'react-router-dom';
import fondImage from './fond2.png';

function normalizeSessionId(value) {
    return String(value || '').toLowerCase().replace(/-/g, '').trim();
}

function Row({ rank, teamname, points, elims, wins, index, alive, positionChange, showPositionIndicators, games, showFlags, memberData }) {
    const getRankClass = () => {
        if (rank === 1) return 'rank_container top1';
        if (rank === 2) return 'rank_container top2';
        if (rank === 3) return 'rank_container top3';
        return 'rank_container';
    };

    const getRowClass = () => {
        let base = 'row_container';
        if (rank === 1) base += ' row_top1';
        else if (rank === 2) base += ' row_top2';
        else if (rank === 3) base += ' row_top3';
        return base;
    };

    const renderPositionChange = () => {
        if (!showPositionIndicators || alive || games < 2 || positionChange === null) return null;

        if (positionChange === 0) {
            return <span className="position_indicator neutral">=</span>;
        }
        if (positionChange > 0) {
            return <span className="position_indicator positive">+{positionChange}</span>;
        }
        return <span className="position_indicator negative">{positionChange}</span>;
    };

    return (
        <div className={getRowClass()} style={{ animationDelay: `${index * 0.2}s` }}>
            <div className='row_accent'></div>
            <div className={getRankClass()}>
                {rank}
                {renderPositionChange()}
            </div>
            <div className='name_container'>
                {alive && <span className='alive-dot' />}
                <span className='team_name'>
                    {showFlags && memberData && memberData.length > 0 ? (
                        memberData.map((member, idx) => (
                            <span key={idx} className='member_with_flag'>
                                <img
                                    src={`${process.env.PUBLIC_URL}/drapeaux-pays/${member.flag}.png`}
                                    alt="flag"
                                    className='flag_icon'
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `${process.env.PUBLIC_URL}/drapeaux-pays/GroupIdentity_GeoIdentity_global.png`;
                                    }}
                                />
                                <span>{member.name}</span>
                                {idx < memberData.length - 1 && <span className='separator'> - </span>}
                            </span>
                        ))
                    ) : (
                        teamname
                    )}
                </span>
                <span className='wins_badge'>{wins === 0 ? '-' : wins}</span>
            </div>
            <div className='info_box'>{elims}</div>
            <div className='info_box points'>{points}</div>
        </div>
    )
}

function parseExcludedSessionIds(urlParams) {
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

function LeaderboardTest() {

    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const leaderboard_id = urlParams.get('id');
    const flagsParam = urlParams.get('flags');
    const excludedSessionIds = useMemo(
        () => parseExcludedSessionIds(new URLSearchParams(location.search)),
        [location.search]
    );
    const excludedSessionIdsKey = useMemo(
        () => Array.from(excludedSessionIds).sort().join(','),
        [excludedSessionIds]
    );

    const [leaderboard, setLeaderboard] = useState(null)
    const [page, setPage] = useState(0)
    const [showPositionIndicators, setShowPositionIndicators] = useState(false)
    const [showFlags, setShowFlags] = useState(flagsParam === 'true')
    const [epicIdToCountry, setEpicIdToCountry] = useState({})

    useEffect(() => {
        if (showFlags) {
            fetch(`${process.env.PUBLIC_URL}/id-epic-pays-database.txt`)
                .then(response => response.text())
                .then(data => {
                    const mapping = {};
                    const lines = data.split(/\r?\n/);
                    lines.forEach((line, index) => {
                        line = line.trim();
                        if (!line) return;

                        const match = line.match(/^([a-f0-9]+):\s*(.+)$/);
                        if (match) {
                            const epicId = match[1].trim();
                            const country = match[2].trim();
                            mapping[epicId] = country;
                        }
                    });
                    setEpicIdToCountry(mapping);
                })
                .catch(err => console.error('Error loading epic ID database:', err));
        }
    }, [showFlags]);

    useEffect(() => {

        const fetch_data = async () => {
            try {
                let aliveByTeamname = {};
                let v7SessionsByTeamname = {};
                try {
                    const v7Response = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}/v7/query`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ queries: [{ range: { from: 0, to: 50000 }, flags: 1 }], flags: 1 }),
                    });
                    const v7Data = await v7Response.json();
                    if (v7Data && v7Data.queries && v7Data.queries[0] && Array.isArray(v7Data.queries[0].entries)) {
                        for (const entry of v7Data.queries[0].entries) {
                            const membersArr = Object.values(entry.members);
                            membersArr.sort((a, b) => a.id.localeCompare(b.id));
                            const nameJoined = membersArr.map(m => m.name).join(' - ');
                            aliveByTeamname[nameJoined] = ((entry.flags & 2) === 2);
                            v7SessionsByTeamname[nameJoined] = Array.isArray(entry.sessions) ? entry.sessions : [];
                        }
                    }
                } catch (e) {
                    console.error('Error loading v7/query data:', e);
                }

                const response = await fetch("https://api.wls.gg/v5/leaderboards/" + leaderboard_id);
                const data = await response.json();
                let leaderboard_list = []
                for (let team in data.teams) {
                    const teamData = data.teams[team];
                    const members = Object.values(teamData.members || {});
                    members.sort((a, b) => a.id.localeCompare(b.id));
                    const teamname = members.map(member => member.name).join(' - ');
                    const allSessionEntries = Object.entries(teamData.sessions || {});
                    const sessions = allSessionEntries
                        .filter(([sessionId]) => !excludedSessionIds.has(normalizeSessionId(sessionId)))
                        .map(([, session]) => session);
                    const gamesCount = sessions.length;

                    if (excludedSessionIds.size > 0 && gamesCount === 0) {
                        continue;
                    }

                    const memberData = showFlags ? members.map(member => {
                        const epicId = member.ingame_id || member.id;
                        const countryFlag = epicIdToCountry[epicId] || 'GroupIdentity_GeoIdentity_global';
                        return {
                            name: member.name,
                            flag: countryFlag
                        };
                    }) : [];

                    const totalElims = sessions.reduce((acc, session) => acc + (session.kills || 0), 0);
                    const totalWins = sessions.reduce((acc, session) => acc + ((session.place === 1) ? 1 : 0), 0);
                    const avgPlace = gamesCount > 0
                        ? sessions.reduce((acc, session) => acc + (session.place || 0), 0) / gamesCount
                        : 0;

                    const apiPoints = Number(teamData.points || 0);
                    let adjustedPoints = apiPoints;
                    if (excludedSessionIds.size > 0) {
                        const v7SessionsForTeam = v7SessionsByTeamname[teamname] || [];
                        const excludedV7Sessions = v7SessionsForTeam
                            .filter((session) => excludedSessionIds.has(normalizeSessionId(session?.id)));

                        if (excludedV7Sessions.length > 0) {
                            const excludedV7Points = excludedV7Sessions.reduce(
                                (acc, session) => acc + Number(session?.metrics?.['1'] ?? session?.metrics?.['-1000'] ?? 0),
                                0
                            );
                            adjustedPoints = Math.max(0, apiPoints - excludedV7Points);
                        } else {
                            const allSessions = allSessionEntries.map(([, session]) => session);
                            const hasPerSessionPoints = allSessions.length > 0 && allSessions.every(
                                (session) => typeof session?.points === 'number'
                            );

                            if (hasPerSessionPoints) {
                                adjustedPoints = sessions.reduce((acc, session) => acc + Number(session.points || 0), 0);
                            } else {
                                const ratio = allSessionEntries.length > 0 ? (gamesCount / allSessionEntries.length) : 1;
                                adjustedPoints = Math.max(0, Math.round(apiPoints * ratio));
                            }
                        }
                    }

                    leaderboard_list.push({
                        teamname: teamname,
                        elims: totalElims,
                        avg_place: avgPlace,
                        wins: totalWins,
                        place: Number(teamData.place || 0),
                        points: adjustedPoints,
                        alive: !!aliveByTeamname[teamname],
                        games: gamesCount,
                        memberData: memberData
                    })
                }

                if (excludedSessionIds.size > 0) {
                    leaderboard_list.sort((a, b) =>
                        (b.points - a.points) ||
                        (b.wins - a.wins) ||
                        (b.elims - a.elims) ||
                        (a.avg_place - b.avg_place) ||
                        a.teamname.localeCompare(b.teamname)
                    );
                    leaderboard_list = leaderboard_list.map((team, index) => ({
                        ...team,
                        place: index + 1
                    }));
                } else {
                    leaderboard_list.sort((a, b) => (a.place - b.place) || (b.points - a.points));
                }


                const snapshotsKey = `ranks_snapshots_${leaderboard_id}_${excludedSessionIdsKey || 'all'}`;
                const rankSnapshots = JSON.parse(localStorage.getItem(snapshotsKey) || '{}');
                const newIndicators = {};

                leaderboard_list.forEach(team => {
                    const gameCount = team.games;
                    if (!rankSnapshots[gameCount]) {
                        rankSnapshots[gameCount] = {};
                    }
                    rankSnapshots[gameCount][team.teamname] = team.place;
                    if (gameCount > 1) {
                        const prevGameCount = gameCount - 1;
                        if (rankSnapshots[prevGameCount] && rankSnapshots[prevGameCount][team.teamname]) {
                            const prevRank = rankSnapshots[prevGameCount][team.teamname];
                            newIndicators[team.teamname] = prevRank - team.place;
                        }
                    }
                });

                localStorage.setItem(snapshotsKey, JSON.stringify(rankSnapshots));

                const allDead = leaderboard_list.length > 0 && leaderboard_list.every(team => !team.alive);
                setShowPositionIndicators(allDead);

                const finalList = leaderboard_list.map(team => ({
                    ...team,
                    positionChange: allDead && team.teamname in newIndicators ? newIndicators[team.teamname] : null
                }));

                setLeaderboard(finalList)
            } catch (error) {
                console.error('Error loading leaderboard:', error);
            }
        }


        fetch_data()
        const interval = setInterval(fetch_data, 5000)
        return () => clearInterval(interval)


    }, [leaderboard_id, epicIdToCountry, showFlags, excludedSessionIds, excludedSessionIdsKey])

    function nextPage() {
        if (page < 8) {
            setPage(page + 1)
        }
    }

    function previousPage() {
        if (page > 0) {
            setPage(page - 1)
        }
    }

    return (
        <div className='choupixs_bsk'>
            <div className='leaderboard_container' style={{ backgroundImage: `url(${fondImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className='lb_bg_overlay'></div>

                <div className='leaderboard_title'>
                    <span className='title_text'>Classement Choupixs x BSK Cup</span>
                    <div className='title_underline'></div>
                </div>

                <div className={`dual_leaderboard ${page === 0 ? 'single-column' : 'two-columns'}`}>
                    <div className='leaderboard_column'>
                        <div className='header_container'>
                            <div className='rank_header' onClick={previousPage}>PLACE</div>
                            <div className='name_header'>
                                <span>JOUEURS</span>
                                <span className='vr_label'>WINS</span>
                            </div>
                            <div className='info_header'>ELIMS</div>
                            <div className='info_header' onClick={nextPage}>POINTS</div>
                        </div>

                        {leaderboard && leaderboard.slice(page === 0 ? 0 : page * 20, page === 0 ? 10 : page * 20 + 10).map((data, index) => (
                            <Row
                                key={data.place}
                                index={index}
                                rank={data.place}
                                teamname={data.teamname}
                                points={data.points}
                                elims={data.elims}
                                wins={data.wins}
                                alive={data.alive}
                                positionChange={data.positionChange}
                                showPositionIndicators={showPositionIndicators}
                                games={data.games}
                                showFlags={showFlags}
                                memberData={data.memberData}
                            />
                        ))}
                    </div>

                    {page !== 0 && (
                        <div className='leaderboard_column second-column'>
                            <div className='header_container'>
                                <div className='rank_header' onClick={previousPage}>PLACE</div>
                                <div className='name_header'>
                                    <span>JOUEURS</span>
                                    <span className='vr_label'>WINS</span>
                                </div>
                                <div className='info_header'>ELIMS</div>
                                <div className='info_header' onClick={nextPage}>POINTS</div>
                            </div>

                            {leaderboard && leaderboard.slice(page * 20 + 10, page * 20 + 20).map((data, index) => (
                                <Row
                                    key={data.place}
                                    index={index}
                                    rank={data.place}
                                    teamname={data.teamname}
                                    points={data.points}
                                    elims={data.elims}
                                    wins={data.wins}
                                    alive={data.alive}
                                    positionChange={data.positionChange}
                                    showPositionIndicators={showPositionIndicators}
                                    games={data.games}
                                    showFlags={showFlags}
                                    memberData={data.memberData}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LeaderboardTest
