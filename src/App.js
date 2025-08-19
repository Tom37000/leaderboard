import './App.css';
import React from "react"
import { HashRouter as Router, Route, Routes  } from 'react-router-dom';
import LeaderboardWolt from './LeaderboardWolt';
import LeaderboardReddyshRoyale from './LeaderboardReddyshRoyale'
import LeaderboardStizoCup from './LeaderboardStizoCup'
import LeaderboardCDFSly from './LeaderboardCDFSly';
import LeaderboardCDF from './LeaderboardCDF';
import LeaderboardSlyHvK from './LeaderboardSlyHvK';

import Leaderboard2R from './Leaderboard2R';
import LeaderboardSolary from './LeaderboardSolary';
import LeaderboardLyost from './LeaderboardLyost';
import LeaderboardReload from './LeaderboardReload';
import LeaderboardErazer from './LeaderboardErazer';
import LeaderboardErazerCumulative from './LeaderboardErazerCumulative';


import TwitchPolls from './TwitchPolls';



function App() {
    return (
      <Router>
        <Routes >
          <Route path="/wolt_leaderboard" element={<LeaderboardWolt />} />
          <Route path="/reddysh_royale_leaderboard" element={<LeaderboardReddyshRoyale />} />
          <Route path="/stizo_leaderboard" element={<LeaderboardStizoCup />} />
          <Route path="/twitch_polls" element={<TwitchPolls />} />
          <Route path="/cdf_leaderboard" element={<LeaderboardCDF />} />
          <Route path="/cdfsly_leaderboard" element={<LeaderboardCDFSly />} />
          <Route path="/sly_hvk_leaderboard" element={<LeaderboardSlyHvK />} />
          <Route path="/reload_leaderboard" element={<LeaderboardReload />} />
          <Route path="/2r_leaderboard" element={<Leaderboard2R />} />
          <Route path="/solary_leaderboard" element={<LeaderboardSolary />} />
          <Route path="/lyost_leaderboard" element={<LeaderboardLyost />} />
          <Route path="/erazer_leaderboard" element={<LeaderboardErazer />} />
          <Route path="/erazer_cumulative_leaderboard" element={<LeaderboardErazerCumulative />} />

        </Routes >
      </Router>
    );
  }


export default App;
