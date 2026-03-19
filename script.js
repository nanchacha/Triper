// App State
let map;
let markers = [];
let routePath = null;
let waypoints = []; // Stores the actual LatLng objects
let waypointNames = []; // Stores the names of the selected places
let discoveredPlaces = new Set();
let debounceTimer;
let topPlacesMarkers = [];
let hoverTimer = null;
let currentPlaceForDetails = null;

// DOM Elements
const waypointsList = document.getElementById('waypoints-list');
const clearBtn = document.getElementById('clear-btn');
const apiWarning = document.getElementById('api-warning');

// Details Panel Elements
const detailsPanel = document.getElementById('details-panel');
const closeDpBtn = document.getElementById('close-dp-btn');
const dpTitle = document.getElementById('dp-title');
const dpRating = document.getElementById('dp-rating');
const dpAddress = document.getElementById('dp-address');
const dpPhotos = document.getElementById('dp-photos');
const prevPhotoBtn = document.getElementById('prev-photo-btn');
const nextPhotoBtn = document.getElementById('next-photo-btn');
const dpReviews = document.getElementById('dp-reviews');
const addRouteBtn = document.getElementById('add-route-btn');
const zoomIndicator = document.getElementById('zoom-indicator');
const loadDataBtn = document.getElementById('load-data-btn');

// Check if API key is not properly set
if (!window.GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY === "YOUR_API_KEY_HERE") {
    apiWarning.classList.remove('hidden');
}

// Map Initialization
function initMap() {
    // Default location (e.g., center of Seoul, South Korea based on language context)
    const seoul = { lat: 37.5665, lng: 126.9780 };

    // Add custom dark styling to Google Maps for premium aesthetic
    const mapOptions = {
        zoom: 13,
        center: seoul,
        disableDefaultUI: true, // cleaner look
        zoomControl: true,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "poi",
                stylers: [{ visibility: "off" }],
            },
            {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [{ visibility: "on" }, { color: "#263c3f" }],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }],
            },
            {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#212a37" }],
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#9ca5b3" }],
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [{ color: "#746855" }],
            },
            {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [{ color: "#1f2835" }],
            },
            {
                featureType: "road.highway",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
            },
            {
                featureType: "transit",
                elementType: "geometry",
                stylers: [{ color: "#2f3948" }],
            },
            {
                featureType: "transit.station",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }],
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#515c6d" }],
            },
            {
                featureType: "water",
                elementType: "labels.text.stroke",
                stylers: [{ color: "#17263c" }],
            },
        ]
    };

    map = new google.maps.Map(document.getElementById("map"), mapOptions);

    // Initialize the line connecting the markers
    routePath = new google.maps.Polyline({
        path: waypoints,
        geodesic: true,
        strokeColor: "#3b82f6", // Matches app accent
        strokeOpacity: 0.8,
        strokeWeight: 4,
    });

    routePath.setMap(map);

    // Initialize places service
    const placesService = new google.maps.places.PlacesService(map);

    // Listen to Map Clicks
    map.addListener("click", (e) => {
        if (e.placeId) {
            e.stop(); // Prevent default info window from Google Maps
            fetchAndShowDetails(e.placeId, { name: "Selected Place", geometry: { location: e.latLng } });
        }
    });


    zoomIndicator.textContent = `Zoom: ${map.getZoom()}`;

    // Toggle labels based on zoom level
    map.addListener("zoom_changed", () => {
        const currentZoom = map.getZoom();
        zoomIndicator.textContent = `Zoom: ${currentZoom}`;
        const showLabel = currentZoom >= 17;
        topPlacesMarkers.forEach(marker => {
            if (showLabel) {
                marker.setLabel({
                    text: marker.placeInfoText,
                    color: "#f8fafc",
                    fontSize: "12px",
                    fontWeight: "600",
                    className: "map-place-label"
                });
            } else {
                marker.setLabel(null);
            }
        });
    });

    updateUI();
}

