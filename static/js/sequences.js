// Dimensions of sunburst.
var width = 850;
var height = 700;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
    w: 125,
    h: 30,
    s: 3,
    t: 10
};
// Mapping of step names to colors.
var colors = {};

//List of each possible unique item in the sequences
var unique = [];
var numOfUnique = 0;

//List of items selected by the user for display
var checkedItems = {};

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0;
/*CSV file to pull data from
 *No header is required (but it's OK if one is present)
 *Use a hyphen to separate the steps in the sequence
 *Every sequence should have an "end" marker as the last element
 *Each line should be a complete path from root to leaf - don't include counts for intermediate steps.*/
var file = "/dataRaw"
var vis = d3.select("#chart").append("svg:svg")
    .attr("id", "svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) {
        return d.size;
    });

var arc = d3.svg.arc()
    .startAngle(function(d) {
        return d.x;
    })
    .endAngle(function(d) {
        return d.x + d.dx;
    })
    .innerRadius(function(d) {
        return Math.sqrt(d.y);
    })
    .outerRadius(function(d) {
        return Math.sqrt(d.y + d.dy);
    });

// Use d3.text and d3.csv.parseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
var csv;
var json;
d3.text(file, function(text) {
    csv = d3.csv.parseRows(text);
    init();
});

//Initialize data and visualization
function init() {
    getUniqueItems(csv); //Array of all unique possible steps in the sequences
    numOfUnique = unique.length;
    checkedItems['end'] = null;
    if (numOfUnique <= 10)
        for (var x = 0; x < numOfUnique; x++)
            checkedItems[unique[x]] = null;
    json = buildHierarchy();
    createVisualization(json, true);
}

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json, firstRun) {
    if (firstRun) { // Basic setup of page elements.
        generateColors(); //Generate colors for each item
        initializeBreadcrumbTrail();
        //If there are greater than 10 unique items then use fancytree, else draw a legend and individual checkboxes
        if (numOfUnique >= 10) {
            document.getElementById("tree").style.visibility = "visible";
            document.getElementById("btnResetSearch").style.visibility = "visible";
            document.getElementById("search").style.visibility = "visible";
            generateCheckBoxes(); //Build the checkbox for each legend item
        } else {
            for (var x = 0; x < numOfUnique; x++)
                checkedItems[unique[x]] = null;
            drawLegend();
            generateCheckBoxesLegend(); //Build the checkbox for each legend item
        }
    } else {
        d3.select("#svg").remove(); //Remove and Redraw the visualization with new data
        d3.select("#container").remove();
        vis = d3.select("#chart").append("svg:svg")
            .attr("id", "svg")
            .attr("width", width)
            .attr("height", height)
            .append("svg:g")
            .attr("id", "container")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
        initializeBreadcrumbTrail();
    }

    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    vis.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

    var nodes = partition.nodes(json);

    var path = vis.data([json]).selectAll("path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("display", function(d) {
            return d.depth ? null : "none";
        })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function(d) {
            return colors[d.name];
        })
        .on("mouseover", mouseover)
        .style("opacity", 1);

    // Add the mouseleave handler to the bounding circle.
    d3.select("#container").on("mouseleave", mouseleave);

    // Get total size of the tree = value of root node from partition.
    totalSize = path.node().__data__.value;
};

function mouseover(d) {
    var percentage = (100 * d.value / totalSize).toPrecision(3);
    var percentageString = percentage + "%";
    if (percentage < 0.1) {
        percentageString = "< 0.1%";
    }

    d3.select("#percentage")
        .text(percentageString);

    d3.select("#explanation")
        .style("visibility", "");

    var sequenceArray = getAncestors(d);
    updateBreadcrumbs(sequenceArray, percentageString);

    // Fade all the segments.
    d3.selectAll("path")
        .style("opacity", .3);

    // Then highlight only those that are an ancestor of the current segment.
    vis.selectAll("path")
        .filter(function(node) {
            return (sequenceArray.indexOf(node) >= 0);
        })
        .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

    // Hide the breadcrumb trail
    d3.select("#trail")
        .style("visibility", "hidden");

    // Deactivate all segments during transition.
    d3.selectAll("path").on("mouseover", null);

    // Transition each segment to full opacity and then reactivate it.
    d3.selectAll("path")
        .style("opacity", 1)
        .on("mouseover", mouseover);

    d3.select("#explanation")
        .style("visibility", "hidden");
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}

