import './App.css';
import React from "react"
import { HashRouter as Router, Route, Routes  } from 'react-router-dom';
import LeaderboardWolt from './LeaderboardWolt';
import LeaderboardReddyshRoyale from './LeaderboardReddyshRoyale'
import LeaderboardStizoCup from './LeaderboardStizoCup'
import LeaderboardCDF from './LeaderboardCDF';
import Leaderboard2R from './Leaderboard2R';
import LeaderboardSolary from './LeaderboardSolary';
import LeaderboardReload from './LeaderboardReload';


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
          <Route path="/reload_leaderboard" element={<LeaderboardReload />} />
          <Route path="/2r_leaderboard" element={<Leaderboard2R />} />
          <Route path="/solary_leaderboard" element={<LeaderboardSolary />} />

        </Routes >
      </Router>
    );
  }


export default App;
