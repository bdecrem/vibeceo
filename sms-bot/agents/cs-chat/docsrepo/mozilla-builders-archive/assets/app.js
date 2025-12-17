var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

(function() {
    'use strict';

    var closeButton = document.querySelector('.js-fti-launch-close');
    var ftiModal = document.querySelector('.fti-launch');
    var rsvpButton = document.querySelector('.fti-rsvp-button');

    function hideModal() {
      ftiModal.classList.add('hidden');
      document.body.removeEventListener("mousedown", hideModal, true);
      document.body.removeEventListener('keydown', keyPressHandler);
    }

    function keyPressHandler(e) {
      if (e.key == "Escape") {
        hideModal();
      }
    }

    // Add listeners to close button and esc key
    closeButton.addEventListener('click', hideModal);
    document.body.addEventListener('keydown', keyPressHandler);
    // rsvpButton.addEventListener('click', function(e){
    //   e.preventDefault();
    // });

})();


}
/*
     FILE ARCHIVED ON 18:11:34 Sep 05, 2022 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 23:06:27 Nov 05, 2025.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 0.513
  exclusion.robots: 0.037
  exclusion.robots.policy: 0.027
  esindex: 0.012
  cdx.remote: 14.802
  LoadShardBlock: 109.327 (3)
  PetaboxLoader3.datanode: 119.187 (5)
  PetaboxLoader3.resolve: 109.987 (2)
  load_resource: 140.664
  loaddict: 49.019
*/