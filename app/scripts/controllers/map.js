'use strict';



var mapModule = angular.module('mapEditor');


mapModule.controller('MapCtrl', ["$scope", "leafletData", "$http", function ($scope, leafletData, $http, $timeout) {

	$scope.userId = "5741973edcba0f4c11278925";
	var cpt = 0;
	console.log("hostname : " + window.location.hostname);
	var socket = io.connect(window.location.hostname);
	//var socket = io.connect("http://localhost:3000");
	socket.emit('get map', "BaladeGroumande")

	socket.on('getItems', function (message) {
		alert('Le serveur a un message pour vous : ' + message);
	})


	var drawnItems = new L.FeatureGroup();

	angular.extend($scope, {
		savedItems: [],
		defaults: {
			minZoom: 12,
		},
		center: {
			lat: 46.831,
			lng: 6.67,
			zoom: 14
		},

	 	maxbounds: {
			southWest: {
				lat: 46.90, // -> haut bas
				lng: 7 // gauche droite
			},
			northEast: {
				lat: 46.4,
				lng: 6.3
			} 

		},



		layers: {
			baselayers: {
				osm: {
					name: 'OpenStreetMap',
					url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
					type: 'xyz'
				},
				other: {
					name: 'Forêt',
					url: 'http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png',
					type: 'xyz'
				}
			},
			overlays: {
				draw: {
					name: 'draw',
					type: 'group',
					visible: true,
					layerParams: {
						showOnSelector: false
					}
				}
			}
		}
	});




	leafletData.getMap().then(function (map) {

		map.invalidateSize();
		L.AwesomeMarkers.Icon.prototype.options.prefix = 'ion';
		var featureGroup = L.featureGroup().addTo(map);

		$scope.markersStyle = {
			wine: {
				icon: 'ion-wineglass',
				markerColor: 'red'
			},
			parking: {
				icon: 'ion-model-s',
				markerColor: 'darkblue'

			},
			start: {
				icon: 'ion-flag',
				markerColor: 'green'

			},
			finish: {
				icon: 'ion-flag',
				markerColor: 'orange'
			}

		}

		socket.on('map', function (userMap) {

			console.log(userMap.saveMap);

			var geojson = userMap.saveMap[0].items;

			var geojsonLayer = L.geoJson(geojson, {

				// pointToLayer: function(feature, latlng) {
				// 	return new L.CircleMarker(latlng, {radius: 10, fillOpacity: 0.85});
				// },


				onEachFeature: function (feature, layer) {
					if (feature.geometry.type == "Point") {
						var popupContent = '<strong>' + (feature.properties.title ? feature.properties.title : "Poste") + '</strong><dl><dd>' +
							(feature.properties.message ? feature.properties.message : "") + '<dd></dl>';
						layer.bindPopup(popupContent);
						layer.on('mouseover', function (e) {
							this.openPopup();
						});
						layer.on('mouseout', function (e) {
							this.closePopup();
						});

						if (feature.properties.icon === "fa-number") {

							var markerStyle = {
								icon: feature.properties.icon,
								number: feature.properties.number,
								markerColor: feature.properties.markerColor,
							}

							layer.setIcon(L.ExtraMarkers.icon(markerStyle));
						} else {
							var markerStyle = {
								icon: feature.properties.icon,
								markerColor: feature.properties.markerColor
							};
							layer.setIcon(L.AwesomeMarkers.icon(markerStyle));
						}
					}

					if (feature.geometry.type == "LineString") {
						layer.setStyle({
							"color": "#0652DD", //#e049e3 #ff7800
							"weight": 5,
							"opacity": 0.8
						});

						layer.bindLabel(feature.properties.distance + 'km');
					}
				}


			});

			map.addLayer(geojsonLayer);
			map.fitBounds(geojsonLayer);
		})


		map.on('draw:drawstart', function (e) {

			$scope.radioMarkersChoice = $scope.markersStyle.wine;
			$scope.marker = {};
			var type = e.layerType,
				layer = e.layer;
			if (type === 'marker') {
				$scope.showNewMarker = true;
			}
		});

		map.on('draw:created', drawCreated);


		function drawCreated(e) {

			var type = e.layerType,
				layer = e.layer;

			$scope.newMarker = e.layer.toGeoJSON();
			$scope.marker.title = " ";
			$scope.marker.message = " ";
			if (type === 'marker') {
				//	console.log($scope.markerMsg);
				layer.setIcon(L.AwesomeMarkers.icon($scope.radioMarkersChoice));
				// layer.setIcon(L.icon({
				// 	// iconUrl: 'images/yeoman.png',
				// 	// iconRetinaUrl: 'my-icon@2x.png',
				// 	// iconSize: [38, 95],
				// 	// iconAnchor: [22, 94],
				// 	// popupAnchor: [-3, -76],
				// 	// shadowUrl: 'my-icon-shadow.png',
				// 	// shadowRetinaUrl: 'my-icon-shadow@2x.png',
				// 	// shadowSize: [68, 95],
				// 	// shadowAnchor: [22, 94]
				// }));
				layer.bindPopup("<strong>" + $scope.marker.title + "</strong><dl><dd>" + $scope.marker.message + "<dd></dl>");

				$scope.newMarker.properties = $scope.marker;
				angular.extend($scope.newMarker.properties, $scope.radioMarkersChoice)
			}

			if (type === 'polyline') {

				var tempLatLng = null;
				var totalDistance = 0.00000;
				$.each(e.layer._latlngs, function (i, latlng) {
					if (tempLatLng == null) {
						tempLatLng = latlng;
						return;
					}
					totalDistance += tempLatLng.distanceTo(latlng);
					tempLatLng = latlng;
				});

				$scope.lineDistance = totalDistance;
				layer.bindLabel((totalDistance / 1000).toFixed(3) + 'km');
				$scope.newMarker.properties.distance = (totalDistance / 1000).toFixed(3)
			}
			featureGroup.addLayer(e.layer);
			$scope.newMarker.properties.id = layer._leaflet_id;

			$scope.savedItems.push($scope.newMarker);
			console.log($scope.savedItems);
			socket.emit('itemsToSave', $scope.savedItems, $scope.userId);

			//	console.log($scope.savedItems)
			//featureGroup.clearLayers(); // Ca empeche de modifier le groupe de item créée

			//console.log(JSON.stringify($scope.newMarker)); 

		}



		leafletData.getLayers().then(function (baselayers) {
			var drawnItems = baselayers.overlays.draw;
			map.on('draw:created', function (e) {
				var layer = e.layer;
				drawnItems.addLayer(layer);
			});
		});
	});
}]);


//*** upload image ****///

// $scope.upload = function (dataUrl, name) {
// 	Upload.upload({
// 		url: 'https://angular-file-upload-cors-srv.appspot.com/upload',
// 		data: {
// 			file: Upload.dataUrltoBlob(dataUrl, name)
// 		},
// 	}).then(function (response) {
// 		$timeout(function () {
// 			$scope.result = response.data;
// 		});
// 	}, function (response) {
// 		if (response.status > 0) $scope.errorMsg = response.status 
// 			+ ': ' + response.data;
// 	}, function (evt) {
// 		$scope.progress = parseInt(100.0 * evt.loaded / evt.total);
// 	});
// }
