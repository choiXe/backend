import React from 'react';
import Navbar from './components/Navbar';
import './App.css';

import Home from './components/pages/Home';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Sector from './components/pages/Sector'
import Stock from './components/pages/Stock';
import Search from './components/pages/Search';
import Setting from './components/pages/Setting';

/*
import Amplify, { API, graphqlOperation } from 'aws-amplify';
import awsconfig from './aws-exports';
import { AmplifySignOut, withAuthenticator } from '@aws-amplify/ui-react';
Amplify.configure(awsconfig);
*/

function App() {
  return (
    <>
      <Router>
        <Navbar />
        <Switch>
          <Route path='/' exact component={Home} />
          <Route path='/sector' component={Sector} />
          <Route path='/stock' component={Stock} />
          <Route path='/search' component={Search} />
          <Route path='/setting' component={Setting} />
        </Switch>
      </Router>
    </>
  );
}

export default App;
