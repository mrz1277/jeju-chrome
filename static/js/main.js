var appUrl = 'https://chrome.google.com/webstore/detail/mgmbbcnndjmdadmamjjglehplfncnlmp';
if (window.chrome && window.navigator.vendor === 'Google Inc.') {
  $('.download').click(function(e) {
    if(!chrome.app.isInstalled) {
      e.preventDefault();
      chrome.webstore.install(appUrl, function() {
        console.log('success');
      }, function(err){
        console.error(err);
        document.location.href = appUrl;
      });
    }
  });
}

var links = document.querySelectorAll('a');
for (var i = 0; i < links.length; i++) {
  links[i].addEventListener('click', function trackButton(e) {
    ga('send', 'event', e.target.id, 'clicked');
  });
}