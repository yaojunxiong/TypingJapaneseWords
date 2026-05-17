// Minna Mastery Loader
// Central loader for lesson-specific Mastery content files.
// Add new lessons here, instead of chaining from lesson files.
(function(){
  window.MinnaMasteryLessons = window.MinnaMasteryLessons || {};
  var version = 'v2026-05-17';
  var lessons = [1, 2];
  lessons.forEach(function(n){
    var pad = String(n).padStart(2, '0');
    document.write('<script src="./minna-mastery-lesson-' + pad + '.js?' + version + '"><\/script>');
  });
})();