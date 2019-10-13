
var API_KEY = '2d9b9a711a304c99bb410a0156cfd5f2';

// This method adds the recorded audio to the page so you can listen to it
function addAudioPlayer(blob){
	var url = URL.createObjectURL(blob);
	var log = document.getElementById('log');

	var audio = document.querySelector('#replay');
	if (audio != null) {audio.parentNode.removeChild(audio);}

	audio = document.createElement('audio');
	audio.setAttribute('id','replay');
	audio.setAttribute('controls','controls');

	var source = document.createElement('source');
	source.src = url;

	audio.appendChild(source);
	log.parentNode.insertBefore(audio, log);
}

// Example phrases
var thingsToRead = [
	"Never gonna give you up\nNever gonna let you down\nNever gonna run around and desert you\nNever gonna make you cry\nNever gonna say goodbye\nNever gonna tell a lie and hurt you",
	"There's a voice that keeps on calling me\n	Down the road, that's where I'll always be.\n	Every stop I make, I make a new friend,\n	Can't stay for long, just turn around and I'm gone again\n	\n	Maybe tomorrow, I'll want to settle down,\n	Until tomorrow, I'll just keep moving on.\n	\n	Down this road that never seems to end,\n	Where new adventure lies just around the bend.\n	So if you want to join me for a while,\n	Just grab your hat, come travel light, that's hobo style.",
	"They're the world's most fearsome fighting team \n	They're heroes in a half-shell and they're green\n	When the evil Shredder attacks\n	These Turtle boys don't cut him no slack! \n	Teenage Mutant Ninja Turtles\nTeenage Mutant Ninja Turtles",
	"If you're seein' things runnin' thru your head \n	Who can you call (ghostbusters)\n	An' invisible man sleepin' in your bed \n	Oh who ya gonna call (ghostbusters) \nI ain't afraid a no ghost \n	I ain't afraid a no ghost \n	Who ya gonna call (ghostbusters) \n	If you're all alone pick up the phone \n	An call (ghostbusters)",
];

// vanilla javascript queystring management
// var qs = (function(a) {
//     if (a == "") return {};
//     var b = {};
//     for (var i = 0; i < a.length; ++i)
//     {
//         var p=a[i].split('=', 2);
//         if (p.length == 1)
//             b[p[0]] = "";
//         else
//             b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
//     }
//     return b;
// })(window.location.search.substr(1).split('&'));

// Get the Cognitive Services key from the querystring
// var key = qs['key'];

// Speaker Recognition API profile configuration - constructs to make management easier
var Profile = class { constructor (name, profileId) { this.name = name; this.profileId = profileId;}};
var profileIds = [];

(function () {
	// Cross browser sound recording using the web audio API
	navigator.getUserMedia = ( navigator.getUserMedia ||
							navigator.webkitGetUserMedia ||
							navigator.mozGetUserMedia ||
							navigator.msGetUserMedia);

	// Really easy way to dump the console logs to the page
	var old = console.log;
	var logger = document.getElementById('log');
	var isScrolledToBottom = logger.scrollHeight - logger.clientHeight <= logger.scrollTop + 1;

	console.log = function () {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == 'object') {
				logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(arguments[i], undefined, 2) : arguments[i]) + '<br />';
			} else {
				logger.innerHTML += arguments[i] + '<br />';
			}
			if(isScrolledToBottom) logger.scrollTop = logger.scrollHeight - logger.clientHeight;
		}
		old(...arguments);
	}
	console.error = console.log;
})();

function enrollNewProfile(){
    document.getElementById('log').innerHTML = '';
	navigator.getUserMedia({audio: true}, function(stream){
		console.log('I\'m listening... just start talking for a few seconds...');
		console.log('Maybe read this: \n' + thingsToRead[Math.floor(Math.random() * thingsToRead.length)]);
		onMediaSuccess(stream, createProfile, 15);
	}, onMediaError);
}

