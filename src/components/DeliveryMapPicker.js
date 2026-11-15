"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { LocateFixed, Search } from "lucide-react";
import { addressFromGeocoderResult } from "@/lib/geocoding";

function makeMarkerIcon() {
  return L.divIcon({
    className: "checkout-map-marker-shell",
    html: '<span class="checkout-map-marker" aria-hidden="true"></span>',
    iconSize: [24, 30],
    iconAnchor: [12, 28],
  });
}

async function lookupAddress(parameters, signal) {
  const query = new URLSearchParams(parameters);
  const response = await fetch(`/api/v1/geocode?${query}`, { signal, headers: { Accept: "application/json" } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "address_lookup_unavailable");
  return data.results || [];
}

export default function DeliveryMapPicker({ onLocationSelect, selectedLocation }) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const marker = useRef(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const selectCoordinatesRef = useRef(null);
  const selectionVersion = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { onLocationSelectRef.current = onLocationSelect; }, [onLocationSelect]);

  const selectCoordinates = useCallback(async (latitude, longitude) => {
    if (!mapInstance.current) return;
    const version = ++selectionVersion.current;
    if (!marker.current) marker.current = L.marker([latitude, longitude], { draggable: true, icon: makeMarkerIcon() }).addTo(mapInstance.current);
    else marker.current.setLatLng([latitude, longitude]);
    marker.current.off("dragend");
    marker.current.on("dragend", (event) => {
      const position = event.target.getLatLng();
      void selectCoordinatesRef.current?.(position.lat, position.lng);
    });
    setResults([]);
    setMessage("Looking up this address…");
    setLocating(false);
    const coordinates = { latitude: Number(latitude), longitude: Number(longitude) };
    try {
      const matches = await lookupAddress({ lat: String(latitude), lon: String(longitude) });
      if (version !== selectionVersion.current) return;
      const place = matches[0];
      const address = place ? addressFromGeocoderResult(place) : {};
      onLocationSelectRef.current({ ...coordinates, ...address });
      setMessage(place ? "Address selected. Check the filled fields and correct anything needed." : "Location selected. Enter the address and PIN manually if they did not fill in.");
    } catch {
      if (version !== selectionVersion.current) return;
      onLocationSelectRef.current(coordinates);
      setMessage("Location selected, but the address lookup failed. Fill in the address and PIN manually.");
    }
  }, []);

  useEffect(() => { selectCoordinatesRef.current = selectCoordinates; }, [selectCoordinates]);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return undefined;
    const map = L.map(mapElement.current, { scrollWheelZoom: false, keyboard: true }).setView([22.9734, 78.6569], 5);
    const tileUrl = "/api/v1/map-tile?z={z}&x={x}&y={y}";
    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    }).addTo(map);
    map.on("click", (event) => { void selectCoordinates(event.latlng.lat, event.latlng.lng); });
    mapInstance.current = map;

    return () => {
      selectionVersion.current += 1;
      map.remove();
      mapInstance.current = null;
      marker.current = null;
    };
    // The map is created once; callback updates are read through onLocationSelectRef.
  }, [selectCoordinates]);

  useEffect(() => {
    const map = mapInstance.current;
    const latitude = selectedLocation?.latitude;
    const longitude = selectedLocation?.longitude;
    if (!map || typeof latitude !== "number" || typeof longitude !== "number") return;
    if (!marker.current) marker.current = L.marker([latitude, longitude], { draggable: true, icon: makeMarkerIcon() }).addTo(map);
    else marker.current.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    marker.current.off("dragend");
    marker.current.on("dragend", (event) => {
      const position = event.target.getLatLng();
      void selectCoordinates(position.lat, position.lng);
    });
  }, [selectedLocation?.latitude, selectedLocation?.longitude, selectCoordinates]);

  async function search(event) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 3) { setMessage("Enter at least 3 characters to search for an area or address."); return; }
    const version = ++selectionVersion.current;
    setSearching(true);
    setMessage("");
    setResults([]);
    try {
      const matches = await lookupAddress({ q: normalized });
      if (version !== selectionVersion.current) return;
      setResults(matches);
      setMessage(matches.length ? `Choose a result for ${normalized}.` : "No matching Indian addresses found. Try a nearby area or PIN code.");
    } catch {
      if (version === selectionVersion.current) setMessage("Address search is temporarily unavailable. You can still choose a point on the map or enter the address manually.");
    } finally {
      if (version === selectionVersion.current) setSearching(false);
    }
  }

  function chooseResult(place) {
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    selectionVersion.current += 1;
    setResults([]);
    setSearching(false);
    if (mapInstance.current) mapInstance.current.setView([latitude, longitude], 16);
    onLocationSelectRef.current({ latitude, longitude, ...addressFromGeocoderResult(place) });
    setMessage("Address selected. Check the filled fields and correct anything needed.");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setMessage("This browser does not support location access. Search for an area or choose a point on the map."); return; }
    setLocating(true);
    setMessage("Finding your current location…");
    navigator.geolocation.getCurrentPosition(
      (position) => { void selectCoordinates(position.coords.latitude, position.coords.longitude); },
      (error) => {
        setLocating(false);
        setMessage(error.code === error.PERMISSION_DENIED ? "Location access was not allowed. Search for an area or choose a point on the map instead." : "Could not get your current location. Search for an area or choose a point on the map instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return <div className="delivery-map-picker">
    <div className="map-search-form" role="search">
      <label className="sr-only" htmlFor="delivery-location-search">Search an area or address</label>
      <input id="delivery-location-search" value={query} onChange={(event) => { selectionVersion.current += 1; setQuery(event.target.value); setResults([]); setSearching(false); setMessage(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); void search(event); } }} placeholder="Search an area or address in India" autoComplete="street-address" />
      <button className="button button-dark" type="button" onClick={search} disabled={searching}>{searching ? "Searching…" : <><Search size={15} /> Search</>}</button>
    </div>
    <button className="map-location-button" type="button" onClick={useCurrentLocation} disabled={locating}><LocateFixed size={15} />{locating ? "Finding location…" : "Use my current location"}</button>
    {results.length > 0 && <ul className="map-search-results" aria-label="Address search results">{results.map((place) => <li key={place.place_id}><button type="button" onClick={() => chooseResult(place)}>{place.display_name}</button></li>)}</ul>}
    <div ref={mapElement} className="delivery-map-canvas" role="application" aria-label="Map for choosing your delivery location. Click the map or move the marker to select a location." />
    <p className="map-keyboard-hint">You can click the map, drag the marker, or use the map controls. OpenStreetMap attribution is shown on the map.</p>
    {message && <p className="map-status" role="status" aria-live="polite">{message}</p>}
  </div>;
}

