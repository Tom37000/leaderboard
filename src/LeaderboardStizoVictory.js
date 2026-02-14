import './LeaderboardStizoVictory.css';
import React, { useState, useEffect, useRef, useMemo } from "react"
import { useLocation } from 'react-router-dom';
import { enrichWithPreviousLeaderboard, fetchUnifiedLeaderboardData, parseExcludedSessionIds } from './leaderboardShared';

const Row = React.memo(function Row({ rank, teamname, points, elims, avg_place, wins, games, order, showGamesColumn, onClick, positionChange, showPositionIndicators, animationEnabled, hasPositionChanged, cascadeFadeEnabled, cascadeIndex, alive, showFlags, memberData }) {
    const renderPositionChange = () => {

        if (!showPositionIndicators || alive || games < 2 || positionChange === null) {
            return null;
        }

        const getIndicatorStyle = (type, value) => {
            const textLength = String(value).length;
            let baseWidth, fontSize, padding;
            if (textLength === 1) {
                baseWidth = 20;
                fontSize = 11;
                padding = '2px 6px';
            } else if (textLength === 2) {
                baseWidth = 26;
                fontSize = 10;
                padding = '2px 5px';
            } else if (textLength === 3) {
                baseWidth = 32;
                fontSize = 9;
                padding = '2px 4px';
            } else {
                baseWidth = 38;
                fontSize = 8;
                padding = '2px 3px';
            }

            const baseStyle = {
                padding: padding,
                borderRadius: '3px',
                fontSize: `${fontSize}px`,
                fontWeight: 'bold',
                border: '1px solid',
                minWidth: `${baseWidth}px`,
                textAlign: 'center',
                display: 'inline-block',
                marginLeft: '0px',
                position: 'absolute',
                right: '-32px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
            };

            if (type === 'neutral') {
                return {
                    ...baseStyle,
                    backgroundColor: '#666',
                    color: '#fff',
                    borderColor: '#666'
                };
            } else if (type === 'positive') {
                return {
                    ...baseStyle,
                    backgroundColor: '#4CAF50',
                    color: '#fff',
                    borderColor: '#4CAF50'
                };
            } else {
                return {
                    ...baseStyle,
                    backgroundColor: '#f44336',
                    color: '#fff',
                    borderColor: '#f44336'
                };
            }
        };


        if (positionChange === 0) {
            return <span className="position_change neutral" style={getIndicatorStyle('neutral', '=')}>=</span>;
        }
        if (positionChange > 0) {
            return <span className="position_change positive" style={getIndicatorStyle('positive', `+${positionChange}`)}>+{positionChange}</span>;
        } else {
            return <span className="position_change negative" style={getIndicatorStyle('negative', positionChange)}>{positionChange}</span>;
        }
    };

    const getAnimationStyle = () => {
        if (!animationEnabled || !hasPositionChanged || positionChange === 0) return {};

        const rowHeight = 60;
        const realDistance = Math.abs(positionChange) * rowHeight;

        const baseSpeed = 200;
        const minDuration = 0.6;
        const maxDuration = 2.0;

        let calculatedDuration = realDistance / baseSpeed;
        calculatedDuration = Math.max(minDuration, Math.min(maxDuration, calculatedDuration));

        const fromPosition = positionChange > 0 ? realDistance : -realDistance;

        return {
            '--slide-from': `${fromPosition}px`,
            '--slide-to': '0px',
            animation: `slideFromTo ${calculatedDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            zIndex: 10
        };
    };

    return (
        <div className='row_container' style={{
            '--animation-order': order,
            opacity: cascadeFadeEnabled ? 0 : (animationEnabled && hasPositionChanged ? 0.9 : 1),
            animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
            animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
            transition: animationEnabled && hasPositionChanged ? 'none' : 'opacity 0.3s ease',
            ...getAnimationStyle()
        }}>
            <div className='rank_container' style={{
                fontSize: rank >= 1000 ? '24px' : rank >= 100 ? '24px' : '26px',
                paddingLeft: rank >= 1000 ? '16px' : rank >= 100 ? '12px' : rank >= 10 ? '4px' : '0px',

            }}>
                {rank}
                {renderPositionChange()}
            </div>
            <div className='name_container' style={{
                cursor: 'pointer',
                fontSize: teamname.length > 70 ? '7px' : teamname.length > 65 ? '8px' : teamname.length > 60 ? '9px' : teamname.length > 55 ? '10px' : teamname.length > 50 ? '11px' : teamname.length > 45 ? '12px' : teamname.length > 40 ? '13px' : teamname.length > 35 ? '14px' : teamname.length > 30 ? '15px' : teamname.length > 25 ? '17px' : teamname.length > 20 ? '19px' : teamname.length > 15 ? '21px' : '24px',
                whiteSpace: 'nowrap',

            }} onClick={onClick}>
                {alive && <span className='alive-dot' />}
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
            </div>
            <div className='info_box'>{avg_place.toFixed(2)}</div>
            <div className='info_box'>{elims}</div>
            <div className='info_box'>{wins}</div>
            <div className='info_box'>{points}</div>
            {showGamesColumn && <div className='info_box'>{games}</div>}
        </div>
    );
}, (prevProps, nextProps) => {

    return (
        prevProps.rank === nextProps.rank &&
        prevProps.teamname === nextProps.teamname &&
        prevProps.points === nextProps.points &&
        prevProps.elims === nextProps.elims &&
        Math.abs(prevProps.avg_place - nextProps.avg_place) < 0.01 &&
        prevProps.wins === nextProps.wins &&
        prevProps.games === nextProps.games &&
        prevProps.showGamesColumn === nextProps.showGamesColumn &&
        prevProps.positionChange === nextProps.positionChange &&
        prevProps.showPositionIndicators === nextProps.showPositionIndicators &&
        prevProps.animationEnabled === nextProps.animationEnabled &&
        prevProps.hasPositionChanged === nextProps.hasPositionChanged &&
        prevProps.cascadeFadeEnabled === nextProps.cascadeFadeEnabled &&
        prevProps.alive === nextProps.alive &&
        prevProps.showFlags === nextProps.showFlags &&
        JSON.stringify(prevProps.memberData) === JSON.stringify(nextProps.memberData)
    );
});

function LeaderboardStizoVictory() {

    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const leaderboard_id = urlParams.get('id');
    const cascadeParam = urlParams.get('cascade');
    const flagsParam = urlParams.get('flags');
    const excludedSessionIds = useMemo(() => parseExcludedSessionIds(new URLSearchParams(location.search)), [location.search]);
    const excludedSessionIdsKey = useMemo(() => Array.from(excludedSessionIds).sort().join(','), [excludedSessionIds]);

    const [leaderboard, setLeaderboard] = useState([]);
    const [apiPage, setApiPage] = useState(0);
    const [localPage, setLocalPage] = useState(0);
    const [totalApiPages, setTotalApiPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFlags, setShowFlags] = useState(flagsParam === 'true');
    const [epicIdToCountry, setEpicIdToCountry] = useState({});
    const [showSearch, setShowSearch] = useState(false);


    const [showGamesColumn, setShowGamesColumn] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamDetails, setTeamDetails] = useState({});
    const [previousPositions, setPreviousPositions] = useState({});
    const [lastChangeTime, setLastChangeTime] = useState(Date.now());
    const [showPositionIndicators, setShowPositionIndicators] = useState(false);
    const [hasRefreshedOnce, setHasRefreshedOnce] = useState(false);
    const [animationEnabled, setAnimationEnabled] = useState(false);
    const [cascadeFadeEnabled, setCascadeFadeEnabled] = useState(cascadeParam === 'true');
    const [previousLeaderboard, setPreviousLeaderboard] = useState(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const wasAllDeadRef = useRef(false);

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
                        } else if (index < 5) {
                            console.log(`Line ${index} did not match:`, JSON.stringify(line));
                        }
                    });
                    console.log(`Loaded ${Object.keys(mapping).length} Epic IDs from database`);
                    console.log('Sample Epic IDs:', Object.keys(mapping).slice(0, 5));
                    console.log('First mapping entry:', Object.entries(mapping)[0]);
                    setEpicIdToCountry(mapping);
                })
                .catch(err => console.error('Error loading epic ID database:', err));
        }
    }, [showFlags]);

    const loadLeaderboard = async () => {
        try {
            const data = await fetchUnifiedLeaderboardData({
                leaderboardId: leaderboard_id,
                excludedSessionIds,
                showFlags,
                epicIdToCountry,
                forceRankByPoints: true,
                includeV7: true,
                indicatorsOnlyWhenAllDead: true,
            });

            setTotalApiPages(data.totalPages);
            setShowGamesColumn(data.hasMultipleGames);
            setShowPositionIndicators(data.showPositionIndicators);
            setHasRefreshedOnce(true);

            const merged = enrichWithPreviousLeaderboard(data.leaderboard, previousLeaderboard);
            setLeaderboard(merged.leaderboard);
            setTeamDetails(data.teamDetails);
            setPreviousLeaderboard(merged.leaderboard);

            if (typeof setIsInitialLoad === 'function' && isInitialLoad) {
                setIsInitialLoad(false);
            }

            if (previousLeaderboard && merged.changedCount > 0) {
                setLastChangeTime(Date.now());
                setAnimationEnabled(true);
                setTimeout(() => { setAnimationEnabled(false); }, 2500);
            } else {
                setAnimationEnabled(false);
            }

            return;
            const firstResponse = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}?page=0`);
            const firstData = await firstResponse.json();

            let allLeaderboardData = [];
            let allDetails = {};
            let hasMultipleGames = false;

            const totalPages = firstData.total_pages || 1;
            setTotalApiPages(totalPages);

            const promises = [];
            for (let page = 0; page < totalPages; page++) {
                promises.push(
                    fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}?page=${page}`)
                        .then(response => response.json())
                );
            }

            const allPagesData = await Promise.all(promises);

            let aliveByTeamname = {}; let v7PointsByTeamname = {};
            try {
                const queries = { queries: [{ range: { from: 0, to: 50000 }, flags: 1 }], flags: 1 };
                const v7Response = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}/v7/query`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(queries),
                });
                const v7Data = await v7Response.json();
                if (v7Data && v7Data.queries && v7Data.queries[0] && Array.isArray(v7Data.queries[0].entries)) {
                    for (const entry of v7Data.queries[0].entries) {
                        const membersArr = Object.values(entry.members);
                        membersArr.sort((a, b) => a.id.localeCompare(b.id));
                        const nameJoined = membersArr.map(m => m.name).join(' - ');
                        aliveByTeamname[nameJoined] = ((entry.flags & 2) === 2);
                        if (entry.stats && typeof entry.stats[1] !== 'undefined') {
                            v7PointsByTeamname[nameJoined] = entry.stats[1];
                        }
                    }
                }
            } catch (e) {
                console.error('Error loading v7/query data:', e);
            }

            allPagesData.forEach(data => {
                for (let team in data.teams) {
                    const sessionKeys = Object.keys(data.teams[team].sessions).sort((a, b) => parseInt(a) - parseInt(b));
                    const sessions = sessionKeys.map(key => data.teams[team].sessions[key]);
                    const gamesCount = sessions.length;
                    const members = Object.values(data.teams[team].members);
                    members.sort((a, b) => a.id.localeCompare(b.id));
                    const teamname = members.map(member => member.name).join(' - ');

                    if (gamesCount > 1) {
                        hasMultipleGames = true;
                    }

                    allDetails[teamname] = {
                        members: members,
                        sessions: sessions,
                        teamData: data.teams[team]
                    };

                    const memberData = showFlags ? members.map(member => {
                        const epicId = member.ingame_id || member.id;
                        const countryFlag = epicIdToCountry[epicId] || 'GroupIdentity_GeoIdentity_global';
                        console.log(`Member: ${member.name}, Epic ID (ingame_id): ${epicId}, Flag: ${countryFlag}`);
                        return {
                            name: member.name,
                            flag: countryFlag
                        };
                    }) : [];

                    const isAlive = !!aliveByTeamname[teamname];

                    allLeaderboardData.push({
                        teamname: teamname,
                        elims: sessions.map(session => session.kills).reduce((acc, curr) => acc + curr, 0),
                        avg_place: sessions.reduce((acc, session) => acc + session.place, 0) / sessions.length,
                        wins: sessions.map(session => session.place).reduce((acc, curr) => acc + (curr === 1 ? 1 : 0), 0),
                        games: gamesCount,
                        place: data.teams[team].place,
                        points: data.teams[team].points,
                        alive: isAlive,
                        memberData: memberData
                    });
                }
            });
            allLeaderboardData.sort((a, b) => {
                if (a.place !== b.place) {
                    return a.place - b.place;
                }
                return b.points - a.points;
            });
            const snapshotsKey = `ranks_snapshots_${leaderboard_id}`;
            const rankSnapshots = JSON.parse(localStorage.getItem(snapshotsKey) || '{}');
            const newIndicators = {};
            let hasNewChanges = false;
            const changedTeams = new Set();
            const prevRunIndicatorsKey = `prev_run_indicators_${leaderboard_id}`;
            const prevRunIndicators = JSON.parse(localStorage.getItem(prevRunIndicatorsKey) || '{}');

            allLeaderboardData.forEach(team => {
                const gameCount = team.games;
                if (!rankSnapshots[gameCount]) {
                    rankSnapshots[gameCount] = {};
                }
                rankSnapshots[gameCount][team.teamname] = team.place;
                if (gameCount > 1) {
                    const prevGameCount = gameCount - 1;
                    if (rankSnapshots[prevGameCount] && rankSnapshots[prevGameCount][team.teamname]) {
                        const prevRank = rankSnapshots[prevGameCount][team.teamname];
                        const change = prevRank - team.place;

                        newIndicators[team.teamname] = change;
                        if (newIndicators[team.teamname] !== (prevRunIndicators[team.teamname] || 0)) {
                            changedTeams.add(team.teamname);
                            hasNewChanges = true;
                        }
                    }
                }
            });

            localStorage.setItem(snapshotsKey, JSON.stringify(rankSnapshots));
            localStorage.setItem(prevRunIndicatorsKey, JSON.stringify(newIndicators));

            let updatedLeaderboardData;
            if (previousLeaderboard) {
                const previousTeamsMap = new Map(previousLeaderboard.map(team => [team.teamname, team]));
                updatedLeaderboardData = allLeaderboardData.map(team => {
                    const existingTeam = previousTeamsMap.get(team.teamname);

                    let dataChanged = false;
                    if (existingTeam) {
                        dataChanged = existingTeam.points !== team.points ||
                            existingTeam.elims !== team.elims ||
                            existingTeam.wins !== team.wins ||
                            existingTeam.games !== team.games ||
                            Math.abs(existingTeam.avg_place - team.avg_place) > 0.01;
                    }

                    const indicatorVal = team.teamname in newIndicators ? newIndicators[team.teamname] : null;
                    const prevIndicatorVal = team.teamname in prevRunIndicators ? prevRunIndicators[team.teamname] : null;
                    const positionChanged = indicatorVal !== prevIndicatorVal;

                    return {
                        ...team,
                        positionChange: indicatorVal,
                        hasPositionChanged: indicatorVal !== null && indicatorVal !== 0,
                        teamId: team.teamname,
                        _isUpdated: dataChanged || positionChanged,
                        memberData: team.memberData || []
                    };
                });
            } else {
                updatedLeaderboardData = allLeaderboardData.map(team => {
                    return {
                        ...team,
                        positionChange: team.teamname in newIndicators ? newIndicators[team.teamname] : null,
                        hasPositionChanged: team.teamname in newIndicators && newIndicators[team.teamname] !== 0,
                        teamId: team.teamname,
                        _isUpdated: true,
                        memberData: team.memberData || []
                    };
                });
            }

            const allDead = updatedLeaderboardData.length > 0 && updatedLeaderboardData.every(team => !team.alive);
            const shouldShowIndicators = allDead;

            if (!shouldShowIndicators) {
                updatedLeaderboardData.forEach(team => {
                    team.positionChange = null;
                    team.hasPositionChanged = false;
                });
            }

            setShowPositionIndicators(shouldShowIndicators);
            setHasRefreshedOnce(true);

            if (changedTeams.size > 0) {
                const now = Date.now();
                setLastChangeTime(now);
                setAnimationEnabled(true);
                setTimeout(() => { setAnimationEnabled(false); }, 2500);
            } else {
                setAnimationEnabled(false);
            }

            setShowGamesColumn(hasMultipleGames);
            if (isInitialLoad) {
                setLeaderboard(updatedLeaderboardData);
                setIsInitialLoad(false);
            } else {
                setLeaderboard(updatedLeaderboardData);
            }

            setTeamDetails(allDetails);

            setPreviousLeaderboard(updatedLeaderboardData);
        } catch (error) {
            console.error('Error loading leaderboard data:', error);
        }
    };

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'F8') {
                event.preventDefault();
                setCascadeFadeEnabled(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    useEffect(() => {
        loadLeaderboard();

        const interval = setInterval(loadLeaderboard, 30000);

        return () => clearInterval(interval);
    }, [leaderboard_id, epicIdToCountry, showFlags, excludedSessionIdsKey]);

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'F1') {
                event.preventDefault();
                setShowSearch(prev => !prev);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        setLocalPage(0);
    }, [searchQuery]);



    const handleTeamClick = (teamname) => {
        setSelectedTeam(teamname);
    };

    const closeModal = () => {
        setSelectedTeam(null);
    };



    function nextPageFromPoints() {
        if (!showGamesColumn) {
            const filteredLeaderboard = leaderboard.filter(team => {
                if (team.teamname.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return true;
                }
                if (!isNaN(searchQuery) && searchQuery.trim() !== '') {
                    const searchPosition = parseInt(searchQuery.trim());
                    if (team.place === searchPosition) {
                        return true;
                    }
                }
                if (teamDetails[team.teamname] && teamDetails[team.teamname].members) {
                    return teamDetails[team.teamname].members.some(member =>
                        member.ingame_name && member.ingame_name.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }
                return false;
            });
            const maxPages = Math.ceil(filteredLeaderboard.length / 10) - 1;

            if (localPage < maxPages) {
                setLocalPage(localPage + 1);
            }
        }
    }

    function nextPageFromGames() {
        if (showGamesColumn) {
            const filteredLeaderboard = leaderboard.filter(team => {
                if (team.teamname.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return true;
                }
                if (!isNaN(searchQuery) && searchQuery.trim() !== '') {
                    const searchPosition = parseInt(searchQuery.trim());
                    if (team.place === searchPosition) {
                        return true;
                    }
                }
                if (teamDetails[team.teamname] && teamDetails[team.teamname].members) {
                    return teamDetails[team.teamname].members.some(member =>
                        member.ingame_name && member.ingame_name.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }
                return false;
            });
            const maxPages = Math.ceil(filteredLeaderboard.length / 10) - 1;

            if (localPage < maxPages) {
                setLocalPage(localPage + 1);
            }
        }
    }

    function previousPage() {
        if (localPage > 0) {
            setLocalPage(localPage - 1);
        }
    }

    useEffect(() => {
        const supportSinglePage = totalApiPages === 1;
        setShowGamesColumn(supportSinglePage);
    }, [totalApiPages]);

    const getFilteredLeaderboard = () => {
        if (!searchQuery) return leaderboard;
        return leaderboard.filter(team => {
            if (team.teamname.toLowerCase().includes(searchQuery.toLowerCase())) {
                return true;
            }
            if (!isNaN(searchQuery) && searchQuery.trim() !== '') {
                const searchPosition = parseInt(searchQuery.trim());
                if (team.place === searchPosition) {
                    return true;
                }
            }
            if (teamDetails[team.teamname] && teamDetails[team.teamname].members) {
                return teamDetails[team.teamname].members.some(member =>
                    member.ingame_name && member.ingame_name.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }
            return false;
        });
    };

    const currentPage = Math.floor((apiPage) + localPage);
    const pageSize = 10;
    const filteredLeaderboard = getFilteredLeaderboard();

    const displayedLeaderboard = filteredLeaderboard.slice(currentPage * pageSize, (currentPage * pageSize) + pageSize);

    return (
        <div className='stizo_victory'>
            <div className='leaderboard_container'>

                {showSearch && (
                    <div className='search_container'>
                        <input
                            type='text'
                            className='search_input'
                            value={searchQuery}
                            placeholder='Rechercher un joueur'
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}

                <div className='leaderboard_title' style={{
                    fontFamily: 'Eurostile',
                    fontSize: '32px',
                    color: '#ffffff',
                    textAlign: 'center',
                    paddingTop: '50px',
                    marginBottom: '20px',
                    fontWeight: 'bold'
                }}>Classement | Stizo Victory Cup</div>

                <div className='leaderboard_table'>
                    <div className='header_container'>
                        <div className='rank_header' onClick={previousPage}>PLACE</div>
                        <div className='name_header'>ÉQUIPE</div>
                        <div style={{ fontSize: '13px' }} className='info_header'>AVG PLACE</div>
                        <div className='info_header'>ELIMS</div>
                        <div className='info_header'>WINS</div>
                        <div className='info_header' onClick={nextPageFromPoints}>POINTS</div>
                        {showGamesColumn && <div onClick={nextPageFromGames} className='info_header'>GAMES</div>}
                    </div>
                    {displayedLeaderboard.map((data, index) => {
                        const positionChange = Math.abs(data.positionChange || 0);
                        let animationOrder;

                        if (positionChange >= 500) {
                            animationOrder = 1;
                        } else if (positionChange >= 100) {
                            animationOrder = 2;
                        } else if (positionChange >= 50) {
                            animationOrder = 3;
                        } else if (positionChange >= 10) {
                            animationOrder = 4;
                        } else if (positionChange > 0) {
                            animationOrder = 5;
                        } else {
                            animationOrder = index + 6;
                        }

                        return (
                            <Row
                                key={`${data.teamId || data.teamname}-${data.place}`}
                                rank={data.place}
                                teamname={data.teamname}
                                points={data.points}
                                elims={data.elims}
                                wins={data.wins}
                                games={data.games}
                                avg_place={data.avg_place}
                                order={animationOrder}
                                showGamesColumn={showGamesColumn}
                                onClick={() => handleTeamClick(data.teamname)}
                                positionChange={data.positionChange}
                                showPositionIndicators={showPositionIndicators}
                                animationEnabled={animationEnabled && data.hasPositionChanged}
                                hasPositionChanged={data.hasPositionChanged || false}
                                cascadeFadeEnabled={cascadeFadeEnabled}
                                cascadeIndex={index}
                                alive={data.alive}
                                showFlags={showFlags}
                                memberData={data.memberData || []}
                            />
                        );
                    })}

                    {selectedTeam && teamDetails[selectedTeam] && (
                        <div className='modal_overlay' onClick={closeModal}>
                            <div className='modal_content' onClick={(e) => e.stopPropagation()}>
                                <div className='modal_header'>
                                    <h2>Stats détaillées - {selectedTeam}</h2>
                                    <button className='close_button' onClick={closeModal}>×</button>
                                </div>
                                <div className='modal_body'>
                                    <div className='team_summary'>
                                        <h3>Résumé de l'équipe :</h3>
                                        <div className='team_stats'>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Position:</span>
                                                <span className='stat_value'>#{teamDetails[selectedTeam].teamData.place}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Points actuels :</span>
                                                <span className='stat_value'>{teamDetails[selectedTeam].teamData.points}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Parties jouées :</span>
                                                <span className='stat_value'>{teamDetails[selectedTeam].sessions.length}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Victoires:</span>
                                                <span className='stat_value'>{teamDetails[selectedTeam].sessions.filter(s => s.place === 1).length}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Top 3:</span>
                                                <span className='stat_value'>{teamDetails[selectedTeam].sessions.filter(s => s.place <= 3).length}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Élims totales:</span>
                                                <span className='stat_value'>{teamDetails[selectedTeam].sessions.reduce((acc, s) => acc + s.kills, 0)}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Place moyenne:</span>
                                                <span className='stat_value'>{(teamDetails[selectedTeam].sessions.reduce((acc, s) => acc + s.place, 0) / teamDetails[selectedTeam].sessions.length).toFixed(2)}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Élims/partie:</span>
                                                <span className='stat_value'>{(teamDetails[selectedTeam].sessions.reduce((acc, s) => acc + s.kills, 0) / teamDetails[selectedTeam].sessions.length).toFixed(2)}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Meilleure place:</span>
                                                <span className='stat_value'>{Math.min(...teamDetails[selectedTeam].sessions.map(s => s.place))}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Pire place:</span>
                                                <span className='stat_value'>{Math.max(...teamDetails[selectedTeam].sessions.map(s => s.place))}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Max élims/partie:</span>
                                                <span className='stat_value'>{Math.max(...teamDetails[selectedTeam].sessions.map(s => s.kills))}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='members_section'>
                                        <h3>Membre(s) de l'équipe :</h3>
                                        <div className='members_list'>
                                            {teamDetails[selectedTeam].members.map((member, index) => (
                                                <div key={index} className='member_item'>
                                                    <span className='member_name'>{member.name}</span>
                                                    {member.ingame && <span className='member_ingame'>{member.ingame}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className='sessions_section'>
                                        <h3>Historique détaillé des games :</h3>
                                        <div className='sessions_table'>
                                            <div className='session_header'>
                                                <div>Game</div>
                                                <div>Place</div>
                                                <div>Éliminations</div>
                                            </div>
                                            {teamDetails[selectedTeam].sessions.map((session, index) => (
                                                <div key={index} className='session_row'>
                                                    <div className='session_highlight'>{index + 1}</div>
                                                    <div className={`place_${session.place <= 3 ? 'top' : session.place <= 10 ? 'good' : 'normal'}`}>{session.place}</div>
                                                    <div className='session_highlight'>{session.kills}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LeaderboardStizoVictory
