var query = (function queryStringToJSON() {
  var pairs = location.search.slice(1).split('&');

  var result = {};
  pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
  });

  return JSON.parse(JSON.stringify(result));
})();

var pathName = (function() {
  var l = document.createElement("a");
  l.href = location.href;
  return l.pathname;
})();

if (pathName === '/' && !$.isEmptyObject(query)) {
  $('#sel_depcity').val(query.depCity);
  $('#dateDep').val(moment(query.depDate).format('YYYY-MM-DD'));
  $('#dateArr').val(moment(query.retDate).format('YYYY-MM-DD'));

  $('input:checkbox').each(function() {
    if ($(this).val() !== query.depCarrier && $(this).val() !== query.retCarrier) {
      $(this).removeAttr('checked');
    }
  });

  $('#searchAirList').click();
}
else if (pathName === '/RealAir/Create') {

}