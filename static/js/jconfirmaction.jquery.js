/*
 * jQuery Plugin : jConfirmAction
 * 
 * by Hidayat Sagita
 * http://www.webstuffshare.com
 * Licensed Under GPL version 2 license.
 *
 */

/**
 *  Modifications to support more advanced 'onclick'-like handlers passed in through yesFunction.
 *  Greg Heartsfield <scsibug@imap.cc> 12-29-10
 */

(function($){

	jQuery.fn.jConfirmAction = function (options) {
		
		// Some jConfirmAction options (limited to customize language) :
		// question : a text for your question.
		// yesAnswer : a text for Yes answer.
		// cancelAnswer : a text for Cancel/No answer.
		var theOptions = jQuery.extend ({
		    question: "Are You Sure ?",
		    yesAnswer: "Yes",
      		    cancelAnswer: "Cancel",
                    yesFunction: null,
                    cancelFunction: null
		}, options);
		
		return this.each (function () {
			
			$(this).bind('click', function(e) {

				e.preventDefault();
				thisHref	= $(this).attr('href');

				if($(this).next('.question').length <= 0)
					$(this).after('<div class="question">'+theOptions.question+'<br/> <span class="yes">'+theOptions.yesAnswer+'</span><span class="cancel">'+theOptions.cancelAnswer+'</span></div>');
				
				$(this).next('.question').animate({opacity: 1}, 300);
				
				$('.yes').bind('click', function(){
					window.location = thisHref;
                                    if (theOptions.yesFunction)
                                        theOptions.yesFunction();
				});
		
				$('.cancel').bind('click', function(){
					$(this).parents('.question').fadeOut(300, function() {
                                            if (theOptions.cancelFunction)
                                                theOptions.cancelFunction();
					    $(this).remove();
					});
				});
				
			});
			
		});
	}
	
})(jQuery);