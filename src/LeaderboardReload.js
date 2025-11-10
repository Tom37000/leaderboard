import './LeaderboardReload.css';
import React, {useState, useEffect} from "react"
import { useLocation } from 'react-router-dom';

const Row = React.memo(function Row({rank, teamname, points, elims, avg_place, wins, games, order, showGamesColumn, onClick, positionChange, showPositionIndicators, animationEnabled, hasPositionChanged, cascadeFadeEnabled, cascadeIndex, alive}) {
    const renderPositionChange = () => {

        if (!showPositionIndicators || alive || games < 2) {
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
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)'
            }}>
                {rank}
                {renderPositionChange()}
            </div>
            <div className='name_container' style={{ 
                cursor: 'pointer',
                fontSize: teamname.length > 25 ? '16px' : teamname.length > 20 ? '18px' : teamname.length > 15 ? '20px' : teamname.length > 10 ? '22px' : '24px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)'
            }} onClick={onClick}>
                {alive && <span className='alive-dot' />}
                {teamname}
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
        prevProps.alive === nextProps.alive
    );
});

function LeaderboardReload() {

    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const leaderboard_id = urlParams.get('id');
    const cascadeParam = urlParams.get('cascade');

    const [leaderboard, setLeaderboard] = useState([]);
    const [apiPage, setApiPage] = useState(0); 
    const [localPage, setLocalPage] = useState(0); 
    const [totalApiPages, setTotalApiPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(""); 
    const [showSearch, setShowSearch] = useState(true); 


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

    const loadLeaderboard = async () => {
        try {
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
            let v7Entries = [];
            try {
                const queries = { queries: [{ range: { from: 0, to: 50000 }, flags: 1 }], flags: 1 };
                const v7Response = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}/v7/query`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(queries),
                });
                const v7Data = await v7Response.json();
                if (v7Data && v7Data.queries && v7Data.queries[0] && Array.isArray(v7Data.queries[0].entries)) {
                    v7Entries = v7Data.queries[0].entries;
                    for (const entry of v7Entries) {
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

            // Helper to normalize session IDs
            const normalizeId = (id) => (id || '').replaceAll('-', '');

            // Fetch sessions list to build current and previous snapshots like in test.js
            let currSessionIds = new Set();
            let prevSessionIds = new Set();
            try {
                const sessionsRes = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}/sessions`);
                const sessionsList = await sessionsRes.json();
                // Sort by start_time
                sessionsList.sort((a, b) => Number(a.start_time) - Number(b.start_time));
                const normalizedIds = sessionsList
                    .map(s => normalizeId(s.id));
                const currIdsArr = [...new Set(normalizedIds)];
                const prevIdsArr = currIdsArr.slice(0, Math.max(0, currIdsArr.length - 1));
                currSessionIds = new Set(currIdsArr);
                prevSessionIds = new Set(prevIdsArr);
            } catch (e) {
                console.error('Error loading sessions list:', e);
            }

            const toNumber = (value) => {
                const n = Number(value);
                return Number.isFinite(n) ? n : 0;
            };
            
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
                    
                    // Points: recalculés via sessions pour permettre la reconstruction N et N-1
                    const pointsFromSessions = sessions.reduce((acc, session) => acc + toNumber(session.points), 0);

                    allLeaderboardData.push({
                        teamname: teamname,
                        elims: sessions.map(session => session.kills).reduce((acc, curr) => acc + curr, 0),
                        avg_place: sessions.reduce((acc, session) => acc + session.place, 0) / sessions.length,
                        wins: sessions.map(session => session.place).reduce((acc, curr) => acc + (curr === 1 ? 1 : 0), 0),
                        games: gamesCount,
                        place: data.teams[team].place,
                        points: (typeof pointsFromSessions === 'number' && pointsFromSessions > 0) ? pointsFromSessions : data.teams[team].points,
                        alive: !!aliveByTeamname[teamname]
                    });
                }
            });
            allLeaderboardData.sort((a, b) => {
                if (a.place !== b.place) {
                    return a.place - b.place;
                }
                return b.points - a.points;
            });
            // Recalcule des rangs N et N-1 directement depuis v7Entries à la manière de test.js
            const computeName = (entry) => {
                const membersArr = Object.values(entry.members);
                membersArr.sort((a, b) => a.id.localeCompare(b.id));
                return membersArr.map(m => m.name).join(' - ');
            };

            const getSessionPoints = (session) => {
                if (session && Array.isArray(session.metrics) && typeof session.metrics[1] !== 'undefined') {
                    const v = Number(session.metrics[1]);
                    return Number.isFinite(v) ? v : 0;
                }
                return toNumber(session?.points);
            };

            const buildLeaderboardAt = (entries, allowedSessionIds) => {
                const cloned = entries.map(e => ({ ...e, sessions: Array.isArray(e.sessions) ? e.sessions.slice() : [] }));
                for (const team of cloned) {
                    team.sessions = team.sessions.filter(s => allowedSessionIds.has(normalizeId(s.id)));
                    const ptsSum = team.sessions.reduce((prev, curr) => prev + getSessionPoints(curr), 0);
                    const avgElims = team.sessions.length > 0 ? team.sessions.reduce((p, c) => p + Number(c.metrics?.[101] ?? c.kills ?? 0), 0) / team.sessions.length : 0;
                    const avgPlace = team.sessions.length > 0 ? team.sessions.reduce((p, c) => p + Number(c.metrics?.[102] ?? c.place ?? 0), 0) / team.sessions.length : 0;
                    const wins = team.sessions.reduce((p, c) => {
                        const w = Number(c.metrics?.[104]);
                        if (Number.isFinite(w)) return p + w;
                        return p + ((c.place === 1) ? 1 : 0);
                    }, 0);
                    const timeAlive = team.sessions.reduce((p, c) => p + Number(c.metrics?.[106] ?? 0), 0);

                    team._calc = {
                        points: ptsSum,
                        avgElims,
                        avgPlace,
                        wins,
                        timeAlive
                    };
                }
                cloned.sort((a, b) => {
                    const ad = b._calc.points - a._calc.points; if (ad !== 0) return ad;
                    const bd = b._calc.wins - a._calc.wins; if (bd !== 0) return bd;
                    const cd = b._calc.avgElims - a._calc.avgElims; if (cd !== 0) return cd;
                    const dd = b._calc.avgPlace - a._calc.avgPlace; if (dd !== 0) return dd;
                    const ed = b._calc.timeAlive - a._calc.timeAlive; if (ed !== 0) return ed;
                    return Math.random() - 0.5;
                });
                cloned.forEach((t, idx) => { t._rank = idx + 1; t._name = computeName(t); });
                return cloned;
            };

            let changeByName = {};
            if (v7Entries && v7Entries.length > 0 && currSessionIds.size > 0) {
                const currLB = buildLeaderboardAt(v7Entries, currSessionIds);
                const prevLB = buildLeaderboardAt(v7Entries, prevSessionIds);
                const prevById = new Map(prevLB.map(t => [t.id, t]));
                for (const ct of currLB) {
                    const pt = prevById.get(ct.id);
                    if (pt) {
                        changeByName[ct._name] = pt._rank - ct._rank;
                    }
                }
            }

            let updatedLeaderboardData;
            if (previousLeaderboard) {
                const previousTeamsMap = new Map(previousLeaderboard.map(team => [team.teamname, team]));
                updatedLeaderboardData = allLeaderboardData.map(team => {
                    const existingTeam = previousTeamsMap.get(team.teamname);
                    if (existingTeam) {
                        const positionChanged = existingTeam.place !== team.place;
                        const dataChanged = existingTeam.points !== team.points || 
                                          existingTeam.elims !== team.elims || 
                                          existingTeam.wins !== team.wins || 
                                          existingTeam.games !== team.games ||
                                          Math.abs(existingTeam.avg_place - team.avg_place) > 0.01;
                        const delta = (changeByName[team.teamname] !== undefined) ? changeByName[team.teamname] : 0;
                        return {
                            ...team,
                            positionChange: delta,
                            hasPositionChanged: positionChanged || (delta !== 0),
                            teamId: team.teamname,
                            _isUpdated: positionChanged || dataChanged
                        };
                    } else {
                        const delta = (changeByName[team.teamname] !== undefined) ? changeByName[team.teamname] : 0;
                        return {
                            ...team,
                            positionChange: delta,
                            hasPositionChanged: delta !== 0,
                            teamId: team.teamname,
                            _isUpdated: true
                        };
                    }
                });
            } else {
                updatedLeaderboardData = allLeaderboardData.map(team => {
                    const delta = (changeByName[team.teamname] !== undefined) ? changeByName[team.teamname] : 0;
                    return {
                        ...team,
                        positionChange: delta,
                        hasPositionChanged: delta !== 0,
                        teamId: team.teamname,
                        _isUpdated: true
                    };
                });
            }
            
            const hasNonZeroDelta = updatedLeaderboardData.some(t => t.positionChange !== 0);
            const allDead = updatedLeaderboardData.length > 0 && updatedLeaderboardData.every(team => !team.alive);

            setShowPositionIndicators(allDead && hasNonZeroDelta);
            setHasRefreshedOnce(true);
            
            if (hasNonZeroDelta) {
                setAnimationEnabled(true);
                setTimeout(() => { setAnimationEnabled(false); }, 2500);
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
        
        const interval = setInterval(loadLeaderboard, 10000);
        
        return () => clearInterval(interval);
    }, [leaderboard_id]);

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
        <div className='reload'>
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
                    color: '#ffffffff',
                    textAlign: 'center',
                    paddingTop: '50px',
                    marginBottom: '20px',
                    fontWeight: 'bold'
                }}>Classement | Finale Reload Duos #3</div>

                <div className='leaderboard_table'>
                    <div className='header_container'>
                        <div className='rank_header' onClick={previousPage}>PLACE</div>
                        <div className='name_header'>ÉQUIPES</div>
                        <div style={{fontSize: '13px'}} className='info_header'>AVG PLACE</div>
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
                                positionChange={data.positionChange || 0}
                                showPositionIndicators={showPositionIndicators}
                                animationEnabled={animationEnabled && data.hasPositionChanged} 
                                hasPositionChanged={data.hasPositionChanged || false}
                                cascadeFadeEnabled={cascadeFadeEnabled}
                                cascadeIndex={index}
                                alive={data.alive}
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

export default LeaderboardReload