import './overlay_joueurs_envie.css';
import React, { useState, useEffect, useRef } from "react"
import { useLocation } from 'react-router-dom';

function computeNameFontSize(text) {
  const len = (text || '').length;
  if (len <= 22) return '18pt';
  if (len <= 28) return '16pt';
  if (len <= 36) return '14pt';
  if (len <= 44) return '13pt';
  if (len <= 52) return '12pt';
  return '11pt';
}

function Row({ rank, teamname, points, elims, avg_place, wins, index, alive }) {
    const nameRef = useRef(null);
    const [fontSizePx, setFontSizePx] = useState(parseInt(computeNameFontSize(teamname)) || 18);

    useEffect(() => {
        const el = nameRef.current;
        if (!el) return;
        let size = parseInt(computeNameFontSize(teamname)) || 18;
        const min = 6;
        el.style.fontSize = `${size}px`;

        const client = el.clientWidth;
        const scroll = el.scrollWidth;

        if (client > 0 && scroll > client) {
            const scale = client / scroll;
            let newSize = Math.max(min, Math.floor(size * scale));
            el.style.fontSize = `${newSize}px`;

            let safety = 0;
            while (el.scrollWidth > el.clientWidth && newSize > min && safety < 10) {
                newSize -= 1;
                el.style.fontSize = `${newSize}px`;
                safety++;
            }
            size = newSize;
        }

        setFontSizePx(size);
    }, [teamname]);

    return (
        <>
            <div className={`rank ${alive ? '' : 'dimmed'}`}>{rank}</div>
            <div className={`name-and-vr ${alive ? 'alive' : 'dimmed'}`}>
                <div
                    className='name'
                    ref={nameRef}
                    style={{ fontSize: `${fontSizePx}px` }}
                >
                    {teamname}
                </div>
                <div className='info points'>{Math.round(points)}</div>
            </div>
        </>
    )
}

