$(document).ready(function(){
  var audio;
  var biquadFilter;
  var clientParameter = "client_id=033e31e2d036e02f39242e1aa1dd2fa9";
  var trackPermalinkUrl = "https://soundcloud.com/harshrecordslabel/starx-kyoto-blarax-fvck-it-original-mix";

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
      var songDurationInSamples = 44100 * audio.duration;;
      //create offline to do the whole song
      var offlineContext = new OfflineAudioContext(1, songDurationInSamples , 44100) || new webkitOfflineAudioContext(1, 2, 44100);
      offlineContext.decodeAudioData(bufferArray, function(buffer){
        //buffer source
        var source = offlineContext.createBufferSource();
        source.buffer = buffer;

        //filter
        var filter = offlineContext.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 211;
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
          var threshold = 0.90;
          var pcmArray = filteredBuffer.getChannelData(0);
          do {
            var peaks = getPeaksAtThreshold(pcmArray, threshold)
            threshold -= 0.01;
          } while(peaks.length < 30 && threshold >= 0.3)
          console.log(threshold)
          var peaksArr = getPeaksAtThreshold(pcmArray, threshold);
          var timeBetweenPeaks = durationBetweenPeaks(peaksArr, filteredBuffer);
          var timeBetweenPeaksInSeconds = peakDurationInSeconds(timeBetweenPeaks, filteredBuffer);
          var avgTime = getAvgTime(timeBetweenPeaksInSeconds);
        };

        // console.log(buffer.getChannelData(0))

      });
    };
    request.send();
  });

  function getPeaksAtThreshold(dataArr, threshold){
    var arr = [];
    console.log(dataArr)
    var negativeThresh = threshold - 2;
    for(var i = 0; i < dataArr.length;){
      if(dataArr[i] > threshold || dataArr[i] < negativeThresh){
        arr.push(i);
        i += 10000;
      }
      i++;
    }
    console.log(arr);
    return arr;
  };

  function durationBetweenPeaks(peaksArr, buffer){
    var arr = [];
    for(var i=0; i<peaksArr.length; i++){
      if(peaksArr[i + 1]){
        var timeDiff = peaksArr[i + 1] - peaksArr[i];
        arr.push(timeDiff);
      }
    }
    return arr;
  };

  function peakDurationInSeconds(durationArr, buffer){
    var lengthOfBufferIndex = buffer.duration / buffer.length;
    var arr = [];
    durationArr.forEach(function(timeDiff){
      var timeInSeconds = timeDiff * lengthOfBufferIndex;
      arr.push(timeInSeconds);
    });
    return arr;
  };

  function getAvgTime(arr){
    var intervals = [];
    var threshold = 0.2;
    arr.forEach(function(peak, index){
      var counter = 0;
      for(var i=0; i < 10; i++){
        if(arr[index + i] - arr[index] < threshold){
          counter ++;
        }
      }
      if(counter > 8){
        var rounded = peak.toFixed(3);
        var foundInterval = false;
        intervals.forEach(function(obj){
          if(obj.interval == rounded){
            foundInterval = true;
            return obj.count++;
          }
        });
        if(!foundInterval && rounded < 1){
          intervals.push({
            interval: rounded,
            count: 1
          });
        }
      }
    });
    intervals.sort(function(a, b){
      return a.count - b.count;
    });
    console.log(intervals);
    return intervals;
  }
});
