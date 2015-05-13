var _gaq = [];
_gaq.push(['_setAccount', 'UA-62234040-1']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

// global
var _cal = new CalHeatMap();
var _clickedDate;

moment.locale("ko");

var WT = {
  init: function() {
    WT.version = "1.1.5";
    WT.utm_params = "?utm_source=wandertab";
    WT.utm_params += "&utm_campaign=wandertab_" + WT.version;
    WT.utm_params += "&utm_medium=chrome_ext";
    WT.simulateLoading = true;
    WT.initializing = true;
    WT.newDeals = JSON.parse(localStorage.getItem("newDeals"));
    WT.newDeals = WT.newDeals ? WT.removeOldDeals(WT.newDeals) : [];

    watch(WT.newDeals, function() {
      localStorage.setItem("newDeals", JSON.stringify(WT.newDeals));
      if (WT.newDeals.length < 1) {
        WT.getDeal().done(function(deal) {
          WT.newDeals.push(deal);
        });
      }
    });

    $.when(WT.getOriginAirport()).then(function() {
      WT.nextDeal();
      $("#refreshLocation").on("click", function() {
        WT.refreshOriginAirport().done(WT.nextDeal);
      });
      $(".btn-shuffle").on("click", function() {
        WT.nextDeal();
      });
    });

    $("#HitlistLogo").attr("href", "http://www.hitlistapp.com/flights/" + WT.utm_params);
    $("a").on("click", function(a) {
      _gaq.push(["_trackEvent", a.target.id, "clicked"]);
    });
    _gaq.push(["_trackEvent", "newTab", "opened"]);
    _gaq.push(["_trackPageview"]);
  },
  getOriginAirport: function() {
    var deferred = $.Deferred();
    WT.originAirport = JSON.parse(localStorage.getItem("originAirport"));

    if (WT.originAirport) {
      return deferred.resolve(WT.originAirport);
    } else {
      WT.showLoader("Determining the closest airport to you");
      $.when(WT.getMyLocation().pipe(WT.getClosestAirport, WT.getClosestAirport)).then(function(airport) {
        WT.originAirport = airport;
        localStorage.setItem("originAirport", JSON.stringify(airport));
        deferred.resolve();
      });
      return deferred.promise();
    }
  },
  refreshOriginAirport: function() {
    localStorage.setItem("originAirport", null);
    return WT.getOriginAirport();
  },
  getMyLocation: function() {
    var deferred = $.Deferred();
    var params = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000
    };
    navigator.geolocation.getCurrentPosition(deferred.resolve, deferred.reject, params);
    return deferred.promise();
  },
  getClosestAirport: function(location) {
    var deferred = $.Deferred();
    var url = "http://localhost:3000/airports/near/";

    if (location.coords) {
      url = url + "?lat=" + location.coords.latitude + "&lon=" + location.coords.longitude;
    } else {
      console.warn("Cannot use location of the user, trying to find it through the IP", location);
    }

    $.getJSON(url).done(function(airport) {
      deferred.resolve(airport);
    }).fail(function(error) {
      console.error("Failed to retrieve Closest airport: ", error);
      deferred.reject("Failed to find Closest airport");
    });
    return deferred.promise();
  },
  nextDeal: function() {
    var deffered = WT.hideDeal();
    WT.showLoader();

    if (WT.newDeals.length >= 1) {
      deffered.done(function() {
        WT.displayDeal($(WT.newDeals).last()[0]);
        WT.newDeals.pop();
      });
    } else {
      $.when(WT.getDeal()).then(WT.displayDeal);
      WT.getDeal().done(function(deal) {
        WT.newDeals.push(deal);
      });
    }
  },
  getDeal: function() {
    var deferred = $.Deferred();

    $.getJSON("http://localhost:3000/deal?airport=" + WT.originAirport.iata_code).done(function(deal) {
      deal.timeStamp = Date.now();
      WT.preLoadDealImage(deal);
      deferred.resolve(deal);
    }).fail(function(error) {
      console.error("Failed to retrieve Deal: ", error);
      deferred.reject("Failed to get a Deal");
    });
    return deferred;
  },
  preLoadDealImage: function(deal) {
    $("#hiddenImage").attr("src", deal.photo.url);
  },
  hideDeal: function() {
    var deferred = $.Deferred();
    $("#deal").removeClass("visible");
    if (WT.simulateLoading) {
      if (!WT.initializing) {
        window.setTimeout(function() {
          deferred.resolve();
        }, 200);
      } else {
        deferred.resolve();
      }
    }
    return deferred;
  },
  displayDeal: function(deal) {
    $("#deal").removeClass("visible");
    $("#bg").css("background-image", "url(" + deal.photo.url + ")");
    WT.setContent('depart', deal.suggestion.depart_date, deal.suggestion.depart_price, WT.originAirport.airport_name, '제주');
    WT.setContent('return', deal.suggestion.return_date, deal.suggestion.return_price, '제주', WT.originAirport.airport_name);
    $('#flights').html('예약하기<small> (' + (deal.suggestion.depart_price + deal.suggestion.return_price) + '원)</small>');

    if (deal.photo.citation) {
      $("#deal a.photo-credits").css("display", "block").attr("href", deal.photo.external_link);
      $("#deal a.photo-credits span").text(deal.photo.citation);
    } else {
      $("#deal a.photo-credits").css("display", "none");
    }

    if (deal.photo.location) {
      $("#deal a.photo-location span").text(deal.photo.location);
      if (deal.photo.latitude && deal.photo.longitude) {
        var url = 'http://map.naver.com/?menu=location&mapMode=0&lat=' +
          deal.photo.latitude + '&lng=' + deal.photo.longitude + '&dlevel=11&enc=b64';
        $("#deal a.photo-location").css("display", "block").attr("href", url);
      } else {
        $("#deal a.photo-location").css("border", "none").css("cursor", "none");
      }
    } else {
      $("#deal a.photo-location").css("display", "none");
    }

    $("#deal").addClass("visible");
    WT.hideLoader();
    WT.initializing = false;
  },
  removeOldDeals: function(deals) {
    var oldDeals = [];
    var hour = 3600000;
    var now = Date.now();
    for (i = 0; i < deals.length; ++i) {

      deals[i].timeStamp + hour > now && oldDeals.push(deals[i]);
    }
    return oldDeals;
  },
  showLoader: function(message) {
    message || (message = "");
    $(".loading .title").html(message);
    $(".loading").stop().fadeIn(300);
  },
  hideLoader: function() {
    $(".loading").stop().fadeOut(300);
  },
  highlightCalendar: function(start, end) {
    var dates = [];
    var depart = moment(start).startOf('day');
    var arrive = moment(end).startOf('day');
    while (depart.isBefore(arrive) || depart.isSame(arrive)) {
      dates.push(moment(depart).toDate());
      depart.add(1, 'day');
    }
    _cal.highlight(dates);
  },
  setContent: function(flight, date, price, dep_airport, arr_airport) {
    $('.'+flight+'-date').text(date ? moment(date).format('D일 HH:mm'): '');
    $('.'+flight+'-price').text(price ? price + '원' : '');
    $('.'+flight+'-airport').html(dep_airport && arr_airport ? dep_airport + ' <i class="fa fa-long-arrow-right"></i> ' + arr_airport : '');

  }
};

