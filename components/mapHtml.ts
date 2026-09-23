// Leaflet is pinned with integrity checks. Tiles use the WebView HTTP cache;
// there is no bulk prefetch or offline download. Attribution is also shown in RN.
export const mapHtml = `<!doctype html><html lang="ar"><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<style>html,body,#map{height:100%;margin:0;background:#eaf1e7}.pin{font-size:24px;text-align:center;background:white;border-radius:50%;border:2px solid #087f72;line-height:32px;box-shadow:0 2px 6px #0003}</style>
</head><body><div id="map"></div>
<script>function send(x){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(x))}window.onerror=function(){send({type:'error'})};</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="" onerror="send({type:'error'})"></script>
<script>
if(window.L){
 const map=L.map('map',{zoomControl:false}).setView([33.59,-7.62],14);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19,keepBuffer:0,updateWhenIdle:true,
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
 }).on('tileerror',()=>send({type:'error'})).on('load',()=>send({type:'tilesReady'})).addTo(map);
 const lines=L.layerGroup().addTo(map), alerts=L.layerGroup().addTo(map);
 let vehicle=null,destination=null,routeId=null,wasNavigating=false;
 const xy=p=>[p.latitude,p.longitude];
 function icon(text){const el=document.createElement('span');el.textContent=text;return L.divIcon({className:'pin',html:el,iconSize:[34,34],iconAnchor:[17,17]})}
 map.on('dragstart',()=>send({type:'pan'}));
 map.on('contextmenu',e=>send({type:'pin',latitude:e.latlng.lat,longitude:e.latlng.lng}));
 window.updateMap=function(s){
   const routeChanged=routeId!==s.routeId;
   if(routeChanged){
     lines.clearLayers();routeId=s.routeId;
     if(s.geometry.length){L.polyline(s.geometry.map(xy),{color:'white',weight:11}).addTo(lines);L.polyline(s.geometry.map(xy),{color:'#087f72',weight:6}).addTo(lines)}
   }
   if(s.fix){if(!vehicle)vehicle=L.marker(xy(s.fix),{icon:icon('➤')}).addTo(map);else vehicle.setLatLng(xy(s.fix))}
   if(destination){map.removeLayer(destination);destination=null}
   if(s.destination)destination=L.marker(xy(s.destination),{icon:icon('⚑')}).addTo(map);
   alerts.clearLayers();s.alerts.forEach(a=>L.marker(xy(a.coordinate),{icon:icon(a.icon)}).on('click',()=>send({type:'alert',id:a.id})).addTo(alerts));
   if(s.geometry.length&&!s.navigating&&(routeChanged||wasNavigating))map.fitBounds(s.geometry.map(xy),{padding:[35,35],maxZoom:15});
   else if(s.following&&s.fix&&(s.navigating||!s.geometry.length))map.setView(xy(s.fix),s.navigating?16:14,{animate:false});
   wasNavigating=s.navigating;
 };send({type:'ready'});
}
</script></body></html>`;
