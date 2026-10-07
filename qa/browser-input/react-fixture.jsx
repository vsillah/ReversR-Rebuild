import React,{useRef,useState,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {ScrollView,TextInput,View,Text} from 'react-native-web';
const native = location.pathname === '/rnw';
const dismissMode = new URL(location.href).searchParams.get('dismiss')==='none'?'none':'on-drag';
const scheduleEnabled = new URL(location.href).searchParams.get('schedule')!=='off';
const scopeParam = new URL(location.href).searchParams.get('scope');
const dismissScope = ['outer','inner'].includes(scopeParam)?scopeParam:'both';
const modes=['plain','scroll','controlled','replace','blur'];
const initial={name:'Synthetic Qualification A',shop:'Synthetic Qualification Shop A',email:'dummy@synthetic.invalid'};
function Fields({mode}) {
  const [values,setValues]=useState(initial);
  const [counts,setCounts]=useState({focus:0,blur:0,input:0,replacement:0,capture:0});
  const trace=useRef([]);
  const record=event=>{trace.current.push(event);const el=document.querySelector('#diagnostics');if(el)el.dataset.trace=trace.current.join(',');};
  const [generation,setGeneration]=useState(0);
  const renders=useRef(0); renders.current++;
  const originalNodes=useRef(null);
  useLayoutEffect(()=>{
    const nodes=Array.from(document.querySelectorAll('#fields input'));
    if(!originalNodes.current)originalNodes.current=nodes;
    document.querySelector('#diagnostics').dataset.nodesStable=String(nodes.length===originalNodes.current.length&&nodes.every((node,i)=>node===originalNodes.current[i]));
  });
  const count=(key)=>{record(key);setCounts(old=>({...old,[key]:old[key]+1}));};
  const scheduleScroll=()=>{
    if(!scheduleEnabled)return;
    const scroll=()=>{record('scheduled-scroll');document.activeElement?.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});};
    requestAnimationFrame(scroll);setTimeout(scroll,260);
  };
  function focused(event) {
    count('focus'); // Real parent rerender, with stable input keys except replace mode.
    if (native||mode==='scroll'||mode==='controlled') scheduleScroll();
    if(mode==='replace'){count('replacement');setGeneration(old=>old+1);}
    if(mode==='blur')event.currentTarget.blur();
  }
  const nativeFields=<ScrollView style={{height:560}} keyboardShouldPersistTaps="handled" keyboardDismissMode={dismissScope==='inner'?'none':dismissMode} onScroll={()=>record('outer-scroll')} scrollEventThrottle={16}>
    <ScrollView style={{height:420}} keyboardShouldPersistTaps="handled" keyboardDismissMode={dismissScope==='outer'?'none':dismissMode} onScroll={()=>record('inner-scroll')} scrollEventThrottle={16}
      onFocusCapture={()=>{count('capture');scheduleScroll();}}>
      {(mode==='scroll'||mode==='controlled')&&<View style={{height:600}}/>}
      <View nativeID="fields">{[['Profile name','name'],['Shop name','shop'],['Profile email','email']].map(([label,key])=><View key={key}><Text style={{color:'white'}}>{label}</Text><TextInput key={`${key}-${generation}`} accessibilityLabel={label} editable={key!=='email'} value={values[key]}
        style={{padding:12,marginVertical:10,backgroundColor:'white',color:'black',height:48}}
        onFocus={focused} onBlur={()=>count('blur')} onChangeText={value=>{setValues(old=>({...old,[key]:value}));count('input');}}/></View>)}</View>
    </ScrollView></ScrollView>;
  return <>
    {native ? nativeFields : <>
    {(mode==='scroll'||mode==='controlled')&&<div style={{height:'75vh'}} aria-hidden="true"/>}
    <section id="fields">{[['Profile name','name'],['Shop name','shop'],['Profile email','email']].map(([label,key])=><label key={key}>{label}<input key={`${key}-${generation}`} type="text" aria-label={label} readOnly={key==='email'} value={values[key]}
      onFocus={focused} onBlur={()=>count('blur')} onChange={event=>{const value=event.currentTarget.value;setValues(old=>({...old,[key]:value}));count('input');}}/></label>)}</section>
    </>}
    <button disabled>Save unavailable in fixture</button>
    <p id="diagnostics" role="status" data-focus={counts.focus} data-blur={counts.blur} data-input={counts.input} data-replacement={counts.replacement} data-renders={renders.current} data-capture={counts.capture}>focus={counts.focus} blur={counts.blur} input={counts.input} replacement={counts.replacement} renders={renders.current} capture={counts.capture}</p>
  </>;
}
function App(){
  const requested=new URL(location.href).searchParams.get('mode');
  const [mode,setMode]=useState(modes.includes(requested)?requested:'plain');
  const [caseId,setCaseId]=useState(0);
  return <main><h1>Local {native?'React Native Web':'React'} input diagnosis</h1><p>Installed dependencies only. No auth, storage, Save or external connections.</p><label>Fixture mode<select aria-label="Fixture mode" value={mode} onChange={event=>{setMode(event.target.value);setCaseId(n=>n+1);}}>{modes.map(value=><option key={value}>{value}</option>)}</select></label><button onClick={()=>setCaseId(n=>n+1)}>Reset synthetic fixture</button><p>Mode: {mode}; fixture keyboardDismissMode: {dismissMode}; schedule: {scheduleEnabled?'on':'off'}; dismiss scope: {dismissScope}</p><Fields key={caseId} mode={mode}/></main>;
}
createRoot(document.querySelector('#root')).render(<App/>);
