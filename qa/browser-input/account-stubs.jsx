import React, {createContext, useContext, useState} from 'react';
import {DarkColors} from '../../constants/theme';
const FixtureContext = createContext(null);
const baseline = id => ({name:`Synthetic Qualification ${id}`,email:`synthetic-${id.toLowerCase()}@example.invalid`,shopName:`Synthetic Qualification Shop ${id}`});
export function FixtureProvider({children}) {
  const [id,setId] = useState('A');
  const [profile,setProfile] = useState(()=>baseline('A'));
  const [saved,setSaved] = useState(()=>baseline('A'));
  const [generation,setGeneration] = useState(0);
  const [saves,setSaves] = useState(0);
  const [refreshes,setRefreshes] = useState(0);
  const reset = next => {setId(next);setProfile(baseline(next));setSaved(baseline(next));setSaves(0);setRefreshes(0);setGeneration(v=>v+1);};
  const blocked = async () => {throw new Error('Disabled in offline fixture');};
  const value = {profile,loading:false,error:null,isWebBillingAvailable:false,
    account:{profile:{id:`fixture-${id}`},shop:{id:`fixture-shop-${id}`},billing:{planLabel:'Free',subscriptionStatus:'none'},
      usage:{monthlyCredits:5,remainingCredits:5,usedCredits:0,creditPeriod:'month'},entitlements:{unlimitedCredits:false},plans:[]},
    saveProfile:async next=>{setSaved({...next,email:baseline(id).email});setProfile({...next,email:baseline(id).email});setSaves(n=>n+1);},
    refreshAccount:async()=>{setProfile({...saved});setRefreshes(n=>n+1);},beginCheckout:blocked,openBillingPortal:blocked};
  return <FixtureContext.Provider value={value}>
    <aside><strong>OFFLINE SYNTHETIC · Actual AccountScreen · {FIXTURE_BASELINE?'BEFORE (on-drag)':'REPAIRED (none)'}</strong><p>Local memory only. Save and refresh model no real persistence. Auth, login, billing and providers are stubbed.</p>
      <button onClick={()=>reset('A')}>Reset synthetic A</button> <button onClick={()=>reset('B')}>Reset synthetic B</button>
      <output id="account-fixture-diagnostics" data-account={id} data-saves={saves} data-refreshes={refreshes}>Fixture {id} · saves {saves} · refreshes {refreshes}</output>
    </aside><main key={generation}>{children}</main>
  </FixtureContext.Provider>;
}
export const useCommercialization = () => useContext(FixtureContext);
export const useCommercialAuth = () => ({status:'signed-in'});
export const useAppTheme = () => ({colors:DarkColors});
export const CommercialLogin = () => <p style={{color:DarkColors.text}}>Offline synthetic sign-in; no authentication executed.</p>;
export const Ionicons = ({color}) => <span style={{color}} aria-hidden="true">◇</span>;
