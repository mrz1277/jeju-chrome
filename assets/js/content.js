/*  ==============================================================
 GA
 =============================================================== */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-62234040-2']);

(function() {
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = ('https:' == document.location.protocol || 'chrome-extension:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

_gaq.push(["_trackPageview"]);

/*  ==============================================================
 Util
 =============================================================== */

// Parse query parameters
var query = (function queryStringToJSON() {
  var pairs = location.search.slice(1).split('&');

  var result = {};
  pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
  });

  var json = JSON.parse(JSON.stringify(result));

  json.depCarrier = json.depFlight.substr(0, 2);
  json.retCarrier = json.retFlight.substr(0, 2);
  json.depClass = json.depFlight.substr(json.depFlight.length-1);
  json.retClass = json.retFlight.substr(json.retFlight.length-1);
  json.depFlight = json.depFlight.substring(0, json.depFlight.length-1);
  json.retFlight = json.retFlight.substring(0, json.retFlight.length-1);

  return json;
})();

// Get url path
var pathName = (function() {
  var l = document.createElement("a");
  l.href = location.href;
  return l.pathname;
})();

// from http://air.jejudo.com/
function GetSeatClass(carrierCode, bookingclass) {
  var strClass = "";
  switch (bookingclass) {
    case "Y":
      strClass = "일반석";
      break;
    case "E":
      strClass = "할인석";
      break;
    case "C":
      strClass = "비지니스";
      break;
    case "I":
      strClass = "일반석";   //에어부산
      break;
    default:
      strClass = "할인석";
      break;
  }
  if ((carrierCode == "7C") && (bookingclass != "Y")) {
    strClass = "할인석";
  }
  return strClass;
}


/*  ==============================================================
 Content Script
 =============================================================== */

if (pathName === '/' && !$.isEmptyObject(query)) {
  $('#sel_depcity').val(query.depCity);
  $('#dateDep').val(moment(query.depDate).format('YYYY-MM-DD'));
  $('#dateArr').val(moment(query.retDate).format('YYYY-MM-DD'));

  $('input:checkbox').each(function() {
    if ($(this).val() !== query.depCarrier && $(this).val() !== query.retCarrier) {
      $(this).removeAttr('checked');
    }
  });

  $('#searchAirList').click().on('click', function() {
    _gaq.push(['_trackEvent', 'book', 'search', 'air.jejudo.com']);
  });

  $('#realTimeLeftList').bind('DOMSubtreeModified', function() {
    // 지정된 항공편 이외에 최저가가 있는지 체크
    var minPrice = 200000;
    var minPriceInput = null;

    $(this).find('tbody tr').each(function(i) {
      var price = parseInt($(this).find('td.jd_real_content_4').text().replace(',', '').replace('원', ''));
      if (price < minPrice) {
        minPrice = price;
        minPriceInput = $(this).find('td.jd_real_content_6 input');
      }

      if ($(this).find('td.jd_real_content_1').text().indexOf(query.depFlight) > 0 &&
        $(this).find('td.jd_real_content_3').text() ===  GetSeatClass(query.depCarrier, query.depClass) &&
        parseInt($(this).find('td.jd_real_content_5').text()) > 0) {

        if (price > minPrice) {
          minPriceInput.click();
        } else {
          $(this).find('td.jd_real_content_6 input').click();
        }
      }
    });
  });
  $('#realTimeRightList').bind('DOMSubtreeModified', function() {
    var minPrice = 200000;
    var minPriceInput = null;

    $(this).find('tbody tr').each(function(i) {
      var price = parseInt($(this).find('td.jd_real_content_4').text().replace(',', '').replace('원', ''));
      if (price < minPrice) {
        minPrice = price;
        minPriceInput = $(this).find('td.jd_real_content_6 input');
      }

      if ($(this).find('td.jd_real_content_1').text().indexOf(query.retFlight) > 0 &&
        $(this).find('td.jd_real_content_3').text() ===  GetSeatClass(query.retCarrier, query.retClass) &&
        parseInt($(this).find('td.jd_real_content_5').text()) > 0) {
        $(this).find('td.jd_real_content_6 input').click();

        if (price > minPrice) {
          minPriceInput.click();
        } else {
          $(this).find('td.jd_real_content_6 input').click();
        }
      }
    });
  });

  // event tracking
  $('.jd_reservation').on("click", function() {
    _gaq.push(['_trackEvent', 'book', 'create', 'air.jejudo.com']);
  });
}
else if (pathName === '/RealAir/Create') {
  $('#btnReservationCommit').on('click', function() {
    _gaq.push(['_trackEvent', 'book', 'complete', 'air.jejudo.com']);
  });
}
else if (pathName === '/RealAir/Completed') {

}