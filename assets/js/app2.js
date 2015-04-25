var WT = {
    init: function() {
      WT.version = "1.1.5", WT.utm_params = "?utm_source=wandertab", WT.utm_params += "&utm_campaign=wandertab_" + WT.version, WT.utm_params += "&utm_medium=chrome_ext", WT.simulateLoading = !0, WT.initializing = !0, WT.newDeals = JSON.parse(localStorage.getItem("newDeals")), WT.newDeals = WT.newDeals ? WT.removeOldDeals(WT.newDeals) : new Array, watch(WT.newDeals, function() {
        localStorage.setItem("newDeals", JSON.stringify(WT.newDeals)), WT.newDeals.length < 1 && WT.getDeal().done(function(a) {
          WT.newDeals.push(a)
        })
      }), $.when(WT.getOriginAirport()).then(function() {
        WT.nextDeal(), $(".btn-refresh-location").on("click", function() {
          WT.refreshOriginAirport().done(WT.nextDeal)
        }), $(".btn-shuffle").on("click", function() {
          WT.nextDeal()
        })
      }), $("#HitlistLogo").attr("href", "http://www.hitlistapp.com/flights/" + WT.utm_params), $("#WandertabInfo").attr("href", "http://www.hitlistapp.com/wandertab/" + WT.utm_params), $("a").on("click", function(a) {
        _gaq.push(["_trackEvent", a.target.id, "clicked"])
      }), _gaq.push(["_trackEvent", "newTab", "opened"]), _gaq.push(["_trackPageview"])
    },
    getOriginAirport: function() {
      var a = $.Deferred();
      return WT.originAirport = JSON.parse(localStorage.getItem("originAirport")), WT.originAirport ? a.resolve(WT.originAirport) : (WT.showLoader("Determining the closest airport to you"), $.when(WT.getMyLocation().pipe(WT.getClosestAirport, WT.getClosestAirport)).then(function(b) {
        WT.originAirport = b, localStorage.setItem("originAirport", JSON.stringify(b)), a.resolve()
      }), a.promise())
    },
    refreshOriginAirport: function() {
      return localStorage.setItem("originAirport", null), WT.getOriginAirport()
    },
    getMyLocation: function() {
      var a = $.Deferred(),
        b = {
          enableHighAccuracy: !1,
          timeout: 5e3,
          maximumAge: 3e5
        };
      return navigator.geolocation.getCurrentPosition(a.resolve, a.reject, b), a.promise()
    },
    getClosestAirport: function(a) {
      var b = $.Deferred(),
        c = "http://www.hitlistapp.com/flights/api/airports/near/";
      return a.coords ? c = c + "?lat=" + a.coords.latitude + "&lon=" + a.coords.longitude : console.warn("Cannot use location of the user, trying to find it through the IP", a), $.getJSON(c).done(function(a) {
        b.resolve(a)
      }).fail(function(a) {
        console.error("Failed to retrieve Closest airport: ", a), b.reject("Failed to find Closest airport")
      }), b.promise()
    },
    nextDeal: function() {
      var a = WT.hideDeal();
      WT.showLoader(), WT.newDeals.length >= 1 ? a.done(function() {
        WT.displayDeal($(WT.newDeals).last()[0]), WT.newDeals.pop()
      }) : ($.when(WT.getDeal()).then(WT.displayDeal), WT.getDeal().done(function(a) {
        WT.newDeals.push(a)
      }))
    },
    getDeal: function() {
      var a = $.Deferred();
      return $.getJSON("http://www.hitlistapp.com/flights/api/deal/?v=1&airport=" + WT.originAirport.iata_code).done(function(b) {
        b.timeStamp = Date.now(), WT.preLoadDealImage(b), a.resolve(b)
      }).fail(function(b) {
        console.error("Failed to retrieve Deal: ", b), a.reject("Failed to get a Deal")
      }), a
    },
    preLoadDealImage: function(a) {
      $("#hiddenImage").attr("src", a.destination.photos.photo_details)
    },
    hideDeal: function() {
      var a = $.Deferred();
      return $("#deal").removeClass("visible"), WT.simulateLoading && !WT.initializing ? window.setTimeout(function() {
        a.resolve()
      }, 200) : a.resolve(), a
    },
    displayDeal: function(a) {
      $("#deal").removeClass("visible"), $("#bg").css("background-image", "url(" + a.destination.photos.photo_details + ")"), $("#deal h1").text(a.price.formatted), $("#deal h2").text(a.destination.city_name + ", " + a.destination.country_name), $("#deal .origin").text("from " + a.origin.city_name + " (" + a.origin.iata_code + ")");
      var b = a.details_link + WT.utm_params;
      $("#deal a.deal-link").attr("href", b), a.destination.photos.photo_citation ? ($("#deal a.photo-credits").css("display", "block").attr("href", a.destination.photos.photo_link), $("#deal a.photo-credits span").text(a.destination.photos.photo_citation)) : $("#deal a.photo-credits").css("display", "none"), $("#deal").addClass("visible"), WT.hideLoader(), WT.initializing = !1
    },
    removeOldDeals: function(a) {
      var b = new Array,
        c = 36e5,
        d = Date.now();
      for (i = 0; i < a.length; ++i) a[i].timeStamp + c > d && b.push(a[i]);
      return b
    },
    showLoader: function(a) {
      a || (a = ""), $(".loading .title").html(a), $(".loading").stop().fadeIn(300)
    },
    hideLoader: function() {
      $(".loading").stop().fadeOut(300)
    }
  },
  _gaq = _gaq || [];
_gaq.push(["_setAccount", "UA-45325814-5"]),
  function() {
    var a = document.createElement("script");
    a.type = "text/javascript", a.async = !0, a.src = "https://ssl.google-analytics.com/ga.js";
    var b = document.getElementsByTagName("script")[0];
    b.parentNode.insertBefore(a, b)
  }(), $(document).ready(function() {
  WT.init(), $(".tooltip").tooltipster({
    position: "left",
    delay: 0
  })
});