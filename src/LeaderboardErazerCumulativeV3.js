import './LeaderboardErazerCumulativeV3.css';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import BackgroundImage from './erazer_leaderboard_background.png';
import {
    computePositionChangesFromSessions,
    fetchUnifiedLeaderboardData,
    loadEpicIdToCountryMap,
    parseExcludedSessionIds,
} from './leaderboardShared';

function Row({
    rank,
    teamname,
    points,
    games,
    onClick,
    cascadeFadeEnabled,
    cascadeIndex,
    positionChange,
    showPositionIndicators,
    alive,
    showFlags,
    memberData,
}) {
    const renderPositionChange = () => {
        if (!showPositionIndicators || alive || games < 2 || positionChange === null || positionChange === 0) {
            return null;
        }

        const style = {
            marginLeft: '6px',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#fff',
            backgroundColor: positionChange > 0 ? '#4CAF50' : '#f44336',
        };

        return <span style={style}>{positionChange > 0 ? `+${positionChange}` : positionChange}</span>;
    };

    return (
        <>
            <div
                className={rank <= 25 ? 'rank top-25' : 'rank'}
                style={{
                    opacity: cascadeFadeEnabled ? 0 : 1,
                    animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
                    animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
                }}
            >
                {rank}
                {renderPositionChange()}
            </div>
            <div
                className='name-and-vr'
                style={{
                    opacity: cascadeFadeEnabled ? 0 : 1,
                    animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
                    animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
                }}
            >
                <div className='name' style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={onClick}>
                    {alive && (
                        <span
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#27E2FF',
                                boxShadow: '0 0 8px #27E2FF',
                                flexShrink: 0,
                            }}
                        />
                    )}
                    {showFlags && memberData && memberData.length > 0
                        ? memberData.map((member, idx) => (
                            <span key={`${member.name}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <img
                                    src={`${process.env.PUBLIC_URL}/drapeaux-pays/${member.flag}.png`}
                                    alt="flag"
                                    style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover', marginRight: '3px' }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `${process.env.PUBLIC_URL}/drapeaux-pays/GroupIdentity_GeoIdentity_global.png`;
                                    }}
                                />
                                <span>{member.name}</span>
                                {idx < memberData.length - 1 && <span>&nbsp;-&nbsp;</span>}
                            </span>
                        ))
                        : teamname}
                </div>
            </div>
            <div
                className='info points'
                style={{
                    opacity: cascadeFadeEnabled ? 0 : 1,
                    animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
                    animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
                }}
            >
                {points}
            </div>
        </>
    );
}

function getTeamKey(members) {
    return [...members]
        .map((member) => member?.ingame_id || member?.id || '')
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b)))
        .join(' - ');
}

function LeaderboardErazerCumulativeV3() {
    const location = useLocation();
    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

    const leaderboardIds = useMemo(
        () => (searchParams.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean),
        [searchParams]
    );
    const cascadeParam = searchParams.get('cascade');
    const flagsParam = searchParams.get('flags');
    const excludedSessionIds = useMemo(
        () => parseExcludedSessionIds(new URLSearchParams(location.search)),
        [location.search]
    );

    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(true);
    const [showFlags, setShowFlags] = useState(flagsParam === 'true');
    const [epicIdToCountry, setEpicIdToCountry] = useState({});
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamDetails, setTeamDetails] = useState({});
    const [cascadeFadeEnabled, setCascadeFadeEnabled] = useState(cascadeParam === 'true');
    const [showPositionIndicators, setShowPositionIndicators] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        setShowFlags(flagsParam === 'true');
        setCascadeFadeEnabled(cascadeParam === 'true');
    }, [flagsParam, cascadeParam]);

    useEffect(() => {
        if (!showFlags) {
            setEpicIdToCountry({});
            return;
        }

        loadEpicIdToCountryMap(process.env.PUBLIC_URL)
            .then((mapping) => setEpicIdToCountry(mapping))
            .catch((err) => {
                console.error('Error loading epic ID database:', err);
                setEpicIdToCountry({});
            });
    }, [showFlags]);

    const loadAllPages = useCallback(async () => {
        if (leaderboardIds.length === 0) {
            setLeaderboard([]);
            setTeamDetails({});
            setError('Aucun leaderboard_id fourni via ?ids=...');
            return;
        }

        setError(null);

        try {
            const datasets = await Promise.all(
                leaderboardIds.map((leaderboardId) =>
                    fetchUnifiedLeaderboardData({
                        leaderboardId,
                        excludedSessionIds,
                        showFlags,
                        epicIdToCountry,
                        forceRankByPoints: true,
                        includeV7: true,
                        indicatorsOnlyWhenAllDead: true,
                    })
                )
            );

            const excludedPlayers = new Set();
            datasets.forEach((dataset) => {
                dataset.leaderboard.forEach((team) => {
                    if (team.place > 25) return;
                    const details = dataset.teamDetails[team.teamname];
                    if (!details || !Array.isArray(details.members)) return;
                    details.members.forEach((member) => {
                        if (member?.id) excludedPlayers.add(String(member.id));
                    });
                });
            });

            const aggregate = new Map();

            datasets.forEach((dataset, idx) => {
                const leaderboardId = leaderboardIds[idx];

                dataset.leaderboard.forEach((team) => {
                    const details = dataset.teamDetails[team.teamname];
                    const members = Array.isArray(details?.members) ? details.members : [];
                    const teamHasExcludedPlayer = members.some((member) => excludedPlayers.has(String(member?.id || '')));
                    const teamPlace = Number(team.place || 0);
                    const regularityPoints = !teamHasExcludedPlayer && teamPlace > 25 && teamPlace <= 125
                        ? Math.max(1, 101 - (teamPlace - 25))
                        : 0;

                    if (regularityPoints <= 0) return;

                    const teamKey = getTeamKey(members) || team.teamname;

                    if (!aggregate.has(teamKey)) {
                        aggregate.set(teamKey, {
                            teamKey,
                            teamname: team.teamname,
                            points: 0,
                            elims: 0,
                            wins: 0,
                            games: 0,
                            weightedPlaceSum: 0,
                            alive: false,
                            memberData: [],
                            members: [],
                            sessions: [],
                            sessionsForIndicators: [],
                            sources: [],
                        });
                    }

                    const entry = aggregate.get(teamKey);
                    entry.teamname = team.teamname;
                    entry.points += regularityPoints;
                    entry.elims += Number(team.elims || 0);
                    entry.wins += Number(team.wins || 0);
                    entry.games += Number(team.games || 0);
                    entry.weightedPlaceSum += Number(team.avg_place || 0) * Number(team.games || 0);
                    entry.alive = entry.alive || !!team.alive;

                    if (showFlags && team.memberData && team.memberData.length > 0) {
                        entry.memberData = team.memberData;
                    }

                    if (entry.members.length === 0) {
                        entry.members = members;
                    }

                    entry.sessions.push(...(Array.isArray(details?.sessions) ? details.sessions : []));
                    entry.sessionsForIndicators.push(...(Array.isArray(team.sessionsForIndicators) ? team.sessionsForIndicators : []));
                    entry.sources.push({ leaderboardId, place: teamPlace, regularityPoints, games: team.games });
                });
            });

            const rows = Array.from(aggregate.values()).map((entry) => ({
                teamKey: entry.teamKey,
                teamname: entry.teamname,
                points: entry.points,
                elims: entry.elims,
                wins: entry.wins,
                games: entry.games,
                avg_place: entry.games > 0 ? entry.weightedPlaceSum / entry.games : 0,
                avg_elim: entry.games > 0 ? entry.elims / entry.games : 0,
                alive: entry.alive,
                memberData: showFlags ? entry.memberData : [],
                sessionsForIndicators: entry.sessionsForIndicators,
            }));

            rows.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                if (b.avg_elim !== a.avg_elim) return b.avg_elim - a.avg_elim;
                return a.avg_place - b.avg_place;
            });

            rows.forEach((team, index) => {
                team.place = index + 1;
            });

            const allDead = rows.length > 0 && rows.every((team) => !team.alive);
            const computedChanges = computePositionChangesFromSessions(rows);

            const finalRows = rows.map((team) => ({
                ...team,
                positionChange: allDead
                    ? (Object.prototype.hasOwnProperty.call(computedChanges, team.teamname)
                        ? computedChanges[team.teamname]
                        : null)
                    : null,
                teamId: team.teamKey,
            }));

            const details = {};
            aggregate.forEach((entry, teamKey) => {
                const row = finalRows.find((team) => team.teamKey === teamKey);
                details[teamKey] = {
                    members: entry.members,
                    sessions: entry.sessions,
                    sources: entry.sources,
                    teamData: {
                        place: row?.place || 0,
                        points: row?.points || 0,
                    },
                };
            });

            setShowPositionIndicators(allDead);
            setTeamDetails(details);
            setLeaderboard(finalRows);
        } catch (err) {
            console.error('Error loading leaderboard data:', err);
            setError(`Erreur lors du chargement des donnees: ${err.message}`);
        }
    }, [leaderboardIds, excludedSessionIds, showFlags, epicIdToCountry]);

    useEffect(() => {
        loadAllPages();
        const interval = setInterval(loadAllPages, 60000);
        return () => clearInterval(interval);
    }, [loadAllPages]);

    const exportToCSV = useCallback(async () => {
        if (!leaderboard || leaderboard.length === 0 || isExporting) return;

        setIsExporting(true);
        try {
            const top45 = leaderboard.slice(0, 45);
            const csvHeader = ['Rank', 'Team Name', 'Avg Place', 'Avg Elim', 'Wins', 'Points'];
            const csvRows = top45.map((team) => [
                team.place,
                team.teamname,
                team.avg_place.toFixed(2),
                team.avg_elim.toFixed(2),
                team.wins,
                team.points,
            ]);
            const csvContent = [csvHeader, ...csvRows]
                .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `leaderboard_export_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Erreur lors de l\'export CSV:', err);
            alert('Erreur lors de l\'export CSV. Verifiez la console pour plus de details.');
        } finally {
            setIsExporting(false);
        }
    }, [leaderboard, isExporting]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'F1') {
                event.preventDefault();
                setShowSearch((prev) => !prev);
            } else if (event.key === 'F2') {
                event.preventDefault();
                exportToCSV();
            } else if (event.key === 'F8') {
                event.preventDefault();
                setCascadeFadeEnabled((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [exportToCSV]);

    useEffect(() => {
        setPage(0);
    }, [searchQuery]);

    const filteredLeaderboard = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return leaderboard;

        return leaderboard.filter((team) => {
            if (team.teamname.toLowerCase().includes(query)) return true;
            if (!Number.isNaN(Number(query)) && Number.isInteger(Number(query))) {
                return team.place === Number(query);
            }
            return false;
        });
    }, [leaderboard, searchQuery]);

    const nextPage = () => {
        const maxPage = Math.max(0, Math.ceil(filteredLeaderboard.length / 40) - 1);
        setPage((prev) => Math.min(maxPage, prev + 1));
    };

    const previousPage = () => {
        setPage((prev) => Math.max(0, prev - 1));
    };

    const closeModal = () => setSelectedTeam(null);

    return (
        <div className='erazer_cup' style={{ backgroundImage: `url(${BackgroundImage})` }}>
            {showSearch && (
                <div className='search_container'>
                    <input
                        type="text"
                        className='search_input'
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            )}

            {error && (
                <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: '#ff6b6b' }}>
                    {error}
                </div>
            )}

            <div className='leaderboard_container_prod'>
                {[0, 1, 2, 3].map((colIndex) => {
                    const from = page * 40 + colIndex * 10;
                    const to = from + 10;
                    const chunk = filteredLeaderboard.slice(from, to);

                    return (
                        <div className='leaderboard_table_prod' key={`col-${colIndex}`}>
                            <div className='rank header' onClick={previousPage}>RANK</div>
                            <div className='name-and-vr header'>
                                <div className='name header'>PLAYER</div>
                            </div>
                            <div className='info header' onClick={nextPage}>POINTS</div>

                            {chunk.map((data, rowIndex) => (
                                <Row
                                    key={`${colIndex}-${data.teamId || data.teamname}`}
                                    rank={data.place}
                                    teamname={data.teamname}
                                    points={data.points}
                                    games={data.games}
                                    onClick={() => setSelectedTeam(data.teamKey)}
                                    cascadeFadeEnabled={cascadeFadeEnabled}
                                    cascadeIndex={colIndex * 10 + rowIndex}
                                    positionChange={data.positionChange}
                                    showPositionIndicators={showPositionIndicators}
                                    alive={data.alive}
                                    showFlags={showFlags}
                                    memberData={data.memberData}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>

            {selectedTeam && teamDetails[selectedTeam] && (
                <div className='modal_overlay' onClick={closeModal}>
                    <div className='modal_content' onClick={(e) => e.stopPropagation()}>
                        <div className='modal_header'>
                            <h2>{leaderboard.find((team) => team.teamKey === selectedTeam)?.teamname || selectedTeam}</h2>
                            <button className='close_button' onClick={closeModal}>x</button>
                        </div>
                        <div className='modal_body'>
                            <div className='team_summary'>
                                <h3>Resume</h3>
                                <div className='stats_grid'>
                                    <div className='stat_item'>
                                        <span className='stat_label'>Place:</span>
                                        <span className='stat_value'>#{teamDetails[selectedTeam].teamData.place}</span>
                                    </div>
                                    <div className='stat_item'>
                                        <span className='stat_label'>Points:</span>
                                        <span className='stat_value'>{teamDetails[selectedTeam].teamData.points}</span>
                                    </div>
                                </div>
                            </div>

                            <div className='members_section'>
                                <h3>Membres</h3>
                                {teamDetails[selectedTeam].members.map((member, idx) => (
                                    <div key={`${member.id || member.name}-${idx}`} className='member_info'>
                                        {member.name}
                                    </div>
                                ))}
                            </div>

                            <div className='sessions_section'>
                                <h3>Contribution par leaderboard</h3>
                                <div className='sessions_table'>
                                    <div className='session_header'>
                                        <div>ID</div>
                                        <div>Place</div>
                                        <div>Points Reg.</div>
                                        <div>Games</div>
                                    </div>
                                    {teamDetails[selectedTeam].sources.map((source, idx) => (
                                        <div key={`${source.leaderboardId}-${idx}`} className='session_row'>
                                            <div className='session_highlight'>{source.leaderboardId}</div>
                                            <div>{source.place}</div>
                                            <div className='session_highlight'>{source.regularityPoints}</div>
                                            <div>{source.games}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaderboardErazerCumulativeV3;
