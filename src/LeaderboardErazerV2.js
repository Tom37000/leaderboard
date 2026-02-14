import './LeaderboardErazerV2.css';
import React, { useState, useEffect, useMemo } from "react"
import { useLocation } from 'react-router-dom';
import { enrichWithPreviousLeaderboard, fetchUnifiedLeaderboardData, parseExcludedSessionIds } from './leaderboardShared';
import BackgroundImage from './erazer_leaderboard_background.png'

function Row({ rank, teamname, points, elims, avg_place, wins, games, index, onClick, cascadeFadeEnabled, cascadeIndex, positionChange, showPositionIndicators, animationEnabled, hasPositionChanged, alive, showFlags, memberData }) {
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
            
            const teamNameLength = teamname.length;
            let scaleFactor = 1;
            if (teamNameLength > 20) {
                scaleFactor = 0.8;
            } else if (teamNameLength > 15) {
                scaleFactor = 0.9;
            }
            
            const adjustedWidth = Math.max(baseWidth, baseWidth * scaleFactor);
            const adjustedFontSize = Math.max(7, fontSize * scaleFactor);
            const adjustedPadding = padding;
            
            const baseStyle = {
                padding: adjustedPadding,
                borderRadius: '3px',
                fontSize: `${adjustedFontSize}px`,
                fontWeight: 'bold',
                border: '1px solid',
                minWidth: `${adjustedWidth}px`,
                textAlign: 'center',
                display: 'inline-block'
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
                    borderColor: '#4CAF50',
                };
            } else {
                return {
                    ...baseStyle,
                    backgroundColor: '#f44336',
                    color: '#fff',
                    borderColor: '#f44336',
                };
            }
        };

        if (positionChange === 0) {
            return null;
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
        
        const baseSpeed = 120; 
        const minDuration = 0.6; 
        const maxDuration = 2.5; 
        
        let calculatedDuration = realDistance / baseSpeed;
        calculatedDuration = Math.max(minDuration, Math.min(maxDuration, calculatedDuration));
        
        const fromPosition = positionChange > 0 ? realDistance : -realDistance;
        
        return {
            '--slide-from': `${fromPosition}px`,
            '--slide-to': '0px',
            animation: `slideFromTo ${calculatedDuration}s cubic-bezier(0.1, 0, 0.9, 1)`
        };
    };

    return (
        <>
            <div className={rank <= 25 ? 'rank top-25' : 'rank'} style={{
                opacity: cascadeFadeEnabled ? 0 : 1,
                animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
                animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
                ...getAnimationStyle()
            }}>
                {rank}
                {renderPositionChange()}
            </div>
            <div className={index % 2 ? 'name-and-vr' : 'name-and-vr odd'} style={{
                opacity: cascadeFadeEnabled ? 0 : 1,
                animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
                animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
                ...getAnimationStyle()
            }}>
                <div className='name' style={{ cursor: 'pointer' }} onClick={() => onClick(teamname)}>
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
            </div>
            <div className='info points' style={{
                opacity: cascadeFadeEnabled ? 0 : 1,
                animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
                animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
                ...getAnimationStyle()
            }}>{points}</div>
        </>
    )
}

function LeaderboardErazerCup() {

    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const leaderboard_id = urlParams.get('id');
    const cascadeParam = urlParams.get('cascade');
    const flagsParam = urlParams.get('flags');
    const excludedSessionIds = useMemo(() => parseExcludedSessionIds(new URLSearchParams(location.search)), [location.search]);
    const excludedSessionIdsKey = useMemo(() => Array.from(excludedSessionIds).sort().join(','), [excludedSessionIds]);

    const [allLeaderboardData, setAllLeaderboardData] = useState([]);
    const [leaderboard, setLeaderboard] = useState(null);
    const [page, setPage] = useState(0);
    const [totalApiPages, setTotalApiPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(true);
    const [showFlags, setShowFlags] = useState(flagsParam === 'true');
    const [epicIdToCountry, setEpicIdToCountry] = useState({});
    const [showGamesColumn, setShowGamesColumn] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamDetails, setTeamDetails] = useState({});
    const [cascadeFadeEnabled, setCascadeFadeEnabled] = useState(cascadeParam === 'true');
    const [previousPositions, setPreviousPositions] = useState({});
    const [lastChangeTime, setLastChangeTime] = useState(Date.now());
    const [showPositionIndicators, setShowPositionIndicators] = useState(false);
    const [hasRefreshedOnce, setHasRefreshedOnce] = useState(false);
    const [animationEnabled, setAnimationEnabled] = useState(false);
    const [previousLeaderboard, setPreviousLeaderboard] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const cascadeParam = urlParams.get('cascade');
        setCascadeFadeEnabled(cascadeParam === 'true');
    }, [location.search]);

    useEffect(() => {
        if (!showFlags) {
            setEpicIdToCountry({});
            return;
        }

        fetch(`${process.env.PUBLIC_URL}/id-epic-pays-database.txt`)
            .then(response => response.text())
            .then(data => {
                const mapping = {};
                const lines = data.split(/\r?\n/);
                lines.forEach((line) => {
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
    }, [showFlags]);

    useEffect(() => {
        const loadAllPages = async () => {
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

                const merged = enrichWithPreviousLeaderboard(data.leaderboard, leaderboard);
                setLeaderboard(merged.leaderboard);
                setTeamDetails(data.teamDetails);

                if (leaderboard && merged.changedCount > 0) {
                    setLastChangeTime(Date.now());
                    setAnimationEnabled(true);
                    setTimeout(() => {
                        setAnimationEnabled(false);
                    }, 2000);
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
                            points: data.teams[team].points
                        });
                    }
                });
                
                allLeaderboardData.sort((a, b) => {
                    if (a.place !== b.place) {
                        return a.place - b.place;
                    }
                    return b.points - a.points;
                });
                
                const storageKey = `leaderboard_positions_${leaderboard_id}`;
                const previousPositions = JSON.parse(localStorage.getItem(storageKey) || '{}');
                const indicatorsStorageKey = `position_indicators_${leaderboard_id}`;
                const storedIndicators = JSON.parse(localStorage.getItem(indicatorsStorageKey) || '{}');
                const lastChangeTimeKey = `last_change_time_${leaderboard_id}`;
                const storedLastChangeTime = localStorage.getItem(lastChangeTimeKey);
                
                let hasChanges = false;
                const newIndicators = {};
                const changedTeams = new Set();
                
                const now = Date.now();
                const shouldClearOldIndicators = storedLastChangeTime && (now - parseInt(storedLastChangeTime)) > 120000;
                
                if (shouldClearOldIndicators) {
                    localStorage.removeItem(indicatorsStorageKey);
                    localStorage.removeItem(lastChangeTimeKey);
                }
                
                allLeaderboardData.forEach(team => {
                    const previousPosition = previousPositions[team.teamname];
                    let positionChange = 0;
                    
                    if (previousPosition !== undefined && previousPosition !== team.place) {
                        positionChange = previousPosition - team.place;
                        if (positionChange !== 0) {
                            hasChanges = true;
                            newIndicators[team.teamname] = positionChange;
                            changedTeams.add(team.teamname);
                        }
                    } else if (!shouldClearOldIndicators && storedIndicators[team.teamname] !== undefined) {
                        positionChange = storedIndicators[team.teamname];
                        if (positionChange !== 0) {
                            newIndicators[team.teamname] = positionChange;
                        }
                    }
                });

                let updatedLeaderboardData;
                if (previousLeaderboard) {
                    updatedLeaderboardData = allLeaderboardData.map(team => {
                        const existingTeam = previousLeaderboard.find(prev => prev.teamname === team.teamname);
                        if (existingTeam && existingTeam.place === team.place) {
                            const dataChanged = existingTeam.points !== team.points || 
                                              existingTeam.elims !== team.elims || 
                                              existingTeam.wins !== team.wins || 
                                              existingTeam.games !== team.games;
                            
                            if (!dataChanged) {
                                return {
                                    ...existingTeam,
                                    positionChange: newIndicators[team.teamname] || existingTeam.positionChange || 0,
                                    hasPositionChanged: changedTeams.has(team.teamname)
                                };
                            } else {
                                return {
                                    ...existingTeam,
                                    points: team.points,
                                    elims: team.elims,
                                    wins: team.wins,
                                    games: team.games,
                                    avg_place: team.avg_place,
                                    positionChange: newIndicators[team.teamname] || 0,
                                    hasPositionChanged: false
                                };
                            }
                        } else {
                            return {
                                ...team,
                                positionChange: newIndicators[team.teamname] || 0,
                                hasPositionChanged: changedTeams.has(team.teamname),
                                teamId: team.teamname
                            };
                        }
                    });
                } else {
                    updatedLeaderboardData = allLeaderboardData.map(team => {
                        return {
                            ...team,
                            positionChange: newIndicators[team.teamname] || 0,
                            hasPositionChanged: changedTeams.has(team.teamname),
                            teamId: team.teamname
                        };
                    });
                }

                const currentPositions = {};
                allLeaderboardData.forEach(team => {
                    currentPositions[team.teamname] = team.place;
                });
                localStorage.setItem(storageKey, JSON.stringify(currentPositions));
                
                if (changedTeams.size > 0) {
                    localStorage.setItem(indicatorsStorageKey, JSON.stringify(newIndicators));
                }

                const shouldShowIndicators = Object.keys(newIndicators).length > 0;
                setShowPositionIndicators(shouldShowIndicators);
                setHasRefreshedOnce(true);
                
                if (hasChanges && changedTeams.size > 0) {
                    const now = Date.now();
                    setLastChangeTime(now);
                    localStorage.setItem(lastChangeTimeKey, now.toString());
                    
                    setAnimationEnabled(true);
                    
                    setTimeout(() => {
                        setAnimationEnabled(false);
                    }, 2000); 
                }
                
                setAllLeaderboardData(updatedLeaderboardData);
                setShowGamesColumn(hasMultipleGames);
                setLeaderboard(updatedLeaderboardData);
                setTeamDetails(allDetails);
                
                setPreviousLeaderboard(updatedLeaderboardData);
                
            } catch (error) {
                console.error('Error loading leaderboard data:', error);
            }
        };
        
        if (leaderboard_id) {
            loadAllPages();
            const interval = setInterval(loadAllPages, 10000);
            return () => clearInterval(interval);
        }
    }, [leaderboard_id, epicIdToCountry, showFlags, excludedSessionIdsKey]);

    const exportToCSV = async () => {
        if (!leaderboard || isExporting) return;
        
        setIsExporting(true);
        
        try {
            const top45 = leaderboard.slice(0, 45);
            const csvData = [];
            
            csvData.push(['Rank', 'Team Name', 'Avg Place', 'Avg Elim', 'Wins', 'Points', 'Epic ID', 'Discord IDs']);
            
            for (const team of top45) {
                try {
                    const teamPlayerNames = team.teamname.split(' - ');
                    const epicIds = [];
                    const discordIds = [];
                    
                    for (const playerName of teamPlayerNames) {
                        try {
                            const response = await fetch(`https://api.wls.gg/users/name/${encodeURIComponent(playerName)}`);
                            console.log(`API call for ${playerName}:`, response.status);
                            if (response.ok) {
                                const userData = await response.json();
                                console.log(`Data for ${playerName}:`, userData);
                                
                                let epicId = 'N/A';
                                let discordId = 'N/A';
                                
                                if (userData.connections) {
                                    console.log(`Connections for ${playerName}:`, userData.connections);
                                    
                                    const epicConnection = Object.values(userData.connections).find(conn => conn.provider === 'epic');
                                    if (epicConnection) {
                                        epicId = epicConnection.id;
                                        console.log(`Epic ID found for ${playerName}: ${epicId}`);
                                    }
                                    
                                    const discordConnection = Object.values(userData.connections).find(conn => conn.provider === 'discord');
                                    if (discordConnection) {
                                        discordId = discordConnection.id;
                                        console.log(`Discord ID found for ${playerName}: ${discordId}`);
                                    }
                                }
                                
                                epicIds.push(epicId);
                                discordIds.push(discordId);
                            } else {
                                console.log(`Failed to fetch data for ${playerName}: ${response.status}`);
                                epicIds.push('N/A');
                                discordIds.push('N/A');
                            }
                        } catch (error) {
                            console.error(`Error fetching data for ${playerName}:`, error);
                            epicIds.push('N/A');
                            discordIds.push('N/A');
                        }
                    }
                    
                    csvData.push([
                        team.place,
                        team.teamname,
                        team.avg_place.toFixed(2),
                        team.elims,
                        team.wins,
                        team.points,
                        epicIds.join(' / '),
                        discordIds.join(' / ')
                    ]);
                } catch (error) {
                    console.error(`Error processing team ${team.teamname}:`, error);
                    csvData.push([
                        team.place,
                        team.teamname,
                        team.avg_place.toFixed(2),
                        team.elims,
                        team.wins,
                        team.points,
                        'Error',
                        'Error'
                    ]);
                }
            }
            
            const csvContent = csvData.map(row => 
                row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
            ).join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `leaderboard_export_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Erreur lors de l\'export CSV:', error);
            alert('Erreur lors de l\'export CSV. Vérifiez la console pour plus de détails.');
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'F1') { 
                event.preventDefault();
                setShowSearch(prev => !prev); 
            } else if (event.key === 'F2') {
                event.preventDefault();
                exportToCSV();
            } else if (event.key === 'F8') {
                event.preventDefault();
                setCascadeFadeEnabled(prev => !prev);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleTeamClick = (teamname) => {
        setSelectedTeam(teamname);
    };

    const closeModal = () => {
        setSelectedTeam(null);
    };

    const nextPage = () => {
        setPage(prevPage => prevPage + 1);
    };

    const previousPage = () => {
        setPage(prevPage => Math.max(0, prevPage - 1));
    };

    const filteredLeaderboard = leaderboard
        ? leaderboard.filter(team => {
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
        })
        : [];

    return (
        <div className='erazer_cup' style={{ backgroundImage: `url(${BackgroundImage})` }}>

            {isExporting && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    zIndex: 1000,
                    textAlign: 'center'
                }}>
                    <div>Export CSV en cours...</div>
                    <div style={{ fontSize: '12px', marginTop: '10px' }}>Récupération des données WLS...</div>
                </div>
            )}

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

            <div className='leaderboard_container_prod'>
                <div className='leaderboard_table_prod'>

                    <div className='rank header' onClick={previousPage}>RANK</div>
                    <div className='name-and-vr header'>
                        <div className='name header'>PLAYER</div>
                    </div>
                    <div className='info header' onClick={nextPage}>POINTS</div>

                    {filteredLeaderboard ? filteredLeaderboard.slice(page * 40, page * 40 + 10).map((data, index) => 
                        <Row 
                            key={`col1-${data.teamname}`}
                            index={index} 
                            rank={data.place} 
                            teamname={data.teamname} 
                            points={data.points} 
                            elims={data.elims} 
                            wins={data.wins} 
                            avg_place={data.avg_place}
                            games={data.games}
                            onClick={handleTeamClick}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index}
                            alive={data.alive}
                            showFlags={showFlags}
                            memberData={data.memberData}
                            positionChange={data.positionChange || 0}
                            showPositionIndicators={showPositionIndicators}
                            animationEnabled={animationEnabled}
                            hasPositionChanged={data.hasPositionChanged || false}
                        />
                    ) : ''}
                </div>
                <div className='leaderboard_table_prod'>

                    <div className='rank header' onClick={previousPage}>RANK</div>
                    <div className='name-and-vr header'>
                        <div className='name header'>PLAYER</div>
                    </div>
                    <div className='info header' onClick={nextPage}>POINTS</div>

                    {filteredLeaderboard ? filteredLeaderboard.slice(page * 40 + 10, page * 40 + 20).map((data, index) => 
                        <Row 
                            key={`col2-${data.teamname}`}
                            index={index} 
                            rank={data.place} 
                            teamname={data.teamname} 
                            points={data.points} 
                            elims={data.elims} 
                            wins={data.wins} 
                            avg_place={data.avg_place}
                            games={data.games}
                            onClick={handleTeamClick}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index + 10}
                            alive={data.alive}
                            showFlags={showFlags}
                            memberData={data.memberData}
                            positionChange={data.positionChange || 0}
                            showPositionIndicators={showPositionIndicators}
                            animationEnabled={animationEnabled}
                            hasPositionChanged={data.hasPositionChanged || false}
                        />
                    ) : ''}
                </div>
                <div className='leaderboard_table_prod'>

                    <div className='rank header' onClick={previousPage}>RANK</div>
                    <div className='name-and-vr header'>
                        <div className='name header'>PLAYER</div>
                    </div>
                    <div className='info header' onClick={nextPage}>POINTS</div>

                    {filteredLeaderboard ? filteredLeaderboard.slice(page * 40 + 20, page * 40 + 30).map((data, index) => 
                        <Row 
                            key={`col3-${data.teamname}`}
                            index={index} 
                            rank={data.place} 
                            teamname={data.teamname} 
                            points={data.points} 
                            elims={data.elims} 
                            wins={data.wins} 
                            avg_place={data.avg_place}
                            games={data.games}
                            onClick={handleTeamClick}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index + 20}
                            alive={data.alive}
                            showFlags={showFlags}
                            memberData={data.memberData}
                            positionChange={data.positionChange || 0}
                            showPositionIndicators={showPositionIndicators}
                            animationEnabled={animationEnabled}
                            hasPositionChanged={data.hasPositionChanged || false}
                        />
                    ) : ''}
                </div>
                <div className='leaderboard_table_prod'>

                    <div className='rank header' onClick={previousPage}>RANK</div>
                    <div className='name-and-vr header'>
                        <div className='name header'>PLAYER</div>
                    </div>
                    <div className='info header' onClick={nextPage}>POINTS</div>

                    {filteredLeaderboard ? filteredLeaderboard.slice(page * 40 + 30, page * 40 + 40).map((data, index) => 
                        <Row 
                            key={`col4-${data.teamname}`}
                            index={index} 
                            rank={data.place} 
                            teamname={data.teamname} 
                            points={data.points} 
                            elims={data.elims} 
                            wins={data.wins} 
                            avg_place={data.avg_place}
                            games={data.games}
                            onClick={handleTeamClick}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index + 30}
                            alive={data.alive}
                            showFlags={showFlags}
                            memberData={data.memberData}
                            positionChange={data.positionChange || 0}
                            showPositionIndicators={showPositionIndicators}
                            animationEnabled={animationEnabled}
                            hasPositionChanged={data.hasPositionChanged || false}
                        />
                    ) : ''}
                </div>
            </div>

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
                                <div className='stats_grid'>
                                    <div className='stat_item'>
                                        <span className='stat_label'>Position:</span>
                                        <span className='stat_value'>#{teamDetails[selectedTeam].teamData.place}</span>
                                    </div>
                                    <div className='stat_item'>
                                        <span className='stat_label'>Points totaux:</span>
                                        <span className='stat_value'>{teamDetails[selectedTeam].teamData.points}</span>
                                    </div>
                                    <div className='stat_item'>
                                        <span className='stat_label'>Éliminations:</span>
                                        <span className='stat_value'>{teamDetails[selectedTeam].sessions.reduce((acc, session) => acc + session.kills, 0)}</span>
                                    </div>
                                    <div className='stat_item'>
                                        <span className='stat_label'>Victoires:</span>
                                        <span className='stat_value'>{teamDetails[selectedTeam].sessions.filter(session => session.place === 1).length}</span>
                                    </div>
                                    <div className='stat_item'>
                                        <span className='stat_label'>Place moyenne:</span>
                                        <span className='stat_value'>{(teamDetails[selectedTeam].sessions.reduce((acc, session) => acc + session.place, 0) / teamDetails[selectedTeam].sessions.length).toFixed(2)}</span>
                                    </div>
                                    <div className='stat_item'>
                                        <span className='stat_label'>Nombre de games:</span>
                                        <span className='stat_value'>{teamDetails[selectedTeam].sessions.length}</span>
                                    </div>
                                </div>
                            </div>
                            <div className='members_section'>
                                <h3>Membres de l'équipe :</h3>
                                {teamDetails[selectedTeam].members.map((member, index) => (
                                    <div key={index} className='member_info'>
                                        <strong>{member.name}</strong>
                                        {member.ingame_name && member.ingame_name !== member.name && (
                                            <span> ({member.ingame_name})</span>
                                        )}
                                    </div>
                                ))}
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
    )
}

export default LeaderboardErazerCup
