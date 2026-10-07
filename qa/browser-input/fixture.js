const modes = ['plain', 'scroll', 'controlled', 'replace', 'blur'];
const selected = new URL(location.href).searchParams.get('mode');
let mode = modes.includes(selected) ? selected : 'plain';
const select = document.querySelector('select');
select.value = mode;
let values, events;
const status = () => {
  const diagnostics = document.querySelector('#diagnostics');
  diagnostics.textContent = `focus=${events.focus} blur=${events.blur} input=${events.input} replacement=${events.replacement}`;
  for (const key of Object.keys(events)) diagnostics.dataset[key] = String(events[key]);
};
function render() {
  document.querySelector('#fields').replaceChildren();
  for (const [label, key] of [['Profile name','name'],['Shop name','shop'],['Profile email','email']]) {
    const wrapper = document.createElement('label'); wrapper.textContent = label;
    const input = document.createElement('input'); input.type = 'text'; input.setAttribute('aria-label', label);
    input.value = values[key]; input.readOnly = key === 'email';
    input.addEventListener('focus', () => {
      events.focus++; status();
      if (mode === 'scroll' || mode === 'controlled') {
        const scroll = () => document.activeElement?.scrollIntoView({block:'center',behavior:'auto'});
        requestAnimationFrame(scroll); setTimeout(scroll,260);
      }
      if (mode === 'controlled') { input.value = values[key]; status(); }
      if (mode === 'replace') { events.replacement++; render(); status(); }
      if (mode === 'blur') input.blur();
    });
    input.addEventListener('blur', () => { events.blur++; status(); });
    input.addEventListener('input', () => { events.input++; values[key] = input.value; if (mode === 'controlled') input.value = values[key]; status(); });
    wrapper.append(input); document.querySelector('#fields').append(wrapper);
  }
}
function reset() {
  document.querySelector('#fields').replaceChildren(); // Old-node blur belongs to the prior case.
  values = {name:'Synthetic Qualification A',shop:'Synthetic Qualification Shop A',email:'dummy@synthetic.invalid'};
  events = {focus:0,blur:0,input:0,replacement:0};
  document.querySelector('#mode').textContent = `Mode: ${mode}`; render(); status();
}
select.addEventListener('change', () => { mode = select.value; reset(); });
document.querySelector('#reset').addEventListener('click',reset);
reset();
