$(document).ready(function(){
  var audio;
  var biquadFilter;
  var clientParameter = "client_id=033e31e2d036e02f39242e1aa1dd2fa9";

  //Put Soundcloud permalink here
  var trackPermalinkUrl = "https://soundcloud.com/imsamme/marshmello-alone-samme-remix";

  //Get Audio element
  audio = document.getElementById("theSong");
  audio.crossOrigin = "anonymous";


  $.get('http://api.soundcloud.com/resolve.json?url=' + trackPermalinkUrl + '&' + clientParameter)
  .then(function(data){
    audio.src = data.stream_url + '?' + clientParameter;
    //Here we get all the stuff
    var audioContext = new AudioContext();
    var request = new XMLHttpRequest();
    request.open('GET', data.stream_url + '?' + clientParameter, true);
    request.responseType = 'arraybuffer';
    request.onload = function(){
      var bufferArray = request.response;
      var byteArray = new Uint8Array(bufferArray);
      var songDurationInSamples = 44100 * audio.duration;
      //create offline to do the whole song
      var offlineContext = new OfflineAudioContext(1, songDurationInSamples , 44100) || new webkitOfflineAudioContext(1, 2, 44100);
      offlineContext.decodeAudioData(bufferArray, function(buffer){
        //buffer source
        var source = offlineContext.createBufferSource();
        source.buffer = buffer;

        //filter
        var filter = offlineContext.createBiquadFilter();
        filter.type = "lowpass";
        //Good frequency for detecting kick punch and blocking out other peaks
        filter.frequency.value = 211;
        //Read up on Q values in filters if you're unsure what this does.  Also check out the codepen link in the ReadMe
        filter.Q.value = 15;

        //song goes into filter
        source.connect(filter);
        filter.connect(offlineContext.destination);

        //start song at 0
        source.start(0);

        // Render the song
        offlineContext.startRendering();

        // Act on the result
        offlineContext.oncomplete = function(e) {
          // Filtered buffer!
          var filteredBuffer = e.renderedBuffer;
          var threshold = 0.98;
          //pcmArray is all frequency data for each sample frame
          var pcmArray = filteredBuffer.getChannelData(0);
          var peaksArr = getPeaksAtThreshold(pcmArray, threshold);
          var timeBetweenPeaks = durationBetweenPeaks(peaksArr, filteredBuffer);
          var timeBetweenPeaksInSeconds = peakDurationInSeconds(timeBetweenPeaks, filteredBuffer);
          var avgTime = getAvgTime(timeBetweenPeaksInSeconds);
          var bpm = returnBPM(avgTime);
          console.log(bpm);
        };
      });
    };
    request.send();
  });

  function getPeaksAtThreshold(dataArr, threshold){
    var arr = [];
    for(var i = 0; i < dataArr.length;){
      if(dataArr[i] > threshold){
        arr.push(i);
        i += 10000;
      }
      i++;
    }
    return arr;
  }

  function durationBetweenPeaks(peaksArr, buffer){
    var arr = [];
    for(var i=0; i<peaksArr.length; i++){
      if(peaksArr[i + 1]){
        var timeDiff = peaksArr[i + 1] - peaksArr[i];
        arr.push(timeDiff);
      }
    }
    return arr;
  }

  function peakDurationInSeconds(durationArr, buffer){
    var lengthOfBufferIndex = buffer.duration / buffer.length;
    var arr = [];
    durationArr.forEach(function(timeDiff){
      var timeInSeconds = timeDiff * lengthOfBufferIndex;
      arr.push(timeInSeconds);
    });
    return arr;
  }

  function getAvgTime(arr){
    var intervals = [];
    //closeness of neighbors
    var threshold = 0.02;
    arr.forEach(function(peak, index){
      var counter = 0;
      for(var i=0; i < 10; i++){
        //if neighbors are close we have a "true peak"
        if(arr[index + i] - arr[index] < threshold){
          counter ++;
        }
      }
      //9 is the threshold for true peaks
      if(counter > 9){
        //rounded for convenience and matching sake
        var rounded = peak.toFixed(3);
        var foundInterval = false;
        //look to see if that interval already exists
        intervals.forEach(function(obj){
          if(obj.interval === rounded){
            foundInterval = true;
            //increase object count if we already have that interval in the array
            return obj.count++;
          }
        });
        //no interval, create ne interval obj.
        if(!foundInterval && rounded < 1){
          intervals.push({
            interval: rounded,
            count: 1
          });
        }
      }
    });
    //sort so the highest counts are at the end
    intervals.sort(function(a, b){
      return a.count - b.count;
    });
    return intervals;
  }

  function returnBPM(arr){
    var bpmArr = [];
    //min number of count in arr obj
    var threshold = 6;
    //only go through last three objects (greatest counts)
    for (var i = arr.length - 1; i > arr.length - 4; i--) {
      if(arr[i].count > threshold){
        //bpm is 60 seconds / the highest interval thresholds.
        var bpm = 60 / arr[i].interval;
        //focus on electronic higher bpm measures. a lot of DnB and stuff will report half measures
        if(bpm <= 85){
          bpm = bpm * 2;
        }
        bpm = Math.round(bpm);
        bpmArr.push(bpm);
      }
    }
    //bpm will have three indexes with the three most likely bpms
    return bpmArr[0];
  }
});
