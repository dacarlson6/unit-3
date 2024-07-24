//SVG dimension variables
var w = 900, h = 500;



//execute script when window is loaded
window.onload = function(){

    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //put a new svg in the body
        .attr("height", h) //assign the height
        .attr("class", "container") //always assign a class (as the block name) for styling and future selection
        .style("background-color", "rgba(0,0,0,0.2)")

    //innerRect block
    var innerRect = container.append("rect") //put a new rect in the svg
        .attr("width", 800) //rectangle width
        .attr("height", 400) //rectangle height

    console.log(innerRect);
};