$(document).ready(function() {
  WT.init();

  $(".tooltip").tooltipster({
    position: "left",
    delay: 0
  });

  _cal.init({
    itemSelector: "#cal-heatmap",
    domain: "month",
    subDomain: "x_day",
    data: "http://localhost:3000/flights?airport=" + WT.originAirport.iata_code + "&start={{d:start}}&end={{d:end}}",
    cellSize: 20,
    cellPadding: 5,
    domainGutter: 20,
    range: 2,
    label: {
      position: "top"
    },
    tooltip: true,
    weekStartOnMonday: false,
    domainDynamicDimension: false,
    domainLabelFormat: function(date) {
      return moment(date).format("MMMM").toUpperCase();
    },
    subDomainTextFormat: "%e",
    subDomainDateFormat: function(date) {
      var data = _clickedDate ? JSON.parse(localStorage.getItem("returnDate"))
        : JSON.parse(localStorage.getItem("departDate"));

      return moment(data[moment(date).format('X')]).format('HH:mm');
    },
    subDomainTitleFormat: {
      empty: "일정 없음",
      filled: "{count}원 {date} 출발"
    },
    displayLegend: false,
    legendVerticalPosition: "top",
    legendHorizontalPosition: "center",
    legendColors: {
      min: "white",
      max: "black"
    },
    legend: [40000, 60000, 80000],
    afterLoadData: function(data) {
      var departPrice = {}, departDate = {};
      var returnPrice = {}, returnDate = {};

      data.depart.forEach(function(d) {
        departPrice[d.date] = d.price;
        departDate[moment(d.date, 'X').startOf('day').format('X')] = moment(d.date, 'X').toDate();
      });

      data.return.forEach(function(d) {
        returnPrice[d.date] = d.price;
        returnDate[moment(d.date, 'X').startOf('day').format('X')] = moment(d.date, 'X').toDate();
      });

      localStorage.setItem("departPrice", JSON.stringify(departPrice));
      localStorage.setItem("returnPrice", JSON.stringify(returnPrice));
      localStorage.setItem("departDate", JSON.stringify(departDate));
      localStorage.setItem("returnDate", JSON.stringify(returnDate));

      return departPrice;
    },
    onComplete: function() {
      var deals = JSON.parse(localStorage.getItem("newDeals"));
      if (deals && deals.length > 0) {
        var deal = deals[0];
        WT.highlightCalendar(deal.suggestion.depart_date, deal.suggestion.return_date);
      }
    },
    onClick: function(date, value) {
      var dateData = _clickedDate ? JSON.parse(localStorage.getItem("returnDate"))
        : JSON.parse(localStorage.getItem("departDate"));
      var dateFormat = moment(dateData[moment(date).format('X')]);

      if (_clickedDate) {
        // 초기화
        if (moment(date).isSame(_clickedDate)) {
          _cal.highlight(new Date(2000,1,1));
          WT.setContent('depart');
          WT.setContent('return');
          $('#flights').html('<small>출발일선택</small>');
        }
        // 도착일 선택됨
        else {
          WT.highlightCalendar(_clickedDate, date);
          WT.setContent('return', dateFormat, value, '제주', WT.originAirport.airport_name);

          var priceTotal = parseInt($('.depart-price').text()) + parseInt(value);
          $('#flights').html('예약하기<small> (' + priceTotal + '원)</small>');
        }
        _clickedDate = undefined;

        _cal.update(JSON.parse(localStorage.getItem("departPrice")), false);
      }
      // 출발일 선택됨
      else {
        _clickedDate = date;
        _cal.highlight(date);
        _cal.update(JSON.parse(localStorage.getItem("returnPrice")), false);
        WT.setContent('depart', dateFormat, value, WT.originAirport.airport_name, '제주');
        $('#flights').html('<small>도착일선택</small>');
      }
    }
  });
});
