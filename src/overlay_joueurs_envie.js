import './overlay_joueurs_envie.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_SIZE = 10;
const MAX_ENTRIES = 50;
const PAGE_INTERVAL_MS = 20000;
const REFRESH_INTERVAL_DEFAULT_MS = 10000;
const REFRESH_INTERVAL_ALIVE_MS = 2000;
const NAME_FONT_MAX = 28;
const NAME_FONT_MIN = 7;
const NAME_LETTER_SPACING_EM = 0.025;
const NAME_RIGHT_SAFETY_PX = 26;
const NAME_FIT_SAFETY_FACTOR = 0.94;

function mapEntriesToRows(entries) {
  return entries
    .map((team) => {
      const members = team?.members ? Object.values(team.members) : [];
      const stats = team?.stats || {};

      const teamName = members.length
        ? members
            .map((member) => member?.name || '')
            .filter(Boolean)
            .sort()
            .join(' - ')
        : (team?.name || '');

      return {
        rank: Number(team?.rank || 9999),
        place: Number(team?.rank || 0),
        points: Number(stats?.[1] || 0),
        teamName,
        alive: (team?.flags & 2) === 2,
      };
    })
    .filter((row) => row.teamName)
    .sort((a, b) => (a.rank - b.rank) || (b.points - a.points))
    .slice(0, MAX_ENTRIES)
    .map(({ place, teamName, points, alive }) => ({ place, teamName, points, alive }));
}