// Logic to add a location point
function addPoint(latLng, placeName) {
    const pointIdx = waypoints.length + 1;

    // Add Marker
    const marker = new google.maps.Marker({
        position: latLng,
        map: map,
        label: {
            text: pointIdx.toString(),
            color: "white",
            fontWeight: "bold",
            fontSize: "14px",
        },
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
            scale: 14 // size of the circle
        },
        animation: google.maps.Animation.DROP
    });

    // Save to our collections
    markers.push(marker);
    waypoints.push(latLng);
    waypointNames.push(placeName || formatCoords(latLng.lat(), latLng.lng()));

    // Update Polyline
    routePath.setPath(waypoints);

    // Update Sidebar
    updateUI();
}

function clearMap() {
    // Remove markers from map
    markers.forEach(marker => marker.setMap(null));

    // Reset collections
    markers = [];
    waypoints = [];
    waypointNames = [];

    // Clear Polyline
    if (routePath) {
        routePath.setPath(waypoints);
    }

    // Update Sidebar
    updateUI();
}

function formatCoords(lat, lng) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function updateUI() {
    clearBtn.disabled = waypoints.length === 0;

    waypointsList.innerHTML = '';

    if (waypoints.length === 0) {
        waypointsList.innerHTML = `<li class="empty-state">Click on the map to add your first point.</li>`;
        return;
    }

    waypoints.forEach((latLng, i) => {
        const li = document.createElement('li');
        li.className = 'waypoint-item';

        li.innerHTML = `
            <div class="waypoint-number">${i + 1}</div>
            <div class="waypoint-info">
                <div class="waypoint-coords" style="font-weight: 600; font-size: 0.95rem; margin-bottom: 2px;">
                    ${waypointNames[i]}
                </div>
                <div class="waypoint-coords" style="color: var(--text-secondary); font-size: 0.75rem;">
                    ${formatCoords(latLng.lat(), latLng.lng())}
                </div>
            </div>
        `;
        waypointsList.appendChild(li);
    });

    // Auto-scroll to bottom of list
    const container = document.querySelector('.waypoints-container');
    container.scrollTop = container.scrollHeight;
}

// Event Listeners
clearBtn.addEventListener('click', clearMap);

// Function to fetch highly rated places in current viewport
function fetchTopPlaces() {
    const originalBounds = map.getBounds();
    if (!originalBounds) return;

    const ne = originalBounds.getNorthEast();
    const sw = originalBounds.getSouthWest();
    const centerLat = map.getCenter().lat();

    // ~1KM in degrees latitude
    const latOffset = 0.009;
    // ~1KM in degrees longitude (adjusting for earth's curvature based on current latitude)
    const lngOffset = Math.abs(0.009 / Math.cos(centerLat * Math.PI / 180));

    // Construct a new expanded bounds object
    const expandedBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(sw.lat() - latOffset, sw.lng() - lngOffset),
        new google.maps.LatLng(ne.lat() + latOffset, ne.lng() + lngOffset)
    );

    const requestLodging = { bounds: expandedBounds, type: 'lodging' };
    const requestRestaurants = { bounds: expandedBounds, type: 'restaurant' };
    const placesService = new google.maps.places.PlacesService(map);

    placesService.nearbySearch(requestLodging, handlePlacesResult);
    placesService.nearbySearch(requestRestaurants, handlePlacesResult);
}

function handlePlacesResult(results, status, pagination) {
    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        results.forEach(place => {
            if (place.rating && place.rating >= 4.0 && place.user_ratings_total && place.user_ratings_total >= 500) {
                if (!discoveredPlaces.has(place.place_id)) {
                    discoveredPlaces.add(place.place_id);
                    createPlaceMarker(place);
                }
            }
        });

        // Automatically load deeper results to prevent skipped places (Gmaps returns max 20 per page)
        if (pagination && pagination.hasNextPage) {
            setTimeout(() => {
                pagination.nextPage();
            }, 2000);
        }
    }
}

