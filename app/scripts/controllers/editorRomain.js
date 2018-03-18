'use strict';

var mapModule = angular.module('mapEditor');


mapModule.controller('RomainEditorCtrl', ["$scope", "leafletData","$http", function($scope, leafletData, $http) {

	var userId = "5741a1fb976d3a3d6b54d000";
	var cpt = 0;
	var socket = io.connect('http://localhost:3000');
	socket.emit('get user map' , userId, "BaladeGroumande")

	var drawnItems = new L.FeatureGroup();

	angular.extend($scope, {
		savedItems:[],
		center: {
			lat: 46.833056,
			lng: 6.65,
			zoom: 13
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

	leafletData.getMap().then(function(map) {


		L.AwesomeMarkers.Icon.prototype.options.prefix = 'ion';
		var featureGroup = L.featureGroup().addTo(map);


		socket.on('map',function(userMap){

			//console.log(userMap.saveMap);

			var geojson = userMap.saveMap[0].items;
			
			var geojsonLayer = L.geoJson(geojson, {

					// pointToLayer: function(feature, latlng) {
					// 	return new L.CircleMarker(latlng, {radius: 10, fillOpacity: 0.85});
					// },
					onEachFeature: function (feature, layer) {
						if(feature.geometry.type == "Point"){
							var popupContent =  '<strong>' + feature.properties.title + '</strong><dl><dd>' + feature.properties.message + '<dd></dl>'
							layer.bindPopup(popupContent);
							var markerStyle = {
								icon: feature.properties.icon,
								markerColor: feature.properties.markerColor};

								layer.setIcon(L.AwesomeMarkers.icon(markerStyle));
							}

							if(feature.geometry.type == "LineString"){
								layer.setStyle({
									"color": "#e049e3", //#e049e3 #ff7800
									"weight": 3.5,
									"opacity": 0.8
								});

								layer.bindLabel(feature.properties.distance + 'km');
							}

							featureGroup.addLayer(layer);

							var m = layer.toGeoJSON();
							delete m._id;
							delete m.__v;
							m.properties.id = layer._leaflet_id;
							console.log(m);
							$scope.savedItems.push(m);

						}
					});
			
			map.addLayer(geojsonLayer);
			
		})

		var drawControl = new L.Control.Draw({
			edit: {
				featureGroup: featureGroup
			},
			draw: {
				polygon: false,
				polyline: {
					shapeOptions: {
						color: '#d907ea',
						opacity: 0.7
					}
				},
				rectangle: false,
				circle: false,
				marker: true
			}
		}).addTo(map);


		$scope.$watch('radioMarkersChoice', function() {
			//console.log($scope.radioMarkersChoice)
		}, true);


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



		map.on('draw:drawstart', function(e) {

			$scope.radioMarkersChoice = $scope.markersStyle.wine;
			$scope.marker = {};
			var type = e.layerType,
			layer = e.layer;
			if (type === 'marker') {
				$scope.showNewMarker = true;
			}
		});

		map.on('draw:created', drawCreated);
		map.on('draw:edited', drawEdited);
		map.on('draw:deleted', drawDeleted);

		function drawCreated(e) {

			var type = e.layerType,
			layer = e.layer;

			$scope.newMarker = e.layer.toGeoJSON();

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
				$.each(e.layer._latlngs, function(i, latlng) {
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
			socket.emit('itemsToSave', $scope.savedItems);

			//	console.log($scope.savedItems)
			//featureGroup.clearLayers(); // Ca empeche de modifier le groupe de item créée

			//console.log(JSON.stringify($scope.newMarker)); 

		}


		function drawEdited(e) {
						var layers = e.layers;
			layers.eachLayer(function(layer) {
				angular.forEach($scope.savedItems, function(value, key) {
					if (value.properties.id == layer._leaflet_id){
						value.geometry = layer.toGeoJSON().geometry;
						
						if(value.geometry.type == "LineString"){
							console.log("oui");
							var tempLatLng = null;
							var totalDistance = 0.00000;
							$.each(layer._latlngs, function(i, latlng) {
								if (tempLatLng == null) {
									tempLatLng = latlng;
									return;
								}
								totalDistance += tempLatLng.distanceTo(latlng);
								tempLatLng = latlng;
							});
							$scope.lineDistance = totalDistance;
							layer.bindLabel((totalDistance / 1000).toFixed(3) + 'km');
							value.properties.distance = (totalDistance / 1000).toFixed(3);
						}
					}
				})
			});	
			socket.emit('itemsToSave', $scope.savedItems);
		};

		function drawDeleted(e) {
			var layers = e.layers;
			layers.eachLayer(function(layer) {
				angular.forEach($scope.savedItems, function(value, key) {
					if (value.properties.id == layer._leaflet_id){
						$scope.savedItems.splice(key, 1);
					}
				})
			});	
			console.log($scope.savedItems);
			socket.emit('itemsToSave', $scope.savedItems);
		};

		leafletData.getLayers().then(function(baselayers) {
			var drawnItems = baselayers.overlays.draw;
			map.on('draw:created', function(e) {
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