function initializeBreadcrumbTrail() {
    // Add the svg area.
    var trail = d3.select("#sequence").append("svg:svg")
        .attr("width", width)
        .attr("height", 50)
        .attr("id", "trail");
    // Add the label at the end, for the percentage.
    trail.append("svg:text")
        .attr("id", "endlabel")
        .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
    var points = [];
    points.push("0,0");
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
        points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {
    // Data join; key function combines name and depth (= position in sequence).
    var g = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function(d) {
            return d.name + d.depth;
        });

    // Add breadcrumb and label for entering nodes.
    var entering = g.enter().append("svg:g");

    entering.append("svg:polygon")
        .attr("points", breadcrumbPoints)
        .style("fill", function(d) {
            return colors[d.name];
        });

    entering.append("svg:text")
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) {
            return d.name;
        });

    // Set position for entering and updating nodes.
    g.attr("transform", function(d, i) {
        return "translate(" + i * (b.w + b.s) + ", 0)";
    });

    // Remove exiting nodes.
    g.exit().remove();

    // Now move and update the percentage at the end.
    d3.select("#trail").select("#endlabel")
        .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(percentageString);

    // Make the breadcrumb trail visible, if it's hidden.
    d3.select("#trail")
        .style("visibility", "");
}

// Return an array of all the unique items that are possible in a sequence
function getUniqueItems(arr) {
    //Generate an array of only the sequences
    var sequences = arr.map(function(value, index) {
        return value[0]
    });
    var items = [];
    var lenSequences = sequences.length;
    for (var x = 0; x < lenSequences; x++) {
        items = sequences[x].split('-'); //Generate an array for each sequence of every step
        var lenItems = items.length;
        for (var i = 0; i < lenItems; i++) {
            if (!unique.includes(items[i]))
                unique.push(items[i]); // add each possible step to a large array, do this for every possible sequence
        }
    }
    unique.move(unique.indexOf('end'), unique.length - 1);
}
//Generate a unique and random color for each possible item in a sequence
function generateColors() {
    //assign each unique item to a random unique color
    Math.seedrandom(1);
    for (var i = 1; i <= numOfUnique; i++) {
        var hue = '';
        var c;
        switch (i % 16) {
            case 0:
                hue = 'Blue';
                break;
            case 1:
                hue = 'Yellow';
                break;
            case 2:
                hue = "Purple";
                break;
            case 3:
                hue = "Indigo"
                break;
            case 4:
                hue = 'Blue Grey';
                break;
            case 5:
                hue = 'Green';
                break;
            case 6:
                hue = 'Red'
                break;
            case 7:
                hue = "Deep Purple";
                break;
            case 8:
                hue = 'Grey';
                break;
            case 9:
                hue = 'Amber';
                break;
            case 10:
                hue = 'Teal';
                break;
            case 11:
                hue = 'Purple';
                break;
            case 12:
                hue = 'Light Green';
                break;
            case 13:
                hue = 'Deep Orange';
                break;
            case 14:
                hue = 'Cyan';
                break;
            case 15:
                hue = 'Orange';
                break;
        }
        if (i < 16) //Only use a random shade if the color has been used before
            c = 500;
        else {
            do {
                c = (Math.random() * 900) + 100; // Geneate shade from 100 - 900
                c = c - (c % 100);
            } while (c <= 600 && c >= 400);
        }
        colors[unique[i - 1]] = palette.get(hue, c);
    }
}

//Generates checkboxes
function generateCheckBoxes() {
    //Build JSON object for fancytree
    alphabet = [];
    var str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (var i = 0; i < str.length; i++) {
        var firstChar = str.charAt(i);
        alphabet[i] = {
            title: firstChar,
            folder: true,
            children: []
        }
        for (var x = 0; x < unique.length; x++) {
            if (unique[x].charAt(0).toUpperCase() === firstChar) {
                data = {
                    title: unique[x],
                    key: unique[x]
                }
                alphabet[i]['children'].push(data);
            }
        }
    }
    $(function() {
        $("#tree").fancytree({
            source: alphabet,
            icon: false,
            checkbox: true,
            selectMode: 3,
            extensions: ["filter"],
            quicksearch: true,
            filter: {
                counter: true, // Show a badge with number of matching child nodes near parent icons
                fuzzy: false, // Match single characters in order, e.g. 'fb' will match 'FooBar'
                hideExpandedCounter: true, // Hide counter badge, when parent is expanded
                highlight: true, // Highlight matches by wrapping inside <mark> tags
                mode: "hide" // Grayout unmatched nodes (pass "hide" to remove unmatched node instead)
            },
            select: function(event, data) {
                var selKeys = $.map(data.tree.getSelectedNodes(), function(node) {
                    return node.key;
                });
                for (var key in checkedItems) {
                    if (!checkedItems.hasOwnProperty(key)) continue;
                    if (!selKeys.includes(key))
                        delete checkedItems[key];
                }
                for (var x = 0; x < selKeys.length; x++) {
                    checkedItems[selKeys[x]] = null;
                }
                json = buildHierarchy();
                createVisualization(json, false);
            }
        });

        //Build fancyTree and search
        var tree = $("#tree").fancytree("getTree");

        $("input[name=search]").keyup(function(e) {
            var n,
                opts = {
                    autoExpand: $("#autoExpand").is(":checked"),
                    leavesOnly: $("#leavesOnly").is(":checked")
                },
                match = $(this).val();

            if (e && e.which === $.ui.keyCode.ESCAPE || $.trim(match) === "") {
                $("button#btnResetSearch").click();
                return;
            }
            n = tree.filterNodes(match, opts);
            $("button#btnResetSearch").attr("disabled", false);
            $("span#matches").text("(" + n + " matches)");
        }).focus();

        $("button#btnResetSearch").click(function(e) {
            $("input[name=search]").val("");
            $("span#matches").text("");
            tree.clearFilter();
        }).attr("disabled", true)
    });
    $("#counter,#hideExpandedCounter,#highlight").prop("checked", true);
}