function applySimulatedAliveStatus(rows, { enabled, onlyAlive, forcedCount }) {
  if (!enabled) {
    return rows;
  }

  if (onlyAlive) {
    return rows.map((row) => ({ ...row, alive: true }));
  }

  if (!rows.length) {
    return rows;
  }

  let aliveCount;
  if (!Number.isNaN(forcedCount)) {
    aliveCount = Math.max(0, Math.min(rows.length, forcedCount));
  } else {
    const minAlive = Math.max(1, Math.floor(rows.length * 0.3));
    const maxAlive = Math.max(minAlive, Math.floor(rows.length * 0.7));
    aliveCount = Math.floor(Math.random() * (maxAlive - minAlive + 1)) + minAlive;
  }

  const indices = Array.from({ length: rows.length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const aliveSet = new Set(indices.slice(0, aliveCount));

  return rows.map((row, index) => ({ ...row, alive: aliveSet.has(index) }));
}

function OverlayRow({ row, index, nameFontPx }) {
  return (
    <div className={`popup-row ${row.alive ? 'is-alive' : 'is-dead'}`} style={{ '--row-index': `${index}` }}>
      <div className='popup-team-rank'>{row.place}</div>
      <div className='popup-team-name'>
        <span className='popup-team-name-inner'>
          {row.alive ? <span className='popup-alive-icon' aria-hidden='true' /> : null}
          <span className='popup-team-name-text' style={{ fontSize: `${nameFontPx}px` }}>
            {row.teamName}
          </span>
        </span>
      </div>
      <div className='popup-team-points'>{row.points === '' ? '' : Math.round(Number(row.points) || 0)}</div>
    </div>
  );
}

function PopUpLeaderboard() {
  const search = useLocation().search;
  const params = new URLSearchParams(search);
  const leaderboardId = params.get('id');
  const onlyAlive = params.get('alive') === 'true' || params.get('alive') === '1';
  const simulateAlive = params.get('simulate_alive') === 'true' || params.get('simulate_alive') === '1';
  const simulateAliveCount = Number.parseInt(
    params.get('simulate_alive_count') || params.get('simulate_alive_top') || '',
    10,
  );

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [nameFontPx, setNameFontPx] = useState(NAME_FONT_MAX);
  const dataLayerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!leaderboardId) {
        setRows([]);
        return;
      }

      try {
        const payload = {
          queries: [{ range: { from: 0, to: 50000 }, flags: 1 }],
          flags: 1,
        };

        const response = await fetch(`https://api.wls.gg/v5/leaderboards/${leaderboardId}/v7/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        const entries = Array.isArray(data?.queries?.[0]?.entries) ? data.queries[0].entries : [];
        const mappedRows = mapEntriesToRows(entries);
        const effectiveRows = applySimulatedAliveStatus(mappedRows, {
          enabled: simulateAlive,
          onlyAlive,
          forcedCount: simulateAliveCount,
        });

        if (!cancelled) {
          setRows(effectiveRows);
        }
      } catch (error) {
        if (!cancelled) {
          setRows([]);
        }
      }
    };

    fetchData();

    if (!leaderboardId) {
      return () => {
        cancelled = true;
      };
    }

    const refreshInterval = onlyAlive ? REFRESH_INTERVAL_ALIVE_MS : REFRESH_INTERVAL_DEFAULT_MS;
    const interval = setInterval(fetchData, refreshInterval);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [leaderboardId, simulateAlive, onlyAlive, simulateAliveCount]);

  const sourceRows = useMemo(() => {
    if (onlyAlive) {
      return rows.filter((row) => row.alive).slice(0, PAGE_SIZE);
    }
    return rows.slice(0, MAX_ENTRIES);
  }, [rows, onlyAlive]);

  const totalPages = onlyAlive ? 1 : Math.max(1, Math.ceil(sourceRows.length / PAGE_SIZE));

  useEffect(() => {
    if (onlyAlive) {
      if (page !== 0) {
        setPage(0);
      }
      return;
    }
    if (page > totalPages - 1) {
      setPage(0);
    }
  }, [page, totalPages, onlyAlive]);

  useEffect(() => {
    if (onlyAlive || totalPages <= 1) {
      return undefined;
    }

    const interval = setInterval(() => {
      setPage((prev) => (prev + 1) % totalPages);
    }, PAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [onlyAlive, totalPages]);

  const displayedRows = useMemo(() => {
    if (onlyAlive) {
      return sourceRows.slice(0, PAGE_SIZE);
    }
    const start = page * PAGE_SIZE;
    return sourceRows.slice(start, start + PAGE_SIZE);
  }, [sourceRows, page, onlyAlive]);

  const paddedRows = useMemo(() => {
    return Array.from({ length: PAGE_SIZE }, (_, index) => {
      return displayedRows[index] || { place: '', teamName: '', points: '', alive: false };
    });
  }, [displayedRows]);

  useEffect(() => {
    const computeTextWidth = (ctx, text, fontSize) => {
      ctx.font = `900 ${fontSize}px OmnesBlack, Eurostile, sans-serif`;
      const base = ctx.measureText(text).width;
      const spacing = Math.max(0, text.length - 1) * fontSize * NAME_LETTER_SPACING_EM;
      return base + spacing + 2;
    };

    const recalcSharedFontSize = () => {
      const layerEl = dataLayerRef.current;
      if (!layerEl) {
        return;
      }

      const rowEls = Array.from(layerEl.querySelectorAll('.popup-row'));
      if (!rowEls.length) {
        setNameFontPx(NAME_FONT_MAX);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      let targetSize = NAME_FONT_MAX;
      let hasNamedRow = false;

      paddedRows.forEach((row, index) => {
        if (!row.teamName) {
          return;
        }
        hasNamedRow = true;

        const rowEl = rowEls[index];
        const nameContainerEl = rowEl?.querySelector('.popup-team-name');
        if (!nameContainerEl) {
          return;
        }

        const iconEl = rowEl.querySelector('.popup-alive-icon');
        const innerEl = rowEl.querySelector('.popup-team-name-inner');
        const innerStyle = innerEl ? window.getComputedStyle(innerEl) : null;
        const gapWidth = innerStyle ? Number.parseFloat(innerStyle.columnGap || innerStyle.gap || '0') || 0 : 0;
        const iconWidth = iconEl ? iconEl.offsetWidth + gapWidth : 0;
        const availableWidth = Math.max(12, nameContainerEl.clientWidth - iconWidth - NAME_RIGHT_SAFETY_PX);

        let fittedSize = NAME_FONT_MAX;
        const baseWidth = computeTextWidth(ctx, row.teamName, NAME_FONT_MAX);
        if (baseWidth > 0) {
          fittedSize = Math.floor((availableWidth / baseWidth) * NAME_FONT_MAX * NAME_FIT_SAFETY_FACTOR);
        }
        fittedSize = Math.max(NAME_FONT_MIN, Math.min(NAME_FONT_MAX, fittedSize));

        while (computeTextWidth(ctx, row.teamName, fittedSize) > availableWidth && fittedSize > NAME_FONT_MIN) {
          fittedSize -= 1;
        }

        targetSize = Math.min(targetSize, fittedSize);
      });

      setNameFontPx(hasNamedRow ? Math.max(NAME_FONT_MIN, targetSize) : NAME_FONT_MAX);
    };

    const frameId = window.requestAnimationFrame(recalcSharedFontSize);
    const resizeObserver = new ResizeObserver(recalcSharedFontSize);
    if (dataLayerRef.current) {
      resizeObserver.observe(dataLayerRef.current);
    }
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        recalcSharedFontSize();
      });
    }
    window.addEventListener('resize', recalcSharedFontSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', recalcSharedFontSize);
    };
  }, [paddedRows]);

  return (
    <div className='overlay_joueurs_'>
      <div className='popup-overlay'>
        <div className='popup-background' />

        <div className='popup-data-layer' ref={dataLayerRef}>
          {paddedRows.map((row, index) => (
            <OverlayRow row={row} index={index} nameFontPx={nameFontPx} key={`overlay-row-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PopUpLeaderboard;
