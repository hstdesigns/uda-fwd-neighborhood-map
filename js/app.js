/* app.js
 *
 * This is our RSS feed reader application. It uses the Google
 * Feed Reader API to grab RSS feeds as JSON object we can make
 * use of. It also uses the Handlebars templating library and
 * jQuery.
 */

var map = null;
var activeMarkerAnimation = null;
var activeInfoWindow = null;

var pd = null;

function flickrPhotosSearchByLoc(lat, lon) {
    const flickrAPI = 'https://api.flickr.com/services/rest/?';
    const flickrAPIKey = '963d289f2c6ed67bbd7be859ff3e090c';

    $.getJSON(flickrAPI, {
        method: 'flickr.photos.search',
        api_key: flickrAPIKey,
        accuracy: 16,
        lat: lat,
        lon: lon,
        radius: 1,
        per_page: 10,
        extras: 'url_m',
        format: 'json',
        nojsoncallback: 1
    }).done(function (data) {
        console.log(data);

    }).fail(function () {
        console.log('flickrPhotosSearchByLoc: error');
    });
}

function MapsData(place) {
    var self = this;
    self.lat = place.geometry.location.lat();
    self.lng = place.geometry.location.lng();
    self.name = place.name;
    self.place_id = place.place_id;

    self.imgurl = "test";

    self.place = place;

    self.marker = new google.maps.Marker({
        map: map,
        draggable: false,
        animation: google.maps.Animation.DROP,
        position: place.geometry.location,
        title: place.name
    });

    self.marker.addListener('click', function () {
        if (activeMarkerAnimation)
            activeMarkerAnimation.setAnimation(null);

        this.setAnimation(google.maps.Animation.BOUNCE);
        activeMarkerAnimation = this;
    });


    self.infoWindowContentString = function () {
        const contentString = '<div id="content">' +
            '<div id="siteNotice">' +
            '</div>' +
            '<h1 id="firstHeading" class="firstHeading">' + self.name + '</h1>' +
            '<div id="bodyContent">' +
            '<p><b>' + self.name + '</b>, also referred to as <b>Ayers Rock</b>, is a large ' +
            '<img src="$imgsrc">' +
            '</div>';

        return contentString.replace('$imgsrc', self.imgurl);
    }

    self.marker.addListener('click', function () {
        activeInfoWindow && activeInfoWindow.close();

        var infoWindow = new google.maps.InfoWindow({
            content: self.infoWindowContentString()
        });

        infoWindow.open(map, self.marker);
        activeInfoWindow = infoWindow;
    });
}

function myController() {
    var self = this;
    self.listMapsData = ko.observableArray();

    self.searchfilter = ko.observable('');

    self.addMapsData = function (place) {
        self.listMapsData.push(new MapsData(place));
    }

    self.filteredItems = ko.computed(function () {
        var filter = self.searchfilter().toLowerCase();

        for (var i = 0; i < self.listMapsData().length; i++) {
            self.listMapsData()[i].marker.setMap(null);
        }

        var filtered = self.listMapsData();

        if (filter) {
            var filtered = ko.utils.arrayFilter(self.listMapsData(), function (item) {
                return (item.name.toLowerCase().indexOf(filter) > -1);
            });
        }

        for (var i = 0; i < filtered.length; i++) {
            filtered[i].marker.setMap(map);
        }

        return filtered;
    })

    self.clickItem = function (item) {
        google.maps.event.trigger(item.marker, 'click');
    }

    self.updateInfoWindowContentString = function () {
        const flickrAPI = 'https://api.flickr.com/services/rest/?';
        const flickrAPIKey = '963d289f2c6ed67bbd7be859ff3e090c';

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
                console.log(data);
                //console.log(obj);
                //obj.imgurl = data.photos.photo[0].url_s;

                if (data.code && data.code != 0) {
                    var err = 'stat: ' + data.stat + '\rcode: ' + data.code + '\rmessage' + data.message;
                    console.log(err);
                    alert(err);
                    return;
                }

                for (var i = 0; i < vModel.listMapsData().length; i++) {
                    vModel.listMapsData()[i].imgurl = data.photos.photo[i].url_s;
                }

            }).fail(function () {
                var err = 'GetFlickrImage API Error!';
                console.log(err);
                alert(err);
            });
        }

        getFlickrImage(self.listMapsData()[0]);
        /*
        for (var i = 0; i < self.listMapsData().length; i++) {
            new getFlickrImage(self.listMapsData()[i]);
        }
        */
    }
}

var vModel = new myController();
ko.applyBindings(vModel);

function initMap() {
    const maxPlaces = 5;
    var locBerlin = new google.maps.LatLng(52.509699, 13.467407);

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
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < maxPlaces; i++) {
                place = results[i];

                vModel.addMapsData(place);
                pd = place;
            }
            console.log('start ajax request...');
            vModel.updateInfoWindowContentString();
            console.log('stop ajax request...');
            console.log(vModel.listMapsData()[0].name);
        }
    });
}

/* All of this functionality is heavily reliant upon the DOM, so we
 * place our code in the $() function to ensure it doesn't execute
 * until the DOM is ready.
 */
$(function () {
    //ko.applyBindings(new WebmailViewModel());

    //console.log(viewModel.pps()[0].name);
}());
