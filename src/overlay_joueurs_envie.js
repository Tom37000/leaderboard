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
        const min = 11; 
        el.style.fontSize = `${size}px`;
        let safety = 0;
        while (el.scrollWidth > el.clientWidth && size > min && safety < 24) {
            size -= 1;
            el.style.fontSize = `${size}px`;
            safety++;
        }
        setFontSizePx(size);
    }, [teamname]);

    return (
        <>
            <div className={`rank ${alive ? '' : 'dimmed'} fade-in`} style={{ animationDelay: `${index * 60}ms` }}>{rank}</div>
            <div className='name-and-vr fade-in' style={{ opacity: alive ? "1" : "0.5", animationDelay: `${index * 60}ms` }}>
                <div
                    className='name'
                    ref={nameRef}
                    style={{
                        fontSize: `${fontSizePx}px`,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {alive ? <span className='alive-dot' /> : null}
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
    
    const headerBgParam = params.get('header_bg');
    const headerBg = headerBgParam || '#194c9e';
    const headerTextParam = params.get('header_text');
    const headerText = headerTextParam || '#ffffff';
    const rankBgParam = params.get('rank_bg');
    const rankBg = rankBgParam || '#194c9e';
    const rankTextParam = params.get('rank_text');
    const rankText = rankTextParam || '#ffffff';
    const nameBgParam = params.get('name_bg');
    const nameBg = nameBgParam || 'rgba(0, 42, 181, 0.5)';
    const nameTextParam = params.get('name_text');
    const nameText = nameTextParam || '#ffffff';
    const pointsTextParam = params.get('points_text');
    const pointsText = pointsTextParam || '#ffffff';
    const aliveDotParam = params.get('alive_dot');
    const aliveDot = aliveDotParam || 'red';

    const [allEntries, setAllEntries] = useState([])
    const [page, setPage] = useState(0)
    const [transition, setTransition] = useState('fade')

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
                    let leaderboard_list = []
                    for (let team of data.queries[0].entries) {
                        leaderboard_list.push({
                            teamname: Object.values(team.members).map(member => member.name).sort().join(' - '),
                            elims: team.stats[107],
                            avg_place: team.stats[102],
                            wins: team.stats[104],
                            place: team.rank,
                            points: team.stats[1],
                            alive: (team.flags & 2) === 2
                        })
                    }
                    leaderboard_list.sort((a, b) => (a.place - b.place) || (b.points - a.points))
                    setAllEntries(leaderboard_list)
                }

                )
        }


        fetch_data()
        const interval = setInterval(fetch_data, 10000)
        return () => clearInterval(interval)


    }, [leaderboard_id])

    const aliveCount = allEntries.filter(item => item.alive).length;
    const showAliveOnly = onlyAlive || aliveCount <= 10;

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
        if (!showAliveOnly) {
            const timer = setInterval(() => {
                setTransition('next');
                setPage(prev => {
                    const totalPages = Math.max(0, Math.ceil(Math.min(50, allEntries.length) / 10) - 1);
                    return (prev + 1) % (totalPages + 1);
                });
            }, 30000);
            return () => clearInterval(timer);
        }
    }, [showAliveOnly, allEntries.length]);

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

    return (
        <div className='overlay_joueurs_' style={{
            "--header-bg-color": headerBg,
            "--header-text-color": headerText,
            "--rank-bg-color": rankBg,
            "--rank-text-color": rankText,
            "--name-bg-color": nameBg,
            "--name-text-color": nameText,
            "--points-text-color": pointsText,
            "--alive-dot-color": aliveDot
        }}>

            <div className='leaderboard_container_prod'>
                <div className={`leaderboard_table_prod page_transition ${transition === 'next' ? 'slide-left' : transition === 'prev' ? 'slide-right' : 'fade'}`} key={`page-${page}`}>

                    <div className='rank header' style={{ background: headerBg }} onClick={previousPage}>#</div>
                    <div className='name-and-vr header' style={{ background: headerBg }}>
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