// createProfile calls the profile endpoint to get a profile Id, then calls enrollProfileAudio
function createProfile(blob){
	addAudioPlayer(blob);

	var create = 'https://westus.api.cognitive.microsoft.com/spid/v1.0/identificationProfiles';

	var request = new XMLHttpRequest();
	request.open("POST", create, true);

	request.setRequestHeader('Content-Type','application/json');
	request.setRequestHeader('Ocp-Apim-Subscription-Key', API_KEY);

	request.onload = function () {
		console.log('creating profile');
		console.log(request.responseText);

		var json = JSON.parse(request.responseText);
		var profileId = json.identificationProfileId;

		// Now we can enrol this profile using the profileId
		enrollProfileAudio(blob, profileId);
	};

	request.send(JSON.stringify({ 'locale' :'en-us'}));
}

// enrollProfileAudio enrolls the recorded audio with the new profile Id, polling the status
function enrollProfileAudio(blob, profileId){
  var enroll = 'https://westus.api.cognitive.microsoft.com/spid/v1.0/identificationProfiles/'+profileId+'/enroll?shortAudio=true';

  var request = new XMLHttpRequest();
  request.open("POST", enroll, true);

  request.setRequestHeader('Content-Type','multipart/form-data');
  request.setRequestHeader('Ocp-Apim-Subscription-Key', API_KEY);

  request.onload = function () {
  	console.log('enrolling');
	console.log(request.responseText);

	// The response contains a location to poll for status
    var location = request.getResponseHeader('Operation-Location');

	if (location!=null) {
		// ping that location to get the enrollment status
    	pollForEnrollment(location, profileId);
	} else {
		console.log('Ugh. I can\'t poll, it\'s all gone wrong.');
	}
  };

  request.send(blob);
}

// Ping the status endpoint to see if the enrollment for identification has completed
function pollForEnrollment(location, profileId){
	var enrolledInterval;

	// hit the endpoint every few seconds
	enrolledInterval = setInterval(function()
	{
		var request = new XMLHttpRequest();
		request.open("GET", location, true);

		request.setRequestHeader('Content-Type','multipart/form-data');
		request.setRequestHeader('Ocp-Apim-Subscription-Key', API_KEY);

		request.onload = function()
		{
			console.log('getting status');
			console.log(request.responseText);

			var json = JSON.parse(request.responseText);
			if (json.status == 'succeeded' && json.processingResult.enrollmentStatus == 'Enrolled')
			{
				// Woohoo! The audio was enrolled successfully!

				// stop polling
				clearInterval(enrolledInterval);
				console.log('enrollment complete!');

				// ask for a name to associated with the ID to make the identification nicer
				var name = window.prompt('Who was that talking?');
				// profileIds.push(new Profile(name, profileId));
				// console.log(profileId + ' is now mapped to ' + name);
				getJSON('http://127.0.0.1:8000/enroll_it/' +  name + ":" + profileId,  function(err, data) {

                    if (err != null) {
                        console.log(err);
                    } else {
                        var text = data.msg;
                        alert(text);
                        if (text.toLowerCase().includes('success'))
                            console.log('ID: \'' + profileId + '\' is now enrolled as Name: \'' + name + '\'');
                        else
                            console.log('ID: \'' + profileId + '\' cannot be enrolled as Name: \'' + name + '\'');
                    }
                });
				// scriptFunction(name + " : " + profileId)
			}
			else if(json.status == 'succeeded' && json.processingResult.remainingEnrollmentSpeechTime > 0) {
				// stop polling, the audio wasn't viable
				clearInterval(enrolledInterval);
				console.log('That audio wasn\'t long enough to use');
			}
			else
			{
				// keep polling
				console.log('Not done yet..');
			}
		};

		request.send();
	}, 1000);
}

