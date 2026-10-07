import React from 'react';
import {createRoot} from 'react-dom/client';
import AccountScreen from '../../app/account';
import {FixtureProvider} from './account-stubs';
createRoot(document.getElementById('root')).render(<FixtureProvider><AccountScreen /></FixtureProvider>);