function createPlaceMarker(place) {
    const showLabel = map.getZoom() >= 17;
    const infoText = `${place.name} (⭐ ${place.rating ? Number(place.rating).toFixed(1) : "0.0"} / 리뷰 ${place.user_ratings_total || 0}개)`;

    const isRestaurant = place.types && place.types.includes('restaurant');
    const reviewCount = place.user_ratings_total || 500;
    
    // Calculate a dynamic scale: Base 1.0, increases with log of review count
    const dynamicScale = Math.max(1.0, 1.0 + Math.log10(reviewCount / 500) * 0.4);

    // Dynamic Color representing rating (4.0 ~ 5.0) => (Blue ~ Pink ~ Red) -> HSL Hue (240 ~ 360)
    const baseRating = Math.max(4.0, Math.min(5.0, place.rating || 4.0));
    const ratingHue = 240 + (baseRating - 4.0) * 120;
    const dynamicColor = `hsl(${ratingHue}, 100%, 65%)`;

    // Bed (Hotel/Lodging) SVG path
    let svgPath = 'M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z';
    // Fork and Knife (Restaurant) SVG path
    if (isRestaurant) {
        svgPath = 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z';
    }

    const marker = new google.maps.Marker({
        position: place.geometry.location,
        map: map,
        title: infoText,
        icon: {
            path: svgPath,
            fillColor: dynamicColor,
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: "#0f172a",
            scale: dynamicScale,
            anchor: new google.maps.Point(12, 12)
        },
        label: showLabel ? {
            text: infoText,
            color: "#f8fafc",
            fontSize: "12px",
            fontWeight: "600",
            className: "map-place-label"
        } : null
    });

    marker.placeInfoText = infoText;
    topPlacesMarkers.push(marker);

    marker.addListener("mouseover", () => {
        hoverTimer = setTimeout(() => {
            fetchAndShowDetails(place.place_id, place);
        }, 2000);
    });

    marker.addListener("mouseout", () => {
        clearTimeout(hoverTimer);
    });

    marker.addListener("click", () => {
        clearTimeout(hoverTimer);
        fetchAndShowDetails(place.place_id, place);
    });
}

function fetchAndShowDetails(placeId, basicPlace) {
    const placesService = new google.maps.places.PlacesService(map);
    placesService.getDetails({
        placeId: placeId,
        fields: ['name', 'rating', 'user_ratings_total', 'formatted_address', 'photos', 'reviews', 'geometry']
    }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            currentPlaceForDetails = place;
            renderDetailsPanel(place);
        } else {
            currentPlaceForDetails = basicPlace;
            renderDetailsPanel(basicPlace);
        }
    });
}

function renderDetailsPanel(place) {
    dpTitle.textContent = place.name || "Unknown Place";
    dpRating.textContent = `⭐ ${place.rating ? Number(place.rating).toFixed(1) : "0.0"} (${place.user_ratings_total || 0})`;
    dpAddress.textContent = place.formatted_address || "주소 정보 없음";
    
    // Photos
    dpPhotos.innerHTML = '';
    dpPhotos.scrollLeft = 0;
    if (place.photos && place.photos.length > 0) {
        if (place.photos.length <= 1) {
            prevPhotoBtn.style.display = 'none';
            nextPhotoBtn.style.display = 'none';
        } else {
            prevPhotoBtn.style.display = 'flex';
            nextPhotoBtn.style.display = 'flex';
            // Reset opacity/pointer overrides, then set initial visibility
            prevPhotoBtn.style.opacity = '0';
            prevPhotoBtn.style.pointerEvents = 'none';
            nextPhotoBtn.style.opacity = '';
            nextPhotoBtn.style.pointerEvents = '';
        }
        place.photos.forEach(photoObj => {
            const imgUrl = photoObj.getUrl({ maxWidth: 400, maxHeight: 300 });
            const img = document.createElement('img');
            img.className = 'dp-photo-card';
            img.src = imgUrl;
            dpPhotos.appendChild(img);
        });
    } else {
        prevPhotoBtn.style.display = 'none';
        nextPhotoBtn.style.display = 'none';
        dpPhotos.innerHTML = '<span style="color:var(--text-secondary); font-size:0.85rem">사진이 없습니다.</span>';
    }

    // Reviews
    dpReviews.innerHTML = '';
    if (place.reviews && place.reviews.length > 0) {
        place.reviews.forEach(review => {
            const div = document.createElement('div');
            div.className = 'review-item';
            div.innerHTML = `
                <div class="reviewer-name">${review.author_name}</div>
                <div class="review-rating">⭐ ${review.rating ? Number(review.rating).toFixed(1) : "0.0"}</div>
                <div class="review-text">${review.text}</div>
            `;
            dpReviews.appendChild(div);
        });
    } else {
        dpReviews.innerHTML = '<span style="color:var(--text-secondary); font-size:0.85rem">리뷰가 없습니다.</span>';
    }

    detailsPanel.classList.remove('hidden');
}

