import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { getApiBase } from '../utils/apiBase';

// Selection is metadata-only. Never retain a File, read bytes, or invoke upload.
export default function CadImportPanel() {
  const { colors } = useAppTheme();
  const picker = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<{ format: string; bytes: number } | null>(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Status has not been checked.');
  const [checking, setChecking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const supported = Platform.OS === 'web' && typeof document !== 'undefined' && typeof File !== 'undefined';
  useEffect(() => () => controller.current?.abort(), []);
  const checkStatus = async () => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setChecking(true);
    const timer = setTimeout(() => request.abort(), 8000);
    try {
      const response = await fetch(`${getApiBase()}/api/cad/capabilities`, { signal: request.signal, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      setStatus(data?.enabled === true
        ? 'The protected conversion service is available. User uploads still require an approved access route.'
        : 'The conversion service is unavailable. You can check again later.');
    } catch {
      setStatus('Could not check service status. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
      controller.current = null;
      setChecking(false);
    }
  };
  const text = { color: colors.text, lineHeight: 22 };
  const button = { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border };
  return (
    <View testID="cad-import-panel" style={{ gap: 14 }}>
      <Text style={[text, { fontWeight: '700', fontSize: 18 }]}>Import CAD</Text>
      <Text style={text}>Choose an .igs or .iges file to check its format and size locally. File contents stay on your device.</Text>
      {supported ? (
        <>
          <input ref={picker} type="file" accept=".igs,.iges" aria-label="Choose IGES file" data-testid="cad-file-input" style={{ display: 'none' }} onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (!file) return;
            const format = file.name.split('.').pop()?.toLowerCase();
            if (format !== 'igs' && format !== 'iges') {
              setSelected(null); setMessage('Unsupported format. Choose an .igs or .iges file.'); return;
            }
            if (file.size === 0) { setSelected(null); setMessage('This file is empty. Choose another IGES file.'); return; }
            setSelected({ format: format.toUpperCase(), bytes: file.size });
            setMessage('File selected locally. Nothing has been uploaded or converted.');
          }} />
          <TouchableOpacity testID="cad-choose-file" accessibilityRole="button" accessibilityLabel="Choose IGES file" style={button} onPress={() => {
            try { picker.current?.click(); } catch { setMessage('This browser could not open the file picker. Try a supported desktop browser.'); }
          }}><Text style={text}>{selected ? 'Choose another file' : 'Choose IGES file'}</Text></TouchableOpacity>
        </>
      ) : <Text testID="cad-picker-unavailable" style={text}>File selection is unavailable on this surface. Open ReversR in a web browser with file-picker support to select an IGES file. Native selection is pending.</Text>}
      {selected && <View testID="cad-selected-metadata" style={{ gap: 10 }}>
        <Text style={text}>{selected.format} · {selected.bytes.toLocaleString()} bytes · Selected locally</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear selected CAD file" style={button} onPress={() => { setSelected(null); setMessage('Selection cleared.'); }}><Text style={text}>Clear selection</Text></TouchableOpacity>
      </View>}
      {!!message && <Text accessibilityLiveRegion="polite" style={text}>{message}</Text>}
      <View testID="cad-operator-gate" style={{ gap: 10, padding: 14, backgroundColor: colors.elevated, borderRadius: 10 }}>
        <Text style={[text, { fontWeight: '700' }]}>Upload is not enabled</Text>
        <Text style={text}>CAD conversion is restricted to approved operator runs. Selecting a file does not authorize an upload. You can use Scan, Describe, or Sample while user import access is being prepared.</Text>
        <TouchableOpacity disabled accessibilityRole="button" accessibilityLabel="Upload unavailable: operator access required" accessibilityState={{ disabled: true }} style={button}><Text style={{ color: colors.mutedText }}>Upload unavailable</Text></TouchableOpacity>
      </View>
      <Text accessibilityLiveRegion="polite" style={text}>{status}</Text>
      <TouchableOpacity testID="cad-check-status" disabled={checking} accessibilityRole="button" accessibilityLabel="Check CAD service status" accessibilityState={{ disabled: checking }} style={button} onPress={checkStatus}><Text style={text}>{checking ? 'Checking status…' : 'Check service status'}</Text></TouchableOpacity>
      <Text style={{ color: colors.mutedText, lineHeight: 20 }}>Future mesh previews will need separate review. Import readiness does not certify dimensions, manufacturing suitability, model fidelity, rendering, or STL export.</Text>
    </View>
  );
}
