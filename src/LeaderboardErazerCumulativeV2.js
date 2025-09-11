import './LeaderboardErazerCumulativeV2.css';
import React, { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import erazerLogo from './erazer-logo1.png';

const Row = React.memo(function Row({ rank, teamname, points, avg_elim, avg_place, wins, order, onClick, cascadeFadeEnabled, cascadeIndex }) {

    const getAnimationStyle = () => {
        return {};
    };

    const getRowClasses = () => {
        let classes = 'row_container';
        if (rank <= 25) {
            classes += ' top-25';
        }
        return classes;
    };

    return (
        <div className={getRowClasses()} style={{ 
            '--animation-order': order,
            opacity: cascadeFadeEnabled ? 0 : 1,
            animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
            animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
            ...getAnimationStyle()
        }}>
            <div className='rank_container' style={{
                fontSize: rank >= 1000 ? '24px' : rank >= 100 ? '24px' : '26px',
                paddingLeft: rank >= 1000 ? '16px' : rank >= 100 ? '12px' : rank >= 10 ? '4px' : '0px'
            }}>
                {rank}
            </div>
            <div className='name_container' style={{ 
                cursor: 'pointer',
                fontSize: teamname.length > 25 ? '16px' : teamname.length > 20 ? '18px' : teamname.length > 15 ? '20px' : teamname.length > 10 ? '22px' : '24px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }} onClick={onClick}>{teamname}</div>
            <div className='info_box'>{avg_place.toFixed(2)}</div>
            <div className='info_box'>{avg_elim.toFixed(2)}</div>
            <div className='info_box'>{wins}</div>
            <div className='info_box'>{points}</div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.rank === nextProps.rank &&
        prevProps.teamname === nextProps.teamname &&
        prevProps.points === nextProps.points &&
        prevProps.avg_elim === nextProps.avg_elim &&
        prevProps.avg_place === nextProps.avg_place &&
        prevProps.wins === nextProps.wins &&
        prevProps.cascadeFadeEnabled === nextProps.cascadeFadeEnabled
    );
});

function LeaderboardErazerCumulativeV2() {
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
     const urlIds = urlParams.get('ids')?.split(',').filter(id => id.trim()) || [];
     
     const leaderboard_ids = urlIds;
    const cascadeParam = urlParams.get('cascade');

    const [leaderboard, setLeaderboard] = useState(null);
    const [error, setError] = useState(null);
    const [apiPage, setApiPage] = useState(0); 
    const [localPage, setLocalPage] = useState(0); 
    const [totalApiPages, setTotalApiPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(""); 
    const [showSearch, setShowSearch] = useState(true); 

    const [showGamesColumn, setShowGamesColumn] = useState(false);

    const [cascadeFadeEnabled, setCascadeFadeEnabled] = useState(cascadeParam === 'true');
    const [isExporting, setIsExporting] = useState(false);
    const [teamDetails, setTeamDetails] = useState({});

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'F8') {
                setCascadeFadeEnabled(prev => !prev);
            } else if (event.key === 'F2') {
                exportToCSV();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [leaderboard]);

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
                                    
                                    const epicConnection = Object.values(userData.connections).find(conn => conn.provider === 'epicgames');
                                    if (epicConnection) {
                                        epicId = epicConnection.name; 
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

    const handleTeamClick = (teamKey, teamname) => {
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
                
                const updatedLeaderboardData = finalLeaderboardData.map(team => {
                    return {
                        ...team,
                        teamId: team.teamname
                    };
                });
                
                setShowGamesColumn(hasMultipleGames);
                setLeaderboard(updatedLeaderboardData);
                setTeamDetails(allDetails);
                
                setCachedData(cacheKey, {
                    leaderboardData: updatedLeaderboardData,
                    hasMultipleGames,
                    teamDetails: allDetails
                });
            } catch (error) {
                console.error('Error loading leaderboard data:', error);
                setError(`Erreur lors du chargement des données: ${error.message}`);
            }
        };
        
        loadAllPages();
        
        const interval = setInterval(loadAllPages, 60000);
        
        return () => clearInterval(interval);
    }, [leaderboard_ids]);

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



    function nextPageFromPoints() {
        const filteredLeaderboard = leaderboard
            ? leaderboard.filter(team => {
                if (!searchQuery || searchQuery.trim() === '') {
                    return true;
                }
                
                if (team.teamname.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return true;
                }
                if (!isNaN(searchQuery) && searchQuery.trim() !== '') {
                    const searchPosition = parseInt(searchQuery.trim());
                    if (team.place === searchPosition) {
                        return true;
                    }
                }

                return false;
            })
            : [];
        const maxPages = Math.ceil(filteredLeaderboard.length / 10) - 1;
        
        if (localPage < maxPages) {
            setLocalPage(localPage + 1);
        }
    }

    function nextPageFromGames() {
        if (showGamesColumn) {
            const filteredLeaderboard = leaderboard
                ? leaderboard.filter(team => {
                    if (!searchQuery || searchQuery.trim() === '') {
                        return true;
                    }
                    
                    if (team.teamname.toLowerCase().includes(searchQuery.toLowerCase())) {
                        return true;
                    }
                    if (!isNaN(searchQuery) && searchQuery.trim() !== '') {
                        const searchPosition = parseInt(searchQuery.trim());
                        if (team.place === searchPosition) {
                            return true;
                        }
                    }

                    return false;
                })
                : [];
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

    if (error) {
        return (
            <div className='erazer_cup_cumulative'>
                <img src={erazerLogo} alt="Erazer Logo" className="erazer_logo" />
                <div style={{color: 'red', textAlign: 'center', marginTop: '50px', fontSize: '18px'}}>
                    {error}
                    <br />
                    <small style={{color: '#ccc', marginTop: '10px', display: 'block'}}>
                        Vérifiez que les IDs des leaderboards sont corrects dans l'URL.
                    </small>
                </div>
            </div>
        );
    }

    if (!leaderboard) {
        return (
            <div className='erazer_cup_cumulative'>
                <img src={erazerLogo} alt="Erazer Logo" className="erazer_logo" />
                <div style={{textAlign: 'center', marginTop: '50px', fontSize: '18px'}}>
                    Chargement...
                </div>
            </div>
        );
    }

    const filteredLeaderboard = leaderboard
        ? leaderboard.filter(team => {
            if (!searchQuery || searchQuery.trim() === '') {
                return true;
            }
            
            if (team.teamname.toLowerCase().includes(searchQuery.toLowerCase())) {
                return true;
            }
            if (!isNaN(searchQuery) && searchQuery.trim() !== '') {
                const searchPosition = parseInt(searchQuery.trim());
                if (team.place === searchPosition) {
                    return true;
                }
            }

            return false;
        })
        : [];
    const startIndex = localPage * 10;
    const endIndex = startIndex + 10;
    const displayedLeaderboard = filteredLeaderboard.slice(startIndex, endIndex);

    return (
        <div className='erazer_cup_cumulative'>
            <img src={erazerLogo} alt="Erazer Logo" className="erazer_logo" />

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
                        <div className='info_header' style={{ fontSize: '12px' }}>AVG ELIM</div>
                        <div className='info_header'>WINS</div>
                        <div className='info_header' onClick={nextPageFromPoints}>POINTS</div>
                    </div>
                    {displayedLeaderboard.map((data, index) => {
                        const animationOrder = index + 1;
                        
                        return (
                            <Row
                                key={data.teamId || data.teamname}
                                rank={data.place}
                                teamname={data.teamname}
                                points={data.points}
                                avg_elim={data.avg_elim}
                                wins={data.wins}
                                avg_place={data.avg_place}
                                order={animationOrder}
                                onClick={() => handleTeamClick(data.teamKey, data.teamname)}
                                cascadeFadeEnabled={cascadeFadeEnabled}
                                cascadeIndex={index}
                            />
                        );
                    })}
                </div>


        </div>


        </div>
    );
}

export default LeaderboardErazerCumulativeV2;