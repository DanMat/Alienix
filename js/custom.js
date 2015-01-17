        //##########################################################################//
	// Scrolling background Tutorial Code by http://www.kudoswebsolutions.com
        // Original Source code: http://youlove.us/
        // Modified and extended by Kudos Web Solutions
        // copyright 2009 kudoswebsolutions.com
        //##########################################################################//

$(function() {
	// Define the height of your two background images.
           //The image to scroll
	   var backgroundheight = 500;
	   var backgroundheight2 = 500;
	   var backgroundheight3 = 500;
    

	// Create a random offset for both images' starting positions
        offset = Math.round(Math.floor(Math.random()* 2001));
       
 
	function scrollbackground() {
                //Ensure all bases are covered when defining the offset.
   		offset = (offset < 1) ? offset + (backgroundheight - 1) : offset - 1;
		// Put the background onto the required div and animate vertically
   		$('#move').css("background-position", "50% " + offset + "px");
   		// Enable the function to loop when it reaches the end of the image
   		setTimeout(function() {
			scrollbackground();
			}, 100
		);
   	}
	function scrollbackground2() {
                //Ensure all bases are covered when defining the offset.
   		offset = (offset < 1) ? offset + (backgroundheight2 - 1) : offset - 1;
		// Put the background onto the required div and animate vertically
   		$('#move2').css("background-position", "50% " + offset + "px");
   		// Enable the function to loop when it reaches the end of the image
   		setTimeout(function() {
			scrollbackground2();
			}, 50
		);
   	}
	
	function scrollbackground3() {
                //Ensure all bases are covered when defining the offset.
   		offset = (offset < 1) ? offset + (backgroundheight3 - 1) : offset - 1;
		// Put the background onto the required div and animate vertically
   		$('#move3').css("background-position", "50% " + offset + "px");
   		// Enable the function to loop when it reaches the end of the image
   		setTimeout(function() {
			scrollbackground3();
			}, 10
		);
   	}

	// Initiate the scroll
	scrollbackground();
	scrollbackground2();
	scrollbackground3();

});