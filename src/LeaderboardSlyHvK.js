import './LeaderboardSlyHvK.css';
import React, {useState, useEffect, useMemo} from "react"
import { useLocation } from 'react-router-dom';
import { enrichWithPreviousLeaderboard, fetchUnifiedLeaderboardData, parseExcludedSessionIds } from './leaderboardShared';
import solaryLogo from './solary.png';
import havokLogo from './havok.png';


const SOLARY_TEAMS = [
    'EuOpsi',
    'Baloudagoat',
    'parosae',
    'kyvt',
    'wyloff',
    'KIRUMA',
    'patchitooo',
    'fazenfnr',
    'naabz',
    'Zeltro1',
    'LorioxTT',
    'Rayze-fn',
    'Raysoxx',
    'HYTOS',
    'm8_ryze',
    'KayFNB4',
    'Focus_on120hz',
    'TWH Azkx',
    'Lorento',
    'Wigmaan',
    'veri',
    'SIKAY7',
    'TikTokZenayb134',
    'UNGmiko',
    'Florian-013',
    'LoGaMFN',
    'Luixyy94',
    'Asixio',
    'PRIME NaTcOk',
    'BSK Darkos',
    'NHUIOP',
    'NATILT',
    'YACINETAEZ',
    'xorytig',
    'vurelix',
    'ash-shishani',
    'Shizzu',
    'nael281',
    'Cyp2211',
    'zeykoogoty7',
    'ZeyOfi',
    'Nixoxx',
    'Zennoxftn',
    'zicoo4x',
    'Oeht',
    'Twitch_Maxftn7',
    'tokaya',
    'Starskyz',
    'LebonvieuxFrexzy'
]

const HAVOK_TEAMS = [
    'Anas09s',
    'fares73783',
    'SukeFn',
    'Nco91',
    'skyzefn7',
    'razdyz',
    'WezzyxFN',
    'Abuzzz9279',
    'NaYzOnTop',
    'demyan',
    'ACCBANNEDFV',
    'lemaizzz',
    'JINX_FNBR',
    'WHT-Happy',
    'Absconus',
    'screener',
    'Mioxou',
    'NaliTw',
    'Jd1x',
    'Dokivaaaaaaaaaaa',
    'PEETERB0X',
    'NayrozGoTy',
    'Le_Rat_Flyxio',
    'Waizyy7',
    'malfi',
    'k13-akuma',
    'CZ_Slowzy',
    'Shocko',
    'KenropFN',
    'Rz Minori',
    'Fol0w',
    'Hezerfn',
    'Manoles100',
    'Hmzz345',
    'Nb_lixxfn1',
    'troxo',
    'VDH10',
    'Carapuce',
    'Zeynix',
    'ValoxGOTY',
    'EFLIXFTN',
    'Zweyko',
    'RYZ992',
    'Liwa11',
    'Gama_Prime',
    'NIKI4777777',
    'keros69',
    'Kiyora',
    'Nadjiiii'
]

const getTeamLogo = (teamname) => {
    if (SOLARY_TEAMS.includes(teamname)) {
        return solaryLogo;
    }

    if (HAVOK_TEAMS.includes(teamname)) {
        return havokLogo;
    }
    
    return null;
};

const Row = React.memo(function Row({rank, teamname, points, elims, avg_place, wins, games, order, showGamesColumn, onClick, positionChange, showPositionIndicators, animationEnabled, hasPositionChanged, cascadeFadeEnabled, cascadeIndex, alive, showFlags, memberData}) {
    const renderPositionChange = () => {
        if (!showPositionIndicators || alive || games < 2 || positionChange === null || positionChange === 0) {
            return null;
        }
        return (
            <span className={`position_change ${positionChange > 0 ? 'positive' : 'negative'}`}>
                {positionChange > 0 ? `+${positionChange}` : positionChange}
            </span>
        );
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

    const getSolaryGradientStyle = () => {
        if (SOLARY_TEAMS.includes(teamname)) {
            return {
                background: 'linear-gradient(135deg, #2e3fec 0%, #5a4ff5 30%, #f9be07 100%)'
            };
        }
        return {};
    };

    const getHavokGradientStyle = () => {
        if (HAVOK_TEAMS.includes(teamname)) {
            return {
                background: 'linear-gradient(135deg, #c8d8e3 0%, #96805c 30%, #d0bc97 100%)'
            };
        }
        return {};
    };
    return (
        <div className='row_container' style={{ 
            '--animation-order': order,
            opacity: cascadeFadeEnabled ? 0 : (animationEnabled && hasPositionChanged ? 0.9 : 1),
            animation: cascadeFadeEnabled ? 'fadeIn 0.8s forwards' : 'none',
            animationDelay: cascadeFadeEnabled ? `${cascadeIndex * 0.1}s` : '0s',
            transition: animationEnabled && hasPositionChanged ? 'none' : 'opacity 0.3s ease',
            ...getAnimationStyle(),
            ...getSolaryGradientStyle(),
            ...getHavokGradientStyle()
        }}>
            <div className='rank_container' style={{
                fontSize: rank >= 1000 ? '24px' : rank >= 100 ? '24px' : '26px',
                paddingLeft: rank >= 1000 ? '16px' : rank >= 100 ? '12px' : rank >= 10 ? '4px' : '0px'
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
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }} onClick={onClick}>
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
                    <>
                        {getTeamLogo(teamname) && (
                            <img 
                                src={getTeamLogo(teamname)} 
                                alt="Team Logo" 
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    objectFit: 'contain'
                                }}
                            />
                        )}
                        <span>{teamname}</span>
                    </>
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
        prevProps.cascadeFadeEnabled === nextProps.cascadeFadeEnabled
    );
});

