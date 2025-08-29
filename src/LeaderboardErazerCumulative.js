import './LeaderboardErazerCumulative.css';
import React, { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import erazerLogo from './erazer-logo1.png';

const Row = React.memo(function Row({ rank, teamname, points, elims, avg_place, wins, games, order, showGamesColumn, onClick, cascadeFadeEnabled, cascadeIndex }) {

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
        prevProps.avg_place === nextProps.avg_place &&
        prevProps.wins === nextProps.wins &&
        prevProps.games === nextProps.games &&
        prevProps.showGamesColumn === nextProps.showGamesColumn &&
        prevProps.cascadeFadeEnabled === nextProps.cascadeFadeEnabled
    );
});

function LeaderboardErazerCumulative() {
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
            const top50 = leaderboard.slice(0, 50);
            const csvData = [];
            
            csvData.push(['Rank', 'Team Name', 'Points', 'Elims', 'Wins', 'Games', 'Avg Place', 'WLS Names', 'User IDs', 'Discord IDs']);
            
            for (const team of top50) {
                try {
                    const teamNames = team.teamname.split(' - ');
                    const wlsData = [];
                    
                    for (const name of teamNames) {
                        try {
                            const response = await fetch(`https://api.wls.gg/users/name/${encodeURIComponent(name)}`);
                            if (response.ok) {
                                const userData = await response.json();
                                
                                let discordId = 'N/A';
                                if (userData.connections) {
                                    const discordConnection = Object.values(userData.connections).find(conn => conn.provider === 'discord');
                                    if (discordConnection) {
                                        discordId = discordConnection.id;
                                    }
                                }
                                
                                wlsData.push({
                                    name: name,
                                    id: userData.id || 'N/A',
                                    discord_id: discordId
                                });
                            } else {
                                wlsData.push({
                                    name: name,
                                    id: 'N/A',
                                    discord_id: 'N/A'
                                });
                            }
                        } catch (error) {
                            console.warn(`Erreur pour ${name}:`, error);
                            wlsData.push({
                                name: name,
                                id: 'N/A',
                                discord_id: 'N/A'
                            });
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    const wlsNames = wlsData.map(d => d.name).join('; ');
                    const userIds = wlsData.map(d => d.id).join('; ');
                    const discordIds = wlsData.map(d => d.discord_id).join('; ');
                    
                    csvData.push([
                        team.place,
                        team.teamname,
                        team.points,
                        team.elims,
                        team.wins,
                        team.games,
                        team.avg_place.toFixed(2),
                        wlsNames,
                        userIds,
                        discordIds
                    ]);
                } catch (error) {
                    console.error(`Erreur pour l'équipe ${team.teamname}:`, error);
                    csvData.push([
                        team.place,
                        team.teamname,
                        team.points,
                        team.elims,
                        team.wins,
                        team.games,
                        team.avg_place.toFixed(2),
                        'Erreur',
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
                return;
            }

            try {
                let allCumulativeData = [];
                let allDetails = {};
                let hasMultipleGames = false;
                
                for (const leaderboard_id of leaderboard_ids) {
                    console.log(`Chargement du leaderboard: ${leaderboard_id}`);
                    const firstResponse = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}?page=0`);
                    if (!firstResponse.ok) {
                        console.error(`Erreur HTTP pour le leaderboard ${leaderboard_id}: ${firstResponse.status}`);
                        throw new Error(`HTTP error! status: ${firstResponse.status} for leaderboard ${leaderboard_id}`);
                    }
                    const firstData = await firstResponse.json();
                    
                    let leaderboardData = [];
                    
                    const totalPages = firstData.total_pages || 1;
                    
                    const promises = [];
                    for (let page = 0; page < totalPages; page++) {
                        promises.push(
                            fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}?page=${page}`)
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error(`HTTP error! status: ${response.status}`);
                                    }
                                    return response.json();
                                })
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
                            
                            leaderboardData.push({
                                teamname: teamname,
                                elims: sessions.map(session => session.kills).reduce((acc, curr) => acc + curr, 0),
                                avg_place: sessions.reduce((acc, session) => acc + session.place, 0) / sessions.length,
                                wins: sessions.map(session => session.place).reduce((acc, curr) => acc + (curr === 1 ? 1 : 0), 0),
                                games: gamesCount,
                                place: data.teams[team].place,
                                points: data.teams[team].points,
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
                    
                    const filteredData = leaderboardData.filter(team => team.place > 25);
                    
                    allCumulativeData = allCumulativeData.concat(filteredData);
                }

                const teamMap = new Map();
                
                allCumulativeData.forEach(team => {
                    if (teamMap.has(team.teamname)) {
                        const existing = teamMap.get(team.teamname);
                        existing.points += team.points;
                        existing.elims += team.elims;
                        existing.wins += team.wins;
                        existing.games += team.games;
                        const totalGames = existing.games;
                        existing.avg_place = ((existing.avg_place * (totalGames - team.games)) + (team.avg_place * team.games)) / totalGames;
                    } else {
                        teamMap.set(team.teamname, { ...team });
                    }
                });
                
                const finalLeaderboardData = Array.from(teamMap.values());
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
                
                setCachedData(cacheKey, {
                    leaderboardData: updatedLeaderboardData,
                    hasMultipleGames
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
        if (!showGamesColumn) {
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

                    return false;
                })
                : [];
            const maxPages = Math.ceil(filteredLeaderboard.length / 10) - 1;
            
            if (localPage < maxPages) {
                setLocalPage(localPage + 1);
            }
        }
    }

    function nextPageFromGames() {
        if (showGamesColumn) {
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
                        <div className='info_header'>ELIMS</div>
                        <div className='info_header'>WINS</div>
                        <div className='info_header' onClick={nextPageFromPoints}>POINTS</div>
                        {showGamesColumn && <div onClick={nextPageFromGames} className='info_header'>GAMES</div>}
                    </div>
                    {displayedLeaderboard.map((data, index) => {
                        const animationOrder = index + 1;
                        
                        return (
                            <Row
                                key={data.teamId || data.teamname}
                                rank={data.place}
                                teamname={data.teamname}
                                points={data.points}
                                elims={data.elims}
                                wins={data.wins}
                                games={data.games}
                                avg_place={data.avg_place}
                                order={animationOrder}
                                showGamesColumn={showGamesColumn}
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

export default LeaderboardErazerCumulative;