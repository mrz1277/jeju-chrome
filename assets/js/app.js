var _gaq = [];
_gaq.push(['_setAccount', 'UA-62234040-1']);

(function() {
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = ('https:' == document.location.protocol || 'chrome-extension:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

// global
var _cal = new CalHeatMap();
var _clickedDate;
var BASE = "http://jeju.herokuapp.com";

moment.locale("ko");

var WT = {
  init: function(done) {
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
          WT.highlightCalendar(deal.suggestion.depart_date, deal.suggestion.return_date);
        });
      } else {
        var deal = WT.newDeals[0];
        WT.highlightCalendar(deal.suggestion.depart_date, deal.suggestion.return_date);
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
      done();
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
      WT.showLoader(chrome.i18n.getMessage('searchAirport'));
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
    var url = BASE + "/airports/near/";

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

    $.getJSON(BASE + "/deal?airport=" + WT.originAirport.iata_code).done(function(deal) {
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
    WT.setContent('depart', deal.suggestion.depart_date, deal.suggestion.depart_price, WT.originAirport.airport_name, chrome.i18n.getMessage("jeju"));
    WT.setContent('return', deal.suggestion.return_date, deal.suggestion.return_price, chrome.i18n.getMessage("jeju"), WT.originAirport.airport_name);
    $('a.btn-tickets').html(chrome.i18n.getMessage("book") + '<small> (' + (deal.suggestion.depart_price + deal.suggestion.return_price) + chrome.i18n.getMessage("won") + ')</small>')
      .attr('href', 'http://air.jejudo.com?' +
      'depCity=' + WT.originAirport.iata_code +
      '&depDate=' + deal.suggestion.depart_date +
      '&retDate=' + deal.suggestion.return_date +
      '&depCarrier=' + deal.suggestion.depart_carrier +
      '&retCarrier=' + deal.suggestion.return_carrier
    );

    if (deal.photo.author && deal.photo.source && deal.photo.external_link) {
      $("#deal a.photo-credits").css("display", "block").attr("href", deal.photo.external_link);
      $("#deal a.photo-credits span").text(deal.photo.author + '(' + deal.photo.source + ')');
    } else {
      $("#deal a.photo-credits").css("display", "none");
    }

    if (deal.photo.name) {
      $("#deal a.photo-location span").text(deal.photo.name);
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
    $('.'+flight+'-date').text(date ? moment(date).format('D' + chrome.i18n.getMessage('day') + ' HH:mm'): '');
    $('.'+flight+'-price').text(price ? price + chrome.i18n.getMessage('day') : '');
    $('.'+flight+'-airport').html(dep_airport && arr_airport ? dep_airport + ' <i class="fa fa-long-arrow-right"></i> ' + arr_airport : '');

  }
};

document.title = chrome.i18n.getMessage('appName');

$(document).ready(function() {
  $('#depart').text(chrome.i18n.getMessage('depart'));
  $('#return').text(chrome.i18n.getMessage('return'));
  $('.r1').text(chrome.i18n.getMessage('r1'));
  $('.r2').text(chrome.i18n.getMessage('r2'));
  $('.r3').text(chrome.i18n.getMessage('r3'));

  WT.init(function() {
    _cal.init({
      itemSelector: "#cal-heatmap",
      domain: "month",
      subDomain: "x_day",
      data: BASE + "/flights?airport=" + WT.originAirport.iata_code + "&start={{d:start}}&end={{d:end}}",
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
        return moment(date).format("M") + chrome.i18n.getMessage('month');
      },
      subDomainTextFormat: "%e",
      subDomainDateFormat: function(date) {
        var data = _clickedDate ? JSON.parse(localStorage.getItem("returnDate"))
          : JSON.parse(localStorage.getItem("departDate"));

        return moment(data[moment(date).format('X')]).format('HH:mm');
      },
      subDomainTitleFormat: {
        empty: chrome.i18n.getMessage('noSchedule'),
        filled: "{count}" + chrome.i18n.getMessage('won') + " {date} " + chrome.i18n.getMessage('depart')
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
        //price는 해당일의 값(count)을 의미하고, date는 시간정보까지 담기 위해 따로 저장(서브도메인이 날짜라 시간정보가 안담김)
        var departPrice = {}, departDate = {}, departCarrier = {};
        var returnPrice = {}, returnDate = {}, returnCarrier = {};

        data.depart.forEach(function(d) {
          departPrice[d.date] = d.price;

          var dateKey = moment(d.date, 'X').startOf('day').format('X');
          departDate[dateKey] = moment(d.date, 'X').toDate();
          departCarrier[dateKey] = d.carrier;
        });

        data.return.forEach(function(d) {
          returnPrice[d.date] = d.price;

          var dateKey = moment(d.date, 'X').startOf('day').format('X');
          returnDate[dateKey] = moment(d.date, 'X').toDate();
          returnCarrier[dateKey] = d.carrier;
        });

        localStorage.setItem("departPrice", JSON.stringify(departPrice));
        localStorage.setItem("returnPrice", JSON.stringify(returnPrice));
        localStorage.setItem("departDate", JSON.stringify(departDate));
        localStorage.setItem("returnDate", JSON.stringify(returnDate));
        localStorage.setItem("departCarrier", JSON.stringify(departCarrier));
        localStorage.setItem("returnCarrier", JSON.stringify(returnCarrier));

        return departPrice;
      },
      onClick: function(date, value) {
        var carrierData = _clickedDate ? JSON.parse(localStorage.getItem("returnCarrier"))
          : JSON.parse(localStorage.getItem("departCarrier"));
        var dateData = _clickedDate ? JSON.parse(localStorage.getItem("returnDate"))
          : JSON.parse(localStorage.getItem("departDate"));

        var key = moment(date).format('X');
        var dateFormat = moment(dateData[key]);
        var carrier = carrierData[key];

        if (_clickedDate) {
          // 초기화
          if (moment(date).isSame(_clickedDate)) {
            _cal.highlight(new Date(2000,1,1)); // disable highlight
            WT.setContent('depart'); // depart table contents set to null
            WT.setContent('return'); // return table contents set to null

            $('a.btn-tickets').html('<small>'+ chrome.i18n.getMessage('selectDepartDate') +'</small>')
              .removeClass('available')
              .attr('href', '')
              .removeData('depCity')
              .removeData('depCarrier')
              .removeData('depDate');
          }
          // 도착일 선택됨
          else {
            WT.highlightCalendar(_clickedDate, date); // highlight from depart to return date
            WT.setContent('return', dateFormat, value, chrome.i18n.getMessage('jeju'), WT.originAirport.airport_name); // set return table contents

            var priceTotal = parseInt($('.depart-price').text()) + parseInt(value);
            $('a.btn-tickets').html(chrome.i18n.getMessage('book')+'<small> (' + priceTotal + chrome.i18n.getMessage('won') + ')</small>')
              .addClass('available')
              .attr('href', 'http://air.jejudo.com?' +
              'depCity=' + $('a.btn-tickets').data('depCity') +
              '&depDate=' + $('a.btn-tickets').data('depDate') +
              '&retDate=' + dateFormat.format('YYYY-MM-DDTHH:mm') +
              '&depCarrier=' + $('a.btn-tickets').data('depCarrier') +
              '&retCarrier=' + carrier);
          }
          _clickedDate = undefined;

          _cal.update(JSON.parse(localStorage.getItem("departPrice")), false);
        }
        // 출발일 선택됨
        else {
          _clickedDate = date;
          _cal.highlight(date);
          _cal.update(JSON.parse(localStorage.getItem("returnPrice")), false);
          WT.setContent('depart', dateFormat, value, WT.originAirport.airport_name, chrome.i18n.getMessage('jeju'));
          WT.setContent('return');
          $('a.btn-tickets').html('<small>' + chrome.i18n.getMessage('selectReturnDate') + '</small>')
            .removeClass('available')
            .attr('href', '')
            .data('depCarrier', carrier)
            .data('depCity', WT.originAirport.iata_code)
            .data('depDate', dateFormat.format('YYYY-MM-DDTHH:mm'));
        }
      }
    });
  });

  $("a.btn-tickets").on('click', function(e) {
    $(this).attr('href') === '' && e.preventDefault();
  });

  $("#refreshLocation").tooltipster({
    position: "left",
    delay: 0,
    content: chrome.i18n.getMessage('refreshLocation')
  });
});