// 2. Start the browser listening, listen for 10 seconds, pass the audio stream to "identifyProfile"
function startListeningForIdentification(){
    document.getElementById('log').innerHTML = '';
    console.log('I\'m listening... just start talking for a few seconds...');
    console.log('Maybe read this: \n' + thingsToRead[Math.floor(Math.random() * thingsToRead.length)]);
    navigator.getUserMedia({audio: true}, function(stream){onMediaSuccess(stream, identifyProfile, 10)}, onMediaError);
}

// 3. Take the audio and send it to the identification endpoint
function identifyProfile(blob){
	addAudioPlayer(blob);

	getJSON('http://127.0.0.1:8000/get_ids',  function(err, data) {

                    if (err != null) {
                        console.log(err);
                    } else {
                        // comma delimited list of profile IDs we're interested in comparing against
                        // var Ids = Array.from(data.ids).map(x => x.profileId).join();
                        var Ids = Array.from(data.ids)

                        var identify = 'https://westus.api.cognitive.microsoft.com/spid/v1.0/identify?identificationProfileIds='
                            + Ids
                            + '&shortAudio=true';

                        var request = new XMLHttpRequest();
                        request.open("POST", identify, true);

                        request.setRequestHeader('Content-Type','application/json');
                        request.setRequestHeader('Ocp-Apim-Subscription-Key', API_KEY);

                        request.onload = function () {
                            console.log('identifying profile');
                            console.log(request.responseText);

                            // The response contains a location to poll for status
                            var location = request.getResponseHeader('Operation-Location');

                            if (location!=null) {
                                // ping that location to get the identification status
                                pollForIdentification(location);
                            } else {
                                console.log('Ugh. I can\'t poll, it\'s all gone wrong.');
                            }
                        };

                        request.send(blob);
                    }
                });
}

// Ping the status endpoint to see if the identification has completed
function pollForIdentification(location){
	var identifiedInterval;

	// hit the endpoint every few seconds
	identifiedInterval = setInterval(function()
	{
		var request = new XMLHttpRequest();
		request.open("GET", location, true);

		request.setRequestHeader('Content-Type','multipart/form-data');
		request.setRequestHeader('Ocp-Apim-Subscription-Key', API_KEY);

		request.onload = function()
		{
			console.log('getting status');
			console.log(request.responseText);

			var json = JSON.parse(request.responseText);
			if (json.status == 'succeeded')
			{
				// Identification process has completed
				clearInterval(identifiedInterval);
				var speaker = profileIds.filter(function(p){return p.profileId == json.processingResult.identifiedProfileId});

				getJSON('http://127.0.0.1:8000/get_speaker/' + json.processingResult.identifiedProfileId,  function(err, data) {

                    if (err != null) {
                        console.log(err);
                    } else {
                        var speaker = data.speaker;
                        alert('\'' + speaker + '\' Was Talking!');
                        if (speaker != null && speaker.length > 0){
                            console.log('I think ' + speaker + ' was talking');
                        } else {
                            console.log('I couldn\'t tell who was talking. So embarrassing.');
                        }
                    }
                });
			}
			else
			{
				// Not done yet
				console.log('still thinking..');
				console.log(json);
			}
		};

		request.send();
	}, 500);
}

// function scriptFunction(myVariableToSend) {
//     var request = new XMLHttpRequest();
//     request.open('GET', 'http://127.0.0.1:8000/get_data/' + myVariableToSend, true);
//
//     request.onload = function() {
//       if (this.status >= 200 && this.status < 400) {
//         // Success!
//         // var data = JSON.parse(this.response);
//           window.alert(JSON.parse(this.response));
//       } else {
//         // We reached our target server, but it returned an error
//
//       }
//     };
//
//     request.onerror = function() {
//       // There was a connection error of some sort
//     };
//
//     request.send();
//     $.getJSON("http://127.0.0.1:8000/get_data/", myVariableToSend, function (serverdata) {
//         window.alert(serverdata);
//     });
// }

var getJSON = function(url, callback) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';

    xhr.onload = function() {

        var status = xhr.status;

        if (status == 200) {
            callback(null, xhr.response);
        } else {
            callback(status);
        }
    };

    xhr.send();
};