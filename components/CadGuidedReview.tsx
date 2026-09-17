import React, { useId, useState } from 'react';
import { useAppTheme } from '../hooks/useAppTheme';
import { MARK_DISPENSER_RESULT as fixture } from '../utils/cadInternalTesterPreview';
import { createReviewReceipt, normalizeReview, restoreReview, REVIEW_CHECKS, STORAGE_KEY, type ReviewState, type ReviewChecks } from '../utils/cadReviewReceipt';
import CadFixtureViewer from './CadFixtureViewer';

const steps = ['Compare', 'Check', 'Receipt'] as const;
const states: { value: ReviewState; label: string }[] = [
  { value: 'pass', label: 'Pass' }, { value: 'issue', label: 'Issue' }, { value: 'not-tested', label: 'Not tested' },
];

// This web-only surface is mounted only behind the existing non-production fixture gate.
export default function CadGuidedReview() {
  const { colors } = useAppTheme();
  const id = useId();
  const [step, setStep] = useState(0);
  const [referenceIndex, setReferenceIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [initial] = useState(() => {
    try { return { checks: restoreReview(window.sessionStorage.getItem(STORAGE_KEY)), available: true }; }
    catch { return { checks: normalizeReview(null), available: false }; }
  });
  const [storageAvailable, setStorageAvailable] = useState(initial.available);
  const [checks, setChecks] = useState<ReviewChecks>(initial.checks);
  const receipt = createReviewReceipt(checks);
  const receiptText = JSON.stringify(receipt, null, 2);
  const reference = fixture.referenceImages[referenceIndex];
  const button: React.CSSProperties = { minHeight: 44, padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.elevated, color: colors.text, font: 'inherit', cursor: 'pointer' };
  const saveChecks = (next: ReviewChecks) => {
    setChecks(next);
    setMessage('');
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(createReviewReceipt(next))); setStorageAvailable(true); }
    catch { setStorageAvailable(false); }
  };
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([receiptText], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'dispenser-visual-review.json';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Receipt download requested. No feedback was sent.');
    } catch { setMessage('Download is unavailable. Select and copy the receipt below.'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(receiptText); setMessage('Receipt copied. No feedback was sent.'); }
    catch { setMessage('Clipboard is unavailable. Select and copy the receipt below.'); }
  };
  return <section data-testid="cad-guided-review" aria-label="Dispenser visual review" style={{ color: colors.text, fontFamily: 'system-ui, sans-serif', fontSize: 14, lineHeight: 1.5, paddingBottom: 96, minWidth: 0 }}>
    <style>{`
      .cad-review-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
      /* The app uses a narrow content lane even on desktop; keep the model full width. */
      .cad-review-layout button:focus-visible, .cad-review-layout a:focus-visible, .cad-review-layout select:focus-visible, .cad-review-layout summary:focus-visible, .cad-review-layout textarea:focus-visible { outline: 3px solid #51acff; outline-offset: 2px; }
      .cad-review-choice { min-height: 44px; flex: 1; display: inline-flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; padding: 3px 2px; font-size: 13px; cursor: pointer; }
      .cad-review-choice:focus-within { outline: 2px solid #51acff; outline-offset: -2px; }
    `}</style>
    <h2 style={{ fontSize: 18, margin: '0 0 10px' }}>Dispenser visual review</h2>
    <div className="cad-review-layout">
      <div style={{ minWidth: 0 }}>
        <CadFixtureViewer geometry={fixture.previewGeometry} label={fixture.fixtureName} />
        <p style={{ color: colors.mutedText, margin: '8px 0' }}>Drag to rotate · + / − or pinch to zoom · Wheel center to reset</p>
        <p style={{ color: colors.mutedText, margin: '8px 0' }}>Fixed public fixture. Upload and conversion are disabled.</p>
      </div>
      <div style={{ minWidth: 0 }}>
        <nav aria-label="Review steps" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          {steps.map((label, index) => <button key={label} type="button" aria-current={step === index ? 'step' : undefined} aria-controls={`${id}-step`} onClick={() => { setStep(index); setMessage(''); }} style={{ ...button, flex: 1, padding: '8px 5px', borderColor: step === index ? colors.text : colors.border, fontWeight: step === index ? 700 : 400 }}>{label}</button>)}
        </nav>
        <div id={`${id}-step`}>
          {step === 0 && <section aria-label="Compare source and references">
            <p style={{ margin: '0 0 10px' }}><strong>Dispenser.IGS</strong> · IGES · {fixture.bytes.toLocaleString()} bytes<br />Imported X × Y × Z: <strong>{fixture.expectedDimensions.map(value => value.toFixed(2)).join(' × ')} mm</strong></p>
            <label htmlFor={`${id}-reference`}>Supplied reference</label>
            <select id={`${id}-reference`} value={referenceIndex} onChange={event => setReferenceIndex(Number(event.target.value))} style={{ ...button, display: 'block', width: '100%', margin: '4px 0 8px' }}>
              {fixture.referenceImages.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}
            </select>
            <img src={reference.url} alt={`${reference.label} supplied dispenser reference`} style={{ display: 'block', width: '100%', height: 210, objectFit: 'contain', background: '#fff', borderRadius: 6 }} />
            <a href={reference.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, color: colors.text }}>Open {reference.label.toLowerCase()} reference full size ↗</a>
            <p style={{ margin: '0 0 8px' }}>Use the wheel’s matching Front, Left or Top view. Compare overall shape, openings and missing features; use Drawing as a second check.</p>
            <details>
              <summary style={{ minHeight: 44, alignContent: 'center', cursor: 'pointer' }}>Source identity & limits</summary>
              <p>Authorized public source · {fixture.meshes} connected components · {fixture.triangles.toLocaleString()} triangles in the display mesh.</p>
              <p style={{ overflowWrap: 'anywhere' }}>Source SHA-256: {fixture.sha256}</p>
              <a href={fixture.sourceAssetUrl} download={fixture.sourceFileName} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, color: colors.text }}>Download original IGES</a>
              <p>Source confidence: {fixture.sourceConfidence}. The source-derived mesh is not fully watertight. Imported extents are source metadata, not measured or certified dimensions.</p>
            </details>
            <button type="button" style={{ ...button, width: '100%', marginTop: 8 }} onClick={() => setStep(1)}>Record checks →</button>
          </section>}
          {step === 1 && <section aria-label="Visual review checklist">
            <p style={{ margin: '0 0 10px' }}>Record only what you tested. Use Issue for a mismatch or unavailable viewer; leave untried checks as Not tested.</p>
            {REVIEW_CHECKS.map(check => <fieldset key={check.id} style={{ margin: '0 0 10px', padding: '8px 0', border: 0, borderBottom: `1px solid ${colors.border}`, minWidth: 0 }}>
              <legend style={{ fontWeight: 700, padding: 0 }}>{check.label}</legend>
              <p style={{ margin: '0 0 4px', color: colors.mutedText }} id={`${id}-${check.id}`}>{check.instruction}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {states.map(state => <label key={state.value} className="cad-review-choice" style={{ background: checks[check.id] === state.value ? colors.elevated : 'transparent', borderRadius: 6 }}>
                  <input type="radio" name={`${id}-${check.id}`} value={state.value} aria-describedby={`${id}-${check.id}`} checked={checks[check.id] === state.value} onChange={() => saveChecks({ ...checks, [check.id]: state.value })} style={{ accentColor: '#32a989', width: 16, height: 16, margin: 0 }} />{state.label}
                </label>)}
              </div>
            </fieldset>)}
            <button type="button" style={{ ...button, width: '100%' }} onClick={() => setStep(2)}>Review receipt →</button>
          </section>}
          {step === 2 && <section aria-label="Review receipt">
            <p style={{ marginTop: 0 }}><strong>{receipt.counts.pass} pass · {receipt.counts.issue} issue · {receipt.counts['not-tested']} not tested</strong></p>
            <p>{receipt.outcome === 'issues-recorded' ? 'Issues recorded. Return to Check to revise any result.' : receipt.outcome === 'incomplete' ? 'Review incomplete. Untested checks remain explicit in the receipt.' : 'All visual checks marked pass by the reviewer.'}</p>
            <p>Receipt contains fixture identifiers and fixed choices only. Copy or download it for your own review; nothing is submitted.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={button} onClick={copy}>Copy receipt</button>
              <button type="button" style={button} onClick={download}>Download receipt</button>
            </div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ minHeight: 44, alignContent: 'center', cursor: 'pointer' }}>View receipt / copy manually</summary>
              <textarea aria-label="Sanitized review receipt" readOnly value={receiptText} style={{ boxSizing: 'border-box', width: '100%', height: 240, padding: 8, fontSize: 12, color: colors.text, background: colors.elevated, border: `1px solid ${colors.border}` }} />
            </details>
            <button type="button" style={{ ...button, marginTop: 12 }} onClick={() => { saveChecks(normalizeReview(null)); setMessage('All checks reset to Not tested.'); }}>Reset all checks</button>
          </section>}
        </div>
        <p role="status" style={{ margin: '8px 0' }}>{message}</p>
        <p style={{ color: colors.mutedText, margin: '8px 0' }}>{storageAvailable ? 'Choices stay in this browser tab for this session.' : 'Tab storage is unavailable. Choices last until reload; download a receipt to keep them.'}</p>
        <p style={{ color: colors.mutedText, margin: '8px 0' }}>Visual review only. No dimensional or manufacturing certification, and no claim about other CAD files.</p>
      </div>
    </div>
  </section>;
}