//Method to remove items from the sequence that are deselected by the user
function splitParts(list) {
    var newSequence = [];
    var lenList = list.length;
    for (var i = 0; i < lenList; i++) {
        if (checkedItems.hasOwnProperty(list[i]))
            newSequence.push(list[i]);
    }
    return newSequence;
}

//Checks to see if a sequence contains only the selected items
function containsOnly(s, list) {
    var retVal = true;
    var lenS = s.length;
    for (var i = 0; i < lenS; i++) {
        if (!(list.includes(s[i])))
            retVal = false;
    }
    return retVal;
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how
// often that sequence occurred.
function buildHierarchy() {
    var children = [];

    var root = {
        "name": "root",
        "children": []
    };
    csvLength = csv.length;
    for (var i = 0; i < csvLength; i++) {
        var size = +csv[i][1];
        if (isNaN(size)) { // e.g. if this is a header row
            continue;
        }

        var parts = splitParts(csv[i][0].split("-"));

        if (parts[0] == "end") //If after items are removed the resulting sequence is simply "end" then skip it
            continue;

        var currentNode = root;
        for (var j = 0; j < parts.length; j++) {
            //If the children are undefined (because the item was removed from the sequence) then define it as empty
            if ((typeof currentNode["children"] === "undefined")) {
                currentNode["children"] = [];
            }
            children = currentNode["children"];
            var nodeName = parts[j];
            var childNode;
            if (j + 1 < parts.length) {
                // Not yet at the end of the sequence; move down the tree.
                var foundChild = false;
                for (var k = 0; k < children.length; k++) {
                    if (children[k]["name"] == nodeName) {
                        childNode = children[k];
                        foundChild = true;
                        break;
                    }
                }
                // If we don't already have a child node for this branch, create it.
                if (!foundChild) {
                    childNode = {
                        "name": nodeName,
                        "children": []
                    };
                    children.push(childNode);
                }
                currentNode = childNode;
            } else {
                // Reached the end of the sequence; create a leaf node.
                var foundChild = false;
                for (var k = 0; k < children.length; k++) {
                    if (children[k]["name"] == nodeName) {
                        childNode = children[k];
                        foundChild = true;
                        break;
                    }
                }
                if (foundChild) {
                    childNode["size"] = childNode["size"] + size;
                } else {
                    childNode = {
                        "name": nodeName,
                        "size": size
                    };
                    children.push(childNode);
                }
            }
        }
    }
    return root;
};

function drawLegend() {
    // Dimensions of legend item: width, height, spacing, radius of rounded rect.
    var li = {
        w: 75,
        h: 30,
        s: 3,
        r: 3
    };

    var legend = d3.select("#legend").append("svg:svg")
        .attr("width", li.w)
        .attr("height", d3.keys(colors).length * (li.h + li.s));

    var g = legend.selectAll("g")
        .data(d3.entries(colors))
        .enter().append("svg:g")
        .attr("transform", function(d, i) {
            return "translate(0," + i * (li.h + li.s) + ")";
        });

    g.append("svg:rect")
        .attr("rx", li.r)
        .attr("ry", li.r)
        .attr("width", li.w)
        .attr("height", li.h)
        .style("fill", function(d) {
            return d.value;
        });

    g.append("svg:text")
        .attr("x", li.w / 2)
        .attr("y", li.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) {
            return d.key;
        });
}

//Generates checkboxes for use with legend if less than 10 unique items are in sequence
function generateCheckBoxesLegend() {
    for (var i = 0; i < numOfUnique; i++) {
        if (unique[i] != 'end') {
            var label = document.createElement("label");
            var checkbox = document.createElement("input");
            checkbox.type = "checkbox"; // make the element a checkbox
            checkbox.id = unique[i]; // give it a name we can check on the server side
            checkbox.setAttribute("style", "margin-top:10px");
            checkbox.checked = true;

            //If checkbox is checked make item visible
            checkbox.onclick = function() {
                if (this.checked) {
                    checkedItems[this.id] = null;
                } else {
                    delete checkedItems[this.id];
                }
                //Redraw vis
                var json = buildHierarchy(csv);
                createVisualization(json, false);
            }
            label.appendChild(checkbox); // add the box to the element

            // add the label element to your div
            document.getElementById('boxes').appendChild(label);
        }
    }
}
Array.prototype.move = function(old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};