// Side Panel Event Listeners
closeDpBtn.addEventListener('click', () => {
    detailsPanel.classList.add('hidden');
});

addRouteBtn.addEventListener('click', () => {
    if (currentPlaceForDetails) {
        addPoint(currentPlaceForDetails.geometry.location, currentPlaceForDetails.name);
        detailsPanel.classList.add('hidden');
    }
});

loadDataBtn.addEventListener('click', () => {
    if (map && map.getZoom() < 13) {
        alert("지도를 좀 더 확대해 주세요. (줌 레벨 13 이상에서 검색 가능)");
        return;
    }
    const originalText = loadDataBtn.textContent;
    loadDataBtn.textContent = '검색 중...';
    fetchTopPlaces();
    setTimeout(() => {
        loadDataBtn.textContent = originalText;
    }, 600); // Visual feedback
});

function getCenteredPhotoIndex() {
    const cards = Array.from(dpPhotos.querySelectorAll('.dp-photo-card'));
    if (!cards.length) return 0;

    const containerRect = dpPhotos.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIndex = 0;
    let minDiff = Infinity;

    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const diff = Math.abs(cardCenter - containerCenter);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = index;
        }
    });
    return closestIndex;
}

function updateNavBtnVisibility() {
    const cards = dpPhotos.querySelectorAll('.dp-photo-card');
    if (!cards.length) return;
    const currentIndex = getCenteredPhotoIndex();
    // Hide prev button on first photo
    prevPhotoBtn.style.opacity = currentIndex === 0 ? '0' : '';
    prevPhotoBtn.style.pointerEvents = currentIndex === 0 ? 'none' : '';
    // Hide next button on last photo
    nextPhotoBtn.style.opacity = currentIndex === cards.length - 1 ? '0' : '';
    nextPhotoBtn.style.pointerEvents = currentIndex === cards.length - 1 ? 'none' : '';
}

// Update button visibility on scroll (with small debounce so it fires after smooth scroll settles)
let navScrollTimer = null;
dpPhotos.addEventListener('scroll', () => {
    clearTimeout(navScrollTimer);
    navScrollTimer = setTimeout(updateNavBtnVisibility, 80);
});

prevPhotoBtn.addEventListener('click', () => {
    const cards = dpPhotos.querySelectorAll('.dp-photo-card');
    if (!cards.length) return;
    const currentIndex = getCenteredPhotoIndex();
    if (currentIndex > 0) {
        cards[currentIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
});

nextPhotoBtn.addEventListener('click', () => {
    const cards = dpPhotos.querySelectorAll('.dp-photo-card');
    if (!cards.length) return;
    const currentIndex = getCenteredPhotoIndex();
    if (currentIndex < cards.length - 1) {
        cards[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
});

// Expose initMap for the API callback
window.initMap = initMap;
