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

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'F8') {
                setCascadeFadeEnabled(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);
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