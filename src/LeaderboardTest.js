import './LeaderboardTest.css';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import fondImage from './fond2.png';
import {
    fetchUnifiedLeaderboardData,
    loadEpicIdToCountryMap,
    parseExcludedSessionIds,
} from './leaderboardShared';

function Row({
    rank,
    teamname,
    points,
    elims,
    wins,
    index,
    alive,
    positionChange,
    showPositionIndicators,
    games,
    showFlags,
    memberData,
    onClick,
}) {
    const getRankClass = () => {
        if (rank === 1) return 'rank_container top1';
        if (rank === 2) return 'rank_container top2';
        if (rank === 3) return 'rank_container top3';
        return 'rank_container';
    };

    const getRowClass = () => {
        let base = 'row_container';
        if (rank === 1) base += ' row_top1';
        else if (rank === 2) base += ' row_top2';
        else if (rank === 3) base += ' row_top3';
        return base;
    };

    const renderPositionChange = () => {
        if (!showPositionIndicators || alive || games < 2 || positionChange === null) return null;

        if (positionChange === 0) {
            return <span className="position_indicator neutral">=</span>;
        }
        if (positionChange > 0) {
            return <span className="position_indicator positive">+{positionChange}</span>;
        }
        return <span className="position_indicator negative">{positionChange}</span>;
    };

    return (
        <div className={getRowClass()} style={{ animationDelay: `${index * 0.2}s` }}>
            <div className='row_accent'></div>
            <div className={getRankClass()}>
                {rank}
                {renderPositionChange()}
            </div>
            <div className='name_container' onClick={onClick} style={{ cursor: 'pointer' }}>
                {alive && <span className='alive-dot' />}
                <span className='team_name'>
                    {showFlags && memberData && memberData.length > 0 ? (
                        memberData.map((member, idx) => (
                            <span key={`${member.name}-${idx}`} className='member_with_flag'>
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
                </span>
                <span className='wins_badge'>{wins === 0 ? '-' : wins}</span>
            </div>
            <div className='info_box'>{elims}</div>
            <div className='info_box points'>{points}</div>
        </div>
    );
}

function LeaderboardTest() {
    const location = useLocation();
    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const leaderboardId = searchParams.get('id');
    const flagsParam = searchParams.get('flags');

    const excludedSessionIds = useMemo(
        () => parseExcludedSessionIds(new URLSearchParams(location.search)),
        [location.search]
    );

    const [leaderboard, setLeaderboard] = useState([]);
    const [teamDetails, setTeamDetails] = useState({});
    const [page, setPage] = useState(0);
    const [showPositionIndicators, setShowPositionIndicators] = useState(false);
    const [showFlags, setShowFlags] = useState(flagsParam === 'true');
    const [epicIdToCountry, setEpicIdToCountry] = useState({});
    const [selectedTeam, setSelectedTeam] = useState(null);

    useEffect(() => {
        setShowFlags(flagsParam === 'true');
    }, [flagsParam]);

    useEffect(() => {
        if (!showFlags) {
            setEpicIdToCountry({});
            return;
        }

        loadEpicIdToCountryMap(process.env.PUBLIC_URL)
            .then((mapping) => setEpicIdToCountry(mapping))
            .catch((err) => {
                console.error('Error loading epic ID database:', err);
                setEpicIdToCountry({});
            });
    }, [showFlags]);

    const fetchData = useCallback(async () => {
        if (!leaderboardId) {
            setLeaderboard([]);
            setTeamDetails({});
            return;
        }

        try {
            const data = await fetchUnifiedLeaderboardData({
                leaderboardId,
                excludedSessionIds,
                showFlags,
                epicIdToCountry,
                forceRankByPoints: false,
                includeV7: true,
                indicatorsOnlyWhenAllDead: true,
            });

            setLeaderboard(data.leaderboard);
            setTeamDetails(data.teamDetails);
            setShowPositionIndicators(data.showPositionIndicators);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }, [leaderboardId, excludedSessionIds, showFlags, epicIdToCountry]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const nextPage = () => {
        const maxPage = Math.max(0, Math.ceil(leaderboard.length / 20) - 1);
        if (page < maxPage) {
            setPage((prev) => prev + 1);
        }
    };

    const previousPage = () => {
        if (page > 0) {
            setPage((prev) => prev - 1);
        }
    };

    const closeModal = () => setSelectedTeam(null);

    const firstColumnSlice = page === 0 ? [0, 10] : [page * 20, page * 20 + 10];
    const secondColumnSlice = [page * 20 + 10, page * 20 + 20];

    return (
        <div className='choupixs_bsk'>
            <div className='leaderboard_container' style={{ backgroundImage: `url(${fondImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className='lb_bg_overlay'></div>

                <div className='leaderboard_title'>
                    <span className='title_text'>Classement Choupixs x BSK Cup</span>
                    <div className='title_underline'></div>
                </div>

                <div className={`dual_leaderboard ${page === 0 ? 'single-column' : 'two-columns'}`}>
                    <div className='leaderboard_column'>
                        <div className='header_container'>
                            <div className='rank_header' onClick={previousPage}>PLACE</div>
                            <div className='name_header'>
                                <span>JOUEURS</span>
                                <span className='vr_label'>WINS</span>
                            </div>
                            <div className='info_header'>ELIMS</div>
                            <div className='info_header' onClick={nextPage}>POINTS</div>
                        </div>

                        {leaderboard.slice(firstColumnSlice[0], firstColumnSlice[1]).map((data, index) => (
                            <Row
                                key={`${data.teamname}-${data.place}`}
                                index={index}
                                rank={data.place}
                                teamname={data.teamname}
                                points={data.points}
                                elims={data.elims}
                                wins={data.wins}
                                alive={data.alive}
                                positionChange={data.positionChange}
                                showPositionIndicators={showPositionIndicators}
                                games={data.games}
                                showFlags={showFlags}
                                memberData={data.memberData}
                                onClick={() => setSelectedTeam(data.teamname)}
                            />
                        ))}
                    </div>

                    {page !== 0 && (
                        <div className='leaderboard_column second-column'>
                            <div className='header_container'>
                                <div className='rank_header' onClick={previousPage}>PLACE</div>
                                <div className='name_header'>
                                    <span>JOUEURS</span>
                                    <span className='vr_label'>WINS</span>
                                </div>
                                <div className='info_header'>ELIMS</div>
                                <div className='info_header' onClick={nextPage}>POINTS</div>
                            </div>

                            {leaderboard.slice(secondColumnSlice[0], secondColumnSlice[1]).map((data, index) => (
                                <Row
                                    key={`${data.teamname}-${data.place}-second`}
                                    index={index}
                                    rank={data.place}
                                    teamname={data.teamname}
                                    points={data.points}
                                    elims={data.elims}
                                    wins={data.wins}
                                    alive={data.alive}
                                    positionChange={data.positionChange}
                                    showPositionIndicators={showPositionIndicators}
                                    games={data.games}
                                    showFlags={showFlags}
                                    memberData={data.memberData}
                                    onClick={() => setSelectedTeam(data.teamname)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {selectedTeam && teamDetails[selectedTeam] && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.75)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 2000,
                        }}
                        onClick={closeModal}
                    >
                        <div
                            style={{
                                width: 'min(880px, 92vw)',
                                maxHeight: '82vh',
                                overflowY: 'auto',
                                background: '#14090b',
                                border: '1px solid rgba(237, 11, 6, 0.4)',
                                borderRadius: '12px',
                                padding: '16px',
                                color: '#fff',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>{selectedTeam}</h3>
                                <button type="button" onClick={closeModal}>x</button>
                            </div>
                            <div style={{ marginTop: '12px' }}>
                                <strong>Membres:</strong>
                                <ul>
                                    {teamDetails[selectedTeam].members.map((member, idx) => (
                                        <li key={`${member.id || member.name}-${idx}`}>{member.name}</li>
                                    ))}
                                </ul>
                            </div>
                            <div style={{ marginTop: '12px' }}>
                                <strong>Games:</strong>
                                <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                                    {teamDetails[selectedTeam].sessions.map((session, idx) => (
                                        <div key={`session-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                            <span>Game {idx + 1}</span>
                                            <span>Place: {session.place}</span>
                                            <span>Kills: {session.kills}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LeaderboardTest;
