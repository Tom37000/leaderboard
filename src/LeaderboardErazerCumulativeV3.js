import './LeaderboardErazerCumulativeV3.css';
import React, { useState, useEffect } from "react"
import { useLocation } from 'react-router-dom';
import BackgroundImage from './erazer_leaderboard_background.png'

function Row({ rank, teamname, points, elims, avg_place, wins, index, onClick, cascadeFadeEnabled, cascadeIndex, positionChange, showPositionIndicators, animationEnabled, hasPositionChanged, avg_elim }) {
    const renderPositionChange = () => {
        if (!showPositionIndicators) {
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
                <div className='name' style={{ cursor: 'pointer' }} onClick={() => onClick(teamname)}>{teamname}</div>
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

function LeaderboardErazerCumulativeV3() {

    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const urlIds = urlParams.get('ids')?.split(',').filter(id => id.trim()) || [];
    const leaderboard_ids = urlIds;
    const cascadeParam = urlParams.get('cascade');

    const [leaderboard, setLeaderboard] = useState(null);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [totalApiPages, setTotalApiPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(true);
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

    const getCachedData = (cacheKey) => {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                const now = Date.now();
                if (now - timestamp < 45000) {
                    return data;
                }
            }
        } catch (error) {
            console.warn('Erreur lors de la lecture du cache:', error);
        }
        return null;
    };

    const setCachedData = (cacheKey, data) => {
        try {
            const cacheEntry = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        } catch (error) {
            console.warn('Erreur lors de la sauvegarde du cache:', error);
        }
    };

    useEffect(() => {
        const loadAllPages = async () => {
            if (leaderboard_ids.length === 0) {
                console.error('Aucun leaderboard_id fourni');
                return;
            }

            console.log('Chargement des leaderboards avec les IDs:', leaderboard_ids);
            setError(null);

            const currentIdsString = leaderboard_ids.join('_');
            
            const cacheKey = `leaderboard_data_${currentIdsString}`;
            const cachedResult = getCachedData(cacheKey);
            
            if (cachedResult) {
                console.log('Utilisation des données en cache');
                setLeaderboard(cachedResult.leaderboardData);
                setShowGamesColumn(cachedResult.hasMultipleGames);
                setTeamDetails(cachedResult.teamDetails || {});
                return;
            }

            try {
                let allCumulativeData = [];
                let allDetails = {};
                let hasMultipleGames = false;
                
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                const fetchWithRetry = async (url, retries = 3, delayMs = 1000) => {
                    for (let i = 0; i < retries; i++) {
                        try {
                            await delay(i * delayMs); 
                            const response = await fetch(url);
                            if (!response.ok) {
                                if (response.status === 429) { 
                                    console.warn(`Rate limit atteint pour ${url}, tentative ${i + 1}/${retries}`);
                                    await delay(2000 * (i + 1)); 
                                    continue;
                                }
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            return response.json();
                        } catch (error) {
                            if (i === retries - 1) throw error;
                            console.warn(`Erreur requête ${url}, tentative ${i + 1}/${retries}:`, error.message);
                            await delay(1000 * (i + 1));
                        }
                    }
                };
                
                const excludedPlayers = new Set();
                
                for (const leaderboard_id of leaderboard_ids) {
                    console.log(`Collecte des top 25 pour le leaderboard: ${leaderboard_id}`);
                    
                    if (leaderboard_ids.indexOf(leaderboard_id) > 0) {
                        await delay(500);
                    }
                    
                    const firstData = await fetchWithRetry(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}?page=0`);
                    if (firstData.teams) {
                        const top25Teams = firstData.teams.filter(team => team.place <= 25);
                        top25Teams.forEach(team => {
                            Object.keys(team.members).forEach(memberId => {
                                excludedPlayers.add(memberId);
                            });
                        });
                    }
                }
                
                console.log(`Joueurs exclus du classement de régularité: ${excludedPlayers.size}`);
                
                for (const leaderboard_id of leaderboard_ids) {
                    console.log(`Chargement du leaderboard: ${leaderboard_id}`);
                    if (leaderboard_ids.indexOf(leaderboard_id) > 0) {
                        await delay(500);
                    }
                    
                    const firstData = await fetchWithRetry(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}?page=0`);
                    
                    let leaderboardData = [];
                    
                    const totalPages = firstData.total_pages || 1;
                    const allPagesData = [];
                    for (let page = 0; page < totalPages; page++) {
                        if (page > 0) {
                            await delay(200); 
                        }
                        const pageData = await fetchWithRetry(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}?page=${page}`);
                        allPagesData.push(pageData);
                    }
                    
                    allPagesData.forEach(data => {
                        for (let team in data.teams) {
                            const sessionKeys = Object.keys(data.teams[team].sessions).sort((a, b) => parseInt(a) - parseInt(b));
                            const sessions = sessionKeys.map(key => data.teams[team].sessions[key]);
                            const gamesCount = sessions.length;
                            const members = Object.values(data.teams[team].members);
                            members.sort((a, b) => a.id.localeCompare(b.id));
                            const teamKey = members.map(member => member.ingame_id).join(' - '); 
                            const teamname = members.map(member => member.name).join(' - '); 
                            
                            if (gamesCount > 1) {
                                hasMultipleGames = true;
                            }
                            
                            const teamHasExcludedPlayer = members.some(member => excludedPlayers.has(member.id));
                            let regularityPoints = 0;
                            const teamPlace = data.teams[team].place;
                            if (!teamHasExcludedPlayer && teamPlace > 25 && teamPlace <= 125) {
                                regularityPoints = Math.max(1, 101 - (teamPlace - 25));
                            }

                            const totalElims = sessions.map(session => session.kills).reduce((acc, curr) => acc + curr, 0);
                            const avg_elim = gamesCount > 0 ? totalElims / gamesCount : 0;
                            
                            leaderboardData.push({
                                teamKey: teamKey,
                                teamname: teamname,
                                avg_elim: avg_elim,
                                elims: totalElims,
                                avg_place: sessions.reduce((acc, session) => acc + session.place, 0) / sessions.length,
                                wins: sessions.map(session => session.place).reduce((acc, curr) => acc + (curr === 1 ? 1 : 0), 0),
                                games: gamesCount,
                                place: data.teams[team].place,
                                points: regularityPoints,
                                leaderboard_id: leaderboard_id
                            });

                            if (!allDetails[teamKey]) {
                                allDetails[teamKey] = [];
                            }
                            allDetails[teamKey].push({
                                place: teamPlace,
                                regularityPoints: regularityPoints,
                                leaderboard_id: leaderboard_id
                            });
                        }
                    });
                    
                    leaderboardData.sort((a, b) => {
                        if (a.place !== b.place) {
                            return a.place - b.place;
                        }
                        return b.points - a.points;
                    });
                    
                    const filteredData = leaderboardData.filter(team => team.points > 0);
                    
                    allCumulativeData = allCumulativeData.concat(filteredData);
                }

                const teamMap = new Map();
                
                allCumulativeData.forEach(team => {
                    if (teamMap.has(team.teamKey)) {
                        const existing = teamMap.get(team.teamKey);
                        console.log(`Addition pour ${team.teamname}: ${existing.points} + ${team.points} = ${existing.points + team.points}`);
                        existing.points += team.points;
                        existing.elims += team.elims;
                        existing.wins += team.wins;
                        existing.games += team.games;
                        existing.teamname = team.teamname; 
                        const totalGames = existing.games;
                        existing.avg_place = ((existing.avg_place * (totalGames - team.games)) + (team.avg_place * team.games)) / totalGames;
                        existing.avg_elim = existing.games > 0 ? existing.elims / existing.games : 0;
                    } else {
                        console.log(`Nouvelle équipe ${team.teamname}: ${team.points} points`);
                        teamMap.set(team.teamKey, { ...team });
                    }
                });
                
                const finalLeaderboardData = Array.from(teamMap.values());
                console.log('Points finaux après addition:');
                finalLeaderboardData.forEach(team => {
                    console.log(`${team.teamname}: ${team.points} points`);
                });
                
                finalLeaderboardData.sort((a, b) => {
                    if (b.points !== a.points) {
                        return b.points - a.points;
                    }
                    if (b.wins !== a.wins) {
                        return b.wins - a.wins;
                    }
                    const avgElimsA = a.games > 0 ? a.elims / a.games : 0;
                    const avgElimsB = b.games > 0 ? b.elims / b.games : 0;
                    if (avgElimsB !== avgElimsA) {
                        return avgElimsB - avgElimsA;
                    }
                    return a.avg_place - b.avg_place;
                });

                finalLeaderboardData.forEach((team, index) => {
                    team.place = index + 1;
                });

                const storageKey = `leaderboard_positions_${currentIdsString}`;
                const previousPositions = JSON.parse(localStorage.getItem(storageKey) || '{}');
                const indicatorsStorageKey = `position_indicators_${currentIdsString}`;
                const storedIndicators = JSON.parse(localStorage.getItem(indicatorsStorageKey) || '{}');
                const lastChangeTimeKey = `last_change_time_${currentIdsString}`;
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
                
                finalLeaderboardData.forEach(team => {
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
                    updatedLeaderboardData = finalLeaderboardData.map(team => {
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
                                    avg_elim: team.avg_elim,
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
                    updatedLeaderboardData = finalLeaderboardData.map(team => {
                        return {
                            ...team,
                            positionChange: newIndicators[team.teamname] || 0,
                            hasPositionChanged: changedTeams.has(team.teamname),
                            teamId: team.teamname
                        };
                    });
                }

                const currentPositions = {};
                finalLeaderboardData.forEach(team => {
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

                const cacheData = {
                    leaderboardData: updatedLeaderboardData,
                    hasMultipleGames: hasMultipleGames,
                    teamDetails: allDetails
                };
                setCachedData(cacheKey, cacheData);
                
                setLeaderboard(updatedLeaderboardData);
                setShowGamesColumn(hasMultipleGames);
                setTeamDetails(allDetails);
                
                setPreviousLeaderboard(updatedLeaderboardData);
                
            } catch (error) {
                console.error('Error loading leaderboard data:', error);
                setError(error.message);
            }
        };
        
        if (leaderboard_ids.length > 0) {
            loadAllPages();
            const interval = setInterval(loadAllPages, 10000);
            return () => clearInterval(interval);
        }
    }, [leaderboard_ids.join(',')]);

    const exportToCSV = async () => {
        if (isExporting) return;
        if (!leaderboard || leaderboard.length === 0) {
            alert("Aucun leaderboard chargé. Ajoutez ?ids=… dans l’URL (ex: #/erazer_cumulative_leaderboard_v3?ids=123,456) puis réessayez avec F2.");
            return;
        }
        
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
                                    
                                    const epicConnection = Object.values(userData.connections).find(conn => conn.provider === 'epicgames');
                                    if (epicConnection) {
                                        epicId = epicConnection.id; 
                                    }
                                    
                                    const discordKey = Object.keys(userData.connections).find(key => key.startsWith('discord:'));
                                    console.log(`Discord key for ${playerName}:`, discordKey);
                                    if (discordKey) {
                                        discordId = userData.connections[discordKey].id;
                                        console.log(`Discord ID for ${playerName}:`, discordId);
                                    }
                                } else {
                                    console.log(`No connections found for ${playerName}`);
                                }
                                
                                epicIds.push(epicId);
                                discordIds.push(discordId);
                            } else {
                                epicIds.push(playerName); 
                                discordIds.push('N/A');
                            }
                        } catch (error) {
                            console.warn(`Erreur pour ${playerName}:`, error);
                            epicIds.push(playerName); 
                            discordIds.push('N/A');
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    const epicIdString = epicIds.join('; ');
                    const discordIdString = discordIds.join('; ');
                    
                    csvData.push([
                        team.place,
                        team.teamname,
                        team.avg_place.toFixed(2),
                        team.avg_elim.toFixed(2),
                        team.wins,
                        team.points,
                        epicIdString,
                        discordIdString
                    ]);
                } catch (error) {
                    console.error(`Erreur pour l'équipe ${team.teamname}:`, error);
                    csvData.push([
                        team.place,
                        team.teamname,
                        team.avg_place.toFixed(2),
                        team.avg_elim ? team.avg_elim.toFixed(2) : '0.00',
                        team.wins,
                        team.points,
                        'Erreur',
                        'Erreur'
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
        const teamKey = leaderboard?.find(team => team.teamname === teamname)?.teamKey;
        if (teamDetails[teamKey]) {
            const details = teamDetails[teamKey];
            let message = `Détails pour ${teamname}:\n\n`;
            
            details.forEach((detail, index) => {
                message += `Leaderboard ID ${detail.leaderboard_id}:\n`;
                message += `- Position finale: ${detail.place}\n`;
                message += `- Points de régularité: ${detail.regularityPoints}\n\n`;
            });
            
            const totalPoints = details.reduce((sum, detail) => sum + detail.regularityPoints, 0);
            message += `Total points de régularité: ${totalPoints}`;
            
            alert(message);
        }
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
            const teamKey = team.teamKey;
            if (teamDetails[teamKey] && teamDetails[teamKey].length > 0) {
                return false;
            }
            return false;
        })
        : [];

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
                            avg_elim={data.avg_elim}
                            onClick={handleTeamClick}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index}
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
                            index={index + 10} 
                            rank={data.place} 
                            teamname={data.teamname} 
                            points={data.points} 
                            elims={data.elims} 
                            wins={data.wins} 
                            avg_place={data.avg_place}
                            avg_elim={data.avg_elim}
                            onClick={handleTeamClick}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index + 10}
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
                            index={index + 20} 
                            rank={data.place} 
                            teamname={data.teamname} 
                            points={data.points} 
                            elims={data.elims} 
                            wins={data.wins} 
                            avg_place={data.avg_place}
                            avg_elim={data.avg_elim}
                            onClick={handleTeamClick}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index + 20}
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
                            index={index + 30} 
                            rank={data.place} 
                            teamname={data.teamname} 
                            points={data.points} 
                            elims={data.elims} 
                            wins={data.wins} 
                            avg_place={data.avg_place}
                            avg_elim={data.avg_elim}
                            onClick={handleTeamClick}
                            cascadeFadeEnabled={cascadeFadeEnabled}
                            cascadeIndex={index + 30}
                            positionChange={data.positionChange || 0}
                            showPositionIndicators={showPositionIndicators}
                            animationEnabled={animationEnabled}
                            hasPositionChanged={data.hasPositionChanged || false}
                        />
                    ) : ''}
                </div>
            </div>

            {selectedTeam && (
                <div className='modal_overlay' onClick={closeModal}>
                    <div className='modal_content' onClick={(e) => e.stopPropagation()}>
                        <div className='modal_header'>
                            <h2>{selectedTeam}</h2>
                            <button className='close_button' onClick={closeModal}>×</button>
                        </div>
                        <div className='modal_body'>
                            {teamDetails[selectedTeam] && (
                                <div>
                                    <h3>Membres de l'équipe:</h3>
                                    <ul>
                                        {teamDetails[selectedTeam].members.map((member, index) => (
                                            <li key={index}>
                                                <strong>{member.name}</strong>
                                                {member.ingame_name && member.ingame_name !== member.name && (
                                                    <span> ({member.ingame_name})</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    <h3>Sessions:</h3>
                                    <div className='sessions_grid'>
                                        {teamDetails[selectedTeam].sessions.map((session, index) => (
                                            <div key={index} className='session_card'>
                                                <h4>Game {index + 1}</h4>
                                                <p>Place: {session.place}</p>
                                                <p>Kills: {session.kills}</p>
                                                <p>Points: {session.points}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaderboardErazerCumulativeV3;