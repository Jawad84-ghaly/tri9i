import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { alertIcons } from '../constants/darijaAudioPrompts';
import type { Coordinate, Destination, RoadAlert, Route } from '../types/navigation';
import { mapHtml } from './mapHtml';
import { localized } from '../constants/language';
const messages = localized({ retry:'الخريطة ما تحمّلاتش. شوف الكونكسيون وضغط هنا نعاودو.' },
  { retry:'Carte non chargée. Vérifiez Internet et touchez ici pour réessayer.' },
  { retry:'Map could not load. Check Internet and tap here to retry.' });

type Props = {
  fix: Coordinate | null; route: Route | null; destination: Destination | null;
  alerts: RoadAlert[]; following: boolean; navigating: boolean; foreground: boolean;
  onPan: () => void; onPin: (point: Coordinate) => void; onAlert: (alert: RoadAlert) => void;
};

// The key-free APK uses a north-up map. Native Google/Apple maps remain available.
export function OpenStreetMap(props: Props) {
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!ready || !props.foreground) return;
    // Only JSON crosses the bridge; names and IDs are never interpreted as HTML.
    const data = JSON.stringify({
      fix: props.fix, geometry: props.route?.geometry ?? [], routeId: props.route?.id,
      destination: props.destination?.coordinate, following: props.following, navigating: props.navigating,
      alerts: props.alerts.map(a => ({ id: a.id, coordinate: a.coordinate, icon: alertIcons[a.kind] })),
    }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    web.current?.injectJavaScript(`window.updateMap(${data});true;`);
  }, [ready, props.fix, props.route, props.destination, props.alerts, props.following, props.navigating, props.foreground]);

  return <View style={StyleSheet.absoluteFillObject}>
    <WebView key={attempt} ref={web} source={{ html: mapHtml, baseUrl: 'https://tri9i.local/' }}
      style={styles.web} originWhitelist={['https://*']} javaScriptEnabled cacheEnabled
      applicationNameForUserAgent="Tri9i/1.0 (+https://github.com/Jawad84-ghaly/tri9i)"
      allowFileAccess={false} mixedContentMode="never" setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url === 'https://tri9i.local/'}
      onError={() => setFailed(true)} onHttpError={() => setFailed(true)}
      onMessage={event => {
        try {
          const value = JSON.parse(event.nativeEvent.data);
          if (value.type === 'ready') { setReady(true); setFailed(false); }
          if (value.type === 'error') setFailed(true);
          if (value.type === 'tilesReady') setFailed(false);
          if (value.type === 'pan') props.onPan();
          if (value.type === 'alert' && typeof value.id === 'string') {
            const alert = props.alerts.find(a => a.id === value.id); if (alert) props.onAlert(alert);
          }
          if (value.type === 'pin' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
              && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180) {
            props.onPin({ latitude: value.latitude, longitude: value.longitude });
          }
        } catch { /* Ignore malformed messages from the map frame. */ }
      }} />
    {(!ready || failed) && <View style={styles.notice}>
      {failed ? <Pressable accessibilityRole="button" onPress={() => { setReady(false); setFailed(false); setAttempt(a => a + 1); }}>
        <Text style={styles.text}>{messages.retry}</Text>
      </Pressable> : <ActivityIndicator color="#087F72" />}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#EAF1E7' },
  notice: { position: 'absolute', top: '42%', alignSelf: 'center', maxWidth: '85%', padding: 14, borderRadius: 12, backgroundColor: '#FFFEF9' },
  text: { color: '#173E35', textAlign: 'center', fontSize: 14 },
});
