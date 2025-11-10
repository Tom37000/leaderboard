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
                    
                    allLeaderboardData.push({
                        teamname: teamname,
                        elims: sessions.map(session => session.kills).reduce((acc, curr) => acc + curr, 0),
                        avg_place: sessions.reduce((acc, session) => acc + session.place, 0) / sessions.length,
                        wins: sessions.map(session => session.place).reduce((acc, curr) => acc + (curr === 1 ? 1 : 0), 0),
                        games: gamesCount,
                        place: data.teams[team].place,
                        points: data.teams[team].points,
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
            
            const lastFinishedKey = `cdf_sly_last_finished_${leaderboard_id}`;
            const lastFinished = JSON.parse(localStorage.getItem(lastFinishedKey) || '{}');
            const indicatorsStorageKey = `position_indicators_${leaderboard_id}`;
            const storedIndicators = JSON.parse(localStorage.getItem(indicatorsStorageKey) || '{}');
            let hasChanges = false;
            const newIndicators = {};
            const changedTeams = new Set();
            
            allLeaderboardData.forEach(team => {
                const prev = lastFinished[team.teamname];
                if (!team.alive) {
                    if (prev && team.games === (prev.games || 0) + 1) {
                        const change = (prev.place || team.place) - team.place;
                        newIndicators[team.teamname] = change === 0 ? 0 : change;
                        if (change !== 0) {
                            changedTeams.add(team.teamname);
                            hasChanges = true;
                        }
                    }
                    if (!prev || prev.games !== team.games) {
                        lastFinished[team.teamname] = {
                            games: team.games,
                            place: team.place,
                            points: (v7PointsByTeamname && typeof v7PointsByTeamname[team.teamname] !== 'undefined')
                                ? v7PointsByTeamname[team.teamname]
                                : team.points
                        };
                    } else if (storedIndicators[team.teamname] !== undefined) {
                        newIndicators[team.teamname] = storedIndicators[team.teamname];
                    }
                }
            });
            
            localStorage.setItem(lastFinishedKey, JSON.stringify(lastFinished));
            
            localStorage.setItem(indicatorsStorageKey, JSON.stringify(newIndicators));
            
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
                        return {
                            ...team,
                            positionChange: newIndicators[team.teamname] || 0,
                            hasPositionChanged: positionChanged || (newIndicators[team.teamname] !== undefined && newIndicators[team.teamname] !== 0),
                            teamId: team.teamname,
                            _isUpdated: positionChanged || dataChanged
                        };
                    } else {
                        return {
                            ...team,
                            positionChange: newIndicators[team.teamname] || 0,
                            hasPositionChanged: newIndicators[team.teamname] !== undefined && newIndicators[team.teamname] !== 0,
                            teamId: team.teamname,
                            _isUpdated: true
                        };
                    }
                });
            } else {
                updatedLeaderboardData = allLeaderboardData.map(team => {
                    return {
                        ...team,
                        positionChange: newIndicators[team.teamname] || 0,
                        hasPositionChanged: newIndicators[team.teamname] !== undefined && newIndicators[team.teamname] !== 0,
                        teamId: team.teamname,
                        _isUpdated: true
                    };
                });
            }
            
            const shouldShowIndicators = Object.keys(newIndicators).length > 0;
            const allDead = updatedLeaderboardData.length > 0 && updatedLeaderboardData.every(team => !team.alive);

            setShowPositionIndicators(allDead);
            setHasRefreshedOnce(true);
            
            if (hasChanges && changedTeams.size > 0) {
                const now = Date.now();
                setLastChangeTime(now);
                const lastChangeTimeKey = `last_change_time_${leaderboard_id}`;
                localStorage.setItem(lastChangeTimeKey, now.toString());
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