function PopUpLeaderboard() {

    const search = useLocation().search;
    const params = new URLSearchParams(search);
    const leaderboard_id = params.get('id');
    const aliveParam = params.get('alive');
    const onlyAlive = aliveParam === 'true' || aliveParam === '1';
    const restoreFullOnEndParam = params.get('restore_full_on_end');
    const restoreFullOnEnd = restoreFullOnEndParam === null
        ? true 
        : (restoreFullOnEndParam === 'true' || restoreFullOnEndParam === '1');

    const simulateAliveParam = params.get('simulate_alive');
    const simulateAliveRandomCountParam = params.get('simulate_alive_count');
    const simulateAliveTopParam = params.get('simulate_alive_top');
    const simulateAlive = simulateAliveParam === 'true' || simulateAliveParam === '1';
    const simulateAliveCount = simulateAliveRandomCountParam
        ? parseInt(simulateAliveRandomCountParam, 10)
        : (simulateAliveTopParam ? parseInt(simulateAliveTopParam, 10) : 10);

    const [allEntries, setAllEntries] = useState([])
    const [page, setPage] = useState(0)
    const [transition, setTransition] = useState('fade')
    const [isHidden, setIsHidden] = useState(false)
    const hideTimerRef = useRef(null)
    const prevAliveCountRef = useRef(0)

    useEffect(() => {

        const fetch_data = () => {

            const queries = { queries: [{ range: { from: 0, to: 50000 }, flags: 1 }], flags: 1 };
            fetch(`https://api.wls.gg/v5/leaderboards/${leaderboard_id}/v7/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queries),
            })
                .then((response) => response.json())
                .then(data => {
                    const safeEntries = Array.isArray(data?.queries?.[0]?.entries) ? data.queries[0].entries : [];
                    let leaderboard_list = []
                    for (let team of safeEntries) {
                        const members = team?.members ? Object.values(team.members) : [];
                        const stats = team?.stats || {};
                        leaderboard_list.push({
                            teamname: members.map(member => member.name).sort().join(' - '),
                            elims: stats[107] || 0,
                            avg_place: stats[102] || 0,
                            wins: stats[104] || 0,
                            place: team?.rank || 0,
                            points: stats[1] || 0,
                            alive: (team?.flags & 2) === 2
                        })
                    }
                    leaderboard_list.sort((a, b) => (a.place - b.place) || (b.points - a.points))

                    if (simulateAlive) {
                        const n = Math.max(0, Math.min(leaderboard_list.length, isNaN(simulateAliveCount) ? 10 : simulateAliveCount));
                        const indices = Array.from({ length: leaderboard_list.length }, (_, i) => i);
                        for (let i = indices.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [indices[i], indices[j]] = [indices[j], indices[i]];
                        }
                        const picked = new Set(indices.slice(0, n));
                        leaderboard_list = leaderboard_list.map((entry, idx) => ({
                            ...entry,
                            alive: entry.alive || picked.has(idx)
                        }));
                    }

                    setAllEntries(leaderboard_list)
                }

                )
        }


        fetch_data()
        const interval = setInterval(fetch_data, 10000)
        return () => clearInterval(interval)


    }, [leaderboard_id])

    const aliveCount = allEntries.filter(item => item.alive).length;
    const showAliveOnly = onlyAlive
        ? true
        : (aliveCount === 0 ? !restoreFullOnEnd : aliveCount <= 10);
    useEffect(() => {
        const prev = prevAliveCountRef.current;
        if (prev > 0 && aliveCount === 0) {
            setIsHidden(true);
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
            hideTimerRef.current = setTimeout(() => {
                setIsHidden(false);
                hideTimerRef.current = null;
            }, 120000);
        }
        if (aliveCount > 0 && isHidden) {
            setIsHidden(false);
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        }
        prevAliveCountRef.current = aliveCount;
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };
    }, [aliveCount, isHidden]);

    useEffect(() => {
        const baseListLength = showAliveOnly
            ? allEntries.filter(item => item.alive).length
            : Math.min(50, allEntries.length);
        const totalPages = Math.max(0, Math.ceil(baseListLength / 10) - 1);
        if (page > totalPages) {
            setTransition('fade');
            setPage(totalPages);
        }
    }, [allEntries, showAliveOnly]);

    useEffect(() => {
        if (!showAliveOnly && !isHidden) {
            const timer = setInterval(() => {
                setTransition('next');
                setPage(prev => {
                    const totalPages = Math.max(0, Math.ceil(Math.min(50, allEntries.length) / 10) - 1);
                    return (prev + 1) % (totalPages + 1);
                });
            }, 30000);
            return () => clearInterval(timer);
        }
    }, [showAliveOnly, allEntries.length, isHidden]);

    function nextPage() {
        setTransition('next');
        const baseListLength = showAliveOnly ? allEntries.filter(item => item.alive).length : Math.min(50, allEntries.length);
        const totalPages = Math.max(0, Math.ceil(baseListLength / 10) - 1);
        setPage(prev => (prev < totalPages ? prev + 1 : 0));
    }

    function previousPage() {
        setTransition('prev');
        const baseListLength = showAliveOnly ? allEntries.filter(item => item.alive).length : Math.min(50, allEntries.length);
        const totalPages = Math.max(0, Math.ceil(baseListLength / 10) - 1);
        setPage(prev => (prev > 0 ? prev - 1 : totalPages));
    }

    const baseList = showAliveOnly ? allEntries.filter(item => item.alive) : allEntries.slice(0, Math.min(50, allEntries.length));
    const displayed = baseList.slice(page * 10, page * 10 + 10);

    if (isHidden) {
        return null;
    }

    return (
        <div className='overlay_joueurs_'>

            <div className='leaderboard_container_prod'>
                <div className={`leaderboard_table_prod page_transition ${transition === 'next' ? 'slide-left' : transition === 'prev' ? 'slide-right' : ''}`} key={`page-${page}`}>

                    <div className='rank header' onClick={previousPage}>#</div>
                    <div className='name-and-vr header'>
                        <div className='name header'>ÉQUIPES</div>
                        <div className='wins header' onClick={nextPage}>PTS</div>
                    </div>

                    {displayed.map((data, index) => (
                        <Row key={`${data.teamname}-${index}`} index={index} rank={data.place} teamname={data.teamname} points={data.points} elims={data.elims} wins={data.wins} avg_place={data.avg_place} alive={data.alive} />
                    ))}
                </div>
            </div>
        </div>

    )
}

export default PopUpLeaderboard