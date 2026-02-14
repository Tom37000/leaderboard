import './LeaderboardCDF.css';
import React, { useState, useEffect, useMemo, useRef } from "react"
import { useLocation } from 'react-router-dom';
import {
    enrichWithPreviousLeaderboard,
    fetchUnifiedLeaderboardData,
    loadEpicIdToCountryMap,
    parseExcludedSessionIds,
} from './leaderboardShared';

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
                right: '-36px',
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
                paddingLeft: rank >= 1000 ? '16px' : rank >= 100 ? '12px' : rank >= 10 ? '4px' : '0px'
            }}>
                {rank}
                {renderPositionChange()}
            </div>
            <div className='name_container' style={{
                cursor: 'pointer',
                fontSize: teamname.length > 70 ? '7px' : teamname.length > 65 ? '8px' : teamname.length > 60 ? '9px' : teamname.length > 55 ? '10px' : teamname.length > 50 ? '11px' : teamname.length > 45 ? '12px' : teamname.length > 40 ? '13px' : teamname.length > 35 ? '14px' : teamname.length > 30 ? '15px' : teamname.length > 25 ? '17px' : teamname.length > 20 ? '19px' : teamname.length > 15 ? '21px' : '24px',
                whiteSpace: 'nowrap'
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
        prevProps.memberData === nextProps.memberData
    );
});

function LeaderboardCDF() {

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
    const [showFlags, setShowFlags] = useState(flagsParam === 'true');
    const [epicIdToCountry, setEpicIdToCountry] = useState({});
    const [showSearch, setShowSearch] = useState(false);


    const [showGamesColumn, setShowGamesColumn] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamDetails, setTeamDetails] = useState({});
    const [lastChangeTime, setLastChangeTime] = useState(Date.now());
    const [showPositionIndicators, setShowPositionIndicators] = useState(false);
    const [hasRefreshedOnce, setHasRefreshedOnce] = useState(false);
    const [animationEnabled, setAnimationEnabled] = useState(false);
    const [cascadeFadeEnabled, setCascadeFadeEnabled] = useState(cascadeParam === 'true');
    const [previousLeaderboard, setPreviousLeaderboard] = useState(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const wasAllDeadRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        if (!showFlags) {
            setEpicIdToCountry({});
            return () => { };
        }

        loadEpicIdToCountryMap(process.env.PUBLIC_URL)
            .then((mapping) => {
                if (!cancelled) setEpicIdToCountry(mapping);
            })
            .catch((err) => console.error('Error loading epic ID database:', err));

        return () => {
            cancelled = true;
        };
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
            wasAllDeadRef.current = data.allDead;

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
                setTimeout(() => { setAnimationEnabled(false); }, 2500);
            } else {
                setAnimationEnabled(false);
            }
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
        <div className='cdf'>

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
                <div className='leaderboard_title' style={{
                    fontFamily: 'Eurostile',
                    fontSize: '32px',
                    color: '#fff',
                    textAlign: 'center',
                    paddingTop: '50px',
                    marginBottom: '20px',
                    fontWeight: 'bold'
                }}>Classement | Finale Centre de Formation</div>

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
                                alive={data.alive}
                                showGamesColumn={showGamesColumn}
                                onClick={() => handleTeamClick(data.teamname)}
                                positionChange={data.positionChange || 0}
                                showPositionIndicators={showPositionIndicators}
                                animationEnabled={animationEnabled && data.hasPositionChanged}
                                hasPositionChanged={data.hasPositionChanged || false}
                                cascadeFadeEnabled={cascadeFadeEnabled}
                                cascadeIndex={index}
                                showFlags={showFlags}
                                memberData={data.memberData}
                            />
                        );
                    })}
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaderboardCDF
