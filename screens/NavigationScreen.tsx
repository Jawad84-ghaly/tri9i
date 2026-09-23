import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { OpenStreetMap } from '../components/OpenStreetMap';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { config } from '../constants/config';
import { alertIcons, alertLabels, eventPrompt, maneuverPrompt, modeLabels, ui } from '../constants/darijaAudioPrompts';
import { demoDestination, demoOptions, demoOrigin, demoPosition } from '../data/demo';
import { useForeground, useLocation } from '../hooks/useLocation';
import { useAlerts } from '../hooks/useAlerts';
import { reportAlert, validAlerts } from '../services/alertsService';
import { calculateRoutes } from '../services/routingService';
import { searchDestinations } from '../services/searchService';
import { speech } from '../services/speechService';
import type { AlertKind, Destination, RoadAlert, RouteMode, RouteOption } from '../types/navigation';
import { alertsAhead, guidanceAt, needsRouteRefresh } from '../utils/guidance';

function Awake() { useKeepAwake(); return null; }
function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}
export default function NavigationScreen() {
  const foreground = useForeground();
  const foregroundRef = useRef(foreground); foregroundRef.current = foreground;
  const { fix, setFix, error: gpsError, retry } = useLocation(foreground);
  const community = useAlerts(fix, foreground);
  const map = useRef<MapView>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Destination[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [mode, setMode] = useState<RouteMode>('fastest');
  const modeRef = useRef(mode); modeRef.current = mode;
  const [navigating, setNavigating] = useState(false);
  const [following, setFollowing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [stale, setStale] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [bottomHeight, setBottomHeight] = useState(280);
  const searchRequest = useRef<AbortController | null>(null);
  const routeRequest = useRef<AbortController | null>(null);
  const fixRef = useRef(fix); fixRef.current = fix;
  const targetRef = useRef(destination); targetRef.current = destination;
  const lastReroute = useRef(0), offRouteCount = useRef(0), spoken = useRef('');
  const demoElapsed = useRef(0);
  const route = options.find(option => option.mode === mode)?.route ?? null;
  const gpsReady = !gpsError && !!fix && (config.demo || (fix.accuracy <= 60 && now - fix.timestamp < 20_000));
  const allAlerts = useMemo(() => validAlerts([...community.alerts, ...(route?.alerts ?? [])], now), [community.alerts, route, now]);
  const guidance = useMemo(() => route && fix ? guidanceAt(route, fix) : null, [route, fix]);

  useEffect(() => {
    let mounted = true;
    void speech.initialize().then(status => { if (mounted) setVoiceStatus(status === 'missing' ? ui.noVoice : status === 'arabic' ? ui.voiceFallback : ''); });
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => { mounted = false; clearInterval(timer); speech.stop(); searchRequest.current?.abort(); routeRequest.current?.abort(); };
  }, []);
  useEffect(() => { speech.setEnabled(!muted && foreground); if (!muted) spoken.current = ''; }, [muted, foreground]);
  useEffect(() => {
    if (!foreground) {
      routeRequest.current?.abort(); searchRequest.current?.abort(); setBusy(false); setSearching(false);
    }
  }, [foreground]);

  const loadRoutes = useCallback(async (target: Destination, initial: boolean) => {
    const origin = fixRef.current;
    if (!origin || (!config.demo && (origin.accuracy > 60 || Date.now() - origin.timestamp > 20_000))) return;
    routeRequest.current?.abort();
    const controller = new AbortController(); routeRequest.current = controller;
    setBusy(true);
    if (initial) { setMessage(''); setOptions([]); setNavigating(false); }
    try {
      const choices = config.demo ? demoOptions() : await calculateRoutes(origin, target.coordinate, controller.signal);
      if (controller.signal.aborted) return;
      const selectedMissing = !initial && !choices.find(choice => choice.mode === modeRef.current)?.route;
      // Keep the last selected route if its criterion temporarily becomes unavailable.
      setOptions(previous => choices.map(choice => selectedMissing && choice.mode === modeRef.current
        ? previous.find(old => old.mode === choice.mode) ?? choice : choice));
      setStale(selectedMissing); setMessage(''); spoken.current = ''; offRouteCount.current = 0;
      if (initial) setMode('fastest');
      return !selectedMissing;
    } catch {
      if (!controller.signal.aborted) { setStale(!initial); setMessage(ui.network); }
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }, []);

  function chooseDestination(target: Destination) {
    searchRequest.current?.abort(); setSearching(false); setResults([]); Keyboard.dismiss();
    setDestination(target); setQuery(target.name); setFollowing(false);
    demoElapsed.current = 0;
    if (config.demo) setFix({ ...demoOrigin, accuracy: 0, heading: 0, timestamp: Date.now() });
    void loadRoutes(target, true);
  }
  async function search() {
    if (!fix || query.trim().length < 2) return;
    searchRequest.current?.abort();
    const controller = new AbortController(); searchRequest.current = controller;
    setSearching(true); setMessage(''); Keyboard.dismiss();
    try {
      const places = config.demo ? [demoDestination] : await searchDestinations(query, fix, controller.signal);
      if (!controller.signal.aborted) { setResults(places); if (!places.length) setMessage(ui.noResults); }
    } catch { if (!controller.signal.aborted) setMessage(config.mapboxToken ? ui.network : ui.config); }
    finally { if (!controller.signal.aborted) setSearching(false); }
  }
  // Refit only while choosing a route. During guidance the camera follows GPS.
  useEffect(() => {
    if (!route || navigating) return;
    map.current?.fitToCoordinates(route.geometry, { edgePadding: { top: 220, bottom: 340, left: 40, right: 40 }, animated: true });
  }, [route, navigating]);
  useEffect(() => {
    if (fix && following && foreground) map.current?.animateCamera({ center: fix, zoom: navigating ? 17 : 14,
      pitch: navigating ? 45 : 0, heading: navigating && fix.heading >= 0 ? fix.heading : 0 }, { duration: 700 });
  }, [fix, following, navigating, foreground]);

  useEffect(() => {
    if (!config.demo || !navigating || !foreground || !route) return;
    const start = Date.now(), elapsed = demoElapsed.current;
    const timer = setInterval(() => {
      demoElapsed.current = elapsed + Date.now() - start;
      setFix({ ...demoPosition(route, demoElapsed.current / 90_000), heading: 0, accuracy: 0, timestamp: Date.now() });
    }, 1000);
    return () => { demoElapsed.current = elapsed + Date.now() - start; clearInterval(timer); };
  }, [navigating, foreground, route, setFix]);

  useEffect(() => {
    if (!navigating || !foreground || config.demo) return;
    const timer = setInterval(() => {
      if (targetRef.current) void loadRoutes(targetRef.current, false);
    }, config.trafficRefreshMs);
    return () => clearInterval(timer);
  }, [navigating, foreground, loadRoutes]);

  useEffect(() => {
    if (!navigating || !foreground || !gpsReady || !guidance || !fix || !route) return;
    if (guidance.arrived) {
      routeRequest.current?.abort(); setBusy(false);
      speech.event('arrived'); setMessage(eventPrompt('arrived')); setNavigating(false); return;
    }
    if (guidance.distance > 80 && !config.demo) {
      offRouteCount.current++;
      if (offRouteCount.current >= 3 && Date.now() - lastReroute.current > 30_000 && !busy && destination) {
        lastReroute.current = Date.now(); speech.event('rerouting'); void loadRoutes(destination, false);
      }
      return;
    }
    offRouteCount.current = 0;
    if (guidance.step) {
      const phase = guidance.metersToStep < 40 ? 'now' : guidance.metersToStep < 230 ? 'soon' : 'far';
      const key = `${route.id}-${guidance.index}-${phase}`;
      if (spoken.current !== key) {
        spoken.current = key; void speech.say(maneuverPrompt(guidance.step, guidance.metersToStep), true);
        return; // Do not queue a joke in the same tick as a maneuver.
      }
    }
    const upcoming = alertsAhead(route, fix, allAlerts)[0];
    if (upcoming) speech.event(upcoming.kind, upcoming.id);
  // Only new GPS fixes advance off-route counters. Alert expiry has its own timer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix, navigating, foreground, route]);

  function stop() {
    routeRequest.current?.abort(); setBusy(false); setNavigating(false); speech.stop();
  }
  async function start() {
    if (!route || !gpsReady || !fix || busy) return;
    if (!config.demo && destination && needsRouteRefresh(route, fix)) {
      if (!await loadRoutes(destination, false)) return;
    }
    if (!foregroundRef.current) return;
    demoElapsed.current = 0;
    spoken.current = ''; setFollowing(true); setNavigating(true); setMessage('');
    speech.setEnabled(!muted); speech.event('start');
  }
  async function sendReport(kind: AlertKind) {
    if (!fix || !gpsReady || sending) return;
    setSending(true);
    try {
      const alert: RoadAlert = config.demo ? { id: `local-${Date.now()}`, kind, coordinate: fix,
        createdAt: Date.now(), expiresAt: Date.now() + 30 * 60_000, source: 'demo' } : await reportAlert(kind, fix);
      community.add(alert); setReportOpen(false); setMessage(config.demo ? ui.localSent : ui.sent);
    } catch { setMessage(ui.reportFailed); }
    finally { setSending(false); }
  }
  function showAlert(alert: RoadAlert) {
    const source = { community: ui.sourceCommunity, mapbox: ui.sourceMapbox, waze: ui.sourceWaze, demo: ui.sourceDemo }[alert.source];
    Alert.alert(`${alertIcons[alert.kind]} ${alertLabels[alert.kind]}`, `${eventPrompt(alert.kind)}\n${source}`, [{ text: ui.close }]);
  }

  return <View style={styles.root}>
    <StatusBar barStyle="dark-content" />
    {navigating && foreground && <Awake />}
    {config.osmMap ? <OpenStreetMap fix={fix} route={route} destination={destination} alerts={allAlerts}
      following={following} navigating={navigating} foreground={foreground} onPan={() => setFollowing(false)}
      onAlert={showAlert} onPin={coordinate => { if (!navigating && gpsReady && !config.demo) chooseDestination({ id: 'pin', name: ui.pin, coordinate }); }} />
    : <MapView ref={map} style={StyleSheet.absoluteFillObject} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      mapPadding={{ top: 170, bottom: bottomHeight + 70, left: 12, right: 12 }}
      initialRegion={{ ...(fix ?? demoOrigin), latitudeDelta: 0.055, longitudeDelta: 0.055 }}
      showsUserLocation={!config.demo && !!fix} showsMyLocationButton={false} showsCompass={false}
      onPanDrag={() => setFollowing(false)}
      onLongPress={event => { if (!navigating && gpsReady && !config.demo) chooseDestination({ id: 'pin', name: ui.pin, coordinate: event.nativeEvent.coordinate }); }}>
      {route && <Polyline coordinates={route.geometry} strokeColor="#FFFFFF" strokeWidth={11} />}
      {route && <Polyline coordinates={route.geometry} strokeColor="#087F72" strokeWidth={6} />}
      {destination && <Marker coordinate={destination.coordinate} title={destination.name} pinColor="#E87543" />}
      {config.demo && fix && <Marker coordinate={fix} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.vehicle}><Text style={styles.vehicleText}>➤</Text></View></Marker>}
      {allAlerts.map(alert => <Marker key={alert.id} coordinate={alert.coordinate} onPress={() => showAlert(alert)}
        accessibilityLabel={alertLabels[alert.kind]}><View style={styles.alertMarker}><Text style={styles.alertEmoji}>{alertIcons[alert.kind]}</Text></View></Marker>)}
    </MapView>}
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.top}>
        <View style={styles.brandRow}><View style={styles.brandIcon}><Text style={styles.brandGlyph}>ط</Text></View>
          <View><Text style={styles.brand}>{ui.brand}</Text><Text style={styles.subtitle}>{ui.subtitle}</Text></View>
        </View>
        <Text style={[styles.badge, config.demo && styles.demoBadge]}>{config.demo ? ui.demo : ui.live}</Text>
        {!navigating && <View style={styles.searchRow}>
          <TextInput accessibilityLabel={ui.search} placeholder={ui.search} placeholderTextColor="#73837F" value={query}
            onChangeText={text => { setQuery(text); searchRequest.current?.abort(); setSearching(false); setResults([]); }}
            onSubmitEditing={() => void search()} returnKeyType="search" style={styles.input} />
          <Button title={ui.find} onPress={() => void search()} disabled={!gpsReady || searching || query.trim().length < 2} />
        </View>}
        {searching && <ActivityIndicator color="#087F72" />}
        {!!results.length && <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {results.map(place => <Pressable accessibilityRole="button" key={place.id} style={styles.result} onPress={() => chooseDestination(place)}><Text style={styles.text}>{place.name}</Text></Pressable>)}
        </ScrollView>}
        {navigating && guidance?.step && <View style={styles.instruction}><Text style={styles.turnArrow}>
          {guidance.step.type === 'arrive' ? '⚑' : guidance.step.modifier?.includes('left') ? '↰' : guidance.step.modifier?.includes('right') ? '↱' : '↑'}</Text>
          <Text style={styles.instructionText}>{maneuverPrompt(guidance.step, guidance.metersToStep)}</Text></View>}
        {gpsError ? <View><Text style={styles.warning}>{ui.noGps}</Text><Button title={ui.retryGps} secondary onPress={retry} /></View>
          : !fix ? <Text style={styles.warning}>{ui.locating}</Text> : !gpsReady ? <Text style={styles.warning}>{ui.gpsWeak}</Text> : null}
        {!!message && <Text accessibilityLiveRegion="polite" style={styles.warning}>{message}</Text>}
      </View>
      <View style={styles.spacer} pointerEvents="none" />
      {config.osmMap && <Pressable accessibilityRole="link" style={styles.osmCredit}
        onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => setMessage(ui.network)); }}>
        <Text style={styles.osmCreditText}>© OpenStreetMap contributors</Text>
      </Pressable>}
      <View style={styles.floatingRow}>
        <Button title={ui.follow} secondary onPress={() => setFollowing(true)} />
        <Button title={muted ? ui.unmute : ui.mute} secondary onPress={() => setMuted(value => !value)} />
      </View>
      <View style={styles.bottom} onLayout={event => setBottomHeight(event.nativeEvent.layout.height)}>
        <ScrollView style={styles.bottomScroll} contentContainerStyle={styles.bottomContent}>
          {!destination && <><Text style={styles.heading}>{ui.search}</Text><Text style={styles.note}>{ui.mapHint}</Text>
            {config.demo && <Button title={ui.chooseDemo} onPress={() => chooseDestination(demoDestination)} />}</>}
          {busy && <View style={styles.loading}><ActivityIndicator color="#087F72" /><Text style={styles.note}>{ui.calculating}</Text></View>}
          {!!options.length && !navigating && <><Text style={styles.heading}>{ui.choose}</Text>
            {options.map(option => <Pressable key={option.mode} accessibilityRole="radio" accessibilityState={{ selected: mode === option.mode, disabled: !option.route }}
              disabled={!option.route || busy} onPress={() => setMode(option.mode)} style={[styles.routeCard, mode === option.mode && styles.selectedRoute, !option.route && styles.disabled]}>
              <View style={styles.routeHeading}><Text style={styles.routeTitle}>{modeLabels[option.mode]}</Text><Text style={styles.radio}>{mode === option.mode ? '●' : '○'}</Text></View>
              <Text style={styles.routeMetrics}>{option.route ? `${Math.ceil(option.route.duration / 60)} ${ui.minutes}  ·  ${(option.route.distance / 1000).toFixed(1)} ${ui.km}  ·  ${option.route.fuelLiters.toFixed(1)} ${ui.liters}` : ui.unavailable}</Text>
              {option.sameAs && <Text style={styles.note}>{ui.same} {modeLabels[option.sameAs]}</Text>}
            </Pressable>)}
            <Text style={styles.note}>{mode === 'shortest' ? ui.shortestNote : mode === 'economical' ? ui.economyNote : ui.background}</Text>
          </>}
          {navigating && route && guidance && <View style={styles.trip}><Text style={styles.tripTime}>
            {Math.max(1, Math.ceil(route.duration * guidance.remaining / Math.max(1, guidance.total) / 60))} {ui.minutes}</Text>
            <Text style={styles.text}>{(guidance.remaining / 1000).toFixed(1)} {ui.km} · {destination?.name}</Text></View>}
          {route && <Text style={styles.note}>{route.trafficAvailable ? ui.traffic : ui.noTraffic} · {ui.refreshed} {Math.floor((now - route.fetchedAt) / 60_000)} {ui.minutes}</Text>}
          {stale && <Text style={styles.warning}>{ui.stale}</Text>}
          {!!voiceStatus && <Text style={styles.note}>{voiceStatus}</Text>}
          <Text style={styles.note}>{community.status === 'live' ? ui.alertsLive : community.status === 'disabled' ? ui.alertsDisabled : ui.alertsOffline}</Text>
          <View style={styles.actions}>
            {route && <View style={styles.action}><Button title={navigating ? ui.stop : ui.start} disabled={!navigating && (busy || !gpsReady)} onPress={navigating ? stop : start} /></View>}
            <View style={styles.action}><Button title={ui.report} secondary disabled={!gpsReady || (!config.demo && !config.alertsUrl)} onPress={() => setReportOpen(true)} /></View>
          </View>
          {destination && !route && !busy && <Button title={ui.find} onPress={() => void loadRoutes(destination, true)} disabled={!gpsReady} />}
          <Text style={styles.attribution}>{ui.mapbox}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
    <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => !sending && setReportOpen(false)}>
      <View style={styles.modalBackdrop}><SafeAreaView style={styles.modal}>
        <Text style={styles.heading}>{ui.report}</Text><Text style={styles.note}>{ui.parked}</Text>
        {(Object.keys(alertLabels) as AlertKind[]).map(kind => <Button key={kind} title={`${alertIcons[kind]} ${alertLabels[kind]}`} secondary disabled={sending || !gpsReady} onPress={() => void sendReport(kind)} />)}
        {sending && <Text style={styles.note}>{ui.reporting}</Text>}
        <Button title={ui.cancel} disabled={sending} onPress={() => setReportOpen(false)} />
      </SafeAreaView></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  osmCredit: { alignSelf: 'flex-start', backgroundColor: '#FFFEF9', marginLeft: 16, marginBottom: 5, padding: 4, borderRadius: 5 },
  osmCreditText: { color: '#173E35', fontSize: 11 },
  root: { flex: 1, backgroundColor: '#E9F0EC' }, overlay: { flex: 1 },
  top: { marginHorizontal: 16, padding: 15, borderRadius: 24, backgroundColor: '#FFFEF9', gap: 8, elevation: 5, shadowColor: '#143B32', shadowOpacity: 0.12, shadowRadius: 12 },
  brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, brand: { fontSize: 28, fontWeight: '900', color: '#173E35', textAlign: 'right' },
  brandIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#087F72', alignItems: 'center', justifyContent: 'center' }, brandGlyph: { fontSize: 31, color: 'white', fontWeight: '900' },
  subtitle: { color: '#63766E', fontSize: 12, textAlign: 'right' }, badge: { color: '#087F72', fontSize: 11, textAlign: 'right', fontWeight: '700' }, demoBadge: { color: '#9C511E' },
  searchRow: { flexDirection: 'row-reverse', gap: 8 }, input: { flex: 1, minHeight: 48, backgroundColor: '#EEF3EE', borderRadius: 14, paddingHorizontal: 12, textAlign: 'right', color: '#173E35', fontSize: 16 },
  button: { minHeight: 46, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#087F72', alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#FFF', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  secondary: { backgroundColor: '#EDF3EE', borderWidth: 1, borderColor: '#D8E4DC' }, secondaryText: { color: '#173E35' }, disabled: { opacity: 0.42 },
  results: { maxHeight: 160 }, result: { paddingVertical: 13, borderBottomWidth: 1, borderColor: '#E1E9E3' },
  text: { color: '#173E35', textAlign: 'right', fontSize: 14 }, warning: { fontSize: 12, color: '#A44C22', textAlign: 'right', lineHeight: 20 },
  spacer: { flex: 1, minHeight: 12 }, floatingRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 10 },
  bottom: { backgroundColor: '#FFFEF9', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8, maxHeight: '47%' }, bottomScroll: { flexGrow: 0 }, bottomContent: { padding: 16, gap: 8 },
  heading: { color: '#173E35', fontSize: 20, fontWeight: '800', textAlign: 'right' }, note: { fontSize: 11, color: '#63766E', textAlign: 'right', lineHeight: 17 },
  routeCard: { borderWidth: 1, borderColor: '#DEE7E0', padding: 10, borderRadius: 15 }, selectedRoute: { borderColor: '#087F72', backgroundColor: '#E8F5EE', borderWidth: 2 },
  routeHeading: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 6 }, routeTitle: { fontWeight: '700', fontSize: 14, color: '#173E35' }, radio: { color: '#087F72', fontSize: 18 }, routeMetrics: { textAlign: 'right', fontSize: 13, color: '#496459', marginTop: 2 },
  actions: { flexDirection: 'row-reverse', gap: 8 }, action: { flex: 1 }, loading: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  attribution: { color: '#72847A', textAlign: 'center', fontSize: 9, marginTop: 3 },
  instruction: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center', backgroundColor: '#087F72', borderRadius: 17, padding: 14 }, instructionText: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'right', flex: 1 }, turnArrow: { color: '#FFF', fontSize: 30 },
  trip: { alignItems: 'flex-end', gap: 5 }, tripTime: { fontSize: 34, fontWeight: '900', color: '#087F72' },
  vehicle: { backgroundColor: '#087F72', borderColor: '#FFF', borderWidth: 3, borderRadius: 24, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, vehicleText: { color: '#FFF', fontSize: 24 },
  alertMarker: { backgroundColor: '#FFF', borderRadius: 16, padding: 7, borderColor: '#F0C394', borderWidth: 2 }, alertEmoji: { fontSize: 21 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#102E3977' }, modal: { backgroundColor: '#FFFEF9', padding: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 12 },
});
