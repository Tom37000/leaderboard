import './LeaderboardErazerCumulative.css';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import erazerLogo from './erazer-logo1.png';
import {
    computePositionChangesFromSessions,
    fetchUnifiedLeaderboardData,
    loadEpicIdToCountryMap,
    parseExcludedSessionIds,
} from './leaderboardShared';

const indicatorBaseStyle = {
    marginLeft: '8px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
};

const Row = React.memo(function Row({
    rank,
    teamname,
    points,
    elims,
    avg_place,
    wins,
    games,
    order,
    showGamesColumn,
    onClick,
    cascadeFadeEnabled,
    cascadeIndex,
    showPositionIndicators,
    positionChange,
    alive,
    showFlags,
    memberData,
}) {
    const renderPositionChange = () => {
        if (!showPositionIndicators || alive || games < 2 || positionChange === null || positionChange === 0) {
            return null;
        }

        if (positionChange > 0) {
            return <span style={{ ...indicatorBaseStyle, backgroundColor: '#4CAF50' }}>+{positionChange}</span>;
        }
        return <span style={{ ...indicatorBaseStyle, backgroundColor: '#f44336' }}>{positionChange}</span>;
    };

    return (
        <div
            className={`row_container ${rank <= 25 ? 'top-25' : ''}`}
            style={{
                '--animation-order': order,
                opacity: cascadeFadeEnabled ? 0 : 1,
                animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
                animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
            }}
        >
            <div
                className='rank_container'
                style={{
                    fontSize: rank >= 1000 ? '24px' : rank >= 100 ? '24px' : '26px',
                    paddingLeft: rank >= 1000 ? '16px' : rank >= 100 ? '12px' : rank >= 10 ? '4px' : '0px',
                }}
            >
                {rank}
                {renderPositionChange()}
            </div>
            <div
                className='name_container'
                style={{
                    cursor: 'pointer',
                    fontSize: teamname.length > 25 ? '16px' : teamname.length > 20 ? '18px' : teamname.length > 15 ? '20px' : teamname.length > 10 ? '22px' : '24px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                }}
                onClick={onClick}
            >
                {alive && (
                    <span
                        style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#f15c86',
                            boxShadow: '0 0 8px #f15c86',
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
                                style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover', marginRight: '4px' }}
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
            <div className='info_box'>{avg_place.toFixed(2)}</div>
            <div className='info_box'>{elims}</div>
            <div className='info_box'>{wins}</div>
            <div className='info_box'>{points}</div>
            {showGamesColumn && <div className='info_box'>{games}</div>}
        </div>
    );
});

function LeaderboardErazerCumulative() {
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
    const [localPage, setLocalPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(true);
    const [showFlags, setShowFlags] = useState(flagsParam === 'true');
    const [epicIdToCountry, setEpicIdToCountry] = useState({});
    const [showGamesColumn, setShowGamesColumn] = useState(false);
    const [showPositionIndicators, setShowPositionIndicators] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamDetails, setTeamDetails] = useState({});
    const [cascadeFadeEnabled, setCascadeFadeEnabled] = useState(cascadeParam === 'true');
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

            const aggregate = new Map();
            let hasMultipleGames = false;

            datasets.forEach((dataset, idx) => {
                const leaderboardId = leaderboardIds[idx];

                dataset.leaderboard.forEach((team) => {
                    if (team.place <= 25) return;

                    const sourceDetails = dataset.teamDetails[team.teamname];
                    if (!sourceDetails) return;

                    hasMultipleGames = hasMultipleGames || team.games > 1;

                    if (!aggregate.has(team.teamname)) {
                        aggregate.set(team.teamname, {
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

                    const entry = aggregate.get(team.teamname);
                    entry.points += Number(team.points || 0);
                    entry.elims += Number(team.elims || 0);
                    entry.wins += Number(team.wins || 0);
                    entry.games += Number(team.games || 0);
                    entry.weightedPlaceSum += Number(team.avg_place || 0) * Number(team.games || 0);
                    entry.alive = entry.alive || !!team.alive;

                    if (showFlags && team.memberData && team.memberData.length > 0) {
                        entry.memberData = team.memberData;
                    }

                    if (entry.members.length === 0) {
                        entry.members = Array.isArray(sourceDetails.members) ? sourceDetails.members : [];
                    }

                    entry.sessions.push(...(Array.isArray(sourceDetails.sessions) ? sourceDetails.sessions : []));
                    entry.sessionsForIndicators.push(...(Array.isArray(team.sessionsForIndicators) ? team.sessionsForIndicators : []));
                    entry.sources.push({ leaderboardId, place: team.place, points: team.points, games: team.games });
                });
            });

            const rows = Array.from(aggregate.values()).map((entry) => ({
                teamname: entry.teamname,
                points: entry.points,
                elims: entry.elims,
                wins: entry.wins,
                games: entry.games,
                avg_place: entry.games > 0 ? entry.weightedPlaceSum / entry.games : 0,
                alive: entry.alive,
                memberData: showFlags ? entry.memberData : [],
                sessionsForIndicators: entry.sessionsForIndicators,
            }));

            rows.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                const avgElimsA = a.games > 0 ? a.elims / a.games : 0;
                const avgElimsB = b.games > 0 ? b.elims / b.games : 0;
                if (avgElimsB !== avgElimsA) return avgElimsB - avgElimsA;
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
                teamId: team.teamname,
            }));

            const details = {};
            aggregate.forEach((entry, teamname) => {
                const row = finalRows.find((team) => team.teamname === teamname);
                details[teamname] = {
                    members: entry.members,
                    sessions: entry.sessions,
                    sources: entry.sources,
                    teamData: {
                        place: row?.place || 0,
                        points: row?.points || 0,
                    },
                };
            });

            setShowGamesColumn(hasMultipleGames);
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
            const top50 = leaderboard.slice(0, 50);
            const csvHeader = ['Rank', 'Team Name', 'Points', 'Elims', 'Wins', 'Games', 'Avg Place'];
            const csvRows = top50.map((team) => [
                team.place,
                team.teamname,
                team.points,
                team.elims,
                team.wins,
                team.games,
                team.avg_place.toFixed(2),
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
        setLocalPage(0);
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

    const startIndex = localPage * 10;
    const displayedLeaderboard = filteredLeaderboard.slice(startIndex, startIndex + 10);

    const previousPage = () => {
        if (localPage > 0) setLocalPage((prev) => prev - 1);
    };

    const nextPage = () => {
        const maxPages = Math.max(0, Math.ceil(filteredLeaderboard.length / 10) - 1);
        if (localPage < maxPages) setLocalPage((prev) => prev + 1);
    };

    const closeModal = () => setSelectedTeam(null);

    if (error) {
        return (
            <div className='erazer_cup_cumulative'>
                <img src={erazerLogo} alt="Erazer Logo" className="erazer_logo" />
                <div style={{ color: 'red', textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>
                    {error}
                </div>
            </div>
        );
    }

    if (!leaderboard) {
        return (
            <div className='erazer_cup_cumulative'>
                <img src={erazerLogo} alt="Erazer Logo" className="erazer_logo" />
                <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>Chargement...</div>
            </div>
        );
    }

    return (
        <div className='erazer_cup_cumulative'>
            <img src={erazerLogo} alt="Erazer Logo" className="erazer_logo" />

            {isExporting && (
                <div
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        zIndex: 1000,
                        textAlign: 'center',
                    }}
                >
                    Export CSV en cours...
                </div>
            )}

            {showSearch && (
                <div className='search_container'>
                    <input
                        type="text"
                        placeholder="Rechercher un joueur"
                        className="search_input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            )}

            <div className='leaderboard_container'>
                <div className='leaderboard_table'>
                    <div className='header_container'>
                        <div className='rank_header' onClick={previousPage}>RANK</div>
                        <div className='name_header'>TEAMS</div>
                        <div className='info_header' style={{ fontSize: '12px' }}>AVG PLACE</div>
                        <div className='info_header'>ELIMS</div>
                        <div className='info_header'>WINS</div>
                        <div className='info_header' onClick={nextPage}>POINTS</div>
                        {showGamesColumn && <div className='info_header' onClick={nextPage}>GAMES</div>}
                    </div>

                    {displayedLeaderboard.map((data, index) => (
                        <Row
                            key={data.teamId || data.teamname}
                            rank={data.place}
                            teamname={data.teamname}
                            points={data.points}
                            elims={data.elims}
                            wins={data.wins}
                            games={data.games}
                            avg_place={data.avg_place}
                            order={index + 1}
                            showGamesColumn={showGamesColumn}
                            onClick={() => setSelectedTeam(data.teamname)}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index}
                            showPositionIndicators={showPositionIndicators}
                            positionChange={data.positionChange}
                            alive={data.alive}
                            showFlags={showFlags}
                            memberData={data.memberData}
                        />
                    ))}
                </div>
            </div>

            {selectedTeam && teamDetails[selectedTeam] && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1200,
                    }}
                    onClick={closeModal}
                >
                    <div
                        style={{
                            width: 'min(900px, 92vw)',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            background: '#111',
                            border: '2px solid #5dbbd3',
                            borderRadius: '10px',
                            padding: '16px',
                            color: '#fff',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0 }}>{selectedTeam}</h3>
                            <button type="button" onClick={closeModal}>x</button>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <strong>Classement cumule:</strong> #{teamDetails[selectedTeam].teamData.place} - {teamDetails[selectedTeam].teamData.points} pts
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <strong>Membres:</strong>
                            <ul>
                                {teamDetails[selectedTeam].members.map((member, idx) => (
                                    <li key={`${member.id || member.name}-${idx}`}>{member.name}</li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <strong>Contribution par leaderboard:</strong>
                            <ul>
                                {teamDetails[selectedTeam].sources.map((source, idx) => (
                                    <li key={`${source.leaderboardId}-${idx}`}>
                                        {source.leaderboardId}: place {source.place}, {source.points} pts, {source.games} games
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaderboardErazerCumulative;
