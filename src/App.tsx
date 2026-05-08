import React from 'react';

import './assets/scss/themes.scss';
import 'simplebar-react/dist/simplebar.min.css';
import Route from './Routes';
import PwaLaunchScreen from './components/common/PwaLaunchScreen';

function App() {
  return (
    <>
      <PwaLaunchScreen />
      <Route />
    </>
  );
}

export default App;