function LeaderboardSlyHvK() {

    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const leaderboard_id = urlParams.get('id');
    const cascadeParam = urlParams.get('cascade');
    const flagsParam = urlParams.get('flags');
    const excludedSessionIds = useMemo(
        () => parseExcludedSessionIds(new URLSearchParams(location.search)),
        [location.search]
    );
    const excludedSessionIdsKey = useMemo(
        () => Array.from(excludedSessionIds).sort().join(','),
        [excludedSessionIds]
    );

    const [leaderboard, setLeaderboard] = useState([]);
    const [apiPage, setApiPage] = useState(0); 
    const [localPage, setLocalPage] = useState(0); 
    const [totalApiPages, setTotalApiPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(""); 
    const [showSearch, setShowSearch] = useState(true); 
    const [showFlags, setShowFlags] = useState(flagsParam === 'true');
    const [epicIdToCountry, setEpicIdToCountry] = useState({});


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

            if (isInitialLoad) {
                setIsInitialLoad(false);
            }

            if (previousLeaderboard && merged.changedCount > 0) {
                setLastChangeTime(Date.now());
                setAnimationEnabled(true);
                setTimeout(() => {
                    setAnimationEnabled(false);
                }, 2500);
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
            const gamesStorageKey = `leaderboard_games_${leaderboard_id}`;
            const previousGames = JSON.parse(localStorage.getItem(gamesStorageKey) || '{}');
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
        
            const currentPositions = {};
            const currentGames = {};
            allLeaderboardData.forEach(team => {
                currentPositions[team.teamname] = team.place;
                currentGames[team.teamname] = team.games;
            });
            localStorage.setItem(storageKey, JSON.stringify(currentPositions));
            localStorage.setItem(gamesStorageKey, JSON.stringify(currentGames));
            
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
                }, 2500); 
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
        
        const interval = setInterval(loadLeaderboard, 15000);
        
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

    const handleOrganizationClick = (organization) => {
        setSelectedTeam(organization);
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
    const startIndex = localPage * 10;
    const endIndex = startIndex + 10;
    const displayedLeaderboard = filteredLeaderboard.slice(startIndex, endIndex);

    return (
        <div className='slyhvk'>

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
            
            <div className='leaderboard_container' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div className='leaderboard_title' style={{
                    fontFamily: 'Eurostile',
                    fontSize: '32px',
                    color: '#000000',
                    textAlign: 'left',
                    paddingTop: '50px',
                    marginBottom: '20px',
                    fontWeight: 'bold',
                    marginLeft: '1100px',
                    width: '100%'
                }}>Affrontement Solary vs HavoK | Finale</div>

                <div className='leaderboard_table'>
                    <div className='header_container'>
                        <div className='rank_header' onClick={previousPage}>PLACE</div>
                        <div className='name_header'>ÉQUIPE</div>
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
                                showFlags={showFlags}
                                memberData={data.memberData}
                            />
                        );
                    })}
                </div>

            </div>

            <div className='team_totals_container' style={{
                position: 'absolute',
                top: '960px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '100px',
                padding: '20px',
                borderRadius: '10px',
                width: '600px',
                zIndex: 10
            }}>
                <div className='team_total_item' onClick={() => handleOrganizationClick('SOLARY')} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '15px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2e3fec 0%, #5a4ff5 30%, #f9be07 100%)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    ':hover': {
                        transform: 'scale(1.05)'
                    }
                }}>
                    <img src={solaryLogo} alt="Solary" style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'contain'
                    }} />
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <span style={{
                            fontFamily: 'Eurostile',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#fff',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                        }}>SOLARY</span>
                        <span style={{
                            fontFamily: 'Eurostile',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#fff',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                        }}>
                            {leaderboard
                                .filter(team => SOLARY_TEAMS.includes(team.teamname))
                                .reduce((total, team) => total + team.points, 0)} pts
                        </span>
                    </div>
                </div>
                <div className='team_total_item' onClick={() => handleOrganizationClick('HAVOK')} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '15px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #c8d8e3 0%, #b8c8d3 30%, #d0bc97 100%)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    ':hover': {
                        transform: 'scale(1.05)'
                    }
                }}>
                    <img src={havokLogo} alt="Havok" style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'contain'
                    }} />
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <span style={{
                            fontFamily: 'Eurostile',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#333',
                            textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
                        }}>HAVOK</span>
                        <span style={{
                            fontFamily: 'Eurostile',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#333',
                            textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
                        }}>
                            {leaderboard
                                .filter(team => HAVOK_TEAMS.includes(team.teamname))
                                .reduce((total, team) => total + team.points, 0)} pts
                        </span>
                    </div>
                </div>
            </div>



            {selectedTeam && (teamDetails[selectedTeam] || selectedTeam === 'SOLARY' || selectedTeam === 'HAVOK') && (
                <div className='modal_overlay' onClick={closeModal}>
                    <div className='modal_content' onClick={(e) => e.stopPropagation()}>
                        <div className='modal_header'>
                            <h2>Stats détaillées - {selectedTeam}</h2>
                            <button className='close_button' onClick={closeModal}>×</button>
                        </div>
                        <div className='modal_body'>
                            {selectedTeam === 'SOLARY' || selectedTeam === 'HAVOK' ? (
                                <div className='organization_summary'>
                                    <h3>Résumé de l'équipe {selectedTeam} :</h3>
                                    <div className='stats_grid'>
                                        <div className='stat_item'>
                                            <span className='stat_label'>Points totaux:</span>
                                            <span className='stat_value'>
                                                {leaderboard
                                                    .filter(team => selectedTeam === 'SOLARY' ? SOLARY_TEAMS.includes(team.teamname) : HAVOK_TEAMS.includes(team.teamname))
                                                    .reduce((total, team) => total + team.points, 0)} pts
                                            </span>
                                        </div>
                                        <div className='stat_item'>
                                            <span className='stat_label'>Nombre de joueurs:</span>
                                            <span className='stat_value'>
                                                {leaderboard.filter(team => selectedTeam === 'SOLARY' ? SOLARY_TEAMS.includes(team.teamname) : HAVOK_TEAMS.includes(team.teamname)).length}
                                            </span>
                                        </div>
                                        <div className='stat_item'>
                                            <span className='stat_label'>Éliminations totales:</span>
                                            <span className='stat_value'>
                                                {leaderboard
                                                    .filter(team => selectedTeam === 'SOLARY' ? SOLARY_TEAMS.includes(team.teamname) : HAVOK_TEAMS.includes(team.teamname))
                                                    .reduce((total, team) => total + team.elims, 0)}
                                            </span>
                                        </div>
                                        <div className='stat_item'>
                                            <span className='stat_label'>Top 1:</span>
                                            <span className='stat_value'>
                                                {leaderboard
                                                    .filter(team => selectedTeam === 'SOLARY' ? SOLARY_TEAMS.includes(team.teamname) : HAVOK_TEAMS.includes(team.teamname))
                                                    .reduce((total, team) => total + team.wins, 0)}
                                            </span>
                                        </div>
                                        <div className='stat_item'>
                                            <span className='stat_label'>Place moyenne:</span>
                                            <span className='stat_value'>
                                                {(() => {
                                                    const orgTeams = leaderboard.filter(team => selectedTeam === 'SOLARY' ? SOLARY_TEAMS.includes(team.teamname) : HAVOK_TEAMS.includes(team.teamname));
                                                    const avgPlace = orgTeams.reduce((total, team) => total + team.avg_place, 0) / orgTeams.length;
                                                    return avgPlace ? avgPlace.toFixed(2) : '0.00';
                                                })()}
                                            </span>
                                        </div>
                                        <div className='stat_item'>
                                            <span className='stat_label'>Meilleure position:</span>
                                            <span className='stat_value'>
                                                #{Math.min(...leaderboard
                                                    .filter(team => selectedTeam === 'SOLARY' ? SOLARY_TEAMS.includes(team.teamname) : HAVOK_TEAMS.includes(team.teamname))
                                                    .map(team => team.place))}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className='teams_section'>
                                        <h3>Équipes de {selectedTeam} :</h3>
                                        <div className='teams_grid'>
                                            {leaderboard
                                                .filter(team => selectedTeam === 'SOLARY' ? SOLARY_TEAMS.includes(team.teamname) : HAVOK_TEAMS.includes(team.teamname))
                                                .sort((a, b) => a.place - b.place)
                                                .map((team, index) => (
                                                    <div key={index} className='team_card' onClick={() => handleTeamClick(team.teamname)} style={{cursor: 'pointer'}}>
                                                        <div className='team_rank'>#{team.place}</div>
                                                        <div className='team_name'>{team.teamname}</div>
                                                        <div className='team_points'>{team.points} pts</div>
                                                        <div className='team_stats'>
                                                            <span>Élims: {team.elims}</span>
                                                            <span>Wins: {team.wins}</span>
                                                            <span>Avg: {team.avg_place.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
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
                                                <span className='stat_label'>Parties jouées :</span>
                                                <span className='stat_value'>{teamDetails[selectedTeam].sessions.length}</span>
                                            </div>
                                            <div className='stat_item'>
                                                <span className='stat_label'>Victoires:</span>
                                                <span className='stat_value'>{teamDetails[selectedTeam].sessions.filter(s => s.place === 1).length}</span>
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
                                        <div className='members_grid'>
                                            {teamDetails[selectedTeam].members.map((member, index) => (
                                                <div key={index} className='member_card'>
                                                    <strong>{member.name}</strong>
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaderboardSlyHvK;
