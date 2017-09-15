/* app.js
 *
 * This is my Neighborhood Map application. It uses the Google
 * Maps API to grab local information as JSON object we can make
 * use of. It also uses jQuery.
 */

// global vars
var map = null;
var activeMarkerAnimation = null;
var activeInfoWindow = null;

// class for marker information
function MapsData(place) {
    var self = this;

    // some vars
    self.lat = place.geometry.location.lat();
    self.lng = place.geometry.location.lng();
    self.name = place.name;
    self.street = place.vicinity;
    self.place_id = place.place_id;
    self.imgurl = "test";
    self.place = place;

    // create marker
    self.marker = new google.maps.Marker({
        map: map,
        draggable: false,
        animation: google.maps.Animation.DROP,
        position: place.geometry.location,
        title: place.name
    });

    // add event listener for marker animation
    self.marker.addListener('click', function () {
        // a little trick to work with scopes
        activeMarkerAnimation && activeMarkerAnimation.setAnimation(null);

        this.setAnimation(google.maps.Animation.BOUNCE);
        activeMarkerAnimation = this;
    });

    // template for the marker info window
    self.infoWindowContentString = function () {
        var contentString = '<div id="content">' +
            '<div id="siteNotice">' +
            '</div>' +
            '<h1 id="firstHeading" class="firstHeading">' + self.name + '</h1>' +
            '<div id="bodyContent">' +
            '<p>Street: <b>' + self.street + '</b>' +
            '<p>Flickr API - Sample Image by Location:</p>' +
            '<img src="$imgsrc">' +
            '</div>';

        return contentString.replace('$imgsrc', self.imgurl);
    };

    // add event listener for open the info window
    self.marker.addListener('click', function () {
        // a little trick to work with scopes
        activeInfoWindow && activeInfoWindow.close();

        var infoWindow = new google.maps.InfoWindow({
            content: self.infoWindowContentString()
        });

        infoWindow.open(map, self.marker);
        activeInfoWindow = infoWindow;
    });
}

// here comes the MVC pattern
function viewModel() {
    var self = this;
    self.listMapsData = ko.observableArray();
    self.searchfilter = ko.observable('');

    self.addMapsData = function (place) {
        self.listMapsData.push(new MapsData(place));
    };

    // filter the items, when I type some text in the searchbar
    self.filteredItems = ko.computed(function () {
        var filter = self.searchfilter().toLowerCase();
        var i = 0;

        // clear all active markers
        for (i = 0; i < self.listMapsData().length; i++) {
            self.listMapsData()[i].marker.setMap(null);
        }

        var filtered = self.listMapsData();

        // if the searchbox.text.length != 0 --> filter the items
        if (filter) {
            filtered = ko.utils.arrayFilter(self.listMapsData(), function (item) {
                return (item.name.toLowerCase().indexOf(filter) > -1);
            });
        }

        for (i = 0; i < filtered.length; i++) {
            filtered[i].marker.setMap(map);
        }

        return filtered;
    });

    // click on the searchitem-menu
    self.clickItem = function (item) {
        google.maps.event.trigger(item.marker, 'click');
    };

    // get some sample images from flickr
    self.updateInfoWindowContentString = function () {
        var flickrAPI = 'https://api.flickr.com/services/rest/?';
        var flickrAPIKey = '963d289f2c6ed67bbd7be859ff3e090c';

        // make a request
        function getFlickrImage(obj) {
            $.getJSON(flickrAPI, {
                method: 'flickr.photos.search',
                api_key: flickrAPIKey,
                accuracy: 16,
                lat: obj.lat,
                lon: obj.lng,
                radius: 1,
                per_page: 10,
                extras: 'url_s',
                format: 'json',
                nojsoncallback: 1
            }).done(function (data) {

                if (data.code && data.code !== 0) {
                    var err = 'stat: ' + data.stat + '\rcode: ' + data.code + '\rmessage' + data.message;
                    console.log(err);
                    alert(err);
                    return;
                }

                var i = 0;
                // update the image urls -> used for the marker info window
                for (i = 0; i < viewModel.listMapsData().length; i++) {
                    viewModel.listMapsData()[i].imgurl = data.photos.photo[i].url_s;
                }

            }).fail(function () {
                var err = 'GetFlickrImage API Error!';
                console.log(err);
                alert(err);
            });
        }

        // hmmm. maybe not the best solution... but it works.
        getFlickrImage(self.listMapsData()[0]);

        /*
        for (var i = 0; i < self.listMapsData().length; i++) {
            new getFlickrImage(self.listMapsData()[i]);
        }
        */
    };
}

var viewModel = new viewModel(); // create instance
ko.applyBindings(viewModel); // bind all

// the google maps init function --> called from the script
function initMap() {
    // hard coded
    var maxPlaces = 6;
    // lat and long hard coded for berlin
    var locBerlin = new google.maps.LatLng(52.5175304, 13.4012768);

    map = new google.maps.Map(document.getElementById('map'), {
        center: locBerlin,
        zoom: 15,
        scrollwheel: false
    });

    // Specify location, radius and place types for your Places API search.
    var request = {
        location: locBerlin,
        radius: '500',
        types: ['food']
    };

    // Create the PlaceService and send the request.
    // Handle the callback with an anonymous function.
    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            var i = 0;
            for (i = 0; i < maxPlaces; i++) {
                place = results[i];
                // fill the MVC with data
                viewModel.addMapsData(place);
            }
            // get the flickr api image urls and set the new info window content string
            viewModel.updateInfoWindowContentString();
        }
    });
}

/* All of this functionality is heavily reliant upon the DOM, so we
 * place our code in the $() function to ensure it doesn't execute
 * until the DOM is ready.
 */
$(function () {
    //console.log(viewModel.pps()[0].name);
}());
